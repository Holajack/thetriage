#!/usr/bin/env python3
"""
Git Worktree Manager for HikeWise Agent Swarm

Manages git worktrees for parallel agent development without branch conflicts.
Each agent gets an isolated workspace while sharing the same repository.

Usage:
    # Create worktree for agent
    python execution/worktree_manager.py \
        --action create \
        --agent-id agent-1 \
        --branch feat/navigation-fix

    # List all worktrees
    python execution/worktree_manager.py --action list

    # Cleanup worktree after merge
    python execution/worktree_manager.py \
        --action cleanup \
        --agent-id agent-1
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import List, Optional, Dict

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


def run_git(args: List[str], cwd: str = None) -> tuple:
    """Run a git command and return (success, stdout, stderr)."""
    cmd = ["git"] + args
    log(f"Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=120
        )
        return (
            result.returncode == 0,
            result.stdout.strip(),
            result.stderr.strip()
        )
    except subprocess.TimeoutExpired:
        return (False, "", "Git command timed out")
    except Exception as e:
        return (False, "", str(e))


def get_project_root() -> str:
    """Get the root directory of the HikeWise project."""
    return str(Path(__file__).parent.parent.resolve())


def get_worktree_base() -> str:
    """Get the base directory for worktrees (parent of project)."""
    project_root = get_project_root()
    return str(Path(project_root).parent)


def get_worktree_path(agent_id: str) -> str:
    """Get the worktree path for a specific agent."""
    base = get_worktree_base()
    return os.path.join(base, f"hikewise-{agent_id}")


def create_worktree(
    agent_id: str,
    branch: str,
    base_branch: str = "main"
) -> ExecutionResult:
    """
    Create an isolated worktree for an agent.

    Args:
        agent_id: Unique identifier for the agent (e.g., "agent-1")
        branch: Branch name to create/checkout in the worktree
        base_branch: Branch to base the new branch on (default: main)

    Returns:
        ExecutionResult with worktree path and branch info
    """
    project_root = get_project_root()
    worktree_path = get_worktree_path(agent_id)

    log(f"Creating worktree for {agent_id} at {worktree_path}")

    # Check if worktree already exists
    if os.path.exists(worktree_path):
        log(f"Worktree already exists at {worktree_path}")
        return ExecutionResult.ok(data={
            "agent_id": agent_id,
            "worktree_path": worktree_path,
            "branch": branch,
            "already_existed": True
        })

    # Ensure we're on base branch and up to date
    success, _, err = run_git(["fetch", "origin"], cwd=project_root)
    if not success:
        log(f"Warning: Could not fetch origin: {err}", level="warning")

    # Check if branch already exists
    success, branches, _ = run_git(["branch", "-a"], cwd=project_root)
    branch_exists = branch in branches or f"origin/{branch}" in branches

    if branch_exists:
        # Create worktree with existing branch
        success, _, err = run_git(
            ["worktree", "add", worktree_path, branch],
            cwd=project_root
        )
    else:
        # Create worktree with new branch from base
        success, _, err = run_git(
            ["worktree", "add", "-b", branch, worktree_path, base_branch],
            cwd=project_root
        )

    if not success:
        return ExecutionResult.fail(error=f"Failed to create worktree: {err}")

    # Save worktree state
    state = load_worktree_state()
    state["worktrees"][agent_id] = {
        "path": worktree_path,
        "branch": branch,
        "created_at": timestamp(),
        "status": "active"
    }
    save_worktree_state(state)

    log(f"Created worktree: {worktree_path} on branch {branch}")
    return ExecutionResult.ok(data={
        "agent_id": agent_id,
        "worktree_path": worktree_path,
        "branch": branch,
        "already_existed": False
    })


def list_worktrees() -> ExecutionResult:
    """List all active worktrees."""
    project_root = get_project_root()

    success, output, err = run_git(["worktree", "list", "--porcelain"], cwd=project_root)
    if not success:
        return ExecutionResult.fail(error=f"Failed to list worktrees: {err}")

    worktrees = []
    current = {}

    for line in output.split("\n"):
        if line.startswith("worktree "):
            if current:
                worktrees.append(current)
            current = {"path": line[9:]}
        elif line.startswith("HEAD "):
            current["head"] = line[5:]
        elif line.startswith("branch "):
            current["branch"] = line[7:].replace("refs/heads/", "")
        elif line == "bare":
            current["bare"] = True
        elif line == "detached":
            current["detached"] = True

    if current:
        worktrees.append(current)

    # Get state for agent mapping
    state = load_worktree_state()

    # Add agent_id to worktrees that we manage
    for wt in worktrees:
        for agent_id, agent_wt in state.get("worktrees", {}).items():
            if agent_wt.get("path") == wt.get("path"):
                wt["agent_id"] = agent_id
                wt["status"] = agent_wt.get("status", "unknown")

    return ExecutionResult.ok(data={
        "worktrees": worktrees,
        "count": len(worktrees)
    })


def cleanup_worktree(agent_id: str, force: bool = False) -> ExecutionResult:
    """
    Remove a worktree after an agent is done.

    Args:
        agent_id: The agent whose worktree to remove
        force: Force removal even if there are uncommitted changes
    """
    project_root = get_project_root()
    worktree_path = get_worktree_path(agent_id)

    log(f"Cleaning up worktree for {agent_id}")

    if not os.path.exists(worktree_path):
        log(f"Worktree does not exist: {worktree_path}")
        # Still update state
        state = load_worktree_state()
        if agent_id in state.get("worktrees", {}):
            del state["worktrees"][agent_id]
            save_worktree_state(state)
        return ExecutionResult.ok(data={"already_removed": True})

    # Check for uncommitted changes
    success, status, _ = run_git(["status", "--porcelain"], cwd=worktree_path)
    if success and status and not force:
        return ExecutionResult.fail(
            error=f"Worktree has uncommitted changes. Use --force to remove anyway."
        )

    # Remove the worktree
    args = ["worktree", "remove", worktree_path]
    if force:
        args.insert(2, "--force")

    success, _, err = run_git(args, cwd=project_root)
    if not success:
        return ExecutionResult.fail(error=f"Failed to remove worktree: {err}")

    # Update state
    state = load_worktree_state()
    if agent_id in state.get("worktrees", {}):
        state["worktrees"][agent_id]["status"] = "removed"
        state["worktrees"][agent_id]["removed_at"] = timestamp()
    save_worktree_state(state)

    log(f"Removed worktree: {worktree_path}")
    return ExecutionResult.ok(data={
        "agent_id": agent_id,
        "worktree_path": worktree_path,
        "removed": True
    })


def cleanup_all_worktrees(force: bool = False) -> ExecutionResult:
    """Remove all agent worktrees."""
    state = load_worktree_state()
    results = []

    for agent_id in list(state.get("worktrees", {}).keys()):
        result = cleanup_worktree(agent_id, force=force)
        results.append({
            "agent_id": agent_id,
            "success": result.success,
            "error": result.error if not result.success else None
        })

    # Prune any stale worktrees
    project_root = get_project_root()
    run_git(["worktree", "prune"], cwd=project_root)

    return ExecutionResult.ok(data={
        "results": results,
        "total": len(results)
    })


def load_worktree_state() -> Dict:
    """Load the worktree state file."""
    try:
        return load_json("swarm/worktree_state.json")
    except FileNotFoundError:
        return {"worktrees": {}, "created_at": timestamp()}


def save_worktree_state(state: Dict):
    """Save the worktree state file."""
    state["updated_at"] = timestamp()
    save_json(state, "swarm/worktree_state.json")


def get_worktree_for_agent(agent_id: str) -> Optional[Dict]:
    """Get worktree info for a specific agent."""
    state = load_worktree_state()
    return state.get("worktrees", {}).get(agent_id)


def main():
    parser = argparse.ArgumentParser(
        description="Git worktree manager for HikeWise agent swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["create", "list", "cleanup", "cleanup-all", "status"],
        help="Action to perform"
    )
    parser.add_argument(
        "--agent-id",
        help="Agent identifier (required for create/cleanup)"
    )
    parser.add_argument(
        "--branch",
        help="Branch name (required for create)"
    )
    parser.add_argument(
        "--base-branch",
        default="main",
        help="Base branch for new branches (default: main)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force cleanup even with uncommitted changes"
    )
    args = parser.parse_args()

    load_env()

    if args.action == "create":
        if not args.agent_id or not args.branch:
            print(ExecutionResult.fail(
                error="--agent-id and --branch required for create"
            ).to_json())
            sys.exit(1)
        result = create_worktree(args.agent_id, args.branch, args.base_branch)

    elif args.action == "list":
        result = list_worktrees()

    elif args.action == "cleanup":
        if not args.agent_id:
            print(ExecutionResult.fail(
                error="--agent-id required for cleanup"
            ).to_json())
            sys.exit(1)
        result = cleanup_worktree(args.agent_id, force=args.force)

    elif args.action == "cleanup-all":
        result = cleanup_all_worktrees(force=args.force)

    elif args.action == "status":
        result = ExecutionResult.ok(data=load_worktree_state())

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
