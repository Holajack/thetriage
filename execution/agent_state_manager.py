#!/usr/bin/env python3
"""
Agent State Manager for HikeWise Swarm

Manages shared state between agents using file-based coordination.
Handles locks, task claiming, and inter-agent communication.

Usage:
    # Claim a task for an agent
    python execution/agent_state_manager.py \
        --action claim \
        --agent-id agent-1 \
        --task-id issue-001

    # Wait for a dependency
    python execution/agent_state_manager.py \
        --action wait \
        --task-id issue-002 \
        --timeout 300

    # Broadcast task completion
    python execution/agent_state_manager.py \
        --action complete \
        --agent-id agent-1 \
        --task-id issue-001
"""

import argparse
import fcntl
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Optional, List

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


class AgentStateManager:
    """
    Manages agent state and coordination via file-based locking.

    State files:
    - .tmp/swarm/state.json - Main state file
    - .tmp/swarm/locks/*.lock - Task locks
    - .tmp/swarm/agents/*.json - Per-agent state
    """

    def __init__(self):
        self.state_dir = get_tmp_path("swarm")
        self.locks_dir = get_tmp_path("swarm/locks")
        self.agents_dir = get_tmp_path("swarm/agents")

        # Ensure directories exist
        os.makedirs(self.locks_dir, exist_ok=True)
        os.makedirs(self.agents_dir, exist_ok=True)

    def _get_lock_path(self, resource: str) -> str:
        """Get lock file path for a resource."""
        safe_name = resource.replace("/", "_").replace("\\", "_")
        return os.path.join(self.locks_dir, f"{safe_name}.lock")

    def _get_agent_state_path(self, agent_id: str) -> str:
        """Get state file path for an agent."""
        return os.path.join(self.agents_dir, f"{agent_id}.json")

    def acquire_lock(self, resource: str, agent_id: str, timeout: int = 30) -> bool:
        """
        Acquire exclusive lock on a resource.

        Uses file locking for atomic operations.
        """
        lock_path = self._get_lock_path(resource)
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                # Create lock file with agent info
                fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                lock_data = {
                    "agent_id": agent_id,
                    "resource": resource,
                    "acquired_at": timestamp(),
                    "pid": os.getpid()
                }
                os.write(fd, json.dumps(lock_data).encode())
                os.close(fd)
                log(f"Agent {agent_id} acquired lock on {resource}")
                return True
            except FileExistsError:
                # Lock exists, check if stale
                try:
                    with open(lock_path, "r") as f:
                        existing = json.load(f)

                    # Check if holding process is still alive
                    pid = existing.get("pid")
                    if pid and not self._process_exists(pid):
                        # Stale lock, remove it
                        os.remove(lock_path)
                        log(f"Removed stale lock from pid {pid}")
                        continue
                except (json.JSONDecodeError, FileNotFoundError):
                    pass

                time.sleep(1)
            except Exception as e:
                log(f"Lock error: {e}", level="error")
                return False

        log(f"Timeout acquiring lock on {resource}", level="warning")
        return False

    def release_lock(self, resource: str, agent_id: str) -> bool:
        """Release a lock on a resource."""
        lock_path = self._get_lock_path(resource)

        try:
            with open(lock_path, "r") as f:
                lock_data = json.load(f)

            if lock_data.get("agent_id") != agent_id:
                log(f"Cannot release lock: owned by {lock_data.get('agent_id')}", level="error")
                return False

            os.remove(lock_path)
            log(f"Agent {agent_id} released lock on {resource}")
            return True
        except FileNotFoundError:
            return True  # Already released
        except Exception as e:
            log(f"Error releasing lock: {e}", level="error")
            return False

    def _process_exists(self, pid: int) -> bool:
        """Check if a process is still running."""
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False

    def claim_task(self, agent_id: str, task_id: str) -> ExecutionResult:
        """
        Claim a task for exclusive work by an agent.
        """
        if not self.acquire_lock(f"task_{task_id}", agent_id):
            return ExecutionResult.fail(error=f"Could not claim task {task_id}")

        # Update main state
        state = self._load_main_state()
        state["tasks"][task_id] = {
            "status": "claimed",
            "agent_id": agent_id,
            "claimed_at": timestamp()
        }
        state["agents"][agent_id] = {
            "status": "working",
            "current_task": task_id,
            "updated_at": timestamp()
        }
        self._save_main_state(state)

        # Update agent state
        self._update_agent_state(agent_id, {
            "current_task": task_id,
            "task_claimed_at": timestamp(),
            "status": "working"
        })

        return ExecutionResult.ok(data={
            "task_id": task_id,
            "agent_id": agent_id,
            "claimed": True
        })

    def complete_task(self, agent_id: str, task_id: str, result: Dict = None) -> ExecutionResult:
        """
        Mark a task as completed and broadcast to other agents.
        """
        # Update main state
        state = self._load_main_state()

        if task_id in state.get("tasks", {}):
            state["tasks"][task_id] = {
                "status": "completed",
                "agent_id": agent_id,
                "completed_at": timestamp(),
                "result": result or {}
            }

        if agent_id in state.get("agents", {}):
            state["agents"][agent_id] = {
                "status": "idle",
                "current_task": None,
                "last_completed": task_id,
                "updated_at": timestamp()
            }

        # Add to completion log for waiting agents
        state.setdefault("completions", []).append({
            "task_id": task_id,
            "agent_id": agent_id,
            "completed_at": timestamp()
        })

        self._save_main_state(state)

        # Release lock
        self.release_lock(f"task_{task_id}", agent_id)

        # Update agent state
        self._update_agent_state(agent_id, {
            "current_task": None,
            "last_completed": task_id,
            "last_completed_at": timestamp(),
            "status": "idle"
        })

        log(f"Task {task_id} completed by {agent_id}")
        return ExecutionResult.ok(data={
            "task_id": task_id,
            "agent_id": agent_id,
            "completed": True
        })

    def wait_for_task(self, task_id: str, timeout: int = 300) -> ExecutionResult:
        """
        Block until a task is completed.
        Used by agents waiting for dependencies.
        """
        start_time = time.time()
        poll_interval = 5  # seconds

        log(f"Waiting for task {task_id} (timeout: {timeout}s)")

        while time.time() - start_time < timeout:
            state = self._load_main_state()
            task_state = state.get("tasks", {}).get(task_id, {})

            if task_state.get("status") == "completed":
                log(f"Task {task_id} is now complete")
                return ExecutionResult.ok(data={
                    "task_id": task_id,
                    "completed": True,
                    "wait_time": time.time() - start_time,
                    "result": task_state.get("result")
                })

            time.sleep(poll_interval)

        return ExecutionResult.fail(error=f"Timeout waiting for task {task_id}")

    def get_agent_status(self, agent_id: str = None) -> ExecutionResult:
        """Get status of one or all agents."""
        state = self._load_main_state()

        if agent_id:
            agent_state = state.get("agents", {}).get(agent_id)
            if not agent_state:
                return ExecutionResult.fail(error=f"Agent not found: {agent_id}")
            return ExecutionResult.ok(data=agent_state)

        return ExecutionResult.ok(data={
            "agents": state.get("agents", {}),
            "tasks": state.get("tasks", {}),
            "active_count": sum(
                1 for a in state.get("agents", {}).values()
                if a.get("status") == "working"
            )
        })

    def register_agent(self, agent_id: str, worktree_path: str = None, port: int = None) -> ExecutionResult:
        """Register a new agent in the swarm."""
        state = self._load_main_state()

        state.setdefault("agents", {})[agent_id] = {
            "status": "idle",
            "registered_at": timestamp(),
            "worktree_path": worktree_path,
            "port": port,
            "current_task": None
        }

        self._save_main_state(state)

        # Create agent state file
        self._update_agent_state(agent_id, {
            "registered_at": timestamp(),
            "worktree_path": worktree_path,
            "port": port,
            "status": "idle"
        })

        return ExecutionResult.ok(data={
            "agent_id": agent_id,
            "registered": True
        })

    def unregister_agent(self, agent_id: str) -> ExecutionResult:
        """Remove an agent from the swarm."""
        state = self._load_main_state()

        if agent_id in state.get("agents", {}):
            del state["agents"][agent_id]
            self._save_main_state(state)

        # Remove agent state file
        agent_path = self._get_agent_state_path(agent_id)
        if os.path.exists(agent_path):
            os.remove(agent_path)

        return ExecutionResult.ok(data={
            "agent_id": agent_id,
            "unregistered": True
        })

    def _load_main_state(self) -> Dict:
        """Load the main state file."""
        state_path = os.path.join(self.state_dir, "state.json")
        try:
            with open(state_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "agents": {},
                "tasks": {},
                "completions": [],
                "created_at": timestamp()
            }

    def _save_main_state(self, state: Dict):
        """Save the main state file with locking."""
        state["updated_at"] = timestamp()
        state_path = os.path.join(self.state_dir, "state.json")

        # Atomic write using temp file
        temp_path = state_path + ".tmp"
        with open(temp_path, "w") as f:
            json.dump(state, f, indent=2)
        os.rename(temp_path, state_path)

    def _update_agent_state(self, agent_id: str, updates: Dict):
        """Update an agent's state file."""
        agent_path = self._get_agent_state_path(agent_id)

        try:
            with open(agent_path, "r") as f:
                state = json.load(f)
        except FileNotFoundError:
            state = {"agent_id": agent_id}

        state.update(updates)
        state["updated_at"] = timestamp()

        with open(agent_path, "w") as f:
            json.dump(state, f, indent=2)

    def cleanup_stale(self, max_age_hours: int = 24) -> ExecutionResult:
        """Clean up stale locks and agent states."""
        import datetime

        cutoff = datetime.datetime.now() - datetime.timedelta(hours=max_age_hours)
        cleaned = {"locks": 0, "agents": 0}

        # Clean stale locks
        for lock_file in os.listdir(self.locks_dir):
            lock_path = os.path.join(self.locks_dir, lock_file)
            try:
                with open(lock_path, "r") as f:
                    lock_data = json.load(f)

                # Check if process is alive
                pid = lock_data.get("pid")
                if pid and not self._process_exists(pid):
                    os.remove(lock_path)
                    cleaned["locks"] += 1
            except Exception:
                pass

        return ExecutionResult.ok(data=cleaned)


