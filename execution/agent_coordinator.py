#!/usr/bin/env python3
"""
Agent Coordinator for the Auto-Dev System

This is the main orchestrator that coordinates:
- Todo processing and work queue management
- Git branch creation and management
- Multiple Claude CLI agents running in parallel
- Dev server instances for each agent
- Playwright testing for each implementation
- GitHub push and PR creation

Usage:
    # Full auto-dev run
    python execution/agent_coordinator.py \
        --todos .tmp/todos/video_20240115.json \
        --project /path/to/project \
        --max-agents 3

    # Dry run (shows what would be done)
    python execution/agent_coordinator.py \
        --todos .tmp/todos/video_20240115.json \
        --project /path/to/project \
        --dry-run

    # Resume from previous run
    python execution/agent_coordinator.py \
        --project /path/to/project \
        --resume
"""

import argparse
import asyncio
import json
import os
import signal
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Dict, Any

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp

# Import other modules
from todo_processor import create_work_queue, load_work_queue, save_work_queue, claim_todo, complete_todo, get_next_todo
from git_branch_manager import init_git_state, create_branch, commit_changes, push_branch, merge_branch, cleanup as git_cleanup
from dev_server_manager import start_server, stop_server, stop_all_servers, check_server_health
from spawn_claude_agent import spawn_claude_agent, TodoItem


@dataclass
class AgentWorker:
    """Represents a single agent worker with its resources."""
    worker_id: str
    port: int
    todo: Optional[Dict] = None
    branch: Optional[str] = None
    server_pid: Optional[int] = None
    status: str = "idle"  # idle, running, completed, failed
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    result: Optional[Dict] = None


@dataclass
class CoordinatorState:
    """State of the coordinator for persistence and resume."""
    run_id: str
    project_path: str
    max_agents: int
    base_port: int
    started_at: str
    workers: List[Dict] = field(default_factory=list)
    completed_todos: List[str] = field(default_factory=list)
    failed_todos: List[str] = field(default_factory=list)
    current_phase: str = "init"  # init, running, cleanup, done

    def to_dict(self) -> dict:
        return {
            "run_id": self.run_id,
            "project_path": self.project_path,
            "max_agents": self.max_agents,
            "base_port": self.base_port,
            "started_at": self.started_at,
            "workers": self.workers,
            "completed_todos": self.completed_todos,
            "failed_todos": self.failed_todos,
            "current_phase": self.current_phase
        }

    @classmethod
    def from_dict(cls, data: dict) -> "CoordinatorState":
        return cls(**data)


def save_coordinator_state(state: CoordinatorState):
    """Save coordinator state for resume capability."""
    save_json(state.to_dict(), "auto-dev/coordinator_state.json")


def load_coordinator_state() -> Optional[CoordinatorState]:
    """Load coordinator state if it exists."""
    try:
        data = load_json("auto-dev/coordinator_state.json")
        return CoordinatorState.from_dict(data)
    except FileNotFoundError:
        return None


