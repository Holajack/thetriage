#!/usr/bin/env python3
"""
Kanban State Manager for HikeWise Swarm

Manages the kanban board state for issue tracking.
Columns: Suggestions -> In Progress -> Done

This is designed with SaaS extraction in mind:
- File-based storage now, database later
- Clean API for state transitions
- Event logging for audit trail

Usage:
    # Initialize kanban board
    python execution/kanban_state_manager.py --action init

    # Add issue to suggestions
    python execution/kanban_state_manager.py \
        --action add \
        --issue '{"id": "issue-001", "title": "Back button bug", "priority": "high"}'

    # Move issue to in_progress
    python execution/kanban_state_manager.py \
        --action move \
        --issue-id issue-001 \
        --to in_progress \
        --agent-id agent-1

    # Get board state
    python execution/kanban_state_manager.py --action get
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


class KanbanStateManager:
    """
    Manages kanban board state with event sourcing.

    State structure:
    {
        "project": "hikewise",
        "columns": {
            "suggestions": [...],
            "in_progress": [...],
            "done": [...]
        },
        "events": [...]
    }
    """

    COLUMNS = ["suggestions", "in_progress", "done"]

    def __init__(self, project: str = "hikewise"):
        self.project = project
        self.state_path = get_tmp_path("swarm/kanban.json")
        self.events_path = get_tmp_path("swarm/kanban_events.json")

    def init_board(self) -> ExecutionResult:
        """Initialize a new kanban board."""
        state = {
            "project": self.project,
            "created_at": timestamp(),
            "updated_at": timestamp(),
            "columns": {
                "suggestions": [],
                "in_progress": [],
                "done": []
            }
        }

        self._save_state(state)
        self._log_event("board_initialized", {"project": self.project})

        return ExecutionResult.ok(data=state)

    def add_issue(self, issue: Dict, column: str = "suggestions") -> ExecutionResult:
        """Add an issue to a column (default: suggestions)."""
        if column not in self.COLUMNS:
            return ExecutionResult.fail(error=f"Invalid column: {column}")

        if "id" not in issue:
            return ExecutionResult.fail(error="Issue must have an 'id' field")

        state = self._load_state()

        # Check for duplicates
        for col_name, col_issues in state["columns"].items():
            for existing in col_issues:
                if existing.get("id") == issue["id"]:
                    return ExecutionResult.fail(
                        error=f"Issue {issue['id']} already exists in {col_name}"
                    )

        # Add metadata
        issue["added_at"] = timestamp()
        issue["added_to"] = column

        state["columns"][column].append(issue)
        state["updated_at"] = timestamp()

        self._save_state(state)
        self._log_event("issue_added", {
            "issue_id": issue["id"],
            "column": column,
            "priority": issue.get("priority")
        })

        return ExecutionResult.ok(data={
            "issue_id": issue["id"],
            "column": column,
            "added": True
        })

    def move_issue(
        self,
        issue_id: str,
        to_column: str,
        agent_id: str = None
    ) -> ExecutionResult:
        """Move an issue between columns."""
        if to_column not in self.COLUMNS:
            return ExecutionResult.fail(error=f"Invalid column: {to_column}")

        state = self._load_state()

        # Find the issue
        issue = None
        from_column = None

        for col_name, col_issues in state["columns"].items():
            for i, existing in enumerate(col_issues):
                if existing.get("id") == issue_id:
                    issue = col_issues.pop(i)
                    from_column = col_name
                    break
            if issue:
                break

        if not issue:
            return ExecutionResult.fail(error=f"Issue not found: {issue_id}")

        if from_column == to_column:
            return ExecutionResult.ok(data={
                "issue_id": issue_id,
                "message": "Already in target column"
            })

        # Update issue metadata
        issue[f"moved_to_{to_column}_at"] = timestamp()
        if agent_id:
            issue["assigned_agent"] = agent_id

        # Add to target column
        state["columns"][to_column].append(issue)
        state["updated_at"] = timestamp()

        self._save_state(state)
        self._log_event("issue_moved", {
            "issue_id": issue_id,
            "from_column": from_column,
            "to_column": to_column,
            "agent_id": agent_id
        })

        return ExecutionResult.ok(data={
            "issue_id": issue_id,
            "from_column": from_column,
            "to_column": to_column,
            "moved": True
        })

    def get_board(self) -> ExecutionResult:
        """Get the current board state."""
        state = self._load_state()

        # Add counts
        summary = {
            "suggestions": len(state["columns"]["suggestions"]),
            "in_progress": len(state["columns"]["in_progress"]),
            "done": len(state["columns"]["done"]),
            "total": sum(len(col) for col in state["columns"].values())
        }

        return ExecutionResult.ok(data={
            **state,
            "summary": summary
        })

    def get_issue(self, issue_id: str) -> ExecutionResult:
        """Get a specific issue by ID."""
        state = self._load_state()

        for col_name, col_issues in state["columns"].items():
            for issue in col_issues:
                if issue.get("id") == issue_id:
                    return ExecutionResult.ok(data={
                        "issue": issue,
                        "column": col_name
                    })

        return ExecutionResult.fail(error=f"Issue not found: {issue_id}")

    def get_column(self, column: str) -> ExecutionResult:
        """Get all issues in a column."""
        if column not in self.COLUMNS:
            return ExecutionResult.fail(error=f"Invalid column: {column}")

        state = self._load_state()
        issues = state["columns"][column]

        return ExecutionResult.ok(data={
            "column": column,
            "issues": issues,
            "count": len(issues)
        })

    def update_issue(self, issue_id: str, updates: Dict) -> ExecutionResult:
        """Update an issue's fields (except id and column)."""
        state = self._load_state()

        for col_name, col_issues in state["columns"].items():
            for i, issue in enumerate(col_issues):
                if issue.get("id") == issue_id:
                    # Don't allow changing id
                    updates.pop("id", None)
                    issue.update(updates)
                    issue["updated_at"] = timestamp()

                    self._save_state(state)
                    self._log_event("issue_updated", {
                        "issue_id": issue_id,
                        "updates": list(updates.keys())
                    })

                    return ExecutionResult.ok(data={
                        "issue_id": issue_id,
                        "updated": True,
                        "issue": issue
                    })

        return ExecutionResult.fail(error=f"Issue not found: {issue_id}")

    def remove_issue(self, issue_id: str) -> ExecutionResult:
        """Remove an issue from the board."""
        state = self._load_state()

        for col_name, col_issues in state["columns"].items():
            for i, issue in enumerate(col_issues):
                if issue.get("id") == issue_id:
                    removed = col_issues.pop(i)
                    state["updated_at"] = timestamp()

                    self._save_state(state)
                    self._log_event("issue_removed", {
                        "issue_id": issue_id,
                        "from_column": col_name
                    })

                    return ExecutionResult.ok(data={
                        "issue_id": issue_id,
                        "removed": True,
                        "from_column": col_name
                    })

        return ExecutionResult.fail(error=f"Issue not found: {issue_id}")

    def import_from_discovery(self, discovery_path: str) -> ExecutionResult:
        """Import classified issues from discovery into suggestions."""
        try:
            with open(discovery_path, "r") as f:
                data = json.load(f)
        except FileNotFoundError:
            return ExecutionResult.fail(error=f"File not found: {discovery_path}")
        except json.JSONDecodeError as e:
            return ExecutionResult.fail(error=f"Invalid JSON: {e}")

        issues = data.get("issues", [])
        if not issues:
            return ExecutionResult.fail(error="No issues found in file")

        added = 0
        skipped = 0

        for issue in issues:
            result = self.add_issue(issue, "suggestions")
            if result.success:
                added += 1
            else:
                skipped += 1

        return ExecutionResult.ok(data={
            "added": added,
            "skipped": skipped,
            "source": discovery_path
        })

    def get_stats(self) -> ExecutionResult:
        """Get board statistics."""
        state = self._load_state()

        # Count by priority
        priority_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for col_issues in state["columns"].values():
            for issue in col_issues:
                priority = issue.get("priority", "low")
                priority_counts[priority] = priority_counts.get(priority, 0) + 1

        # Count by category
        category_counts = {}
        for col_issues in state["columns"].values():
            for issue in col_issues:
                cat = issue.get("category", "uncategorized")
                category_counts[cat] = category_counts.get(cat, 0) + 1

        # Load events for velocity
        try:
            with open(self.events_path, "r") as f:
                events = json.load(f)
        except FileNotFoundError:
            events = []

        completed_today = sum(
            1 for e in events
            if e.get("type") == "issue_moved"
            and e.get("data", {}).get("to_column") == "done"
            and e.get("timestamp", "").startswith(datetime.now().strftime("%Y-%m-%d"))
        )

        return ExecutionResult.ok(data={
            "columns": {
                col: len(state["columns"][col]) for col in self.COLUMNS
            },
            "by_priority": priority_counts,
            "by_category": category_counts,
            "completed_today": completed_today,
            "total_events": len(events)
        })

    def _load_state(self) -> Dict:
        """Load board state from file."""
        try:
            with open(self.state_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            # Auto-initialize
            return {
                "project": self.project,
                "created_at": timestamp(),
                "updated_at": timestamp(),
                "columns": {
                    "suggestions": [],
                    "in_progress": [],
                    "done": []
                }
            }

    def _save_state(self, state: Dict):
        """Save board state to file."""
        os.makedirs(os.path.dirname(self.state_path), exist_ok=True)
        with open(self.state_path, "w") as f:
            json.dump(state, f, indent=2)

    def _log_event(self, event_type: str, data: Dict):
        """Log an event for audit trail."""
        event = {
            "type": event_type,
            "timestamp": timestamp(),
            "data": data
        }

        try:
            with open(self.events_path, "r") as f:
                events = json.load(f)
        except FileNotFoundError:
            events = []

        events.append(event)

        os.makedirs(os.path.dirname(self.events_path), exist_ok=True)
        with open(self.events_path, "w") as f:
            json.dump(events, f, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Kanban state manager for HikeWise swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["init", "add", "move", "get", "column", "update", "remove", "import", "stats"],
        help="Action to perform"
    )
    parser.add_argument("--issue", help="Issue JSON (for add action)")
    parser.add_argument("--issue-id", help="Issue ID (for move/get/update/remove)")
    parser.add_argument("--to", help="Target column (for move)")
    parser.add_argument("--column", help="Column name (for column action)")
    parser.add_argument("--agent-id", help="Agent ID (for move)")
    parser.add_argument("--updates", help="Updates JSON (for update action)")
    parser.add_argument("--from-file", help="File to import from")
    args = parser.parse_args()

    load_env()
    manager = KanbanStateManager()

    if args.action == "init":
        result = manager.init_board()

    elif args.action == "add":
        if not args.issue:
            print(ExecutionResult.fail(error="--issue required").to_json())
            sys.exit(1)
        try:
            issue = json.loads(args.issue)
        except json.JSONDecodeError as e:
            print(ExecutionResult.fail(error=f"Invalid JSON: {e}").to_json())
            sys.exit(1)
        result = manager.add_issue(issue, args.column or "suggestions")

    elif args.action == "move":
        if not args.issue_id or not args.to:
            print(ExecutionResult.fail(error="--issue-id and --to required").to_json())
            sys.exit(1)
        result = manager.move_issue(args.issue_id, args.to, args.agent_id)

    elif args.action == "get":
        if args.issue_id:
            result = manager.get_issue(args.issue_id)
        else:
            result = manager.get_board()

    elif args.action == "column":
        if not args.column:
            print(ExecutionResult.fail(error="--column required").to_json())
            sys.exit(1)
        result = manager.get_column(args.column)

    elif args.action == "update":
        if not args.issue_id or not args.updates:
            print(ExecutionResult.fail(error="--issue-id and --updates required").to_json())
            sys.exit(1)
        try:
            updates = json.loads(args.updates)
        except json.JSONDecodeError as e:
            print(ExecutionResult.fail(error=f"Invalid JSON: {e}").to_json())
            sys.exit(1)
        result = manager.update_issue(args.issue_id, updates)

    elif args.action == "remove":
        if not args.issue_id:
            print(ExecutionResult.fail(error="--issue-id required").to_json())
            sys.exit(1)
        result = manager.remove_issue(args.issue_id)

    elif args.action == "import":
        if not args.from_file:
            print(ExecutionResult.fail(error="--from-file required").to_json())
            sys.exit(1)
        result = manager.import_from_discovery(args.from_file)

    elif args.action == "stats":
        result = manager.get_stats()

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
