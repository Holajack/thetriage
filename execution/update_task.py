#!/usr/bin/env python3
"""
Task Status Update Script

Usage:
    # Update task status
    python update_task.py QZ-001 in_progress
    python update_task.py QZ-001 completed

    # Mark a test as passed/failed
    python update_task.py QZ-001 --test "Quiz completes without error" --passed
    python update_task.py QZ-001 --test "Quiz completes without error" --failed

    # Assign a session to a task
    python update_task.py QZ-001 --assign session-1

    # View task details
    python update_task.py QZ-001 --view

    # List all tasks with status
    python update_task.py --list

    # Sync JSON to Markdown
    python update_task.py --sync
"""

import json
import argparse
from datetime import datetime
from pathlib import Path


def load_tasks(filepath: str = "task_status.json") -> dict:
    """Load tasks from JSON file."""
    with open(filepath, "r") as f:
        return json.load(f)


def save_tasks(data: dict, filepath: str = "task_status.json"):
    """Save tasks to JSON file."""
    data["lastUpdated"] = datetime.now().isoformat() + "Z"
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    print(f"✅ Saved to {filepath}")


def update_summary(data: dict):
    """Recalculate summary counts."""
    status_counts = {
        "pending": 0,
        "inProgress": 0,
        "blocked": 0,
        "review": 0,
        "completed": 0,
    }
    status_map = {
        "pending": "pending",
        "in_progress": "inProgress",
        "blocked": "blocked",
        "review": "review",
        "completed": "completed",
    }
    for task in data["tasks"]:
        key = status_map.get(task["status"], "pending")
        status_counts[key] += 1
    data["summary"] = {
        "total": len(data["tasks"]),
        **status_counts,
    }


def find_task(data: dict, task_id: str) -> dict | None:
    """Find a task by ID."""
    for task in data["tasks"]:
        if task["id"] == task_id:
            return task
    return None


def update_status(data: dict, task_id: str, new_status: str):
    """Update a task's status."""
    valid_statuses = ["pending", "in_progress", "blocked", "review", "completed"]
    if new_status not in valid_statuses:
        print(f"❌ Invalid status: {new_status}")
        print(f"   Valid statuses: {', '.join(valid_statuses)}")
        return False

    task = find_task(data, task_id)
    if not task:
        print(f"❌ Task not found: {task_id}")
        return False

    old_status = task["status"]
    task["status"] = new_status
    task["updatedAt"] = datetime.now().isoformat() + "Z"
    update_summary(data)
    print(f"✅ {task_id}: {old_status} → {new_status}")
    return True


def update_test(data: dict, task_id: str, test_name: str, passed: bool):
    """Update a test's pass/fail status."""
    task = find_task(data, task_id)
    if not task:
        print(f"❌ Task not found: {task_id}")
        return False

    for test in task["tests"]:
        if test["name"] == test_name:
            test["passed"] = passed
            task["updatedAt"] = datetime.now().isoformat() + "Z"
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{status}: {task_id} - {test_name}")
            return True

    print(f"❌ Test not found: '{test_name}'")
    print(f"   Available tests for {task_id}:")
    for test in task["tests"]:
        print(f"   - {test['name']}")
    return False


def assign_session(data: dict, task_id: str, session_id: str):
    """Assign a session to a task."""
    task = find_task(data, task_id)
    if not task:
        print(f"❌ Task not found: {task_id}")
        return False

    task["assignedSession"] = session_id
    task["updatedAt"] = datetime.now().isoformat() + "Z"
    print(f"✅ {task_id} assigned to {session_id}")
    return True


