#!/usr/bin/env python3
"""
Spawns Claude CLI agents for implementing specific todos.

This script creates a Claude CLI session with a detailed prompt
based on the todo item, runs it in the background, and captures output.

Usage:
    python execution/spawn_claude_agent.py \
        --todo-json '{"id": "todo_001", ...}' \
        --project-path /path/to/project \
        --test-url http://localhost:3001 \
        --session-id agent_001
"""

import argparse
import json
import os
import subprocess
import sys
import signal
import time
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

# Add execution directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, timestamp


@dataclass
class TodoItem:
    """Structured todo item from generate_todos.py output."""
    id: str
    title: str
    priority: int
    category: str
    description: str
    acceptance_criteria: list
    related_files: list = None
    timestamp: str = None

    @classmethod
    def from_dict(cls, data: dict) -> "TodoItem":
        return cls(
            id=data.get("id", "unknown"),
            title=data.get("title", "Untitled"),
            priority=data.get("priority", 3),
            category=data.get("category", "feature"),
            description=data.get("description", ""),
            acceptance_criteria=data.get("acceptance_criteria", []),
            related_files=data.get("related_files", []),
            timestamp=data.get("timestamp", "")
        )


def build_agent_prompt(
    todo: TodoItem,
    project_path: str,
    test_url: str,
    app_context: str = ""
) -> str:
    """
    Build a detailed prompt for the Claude CLI agent.

    The prompt guides Claude to implement the feature properly,
    following existing patterns and testing the result.
    """
    acceptance_items = "\n".join(
        f"- [ ] {criterion}" for criterion in todo.acceptance_criteria
    ) if todo.acceptance_criteria else "- [ ] Feature works as described"

    related_files_section = ""
    if todo.related_files:
        related_files_section = "\n## Related Files (Start Here)\n" + "\n".join(
            f"- {f}" for f in todo.related_files
        )

    prompt = f"""# Implementation Task: {todo.title}

## Context
You are implementing a feature for a project.
{f"App Context: {app_context}" if app_context else ""}
Working directory: {project_path}
Test URL: {test_url}

## Task Details
**ID:** {todo.id}
**Priority:** {todo.priority}/5
**Category:** {todo.category}
**Description:** {todo.description}

## Acceptance Criteria
{acceptance_items}
{related_files_section}

## Instructions

1. **Explore First**: Read existing code to understand patterns, conventions, and architecture
2. **Plan**: Before writing code, understand what files need to change
3. **Implement**: Make minimal, focused changes that accomplish the task
4. **Test**: Visit {test_url} to verify your changes work
5. **Commit**: Create a descriptive commit with the changes

## Rules
- Follow existing code patterns and conventions
- DO NOT refactor unrelated code
- DO NOT add unnecessary dependencies
- Keep changes focused on this specific task
- If you encounter blockers, document them and continue with what you can

## When Done
Provide a summary of:
1. Files modified
2. What was implemented
3. How to test it
4. Any issues or notes

Begin by exploring the codebase structure.
"""
    return prompt