def process_single_todo(
    worker: AgentWorker,
    todo_data: Dict,
    project_path: str,
    app_context: str,
    auto_merge: bool,
    github_push: bool,
    run_tests: bool,
    timeout: int
) -> Dict:
    """
    Process a single todo with a dedicated worker.

    This runs in a thread and handles:
    1. Creating feature branch
    2. Starting dev server
    3. Running Claude agent
    4. Running Playwright tests
    5. Committing and pushing changes
    """
    result = {
        "worker_id": worker.worker_id,
        "todo_id": todo_data["id"],
        "success": False,
        "phases": {}
    }

    todo = TodoItem.from_dict(todo_data)
    log(f"[{worker.worker_id}] Starting work on {todo.id}: {todo.title}")

    try:
        # Phase 1: Create branch
        log(f"[{worker.worker_id}] Creating branch...")
        branch_result = create_branch(project_path, todo.id, todo.title)
        result["phases"]["branch"] = branch_result.to_dict()

        if not branch_result.success:
            log(f"[{worker.worker_id}] Failed to create branch: {branch_result.error}", level="error")
            return result

        worker.branch = branch_result.data["branch"]

        # Phase 2: Start dev server
        log(f"[{worker.worker_id}] Starting dev server on port {worker.port}...")
        server_result = start_server(project_path, worker.port)
        result["phases"]["server"] = server_result.to_dict()

        if not server_result.success:
            log(f"[{worker.worker_id}] Failed to start server: {server_result.error}", level="error")
            return result

        worker.server_pid = server_result.data.get("pid")
        test_url = server_result.data.get("url", f"http://localhost:{worker.port}")

        # Phase 3: Run Claude agent
        log(f"[{worker.worker_id}] Spawning Claude agent...")
        agent_result = spawn_claude_agent(
            todo=todo,
            project_path=project_path,
            test_url=test_url,
            session_id=f"{worker.worker_id}_{todo.id}",
            app_context=app_context,
            timeout=timeout
        )
        result["phases"]["agent"] = agent_result.to_dict()

        if not agent_result.success:
            log(f"[{worker.worker_id}] Agent failed: {agent_result.error}", level="error")
            # Don't return yet - still try to run tests and commit what we have

        # Phase 4: Run Playwright tests (if enabled)
        if run_tests:
            log(f"[{worker.worker_id}] Running Playwright tests...")
            try:
                # Import here to avoid issues if playwright not installed
                from playwright_test_runner import run_tests as pw_run_tests
                import asyncio

                test_result = asyncio.run(pw_run_tests(
                    url=test_url,
                    todo_id=todo.id,
                    acceptance_criteria=todo.acceptance_criteria,
                    timeout=120,
                    headless=True
                ))
                result["phases"]["tests"] = test_result.to_dict()

                if test_result.failed_tests > 0:
                    log(f"[{worker.worker_id}] {test_result.failed_tests} tests failed", level="warning")
            except ImportError:
                log(f"[{worker.worker_id}] Playwright not available, skipping tests", level="warning")
                result["phases"]["tests"] = {"skipped": True, "reason": "playwright not installed"}
            except Exception as e:
                log(f"[{worker.worker_id}] Test error: {e}", level="error")
                result["phases"]["tests"] = {"error": str(e)}

        # Phase 5: Commit changes
        log(f"[{worker.worker_id}] Committing changes...")
        commit_msg = f"feat({todo.category}): {todo.title}\n\nImplemented by auto-dev agent\nTodo ID: {todo.id}"
        commit_result = commit_changes(project_path, commit_msg)
        result["phases"]["commit"] = commit_result.to_dict()

        # Phase 6: Push to GitHub (if enabled and commit succeeded)
        if github_push and commit_result.success and commit_result.data.get("committed"):
            log(f"[{worker.worker_id}] Pushing to GitHub...")
            push_result = push_branch(project_path, worker.branch)
            result["phases"]["push"] = push_result.to_dict()
        else:
            result["phases"]["push"] = {"skipped": True}

        # Phase 7: Auto-merge (if enabled and all tests passed)
        tests_passed = result["phases"].get("tests", {}).get("failed_tests", 0) == 0
        if auto_merge and tests_passed and commit_result.success:
            log(f"[{worker.worker_id}] Auto-merging to main...")
            merge_result = merge_branch(project_path, worker.branch)
            result["phases"]["merge"] = merge_result.to_dict()
        else:
            result["phases"]["merge"] = {"skipped": True, "reason": "auto_merge disabled or tests failed"}

        # Determine overall success
        result["success"] = (
            agent_result.success or
            commit_result.data.get("committed", False)
        )

    except Exception as e:
        log(f"[{worker.worker_id}] Error: {e}", level="error")
        result["error"] = str(e)

    finally:
        # Cleanup: Stop dev server
        if worker.server_pid:
            log(f"[{worker.worker_id}] Stopping dev server...")
            stop_server(worker.port)

    log(f"[{worker.worker_id}] Finished: {'SUCCESS' if result['success'] else 'FAILED'}")
    return result


