#!/usr/bin/env python3
"""
Swarm Coordinator for HikeWise

Main orchestrator for the agent swarm system. Coordinates:
- Issue discovery via Maestro
- Issue classification and prioritization
- Agent spawning with worktree isolation
- Testing and verification
- Kanban state management

This extends the existing agent_coordinator.py with mobile-specific features.

Usage:
    # Full swarm run
    python execution/swarm_coordinator.py \
        --action run \
        --max-agents 3

    # Discovery only
    python execution/swarm_coordinator.py --action discover

    # Status check
    python execution/swarm_coordinator.py --action status

    # Dry run
    python execution/swarm_coordinator.py --action run --dry-run
"""

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp

# Import other swarm modules
from worktree_manager import create_worktree, cleanup_worktree, list_worktrees
from agent_dependency_resolver import DependencyGraph, build_graph_from_kanban
from agent_state_manager import AgentStateManager
from kanban_state_manager import KanbanStateManager
from discovery_agent import DiscoveryAgent
from issue_classifier import IssueClassifier


@dataclass
class SwarmAgent:
    """Represents a single agent in the swarm."""
    agent_id: str
    status: str = "idle"  # idle, working, testing, completed, failed
    worktree_path: Optional[str] = None
    branch: Optional[str] = None
    current_task: Optional[str] = None
    port: int = 8081
    started_at: Optional[str] = None
    results: List[Dict] = field(default_factory=list)


@dataclass
class SwarmState:
    """Overall swarm state."""
    run_id: str
    phase: str = "init"  # init, discovery, classification, fixing, testing, complete
    agents: Dict[str, SwarmAgent] = field(default_factory=dict)
    issues_discovered: int = 0
    issues_fixed: int = 0
    issues_failed: int = 0
    started_at: str = ""
    updated_at: str = ""