def view_task(data: dict, task_id: str):
    """Display detailed task information."""
    task = find_task(data, task_id)
    if not task:
        print(f"❌ Task not found: {task_id}")
        return

    print(f"\n{'='*60}")
    print(f"Task: {task['id']} - {task['title']}")
    print(f"{'='*60}")
    print(f"Status:      {task['status']}")
    print(f"Priority:    {task['priority']}")
    print(f"Branch:      {task['branch']}")
    print(f"Session:     {task['assignedSession'] or 'Unassigned'}")
    print(f"Files:       {', '.join(task['files'])}")
    if task["lines"]:
        print(f"Lines:       {', '.join(map(str, task['lines']))}")
    print(f"\nDescription: {task['description']}")
    print(f"\nFix:         {task['fix']}")
    print(f"\nDependencies: {', '.join(task['dependencies']) or 'None'}")
    print(f"\nTests:")
    for test in task["tests"]:
        status = "✅" if test["passed"] else "❌"
        print(f"  {status} {test['name']}")
    print(f"\nUpdated: {task['updatedAt']}")


def list_tasks(data: dict):
    """List all tasks with their status."""
    print(f"\n{'='*80}")
    print(f"Task Status Overview - {data['summary']['completed']}/{data['summary']['total']} Complete")
    print(f"{'='*80}")
    print(f"{'ID':<10} {'Status':<12} {'Tests':<8} {'Title':<45}")
    print(f"{'-'*10} {'-'*12} {'-'*8} {'-'*45}")
    for task in data["tasks"]:
        passed = sum(1 for t in task["tests"] if t["passed"])
        total = len(task["tests"])
        tests_str = f"{passed}/{total}"
        title = task["title"][:42] + "..." if len(task["title"]) > 45 else task["title"]
        print(f"{task['id']:<10} {task['status']:<12} {tests_str:<8} {title}")


def sync_markdown(data: dict, md_path: str = "TASK_TRACKER.md"):
    """Update the markdown file with current JSON status."""
    # This is a simplified sync - in production, you'd parse and update the MD properly
    summary = data["summary"]
    print(f"\n📊 Status Summary:")
    print(f"   Total:       {summary['total']}")
    print(f"   Pending:     {summary['pending']}")
    print(f"   In Progress: {summary['inProgress']}")
    print(f"   Blocked:     {summary['blocked']}")
    print(f"   Review:      {summary['review']}")
    print(f"   Completed:   {summary['completed']}")

    # For now, just print a notice - a full implementation would update the MD file
    print(f"\n💡 To fully sync, manually update {md_path} or implement MD parsing")


def main():
    parser = argparse.ArgumentParser(description="Update task status")
    parser.add_argument("task_id", nargs="?", help="Task ID (e.g., QZ-001)")
    parser.add_argument("status", nargs="?", help="New status")
    parser.add_argument("--test", help="Test name to update")
    parser.add_argument("--passed", action="store_true", help="Mark test as passed")
    parser.add_argument("--failed", action="store_true", help="Mark test as failed")
    parser.add_argument("--assign", help="Assign task to a session")
    parser.add_argument("--view", action="store_true", help="View task details")
    parser.add_argument("--list", action="store_true", help="List all tasks")
    parser.add_argument("--sync", action="store_true", help="Sync JSON to Markdown")
    parser.add_argument("--file", default="task_status.json", help="JSON file path")

    args = parser.parse_args()

    # Handle path relative to script location or current directory
    json_path = Path(args.file)
    if not json_path.exists():
        # Try looking in parent directory
        json_path = Path(__file__).parent.parent / args.file
    if not json_path.exists():
        print(f"❌ Task file not found: {args.file}")
        return

    data = load_tasks(str(json_path))

    if args.list:
        list_tasks(data)
        return

    if args.sync:
        sync_markdown(data)
        return

    if not args.task_id:
        parser.print_help()
        return

    if args.view:
        view_task(data, args.task_id)
        return

    if args.test:
        if args.passed:
            update_test(data, args.task_id, args.test, True)
            save_tasks(data, str(json_path))
        elif args.failed:
            update_test(data, args.task_id, args.test, False)
            save_tasks(data, str(json_path))
        else:
            print("❌ Specify --passed or --failed with --test")
        return

    if args.assign:
        assign_session(data, args.task_id, args.assign)
        save_tasks(data, str(json_path))
        return

    if args.status:
        update_status(data, args.task_id, args.status)
        save_tasks(data, str(json_path))
        return

    # Default: view the task
    view_task(data, args.task_id)


if __name__ == "__main__":
    main()
