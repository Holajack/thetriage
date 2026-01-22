#!/usr/bin/env python3
"""
Todo processor for the auto-dev agent system.

Parses todos from generate_todos.py output, prioritizes them,
detects dependencies, and creates a work queue for parallel processing.

Usage:
    # Create work queue from todos
    python execution/todo_processor.py \
        --todos .tmp/todos/video_20240115.json \
        --priority-filter 3 \
        --categories feature,enhancement

    # Get next available todo
    python execution/todo_processor.py \
        --action next

    # Mark todo as in-progress
    python execution/todo_processor.py \
        --action claim \
        --todo-id todo_001

    # Mark todo as complete
    python execution/todo_processor.py \
        --action complete \
        --todo-id todo_001
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import List, Optional, Dict, Set
from dataclasses import dataclass, field
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


@dataclass
class Todo:
    """Structured todo item."""
    id: str
    title: str
    priority: int
    category: str
    description: str
    acceptance_criteria: List[str]
    related_files: List[str] = field(default_factory=list)
    timestamp: str = ""
    status: str = "pending"  # pending, in_progress, completed, failed
    depends_on: List[str] = field(default_factory=list)
    claimed_by: Optional[str] = None
    claimed_at: Optional[str] = None
    completed_at: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> "Todo":
        return cls(
            id=data.get("id", f"todo_{hash(data.get('title', '')) % 10000:04d}"),
            title=data.get("title", "Untitled"),
            priority=data.get("priority", 3),
            category=data.get("category", "feature"),
            description=data.get("description", ""),
            acceptance_criteria=data.get("acceptance_criteria", []),
            related_files=data.get("related_files", []),
            timestamp=data.get("timestamp", ""),
            status=data.get("status", "pending"),
            depends_on=data.get("depends_on", []),
            claimed_by=data.get("claimed_by"),
            claimed_at=data.get("claimed_at"),
            completed_at=data.get("completed_at")
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "priority": self.priority,
            "category": self.category,
            "description": self.description,
            "acceptance_criteria": self.acceptance_criteria,
            "related_files": self.related_files,
            "timestamp": self.timestamp,
            "status": self.status,
            "depends_on": self.depends_on,
            "claimed_by": self.claimed_by,
            "claimed_at": self.claimed_at,
            "completed_at": self.completed_at
        }


def detect_file_conflicts(todos: List[Todo]) -> Dict[str, List[str]]:
    """
    Detect which todos might conflict by touching the same files.

    Returns a dict mapping todo_id to list of conflicting todo_ids.
    """
    file_to_todos: Dict[str, List[str]] = defaultdict(list)

    for todo in todos:
        for file_path in todo.related_files:
            # Normalize file path
            normalized = file_path.strip().lower()
            file_to_todos[normalized].append(todo.id)

    conflicts: Dict[str, List[str]] = defaultdict(list)
    for file_path, todo_ids in file_to_todos.items():
        if len(todo_ids) > 1:
            for todo_id in todo_ids:
                others = [t for t in todo_ids if t != todo_id]
                conflicts[todo_id].extend(others)

    # Deduplicate
    for todo_id in conflicts:
        conflicts[todo_id] = list(set(conflicts[todo_id]))

    return dict(conflicts)


def detect_dependencies(todos: List[Todo]) -> Dict[str, List[str]]:
    """
    Detect dependencies between todos based on keywords.

    Uses heuristics like:
    - "after X is done"
    - "depends on Y"
    - "requires Z first"
    """
    dependency_patterns = [
        r"after\s+['\"]?([^'\"]+)['\"]?\s+is\s+done",
        r"depends\s+on\s+['\"]?([^'\"]+)['\"]?",
        r"requires\s+['\"]?([^'\"]+)['\"]?\s+first",
        r"once\s+['\"]?([^'\"]+)['\"]?\s+is\s+implemented",
    ]

    # Build a map of title -> id
    title_to_id = {todo.title.lower(): todo.id for todo in todos}

    dependencies: Dict[str, List[str]] = {}

    for todo in todos:
        deps = []
        text = f"{todo.title} {todo.description}".lower()

        for pattern in dependency_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                # Try to find a matching todo
                match_lower = match.lower().strip()
                if match_lower in title_to_id:
                    dep_id = title_to_id[match_lower]
                    if dep_id != todo.id:
                        deps.append(dep_id)

        if deps:
            dependencies[todo.id] = list(set(deps))

    return dependencies


def prioritize_todos(
    todos: List[Todo],
    conflicts: Dict[str, List[str]],
    dependencies: Dict[str, List[str]]
) -> List[Todo]:
    """
    Sort todos by priority, considering conflicts and dependencies.

    Priority rules:
    1. Higher priority number = more important (5 is highest)
    2. Todos with no dependencies come first
    3. Todos with no file conflicts can run in parallel
    """
    # Add detected dependencies to todos
    for todo in todos:
        if todo.id in dependencies:
            todo.depends_on = list(set(todo.depends_on + dependencies[todo.id]))

    # Topological sort considering dependencies
    def can_process(todo: Todo, completed: Set[str]) -> bool:
        return all(dep in completed for dep in todo.depends_on)

    # Sort by priority first (higher = first)
    sorted_todos = sorted(todos, key=lambda t: (-t.priority, t.id))

    # Reorder based on dependencies (simple approach)
    result = []
    remaining = sorted_todos.copy()
    completed: Set[str] = set()

    # Keep iterating until all todos are placed
    max_iterations = len(todos) * 2
    iteration = 0

    while remaining and iteration < max_iterations:
        iteration += 1
        made_progress = False

        for todo in remaining[:]:
            if can_process(todo, completed):
                result.append(todo)
                completed.add(todo.id)
                remaining.remove(todo)
                made_progress = True

        # If no progress, there might be a circular dependency
        if not made_progress and remaining:
            # Just add the highest priority remaining todo
            todo = remaining.pop(0)
            result.append(todo)
            completed.add(todo.id)
            log(f"Warning: Possible circular dependency for {todo.id}", level="warning")

    return result


def create_work_queue(
    todos_path: str,
    priority_filter: int = 1,
    categories: Optional[List[str]] = None,
    max_todos: Optional[int] = None
) -> ExecutionResult:
    """
    Load todos and create a prioritized work queue.

    Args:
        todos_path: Path to the todos JSON file
        priority_filter: Only include todos with priority >= this value
        categories: Only include todos in these categories (None = all)
        max_todos: Maximum number of todos to include

    Returns:
        ExecutionResult with work queue data
    """
    # Load todos
    try:
        with open(todos_path, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        return ExecutionResult.fail(error=f"Todos file not found: {todos_path}")
    except json.JSONDecodeError as e:
        return ExecutionResult.fail(error=f"Invalid JSON in todos file: {e}")

    # Extract todos list
    if isinstance(data, list):
        todos_data = data
    elif isinstance(data, dict) and "todos" in data:
        todos_data = data["todos"]
    else:
        return ExecutionResult.fail(error="Invalid todos format. Expected list or {todos: [...]}.")

    # Parse todos
    todos = [Todo.from_dict(t) for t in todos_data]
    log(f"Loaded {len(todos)} todos from {todos_path}")

    # Filter by priority
    todos = [t for t in todos if t.priority >= priority_filter]
    log(f"After priority filter (>={priority_filter}): {len(todos)} todos")

    # Filter by category
    if categories:
        categories_lower = [c.lower() for c in categories]
        todos = [t for t in todos if t.category.lower() in categories_lower]
        log(f"After category filter ({categories}): {len(todos)} todos")

    # Detect conflicts and dependencies
    conflicts = detect_file_conflicts(todos)
    dependencies = detect_dependencies(todos)

    # Prioritize
    todos = prioritize_todos(todos, conflicts, dependencies)

    # Limit
    if max_todos:
        todos = todos[:max_todos]

    # Create work queue
    work_queue = {
        "created_at": timestamp(),
        "source_file": todos_path,
        "filters": {
            "priority_filter": priority_filter,
            "categories": categories,
            "max_todos": max_todos
        },
        "total_count": len(todos),
        "pending_count": len(todos),
        "in_progress_count": 0,
        "completed_count": 0,
        "failed_count": 0,
        "file_conflicts": conflicts,
        "todos": [t.to_dict() for t in todos]
    }

    # Save work queue
    queue_file = save_json(work_queue, "auto-dev/work_queue.json")

    log(f"Created work queue with {len(todos)} todos")
    return ExecutionResult.ok(
        data=work_queue,
        queue_file=str(queue_file)
    )


def load_work_queue() -> dict:
    """Load the current work queue."""
    return load_json("auto-dev/work_queue.json")


def save_work_queue(queue: dict):
    """Save the work queue."""
    save_json(queue, "auto-dev/work_queue.json")


def get_next_todo(agent_id: Optional[str] = None) -> ExecutionResult:
    """
    Get the next available todo from the queue.

    Args:
        agent_id: Optional ID of the agent claiming the todo

    Returns:
        ExecutionResult with the next todo, or error if none available
    """
    try:
        queue = load_work_queue()
    except FileNotFoundError:
        return ExecutionResult.fail(error="Work queue not found. Run --action create first.")

    todos = queue.get("todos", [])
    completed_ids = {t["id"] for t in todos if t["status"] == "completed"}

    for todo_data in todos:
        if todo_data["status"] != "pending":
            continue

        # Check dependencies
        depends_on = todo_data.get("depends_on", [])
        if all(dep in completed_ids for dep in depends_on):
            return ExecutionResult.ok(data=todo_data)

    return ExecutionResult.fail(
        error="No available todos (all completed, in progress, or blocked by dependencies)"
    )


def claim_todo(todo_id: str, agent_id: str) -> ExecutionResult:
    """
    Claim a todo for processing.

    Args:
        todo_id: ID of the todo to claim
        agent_id: ID of the agent claiming it

    Returns:
        ExecutionResult indicating success or failure
    """
    try:
        queue = load_work_queue()
    except FileNotFoundError:
        return ExecutionResult.fail(error="Work queue not found")

    for todo in queue["todos"]:
        if todo["id"] == todo_id:
            if todo["status"] != "pending":
                return ExecutionResult.fail(
                    error=f"Todo {todo_id} is not pending (status: {todo['status']})"
                )

            todo["status"] = "in_progress"
            todo["claimed_by"] = agent_id
            todo["claimed_at"] = timestamp()

            queue["pending_count"] -= 1
            queue["in_progress_count"] += 1

            save_work_queue(queue)
            log(f"Todo {todo_id} claimed by {agent_id}")
            return ExecutionResult.ok(data=todo)

    return ExecutionResult.fail(error=f"Todo {todo_id} not found")


def complete_todo(todo_id: str, success: bool = True) -> ExecutionResult:
    """
    Mark a todo as completed or failed.

    Args:
        todo_id: ID of the todo
        success: Whether it completed successfully

    Returns:
        ExecutionResult indicating success or failure
    """
    try:
        queue = load_work_queue()
    except FileNotFoundError:
        return ExecutionResult.fail(error="Work queue not found")

    for todo in queue["todos"]:
        if todo["id"] == todo_id:
            if todo["status"] != "in_progress":
                return ExecutionResult.fail(
                    error=f"Todo {todo_id} is not in progress (status: {todo['status']})"
                )

            new_status = "completed" if success else "failed"
            todo["status"] = new_status
            todo["completed_at"] = timestamp()

            queue["in_progress_count"] -= 1
            if success:
                queue["completed_count"] += 1
            else:
                queue["failed_count"] += 1

            save_work_queue(queue)
            log(f"Todo {todo_id} marked as {new_status}")
            return ExecutionResult.ok(data=todo)

    return ExecutionResult.fail(error=f"Todo {todo_id} not found")


def get_queue_status() -> ExecutionResult:
    """Get current status of the work queue."""
    try:
        queue = load_work_queue()
    except FileNotFoundError:
        return ExecutionResult.fail(error="Work queue not found")

    return ExecutionResult.ok(
        data={
            "total": queue.get("total_count", 0),
            "pending": queue.get("pending_count", 0),
            "in_progress": queue.get("in_progress_count", 0),
            "completed": queue.get("completed_count", 0),
            "failed": queue.get("failed_count", 0),
            "progress_percent": (
                queue.get("completed_count", 0) / queue.get("total_count", 1) * 100
            )
        }
    )


def main():
    parser = argparse.ArgumentParser(description="Todo processor for auto-dev agent")
    parser.add_argument(
        "--action",
        default="create",
        choices=["create", "next", "claim", "complete", "fail", "status"],
        help="Action to perform (default: create)"
    )
    parser.add_argument(
        "--todos",
        help="Path to todos JSON file (for create action)"
    )
    parser.add_argument(
        "--priority-filter",
        type=int,
        default=1,
        help="Minimum priority to include (1-5, default: 1)"
    )
    parser.add_argument(
        "--categories",
        help="Comma-separated list of categories to include"
    )
    parser.add_argument(
        "--max-todos",
        type=int,
        help="Maximum number of todos to process"
    )
    parser.add_argument(
        "--todo-id",
        help="Todo ID (for claim/complete/fail actions)"
    )
    parser.add_argument(
        "--agent-id",
        help="Agent ID (for claim action)"
    )
    args = parser.parse_args()

    load_env()

    if args.action == "create":
        if not args.todos:
            print(ExecutionResult.fail(
                error="--todos required for create action"
            ).to_json())
            sys.exit(1)

        categories = args.categories.split(",") if args.categories else None
        result = create_work_queue(
            todos_path=args.todos,
            priority_filter=args.priority_filter,
            categories=categories,
            max_todos=args.max_todos
        )

    elif args.action == "next":
        result = get_next_todo(args.agent_id)

    elif args.action == "claim":
        if not args.todo_id or not args.agent_id:
            print(ExecutionResult.fail(
                error="--todo-id and --agent-id required for claim action"
            ).to_json())
            sys.exit(1)
        result = claim_todo(args.todo_id, args.agent_id)

    elif args.action == "complete":
        if not args.todo_id:
            print(ExecutionResult.fail(
                error="--todo-id required for complete action"
            ).to_json())
            sys.exit(1)
        result = complete_todo(args.todo_id, success=True)

    elif args.action == "fail":
        if not args.todo_id:
            print(ExecutionResult.fail(
                error="--todo-id required for fail action"
            ).to_json())
            sys.exit(1)
        result = complete_todo(args.todo_id, success=False)

    elif args.action == "status":
        result = get_queue_status()

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
