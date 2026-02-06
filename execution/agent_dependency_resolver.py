#!/usr/bin/env python3
"""
Agent Dependency Resolver for HikeWise Swarm

Resolves dependencies between tasks and determines execution order.
Ensures agents don't work on tasks until their dependencies are complete.

Usage:
    # Build dependency graph from issues
    python execution/agent_dependency_resolver.py \
        --action build \
        --issues .tmp/swarm/kanban.json

    # Get next ready tasks
    python execution/agent_dependency_resolver.py \
        --action ready \
        --max-tasks 3

    # Check for circular dependencies
    python execution/agent_dependency_resolver.py \
        --action validate
"""

import argparse
import json
import sys
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


class DependencyGraph:
    """
    Directed acyclic graph for task dependencies.

    Supports:
    - Adding tasks with dependencies
    - Topological sorting
    - Finding ready tasks (no unmet dependencies)
    - Cycle detection
    """

    def __init__(self):
        self.tasks: Dict[str, Dict] = {}  # task_id -> task data
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)  # task -> depends on
        self.dependents: Dict[str, Set[str]] = defaultdict(set)  # task -> depended on by
        self.completed: Set[str] = set()
        self.in_progress: Set[str] = set()

    def add_task(self, task_id: str, task_data: Dict, depends_on: List[str] = None):
        """Add a task to the graph with its dependencies."""
        self.tasks[task_id] = task_data

        if depends_on:
            for dep in depends_on:
                self.dependencies[task_id].add(dep)
                self.dependents[dep].add(task_id)

    def mark_completed(self, task_id: str):
        """Mark a task as completed."""
        self.completed.add(task_id)
        self.in_progress.discard(task_id)

    def mark_in_progress(self, task_id: str):
        """Mark a task as in progress."""
        self.in_progress.add(task_id)

    def get_ready_tasks(self, max_tasks: int = None) -> List[str]:
        """
        Get tasks that are ready to be worked on.
        A task is ready if all its dependencies are completed.
        """
        ready = []

        for task_id in self.tasks:
            if task_id in self.completed or task_id in self.in_progress:
                continue

            # Check if all dependencies are met
            deps = self.dependencies.get(task_id, set())
            if deps.issubset(self.completed):
                ready.append(task_id)

        # Sort by priority (higher priority first)
        ready.sort(key=lambda t: self._get_priority_score(t), reverse=True)

        if max_tasks:
            ready = ready[:max_tasks]

        return ready

    def _get_priority_score(self, task_id: str) -> int:
        """Get numeric priority score for sorting."""
        task = self.tasks.get(task_id, {})
        priority = task.get("priority", "low")

        priority_map = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        return priority_map.get(priority, 0)

    def get_blocked_tasks(self) -> Dict[str, List[str]]:
        """Get tasks that are blocked and what they're waiting for."""
        blocked = {}

        for task_id in self.tasks:
            if task_id in self.completed or task_id in self.in_progress:
                continue

            deps = self.dependencies.get(task_id, set())
            unmet = deps - self.completed

            if unmet:
                blocked[task_id] = list(unmet)

        return blocked

    def detect_cycles(self) -> List[List[str]]:
        """Detect circular dependencies using DFS."""
        cycles = []
        visited = set()
        rec_stack = set()
        path = []

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in self.dependencies.get(node, set()):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    # Found cycle
                    cycle_start = path.index(neighbor)
                    cycles.append(path[cycle_start:] + [neighbor])
                    return True

            path.pop()
            rec_stack.remove(node)
            return False

        for task_id in self.tasks:
            if task_id not in visited:
                dfs(task_id)

        return cycles

    def topological_sort(self) -> Optional[List[str]]:
        """
        Return tasks in topological order (dependencies first).
        Returns None if there are cycles.
        """
        if self.detect_cycles():
            return None

        in_degree = {task: 0 for task in self.tasks}
        for task_id in self.tasks:
            for dep in self.dependencies.get(task_id, set()):
                if dep in in_degree:
                    in_degree[task_id] += 1

        queue = deque([t for t, d in in_degree.items() if d == 0])
        result = []

        while queue:
            task = queue.popleft()
            result.append(task)

            for dependent in self.dependents.get(task, set()):
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)

        return result if len(result) == len(self.tasks) else None

    def to_dict(self) -> Dict:
        """Serialize graph to dictionary."""
        return {
            "tasks": self.tasks,
            "dependencies": {k: list(v) for k, v in self.dependencies.items()},
            "completed": list(self.completed),
            "in_progress": list(self.in_progress),
            "updated_at": timestamp()
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "DependencyGraph":
        """Deserialize graph from dictionary."""
        graph = cls()
        graph.tasks = data.get("tasks", {})
        graph.dependencies = defaultdict(set, {
            k: set(v) for k, v in data.get("dependencies", {}).items()
        })
        graph.completed = set(data.get("completed", []))
        graph.in_progress = set(data.get("in_progress", []))

        # Rebuild dependents
        for task_id, deps in graph.dependencies.items():
            for dep in deps:
                graph.dependents[dep].add(task_id)

        return graph


def infer_dependencies(issues: List[Dict]) -> Dict[str, List[str]]:
    """
    Infer dependencies between issues based on:
    - Explicit depends_on field
    - Category relationships (navigation before UI polish)
    - File overlap (same files = serial execution)
    """
    dependencies = {}

    # Category priority order (lower depends on higher)
    category_order = {
        "navigation": 1,
        "data-sync": 2,
        "settings": 3,
        "ui": 4,
        "animation": 5
    }

    # Build file ownership map
    file_to_issues = defaultdict(list)
    for issue in issues:
        issue_id = issue.get("id")
        for file in issue.get("affected_files", []):
            file_to_issues[file].append(issue_id)

    for issue in issues:
        issue_id = issue.get("id")
        deps = list(issue.get("depends_on", []))

        # Infer from category relationships
        issue_category = issue.get("category", "")
        issue_order = category_order.get(issue_category, 99)

        for other in issues:
            if other.get("id") == issue_id:
                continue

            other_category = other.get("category", "")
            other_order = category_order.get(other_category, 99)

            # Higher priority categories should complete first
            if other_order < issue_order and other.get("priority") == "high":
                if other.get("id") not in deps:
                    deps.append(other.get("id"))

        # File overlap creates implicit dependencies for critical issues
        issue_files = set(issue.get("affected_files", []))
        for other in issues:
            if other.get("id") == issue_id:
                continue

            other_files = set(other.get("affected_files", []))
            overlap = issue_files & other_files

            # If same files and other is higher priority, depend on it
            if overlap and other.get("priority") in ["critical", "high"]:
                if issue.get("priority") not in ["critical", "high"]:
                    if other.get("id") not in deps:
                        deps.append(other.get("id"))

        dependencies[issue_id] = deps

    return dependencies


def build_graph_from_kanban(kanban_path: str) -> ExecutionResult:
    """Build dependency graph from kanban.json."""
    try:
        with open(kanban_path, "r") as f:
            kanban = json.load(f)
    except FileNotFoundError:
        return ExecutionResult.fail(error=f"Kanban file not found: {kanban_path}")
    except json.JSONDecodeError as e:
        return ExecutionResult.fail(error=f"Invalid JSON: {e}")

    graph = DependencyGraph()

    # Get all issues from kanban columns
    all_issues = []
    columns = kanban.get("columns", {})

    for column_name, issues in columns.items():
        for issue in issues:
            issue["_column"] = column_name
            all_issues.append(issue)

    # Infer dependencies
    deps = infer_dependencies(all_issues)

    # Add to graph
    for issue in all_issues:
        issue_id = issue.get("id")
        graph.add_task(issue_id, issue, deps.get(issue_id, []))

        # Mark completed issues
        if issue.get("_column") == "done":
            graph.mark_completed(issue_id)
        elif issue.get("_column") == "in_progress":
            graph.mark_in_progress(issue_id)

    # Validate
    cycles = graph.detect_cycles()
    if cycles:
        log(f"Warning: Circular dependencies detected: {cycles}", level="warning")

    # Save graph
    save_json(graph.to_dict(), "swarm/dependency_graph.json")

    return ExecutionResult.ok(data={
        "total_tasks": len(graph.tasks),
        "completed": len(graph.completed),
        "in_progress": len(graph.in_progress),
        "ready": len(graph.get_ready_tasks()),
        "cycles": cycles
    })


def get_ready_tasks(max_tasks: int = 3) -> ExecutionResult:
    """Get tasks ready for execution."""
    try:
        data = load_json("swarm/dependency_graph.json")
        graph = DependencyGraph.from_dict(data)
    except FileNotFoundError:
        return ExecutionResult.fail(error="Dependency graph not found. Run --action build first.")

    ready = graph.get_ready_tasks(max_tasks)
    tasks = [graph.tasks[t] for t in ready]

    return ExecutionResult.ok(data={
        "ready_tasks": tasks,
        "count": len(tasks),
        "blocked": graph.get_blocked_tasks()
    })


def mark_task_status(task_id: str, status: str) -> ExecutionResult:
    """Update task status in the dependency graph."""
    try:
        data = load_json("swarm/dependency_graph.json")
        graph = DependencyGraph.from_dict(data)
    except FileNotFoundError:
        return ExecutionResult.fail(error="Dependency graph not found.")

    if task_id not in graph.tasks:
        return ExecutionResult.fail(error=f"Task not found: {task_id}")

    if status == "completed":
        graph.mark_completed(task_id)
    elif status == "in_progress":
        graph.mark_in_progress(task_id)
    else:
        return ExecutionResult.fail(error=f"Invalid status: {status}")

    save_json(graph.to_dict(), "swarm/dependency_graph.json")

    return ExecutionResult.ok(data={
        "task_id": task_id,
        "status": status,
        "newly_ready": graph.get_ready_tasks()
    })


def validate_graph() -> ExecutionResult:
    """Validate the dependency graph for issues."""
    try:
        data = load_json("swarm/dependency_graph.json")
        graph = DependencyGraph.from_dict(data)
    except FileNotFoundError:
        return ExecutionResult.fail(error="Dependency graph not found.")

    issues = []

    # Check for cycles
    cycles = graph.detect_cycles()
    if cycles:
        issues.append({
            "type": "circular_dependency",
            "details": cycles
        })

    # Check for missing dependencies
    for task_id, deps in graph.dependencies.items():
        for dep in deps:
            if dep not in graph.tasks:
                issues.append({
                    "type": "missing_dependency",
                    "task": task_id,
                    "missing": dep
                })

    # Check for orphaned tasks (no path to completion)
    topo = graph.topological_sort()
    if topo is None and not cycles:
        issues.append({
            "type": "invalid_graph",
            "details": "Could not perform topological sort"
        })

    return ExecutionResult.ok(data={
        "valid": len(issues) == 0,
        "issues": issues,
        "task_count": len(graph.tasks),
        "execution_order": topo
    })


def main():
    parser = argparse.ArgumentParser(
        description="Dependency resolver for HikeWise agent swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["build", "ready", "validate", "mark"],
        help="Action to perform"
    )
    parser.add_argument(
        "--issues",
        help="Path to kanban.json (for build action)"
    )
    parser.add_argument(
        "--max-tasks",
        type=int,
        default=3,
        help="Maximum tasks to return (for ready action)"
    )
    parser.add_argument(
        "--task-id",
        help="Task ID (for mark action)"
    )
    parser.add_argument(
        "--status",
        choices=["in_progress", "completed"],
        help="New status (for mark action)"
    )
    args = parser.parse_args()

    load_env()

    if args.action == "build":
        if not args.issues:
            issues_path = get_tmp_path("swarm/kanban.json")
        else:
            issues_path = args.issues
        result = build_graph_from_kanban(issues_path)

    elif args.action == "ready":
        result = get_ready_tasks(args.max_tasks)

    elif args.action == "validate":
        result = validate_graph()

    elif args.action == "mark":
        if not args.task_id or not args.status:
            print(ExecutionResult.fail(
                error="--task-id and --status required for mark action"
            ).to_json())
            sys.exit(1)
        result = mark_task_status(args.task_id, args.status)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