class SwarmCoordinator:
    """
    Main swarm coordinator.

    Workflow:
    1. Discovery Phase: Run Maestro flows to find issues
    2. Classification Phase: Classify and prioritize issues
    3. Fixing Phase: Spawn agents to fix issues in priority order
    4. Testing Phase: Verify fixes with Maestro
    5. Completion: Update kanban, generate report
    """

    def __init__(self, project_path: str = None, max_agents: int = 3, base_port: int = 8081):
        self.project_path = project_path or str(Path(__file__).parent.parent)
        self.max_agents = max_agents
        self.base_port = base_port

        # Initialize components
        self.state_manager = AgentStateManager()
        self.kanban = KanbanStateManager()
        self.discovery = DiscoveryAgent(self.project_path)
        self.classifier = IssueClassifier()

        # State
        self.state = SwarmState(
            run_id=f"swarm_{timestamp().replace(':', '-').replace(' ', '_')}",
            started_at=timestamp()
        )

    def run(self, dry_run: bool = False, skip_discovery: bool = False) -> ExecutionResult:
        """Run the full swarm workflow."""
        log(f"Starting swarm run: {self.state.run_id}")
        self._save_state()

        try:
            # Phase 1: Discovery
            if not skip_discovery:
                log("Phase 1: Running discovery...")
                self.state.phase = "discovery"
                self._save_state()

                discovery_result = self._run_discovery()
                if not discovery_result.success:
                    log(f"Discovery failed: {discovery_result.error}", level="error")

            # Phase 2: Classification
            log("Phase 2: Classifying issues...")
            self.state.phase = "classification"
            self._save_state()

            classification_result = self._run_classification()
            if classification_result.success:
                self.state.issues_discovered = classification_result.data.get("total_classified", 0)

            # Phase 3: Build dependency graph
            log("Phase 3: Building dependency graph...")
            kanban_path = get_tmp_path("swarm/kanban.json")
            graph_result = build_graph_from_kanban(kanban_path)

            if dry_run:
                log("DRY RUN - Would process the following issues:")
                return self._generate_dry_run_report()

            # Phase 4: Fixing
            log("Phase 4: Spawning agents to fix issues...")
            self.state.phase = "fixing"
            self._save_state()

            fixing_result = self._run_fixing_phase()

            # Phase 5: Testing
            log("Phase 5: Testing fixes...")
            self.state.phase = "testing"
            self._save_state()

            testing_result = self._run_testing_phase()

            # Phase 6: Completion
            log("Phase 6: Generating report...")
            self.state.phase = "complete"
            self._save_state()

            return self._generate_final_report()

        except Exception as e:
            log(f"Swarm error: {e}", level="error")
            self.state.phase = "error"
            self._save_state()
            return ExecutionResult.fail(error=str(e))

        finally:
            # Cleanup
            self._cleanup()

    def _run_discovery(self) -> ExecutionResult:
        """Run the discovery phase."""
        flows_dir = os.path.join(self.project_path, ".maestro/flows/discovery")

        if not os.path.exists(flows_dir):
            log("No discovery flows found. Skipping discovery.", level="warning")
            return ExecutionResult.ok(data={"skipped": True})

        return self.discovery.run_all_discovery_flows(flows_dir)

    def _run_classification(self) -> ExecutionResult:
        """Run the classification phase."""
        # Check for discovery results
        discovery_path = get_tmp_path("discovery/issue_report.json")

        if not os.path.exists(discovery_path):
            # Check for existing todo list
            todo_path = os.path.join(self.project_path, "HikeWise_ToDo_List.md")
            if os.path.exists(todo_path):
                log("No discovery results. Using existing todo list.")
                return self._import_from_todo_list(todo_path)
            else:
                log("No issues to classify", level="warning")
                return ExecutionResult.ok(data={"total_classified": 0})

        # Classify discovered issues
        from issue_classifier import classify_from_discovery
        result = classify_from_discovery(discovery_path)

        if result.success:
            # Import to kanban
            classified_path = get_tmp_path("swarm/classified_issues.json")
            self.kanban.import_from_discovery(classified_path)

        return result

    def _import_from_todo_list(self, todo_path: str) -> ExecutionResult:
        """Import issues from markdown todo list."""
        import re

        with open(todo_path, "r") as f:
            content = f.read()

        # Parse markdown checkboxes
        issues = []
        current_category = "general"

        for line in content.split("\n"):
            # Check for category headers
            if line.startswith("###"):
                current_category = line.replace("###", "").strip().lower()
                continue

            # Check for todo items
            match = re.match(r"- \[ \] (.+)", line)
            if match:
                title = match.group(1).strip()
                issue_id = f"todo-{len(issues)+1:03d}"

                issues.append({
                    "id": issue_id,
                    "title": title,
                    "category": current_category,
                    "source": "todo_list"
                })

        # Classify
        classified = self.classifier.classify_batch(issues)

        # Add to kanban
        for issue in classified:
            self.kanban.add_issue(issue, "suggestions")

        return ExecutionResult.ok(data={
            "total_classified": len(classified),
            "source": todo_path
        })

    def _run_fixing_phase(self) -> ExecutionResult:
        """Run agents to fix issues."""
        # Get ready issues from kanban
        ready_result = self.kanban.get_column("suggestions")
        if not ready_result.success:
            return ready_result

        suggestions = ready_result.data.get("issues", [])
        if not suggestions:
            log("No issues to fix")
            return ExecutionResult.ok(data={"fixed": 0})

        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        suggestions.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 4))

        # Initialize agents
        for i in range(self.max_agents):
            agent_id = f"agent-{i+1}"
            self.state.agents[agent_id] = SwarmAgent(
                agent_id=agent_id,
                port=self.base_port + i
            )
            self.state_manager.register_agent(agent_id, port=self.base_port + i)

        # Process issues with agent pool
        fixed = 0
        failed = 0

        with ThreadPoolExecutor(max_workers=self.max_agents) as executor:
            futures = {}

            # Assign initial work
            for i, issue in enumerate(suggestions[:self.max_agents]):
                agent_id = f"agent-{i+1}"
                future = executor.submit(self._process_issue, agent_id, issue)
                futures[future] = (agent_id, issue)

            remaining = suggestions[self.max_agents:]

            # Process results and assign new work
            while futures:
                for future in list(futures.keys()):
                    if future.done():
                        agent_id, issue = futures.pop(future)

                        try:
                            result = future.result()
                            if result.success:
                                fixed += 1
                                self.kanban.move_issue(issue["id"], "done", agent_id)
                            else:
                                failed += 1
                                log(f"Issue {issue['id']} failed: {result.error}", level="error")
                        except Exception as e:
                            failed += 1
                            log(f"Agent {agent_id} error: {e}", level="error")

                        # Assign next issue
                        if remaining:
                            next_issue = remaining.pop(0)
                            future = executor.submit(self._process_issue, agent_id, next_issue)
                            futures[future] = (agent_id, next_issue)

                time.sleep(1)

        self.state.issues_fixed = fixed
        self.state.issues_failed = failed

        return ExecutionResult.ok(data={
            "fixed": fixed,
            "failed": failed
        })

    def _process_issue(self, agent_id: str, issue: Dict) -> ExecutionResult:
        """Process a single issue with an agent."""
        issue_id = issue.get("id")
        log(f"[{agent_id}] Processing issue: {issue_id}")

        # Claim the task
        self.state_manager.claim_task(agent_id, issue_id)
        self.kanban.move_issue(issue_id, "in_progress", agent_id)

        try:
            # Create worktree
            branch = f"fix/{issue_id}"
            wt_result = create_worktree(agent_id, branch)

            if not wt_result.success:
                return ExecutionResult.fail(error=f"Failed to create worktree: {wt_result.error}")

            worktree_path = wt_result.data.get("worktree_path")
            self.state.agents[agent_id].worktree_path = worktree_path
            self.state.agents[agent_id].branch = branch

            # Spawn Claude agent to fix the issue
            from spawn_claude_agent import spawn_claude_agent, TodoItem

            todo = TodoItem(
                id=issue_id,
                title=issue.get("title", ""),
                description=issue.get("description", ""),
                category=issue.get("category", "general"),
                priority=self._priority_to_int(issue.get("priority", "low")),
                acceptance_criteria=issue.get("acceptance_criteria", []),
                related_files=issue.get("affected_files", [])
            )

            agent_result = spawn_claude_agent(
                todo=todo,
                project_path=worktree_path,
                test_url=f"http://localhost:{self.state.agents[agent_id].port}",
                session_id=f"{agent_id}_{issue_id}",
                timeout=600
            )

            # Complete the task
            self.state_manager.complete_task(agent_id, issue_id, {
                "success": agent_result.success,
                "branch": branch
            })

            return agent_result

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

        finally:
            # Cleanup worktree
            cleanup_worktree(agent_id)

    def _priority_to_int(self, priority: str) -> int:
        """Convert priority string to int."""
        return {"critical": 5, "high": 4, "medium": 3, "low": 2}.get(priority, 1)

    def _run_testing_phase(self) -> ExecutionResult:
        """Run verification tests for fixed issues."""
        from maestro_test_runner import MaestroTestRunner

        runner = MaestroTestRunner(self.project_path)
        verify_dir = os.path.join(self.project_path, ".maestro/flows/verify")

        if not os.path.exists(verify_dir):
            log("No verification flows found. Skipping testing.", level="warning")
            return ExecutionResult.ok(data={"skipped": True})

        return runner.run_flows(verify_dir)

    def _cleanup(self):
        """Cleanup resources."""
        log("Cleaning up...")

        # Cleanup all worktrees
        for agent_id in self.state.agents:
            cleanup_worktree(agent_id, force=True)
            self.state_manager.unregister_agent(agent_id)

        # Cleanup stale state
        self.state_manager.cleanup_stale()

    def _save_state(self):
        """Save current state."""
        self.state.updated_at = timestamp()
        state_dict = {
            "run_id": self.state.run_id,
            "phase": self.state.phase,
            "agents": {
                aid: {
                    "agent_id": a.agent_id,
                    "status": a.status,
                    "current_task": a.current_task,
                    "port": a.port
                }
                for aid, a in self.state.agents.items()
            },
            "issues_discovered": self.state.issues_discovered,
            "issues_fixed": self.state.issues_fixed,
            "issues_failed": self.state.issues_failed,
            "started_at": self.state.started_at,
            "updated_at": self.state.updated_at
        }
        save_json(state_dict, "swarm/coordinator_state.json")

    def _generate_dry_run_report(self) -> ExecutionResult:
        """Generate dry run report."""
        board = self.kanban.get_board()
        stats = self.kanban.get_stats()

        return ExecutionResult.ok(data={
            "dry_run": True,
            "would_process": board.data if board.success else {},
            "stats": stats.data if stats.success else {}
        })

    def _generate_final_report(self) -> ExecutionResult:
        """Generate final swarm run report."""
        report = {
            "run_id": self.state.run_id,
            "started_at": self.state.started_at,
            "completed_at": timestamp(),
            "summary": {
                "issues_discovered": self.state.issues_discovered,
                "issues_fixed": self.state.issues_fixed,
                "issues_failed": self.state.issues_failed,
                "success_rate": round(
                    self.state.issues_fixed / max(1, self.state.issues_discovered) * 100, 1
                )
            },
            "agents_used": len(self.state.agents),
            "kanban": self.kanban.get_stats().data if self.kanban.get_stats().success else {}
        }

        save_json(report, f"swarm/reports/{self.state.run_id}.json")

        return ExecutionResult.ok(data=report)

    def get_status(self) -> ExecutionResult:
        """Get current swarm status."""
        try:
            state = load_json("swarm/coordinator_state.json")
        except FileNotFoundError:
            state = {"phase": "not_started"}

        board = self.kanban.get_board()
        agents = self.state_manager.get_agent_status()

        return ExecutionResult.ok(data={
            "coordinator_state": state,
            "kanban": board.data if board.success else {},
            "agents": agents.data if agents.success else {}
        })


def main():
    parser = argparse.ArgumentParser(
        description="Swarm coordinator for HikeWise"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["run", "discover", "classify", "status", "cleanup"],
        help="Action to perform"
    )
    parser.add_argument("--max-agents", type=int, default=3, help="Max parallel agents")
    parser.add_argument("--base-port", type=int, default=8081, help="Base port for agents")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done")
    parser.add_argument("--skip-discovery", action="store_true", help="Skip discovery phase")
    args = parser.parse_args()

    load_env()
    coordinator = SwarmCoordinator(max_agents=args.max_agents, base_port=args.base_port)

    if args.action == "run":
        result = coordinator.run(dry_run=args.dry_run, skip_discovery=args.skip_discovery)

    elif args.action == "discover":
        result = coordinator._run_discovery()

    elif args.action == "classify":
        result = coordinator._run_classification()

    elif args.action == "status":
        result = coordinator.get_status()

    elif args.action == "cleanup":
        coordinator._cleanup()
        result = ExecutionResult.ok(data={"cleaned": True})

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