def run_coordinator(
    todos_path: str,
    project_path: str,
    max_agents: int = 3,
    base_port: int = 3001,
    priority_filter: int = 1,
    categories: Optional[List[str]] = None,
    max_todos: Optional[int] = None,
    app_context: str = "",
    auto_merge: bool = False,
    github_push: bool = True,
    run_tests: bool = True,
    timeout: int = 600,
    dry_run: bool = False
) -> ExecutionResult:
    """
    Main coordinator function that orchestrates the entire auto-dev process.
    """
    run_id = f"run_{timestamp()}"
    log(f"Starting auto-dev coordinator: {run_id}")

    # Create state
    state = CoordinatorState(
        run_id=run_id,
        project_path=project_path,
        max_agents=max_agents,
        base_port=base_port,
        started_at=timestamp()
    )

    try:
        # Phase 1: Create work queue
        log("Phase 1: Creating work queue...")
        queue_result = create_work_queue(
            todos_path=todos_path,
            priority_filter=priority_filter,
            categories=categories,
            max_todos=max_todos
        )

        if not queue_result.success:
            return ExecutionResult.fail(error=f"Failed to create work queue: {queue_result.error}")

        queue = load_work_queue()
        total_todos = queue["total_count"]
        log(f"Work queue created with {total_todos} todos")

        if dry_run:
            log("DRY RUN - Would process the following todos:")
            for i, todo in enumerate(queue["todos"][:10]):
                log(f"  {i+1}. [{todo['priority']}] {todo['title']} ({todo['category']})")
            if total_todos > 10:
                log(f"  ... and {total_todos - 10} more")
            return ExecutionResult.ok(data={"dry_run": True, "total_todos": total_todos})

        # Phase 2: Initialize git
        log("Phase 2: Initializing git state...")
        git_result = init_git_state(project_path)
        if not git_result.success:
            return ExecutionResult.fail(error=f"Failed to initialize git: {git_result.error}")

        state.current_phase = "running"
        save_coordinator_state(state)

        # Phase 3: Process todos in parallel
        log(f"Phase 3: Processing todos with up to {max_agents} parallel agents...")

        # Create worker pool
        workers = [
            AgentWorker(
                worker_id=f"worker_{i}",
                port=base_port + i
            )
            for i in range(max_agents)
        ]

        results = []

        with ThreadPoolExecutor(max_workers=max_agents) as executor:
            futures = {}
            pending_todos = []

            # Initial assignment
            for worker in workers:
                next_result = get_next_todo()
                if next_result.success:
                    todo_data = next_result.data
                    claim_todo(todo_data["id"], worker.worker_id)
                    worker.todo = todo_data
                    worker.status = "running"
                    worker.started_at = timestamp()

                    future = executor.submit(
                        process_single_todo,
                        worker,
                        todo_data,
                        project_path,
                        app_context,
                        auto_merge,
                        github_push,
                        run_tests,
                        timeout
                    )
                    futures[future] = worker

            # Process results and assign new work
            while futures:
                done = []
                for future in list(futures.keys()):
                    if future.done():
                        done.append(future)

                for future in done:
                    worker = futures.pop(future)

                    try:
                        result = future.result()
                        results.append(result)

                        todo_id = result["todo_id"]
                        if result["success"]:
                            complete_todo(todo_id, success=True)
                            state.completed_todos.append(todo_id)
                            log(f"Completed: {todo_id}")
                        else:
                            complete_todo(todo_id, success=False)
                            state.failed_todos.append(todo_id)
                            log(f"Failed: {todo_id}")

                    except Exception as e:
                        log(f"Worker {worker.worker_id} error: {e}", level="error")

                    # Assign new work to this worker
                    worker.status = "idle"
                    worker.todo = None
                    worker.branch = None

                    next_result = get_next_todo()
                    if next_result.success:
                        todo_data = next_result.data
                        claim_todo(todo_data["id"], worker.worker_id)
                        worker.todo = todo_data
                        worker.status = "running"
                        worker.started_at = timestamp()

                        future = executor.submit(
                            process_single_todo,
                            worker,
                            todo_data,
                            project_path,
                            app_context,
                            auto_merge,
                            github_push,
                            run_tests,
                            timeout
                        )
                        futures[future] = worker

                save_coordinator_state(state)
                time.sleep(1)  # Small delay to prevent busy waiting

        # Phase 4: Cleanup
        log("Phase 4: Cleanup...")
        state.current_phase = "cleanup"
        save_coordinator_state(state)

        # Stop any remaining servers
        stop_all_servers()

        # Restore git state
        git_cleanup(project_path)

        # Generate report
        state.current_phase = "done"
        report = {
            "run_id": run_id,
            "started_at": state.started_at,
            "finished_at": timestamp(),
            "project_path": project_path,
            "total_todos": total_todos,
            "completed": len(state.completed_todos),
            "failed": len(state.failed_todos),
            "success_rate": len(state.completed_todos) / total_todos * 100 if total_todos > 0 else 0,
            "completed_todos": state.completed_todos,
            "failed_todos": state.failed_todos,
            "results": results
        }

        report_file = save_json(report, f"auto-dev/run_report_{run_id}.json")
        save_coordinator_state(state)

        log(f"Auto-dev run complete. {len(state.completed_todos)}/{total_todos} todos completed.")
        return ExecutionResult.ok(data=report, report_file=str(report_file))

    except KeyboardInterrupt:
        log("Interrupted by user. Cleaning up...", level="warning")
        stop_all_servers()
        git_cleanup(project_path)
        return ExecutionResult.fail(error="Interrupted by user")

    except Exception as e:
        log(f"Coordinator error: {e}", level="error")
        stop_all_servers()
        return ExecutionResult.fail(error=str(e))