def main():
    parser = argparse.ArgumentParser(
        description="Agent state manager for HikeWise swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["claim", "complete", "wait", "status", "register", "unregister", "cleanup"],
        help="Action to perform"
    )
    parser.add_argument("--agent-id", help="Agent identifier")
    parser.add_argument("--task-id", help="Task identifier")
    parser.add_argument("--timeout", type=int, default=300, help="Wait timeout in seconds")
    parser.add_argument("--worktree-path", help="Worktree path for agent registration")
    parser.add_argument("--port", type=int, help="Port for agent registration")
    args = parser.parse_args()

    load_env()
    manager = AgentStateManager()

    if args.action == "claim":
        if not args.agent_id or not args.task_id:
            print(ExecutionResult.fail(error="--agent-id and --task-id required").to_json())
            sys.exit(1)
        result = manager.claim_task(args.agent_id, args.task_id)

    elif args.action == "complete":
        if not args.agent_id or not args.task_id:
            print(ExecutionResult.fail(error="--agent-id and --task-id required").to_json())
            sys.exit(1)
        result = manager.complete_task(args.agent_id, args.task_id)

    elif args.action == "wait":
        if not args.task_id:
            print(ExecutionResult.fail(error="--task-id required").to_json())
            sys.exit(1)
        result = manager.wait_for_task(args.task_id, args.timeout)

    elif args.action == "status":
        result = manager.get_agent_status(args.agent_id)

    elif args.action == "register":
        if not args.agent_id:
            print(ExecutionResult.fail(error="--agent-id required").to_json())
            sys.exit(1)
        result = manager.register_agent(args.agent_id, args.worktree_path, args.port)

    elif args.action == "unregister":
        if not args.agent_id:
            print(ExecutionResult.fail(error="--agent-id required").to_json())
            sys.exit(1)
        result = manager.unregister_agent(args.agent_id)

    elif args.action == "cleanup":
        result = manager.cleanup_stale()

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
