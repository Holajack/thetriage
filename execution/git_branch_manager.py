#!/usr/bin/env python3
"""
Manages git branches for the auto-dev agent system.

Handles creating feature branches, committing, pushing, and merging.
Each todo gets its own isolated branch for parallel development.

Usage:
    # Initialize git state
    python execution/git_branch_manager.py --action init --project /path/to/project

    # Create feature branch
    python execution/git_branch_manager.py \
        --action create \
        --project /path/to/project \
        --todo-id todo_001 \
        --title "add-dark-mode"

    # Commit changes
    python execution/git_branch_manager.py \
        --action commit \
        --project /path/to/project \
        --message "feat: add dark mode toggle"

    # Push to remote
    python execution/git_branch_manager.py \
        --action push \
        --project /path/to/project

    # Merge to main
    python execution/git_branch_manager.py \
        --action merge \
        --project /path/to/project \
        --branch feat/todo-001-add-dark-mode
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional, List

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, timestamp


def run_git(args: List[str], cwd: str, capture: bool = True) -> tuple:
    """
    Run a git command and return (success, stdout, stderr).
    """
    cmd = ["git"] + args
    log(f"Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=capture,
            text=True,
            timeout=60
        )
        return (
            result.returncode == 0,
            result.stdout.strip() if capture else "",
            result.stderr.strip() if capture else ""
        )
    except subprocess.TimeoutExpired:
        return (False, "", "Git command timed out")
    except Exception as e:
        return (False, "", str(e))


def slugify(text: str, max_length: int = 30) -> str:
    """Convert text to a git branch-friendly slug."""
    # Convert to lowercase
    slug = text.lower()
    # Replace spaces and special chars with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Truncate to max length
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip('-')
    return slug


def init_git_state(project_path: str) -> ExecutionResult:
    """
    Initialize git state for the auto-dev session.

    - Checks if it's a git repo
    - Gets current branch
    - Stashes any uncommitted changes
    - Returns to main/master branch
    """
    log("Initializing git state...")

    # Check if it's a git repo
    success, _, _ = run_git(["status"], project_path)
    if not success:
        return ExecutionResult.fail(
            error=f"Not a git repository: {project_path}"
        )

    # Get current branch
    success, current_branch, _ = run_git(["rev-parse", "--abbrev-ref", "HEAD"], project_path)
    if not success:
        return ExecutionResult.fail(error="Could not determine current branch")

    # Check for uncommitted changes
    success, status, _ = run_git(["status", "--porcelain"], project_path)
    has_changes = bool(status)

    stash_name = None
    if has_changes:
        # Stash changes
        stash_name = f"auto-dev-{timestamp()}"
        success, _, err = run_git(["stash", "push", "-m", stash_name], project_path)
        if not success:
            return ExecutionResult.fail(error=f"Failed to stash changes: {err}")
        log(f"Stashed uncommitted changes: {stash_name}")

    # Determine main branch name
    success, branches, _ = run_git(["branch", "-l", "main", "master"], project_path)
    if "main" in branches:
        main_branch = "main"
    elif "master" in branches:
        main_branch = "master"
    else:
        main_branch = current_branch  # Use current if no main/master

    # Checkout main branch
    if current_branch != main_branch:
        success, _, err = run_git(["checkout", main_branch], project_path)
        if not success:
            return ExecutionResult.fail(error=f"Failed to checkout {main_branch}: {err}")

    # Pull latest
    success, _, _ = run_git(["pull", "--rebase"], project_path)
    # Don't fail if pull fails (might be offline)

    # Save state
    state = {
        "initialized_at": timestamp(),
        "project_path": project_path,
        "main_branch": main_branch,
        "original_branch": current_branch,
        "stash_name": stash_name,
        "active_branches": []
    }
    state_file = save_json(state, "auto-dev/git_state.json")

    log(f"Git state initialized. Main branch: {main_branch}")
    return ExecutionResult.ok(data=state, state_file=str(state_file))


def create_branch(
    project_path: str,
    todo_id: str,
    title: str
) -> ExecutionResult:
    """
    Create a new feature branch for a todo item.

    Branch naming: feat/todo-{id}-{slugified-title}
    """
    slug = slugify(title)
    branch_name = f"feat/{todo_id}-{slug}"

    log(f"Creating branch: {branch_name}")

    # Load state
    try:
        state_path = get_tmp_path("auto-dev/git_state.json")
        with open(state_path, "r") as f:
            state = json.load(f)
    except FileNotFoundError:
        return ExecutionResult.fail(
            error="Git state not initialized. Run --action init first."
        )

    # Make sure we're on main branch
    main_branch = state.get("main_branch", "main")
    success, current, _ = run_git(["rev-parse", "--abbrev-ref", "HEAD"], project_path)
    if current != main_branch:
        run_git(["checkout", main_branch], project_path)

    # Create and checkout new branch
    success, _, err = run_git(["checkout", "-b", branch_name], project_path)
    if not success:
        # Branch might already exist
        if "already exists" in err:
            success, _, err = run_git(["checkout", branch_name], project_path)
            if not success:
                return ExecutionResult.fail(error=f"Failed to checkout branch: {err}")
            log(f"Branch {branch_name} already exists, checked out")
        else:
            return ExecutionResult.fail(error=f"Failed to create branch: {err}")

    # Update state
    if branch_name not in state["active_branches"]:
        state["active_branches"].append(branch_name)
        save_json(state, "auto-dev/git_state.json")

    log(f"On branch: {branch_name}")
    return ExecutionResult.ok(
        data={
            "branch": branch_name,
            "todo_id": todo_id,
            "title": title
        }
    )


def commit_changes(
    project_path: str,
    message: str,
    add_all: bool = True
) -> ExecutionResult:
    """
    Commit current changes with the given message.
    """
    log(f"Committing changes: {message}")

    if add_all:
        success, _, err = run_git(["add", "-A"], project_path)
        if not success:
            return ExecutionResult.fail(error=f"Failed to stage changes: {err}")

    # Check if there are changes to commit
    success, status, _ = run_git(["status", "--porcelain"], project_path)
    if not status:
        log("No changes to commit")
        return ExecutionResult.ok(data={"committed": False, "message": "No changes to commit"})

    # Commit
    success, _, err = run_git(["commit", "-m", message], project_path)
    if not success:
        return ExecutionResult.fail(error=f"Failed to commit: {err}")

    # Get commit hash
    success, commit_hash, _ = run_git(["rev-parse", "HEAD"], project_path)

    log(f"Committed: {commit_hash[:8]}")
    return ExecutionResult.ok(
        data={
            "committed": True,
            "hash": commit_hash,
            "message": message
        }
    )


def push_branch(
    project_path: str,
    branch: Optional[str] = None,
    set_upstream: bool = True
) -> ExecutionResult:
    """
    Push the current or specified branch to remote.
    """
    if not branch:
        success, branch, _ = run_git(["rev-parse", "--abbrev-ref", "HEAD"], project_path)
        if not success:
            return ExecutionResult.fail(error="Could not determine current branch")

    log(f"Pushing branch: {branch}")

    args = ["push"]
    if set_upstream:
        args.extend(["-u", "origin", branch])

    success, _, err = run_git(args, project_path)
    if not success:
        return ExecutionResult.fail(error=f"Failed to push: {err}")

    log(f"Pushed: {branch}")
    return ExecutionResult.ok(data={"branch": branch, "pushed": True})


def merge_branch(
    project_path: str,
    branch: str,
    delete_after: bool = True
) -> ExecutionResult:
    """
    Merge a feature branch back to main.
    """
    log(f"Merging branch: {branch}")

    # Load state
    try:
        state_path = get_tmp_path("auto-dev/git_state.json")
        with open(state_path, "r") as f:
            state = json.load(f)
    except FileNotFoundError:
        return ExecutionResult.fail(error="Git state not initialized")

    main_branch = state.get("main_branch", "main")

    # Checkout main
    success, _, err = run_git(["checkout", main_branch], project_path)
    if not success:
        return ExecutionResult.fail(error=f"Failed to checkout {main_branch}: {err}")

    # Merge
    success, _, err = run_git(["merge", branch, "--no-ff", "-m", f"Merge {branch}"], project_path)
    if not success:
        # Abort the merge
        run_git(["merge", "--abort"], project_path)
        return ExecutionResult.fail(error=f"Merge conflict: {err}")

    # Delete branch if requested
    if delete_after:
        run_git(["branch", "-d", branch], project_path)
        # Update state
        if branch in state["active_branches"]:
            state["active_branches"].remove(branch)
            save_json(state, "auto-dev/git_state.json")

    log(f"Merged {branch} into {main_branch}")
    return ExecutionResult.ok(
        data={
            "merged": True,
            "branch": branch,
            "into": main_branch,
            "deleted": delete_after
        }
    )


def get_branch_status(project_path: str) -> ExecutionResult:
    """
    Get current git status and branch information.
    """
    success, branch, _ = run_git(["rev-parse", "--abbrev-ref", "HEAD"], project_path)
    if not success:
        return ExecutionResult.fail(error="Not a git repository")

    success, status, _ = run_git(["status", "--porcelain"], project_path)
    success, log_output, _ = run_git(["log", "-5", "--oneline"], project_path)

    return ExecutionResult.ok(
        data={
            "branch": branch,
            "has_changes": bool(status),
            "changes": status.split("\n") if status else [],
            "recent_commits": log_output.split("\n") if log_output else []
        }
    )


def cleanup(project_path: str) -> ExecutionResult:
    """
    Cleanup git state, restore original branch, pop stash if needed.
    """
    try:
        state_path = get_tmp_path("auto-dev/git_state.json")
        with open(state_path, "r") as f:
            state = json.load(f)
    except FileNotFoundError:
        return ExecutionResult.fail(error="No git state to cleanup")

    main_branch = state.get("main_branch", "main")
    original_branch = state.get("original_branch")
    stash_name = state.get("stash_name")

    # Checkout original branch
    if original_branch:
        run_git(["checkout", original_branch], project_path)
    else:
        run_git(["checkout", main_branch], project_path)

    # Pop stash if we stashed anything
    if stash_name:
        success, stash_list, _ = run_git(["stash", "list"], project_path)
        if stash_name in stash_list:
            run_git(["stash", "pop"], project_path)
            log(f"Restored stashed changes: {stash_name}")

    log("Git state cleaned up")
    return ExecutionResult.ok(data={"cleaned": True})


def main():
    parser = argparse.ArgumentParser(description="Git branch manager for auto-dev agent")
    parser.add_argument(
        "--action",
        required=True,
        choices=["init", "create", "commit", "push", "merge", "status", "cleanup"],
        help="Action to perform"
    )
    parser.add_argument(
        "--project",
        required=True,
        help="Path to the project directory"
    )
    parser.add_argument(
        "--todo-id",
        help="Todo ID (for create action)"
    )
    parser.add_argument(
        "--title",
        help="Branch title (for create action)"
    )
    parser.add_argument(
        "--message",
        help="Commit message (for commit action)"
    )
    parser.add_argument(
        "--branch",
        help="Branch name (for merge/push actions)"
    )
    parser.add_argument(
        "--no-delete",
        action="store_true",
        help="Don't delete branch after merge"
    )
    args = parser.parse_args()

    load_env()
    project_path = str(Path(args.project).resolve())

    if args.action == "init":
        result = init_git_state(project_path)

    elif args.action == "create":
        if not args.todo_id or not args.title:
            print(ExecutionResult.fail(
                error="--todo-id and --title required for create action"
            ).to_json())
            sys.exit(1)
        result = create_branch(project_path, args.todo_id, args.title)

    elif args.action == "commit":
        if not args.message:
            print(ExecutionResult.fail(
                error="--message required for commit action"
            ).to_json())
            sys.exit(1)
        result = commit_changes(project_path, args.message)

    elif args.action == "push":
        result = push_branch(project_path, args.branch)

    elif args.action == "merge":
        if not args.branch:
            print(ExecutionResult.fail(
                error="--branch required for merge action"
            ).to_json())
            sys.exit(1)
        result = merge_branch(project_path, args.branch, delete_after=not args.no_delete)

    elif args.action == "status":
        result = get_branch_status(project_path)

    elif args.action == "cleanup":
        result = cleanup(project_path)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