def main():
    parser = argparse.ArgumentParser(
        description="Auto-Dev Agent Coordinator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic run
  python execution/agent_coordinator.py --todos .tmp/todos/video.json --project ./my-app

  # With options
  python execution/agent_coordinator.py \\
    --todos .tmp/todos/video.json \\
    --project ./my-app \\
    --max-agents 5 \\
    --priority-filter 3 \\
    --auto-merge

  # Dry run
  python execution/agent_coordinator.py --todos .tmp/todos/video.json --project ./my-app --dry-run
        """
    )
    parser.add_argument(
        "--todos",
        required=True,
        help="Path to todos JSON file"
    )
    parser.add_argument(
        "--project",
        required=True,
        help="Path to the project directory"
    )
    parser.add_argument(
        "--max-agents",
        type=int,
        default=3,
        help="Maximum parallel agents (default: 3)"
    )
    parser.add_argument(
        "--base-port",
        type=int,
        default=3001,
        help="Base port for dev servers (default: 3001)"
    )
    parser.add_argument(
        "--priority-filter",
        type=int,
        default=1,
        help="Minimum priority (1-5, default: 1)"
    )
    parser.add_argument(
        "--categories",
        help="Comma-separated categories to include"
    )
    parser.add_argument(
        "--max-todos",
        type=int,
        help="Maximum todos to process"
    )
    parser.add_argument(
        "--app-context",
        default="",
        help="Context about the application"
    )
    parser.add_argument(
        "--auto-merge",
        action="store_true",
        help="Auto-merge passing branches to main"
    )
    parser.add_argument(
        "--no-push",
        action="store_true",
        help="Don't push branches to GitHub"
    )
    parser.add_argument(
        "--no-tests",
        action="store_true",
        help="Skip Playwright tests"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Agent timeout in seconds (default: 600)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without executing"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from previous run"
    )
    args = parser.parse_args()

    load_env()

    # Handle resume
    if args.resume:
        state = load_coordinator_state()
        if not state:
            print(ExecutionResult.fail(error="No previous run to resume").to_json())
            sys.exit(1)
        # TODO: Implement resume logic
        print(ExecutionResult.fail(error="Resume not yet implemented").to_json())
        sys.exit(1)

    # Parse categories
    categories = args.categories.split(",") if args.categories else None

    # Run coordinator
    result = run_coordinator(
        todos_path=args.todos,
        project_path=args.project,
        max_agents=args.max_agents,
        base_port=args.base_port,
        priority_filter=args.priority_filter,
        categories=categories,
        max_todos=args.max_todos,
        app_context=args.app_context,
        auto_merge=args.auto_merge,
        github_push=not args.no_push,
        run_tests=not args.no_tests,
        timeout=args.timeout,
        dry_run=args.dry_run
    )

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