def spawn_claude_agent(
    todo: TodoItem,
    project_path: str,
    test_url: str,
    session_id: str,
    app_context: str = "",
    timeout: int = 600
) -> ExecutionResult:
    """
    Spawn a Claude CLI agent to implement the todo.

    Args:
        todo: The todo item to implement
        project_path: Path to the project
        test_url: URL where the dev server is running
        session_id: Unique identifier for this agent session
        app_context: Optional context about the app
        timeout: Maximum time in seconds for the agent to run

    Returns:
        ExecutionResult with agent output and status
    """
    prompt = build_agent_prompt(todo, project_path, test_url, app_context)

    # Create output directory
    output_dir = get_tmp_path(f"auto-dev/agents")
    log_file = output_dir / f"{session_id}.log"
    prompt_file = output_dir / f"{session_id}_prompt.md"

    # Save prompt for debugging
    with open(prompt_file, "w") as f:
        f.write(prompt)
    log(f"Saved prompt to {prompt_file}")

    # Build Claude CLI command
    # Using --print for non-interactive mode with streaming output
    cmd = [
        "claude",
        "--print",  # Non-interactive, print response
        "--dangerously-skip-permissions",  # Skip permission prompts (user's account)
        prompt
    ]

    log(f"Spawning Claude agent for {todo.id}: {todo.title}")
    log(f"Working directory: {project_path}")
    log(f"Log file: {log_file}")

    try:
        # Open log file for writing
        with open(log_file, "w") as log_handle:
            # Write header
            log_handle.write(f"=== Claude Agent Session: {session_id} ===\n")
            log_handle.write(f"Todo: {todo.id} - {todo.title}\n")
            log_handle.write(f"Started: {timestamp()}\n")
            log_handle.write("=" * 50 + "\n\n")
            log_handle.flush()

            # Run Claude CLI
            process = subprocess.Popen(
                cmd,
                cwd=project_path,
                stdout=log_handle,
                stderr=subprocess.STDOUT,
                text=True,
                preexec_fn=os.setsid if os.name != 'nt' else None
            )

            # Wait for completion with timeout
            try:
                return_code = process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                log(f"Agent {session_id} timed out after {timeout}s", level="warning")
                # Kill the process group
                if os.name != 'nt':
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    process.terminate()
                process.wait()
                return_code = -1

            # Write footer
            log_handle.write("\n" + "=" * 50 + "\n")
            log_handle.write(f"Finished: {timestamp()}\n")
            log_handle.write(f"Exit code: {return_code}\n")

        # Read the log to get output
        with open(log_file, "r") as f:
            output = f.read()

        if return_code == 0:
            log(f"Agent {session_id} completed successfully")
            return ExecutionResult.ok(
                data={
                    "session_id": session_id,
                    "todo_id": todo.id,
                    "log_file": str(log_file),
                    "output_preview": output[-2000:] if len(output) > 2000 else output
                },
                return_code=return_code
            )
        else:
            log(f"Agent {session_id} failed with code {return_code}", level="error")
            return ExecutionResult.fail(
                error=f"Agent exited with code {return_code}",
                session_id=session_id,
                todo_id=todo.id,
                log_file=str(log_file)
            )

    except FileNotFoundError:
        return ExecutionResult.fail(
            error="Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
            session_id=session_id,
            todo_id=todo.id
        )
    except Exception as e:
        log(f"Error spawning agent: {e}", level="error")
        return ExecutionResult.fail(
            error=str(e),
            session_id=session_id,
            todo_id=todo.id
        )


def spawn_claude_agent_background(
    todo: TodoItem,
    project_path: str,
    test_url: str,
    session_id: str,
    app_context: str = "",
    timeout: int = 600
) -> tuple:
    """
    Spawn a Claude CLI agent in the background.

    Returns:
        Tuple of (subprocess.Popen, log_file_path)
    """
    prompt = build_agent_prompt(todo, project_path, test_url, app_context)

    # Create output directory
    output_dir = get_tmp_path(f"auto-dev/agents")
    log_file = output_dir / f"{session_id}.log"
    prompt_file = output_dir / f"{session_id}_prompt.md"

    # Save prompt
    with open(prompt_file, "w") as f:
        f.write(prompt)

    # Build command
    cmd = [
        "claude",
        "--print",
        "--dangerously-skip-permissions",
        prompt
    ]

    log(f"Spawning background Claude agent for {todo.id}")

    # Open log file
    log_handle = open(log_file, "w")
    log_handle.write(f"=== Claude Agent Session: {session_id} ===\n")
    log_handle.write(f"Todo: {todo.id} - {todo.title}\n")
    log_handle.write(f"Started: {timestamp()}\n")
    log_handle.write("=" * 50 + "\n\n")
    log_handle.flush()

    # Spawn process
    process = subprocess.Popen(
        cmd,
        cwd=project_path,
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        text=True,
        preexec_fn=os.setsid if os.name != 'nt' else None
    )

    return process, log_file, log_handle


def main():
    parser = argparse.ArgumentParser(
        description="Spawn Claude CLI agent for implementing a todo"
    )
    parser.add_argument(
        "--todo-json",
        required=True,
        help="JSON string or file path containing the todo item"
    )
    parser.add_argument(
        "--project-path",
        required=True,
        help="Path to the project directory"
    )
    parser.add_argument(
        "--test-url",
        required=True,
        help="URL where dev server is running"
    )
    parser.add_argument(
        "--session-id",
        required=True,
        help="Unique identifier for this agent session"
    )
    parser.add_argument(
        "--app-context",
        default="",
        help="Context about the application being developed"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Timeout in seconds (default: 600)"
    )
    args = parser.parse_args()

    # Load environment
    load_env()

    # Parse todo JSON
    todo_json = args.todo_json
    if todo_json.startswith("{"):
        todo_data = json.loads(todo_json)
    else:
        # It's a file path
        with open(todo_json, "r") as f:
            todo_data = json.load(f)

    todo = TodoItem.from_dict(todo_data)

    # Validate project path
    project_path = Path(args.project_path)
    if not project_path.exists():
        print(ExecutionResult.fail(
            error=f"Project path does not exist: {project_path}"
        ).to_json())
        sys.exit(1)

    # Spawn the agent
    result = spawn_claude_agent(
        todo=todo,
        project_path=str(project_path),
        test_url=args.test_url,
        session_id=args.session_id,
        app_context=args.app_context,
        timeout=args.timeout
    )

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
