#!/usr/bin/env python3
"""
Development server manager for the auto-dev agent system.

Manages multiple dev server instances on different ports.
Supports various project types: Next.js, React, Expo, Vite, etc.

Usage:
    # Start a dev server
    python execution/dev_server_manager.py \
        --action start \
        --project /path/to/project \
        --port 3001

    # Check server health
    python execution/dev_server_manager.py \
        --action health \
        --port 3001

    # Stop a server
    python execution/dev_server_manager.py \
        --action stop \
        --port 3001

    # Stop all managed servers
    python execution/dev_server_manager.py --action stop-all
"""

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import socket
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass
import requests

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


@dataclass
class ServerInfo:
    """Information about a running dev server."""
    port: int
    pid: int
    project_path: str
    start_command: str
    started_at: str
    url: str
    project_type: str


def detect_project_type(project_path: str) -> tuple:
    """
    Detect the project type and return (type, start_command).

    Returns:
        Tuple of (project_type, start_command, default_port)
    """
    project = Path(project_path)

    # Check for package.json
    package_json = project / "package.json"
    if package_json.exists():
        with open(package_json, "r") as f:
            pkg = json.load(f)
            scripts = pkg.get("scripts", {})

            # Check for Expo
            if "expo" in pkg.get("dependencies", {}) or "expo" in pkg.get("devDependencies", {}):
                # Use expo web for browser testing
                return ("expo", "npx expo start --web --port {port}", 8081)

            # Check for Next.js
            if "next" in pkg.get("dependencies", {}) or "next" in pkg.get("devDependencies", {}):
                if "dev" in scripts:
                    return ("nextjs", "npm run dev -- --port {port}", 3000)
                return ("nextjs", "npx next dev --port {port}", 3000)

            # Check for Vite
            if "vite" in pkg.get("devDependencies", {}) or "vite" in pkg.get("dependencies", {}):
                return ("vite", "npm run dev -- --port {port}", 5173)

            # Check for Create React App
            if "react-scripts" in pkg.get("dependencies", {}):
                return ("cra", "PORT={port} npm start", 3000)

            # Generic npm project
            if "dev" in scripts:
                return ("npm", "npm run dev -- --port {port}", 3000)
            if "start" in scripts:
                return ("npm", "PORT={port} npm start", 3000)

    # Python projects
    if (project / "manage.py").exists():
        return ("django", "python manage.py runserver 0.0.0.0:{port}", 8000)

    if (project / "app.py").exists() or (project / "main.py").exists():
        return ("flask", "python -m flask run --port {port}", 5000)

    # Static files
    if (project / "index.html").exists():
        return ("static", "python -m http.server {port}", 8000)

    return ("unknown", None, 3000)


def is_port_in_use(port: int) -> bool:
    """Check if a port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0


def find_available_port(start_port: int, max_attempts: int = 100) -> int:
    """Find an available port starting from start_port."""
    for offset in range(max_attempts):
        port = start_port + offset
        if not is_port_in_use(port):
            return port
    raise RuntimeError(f"No available ports found in range {start_port}-{start_port + max_attempts}")


def get_servers_state() -> Dict[int, dict]:
    """Load the current servers state from file."""
    try:
        return load_json("auto-dev/servers_state.json")
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_servers_state(state: Dict[int, dict]):
    """Save the servers state to file."""
    save_json(state, "auto-dev/servers_state.json")


def start_server(
    project_path: str,
    port: int,
    command_override: Optional[str] = None,
    wait_for_ready: bool = True,
    ready_timeout: int = 60
) -> ExecutionResult:
    """
    Start a dev server for the project.

    Args:
        project_path: Path to the project
        port: Port to run on
        command_override: Optional override for the start command
        wait_for_ready: Whether to wait for server to be ready
        ready_timeout: Timeout for waiting for server

    Returns:
        ExecutionResult with server info
    """
    project_path = str(Path(project_path).resolve())

    # Check if port is available
    if is_port_in_use(port):
        # Try to find an available port
        try:
            port = find_available_port(port)
            log(f"Port was in use, using port {port} instead")
        except RuntimeError as e:
            return ExecutionResult.fail(error=str(e))

    # Detect project type
    project_type, default_command, _ = detect_project_type(project_path)
    log(f"Detected project type: {project_type}")

    # Determine start command
    command = command_override or default_command
    if not command:
        return ExecutionResult.fail(
            error=f"Could not determine start command for project type: {project_type}"
        )

    # Format command with port
    command = command.format(port=port)
    log(f"Start command: {command}")

    # Create log file
    log_dir = get_tmp_path("auto-dev/server_logs")
    log_file = log_dir / f"server_{port}.log"

    try:
        # Open log file
        log_handle = open(log_file, "w")

        # Start the server
        process = subprocess.Popen(
            command,
            shell=True,
            cwd=project_path,
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid if os.name != 'nt' else None
        )

        url = f"http://localhost:{port}"

        # Save server info
        server_info = {
            "port": port,
            "pid": process.pid,
            "project_path": project_path,
            "start_command": command,
            "started_at": timestamp(),
            "url": url,
            "project_type": project_type,
            "log_file": str(log_file)
        }

        # Update state
        state = get_servers_state()
        state[str(port)] = server_info
        save_servers_state(state)

        log(f"Started server on port {port} (PID: {process.pid})")

        # Wait for server to be ready
        if wait_for_ready:
            log(f"Waiting for server to be ready at {url}...")
            ready = wait_for_server_ready(url, ready_timeout)
            if not ready:
                # Server didn't start properly
                stop_server(port)
                return ExecutionResult.fail(
                    error=f"Server failed to become ready within {ready_timeout}s",
                    log_file=str(log_file)
                )
            log("Server is ready")

        return ExecutionResult.ok(
            data=server_info,
            url=url,
            pid=process.pid
        )

    except Exception as e:
        log(f"Failed to start server: {e}", level="error")
        return ExecutionResult.fail(error=str(e))


def wait_for_server_ready(url: str, timeout: int = 60) -> bool:
    """Wait for the server to respond to requests."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code < 500:
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
    return False


def check_server_health(port: int) -> ExecutionResult:
    """Check if a server is healthy."""
    state = get_servers_state()
    server_info = state.get(str(port))

    if not server_info:
        return ExecutionResult.fail(error=f"No server registered on port {port}")

    url = server_info.get("url", f"http://localhost:{port}")
    pid = server_info.get("pid")

    # Check if process is running
    try:
        os.kill(pid, 0)
        process_running = True
    except (OSError, TypeError):
        process_running = False

    # Check if server responds
    try:
        response = requests.get(url, timeout=5)
        responds = True
        status_code = response.status_code
    except requests.exceptions.RequestException:
        responds = False
        status_code = None

    healthy = process_running and responds

    return ExecutionResult.ok(
        data={
            "port": port,
            "healthy": healthy,
            "process_running": process_running,
            "responds": responds,
            "status_code": status_code,
            "url": url,
            "pid": pid
        }
    )


def stop_server(port: int) -> ExecutionResult:
    """Stop a server running on the given port."""
    state = get_servers_state()
    server_info = state.get(str(port))

    if not server_info:
        # Try to kill any process on that port anyway
        log(f"No registered server on port {port}, checking for processes...")
        if is_port_in_use(port):
            # Try to find and kill the process
            try:
                result = subprocess.run(
                    f"lsof -ti:{port} | xargs kill -9",
                    shell=True,
                    capture_output=True
                )
                log(f"Killed process on port {port}")
            except Exception:
                pass
        return ExecutionResult.ok(data={"port": port, "stopped": True, "was_registered": False})

    pid = server_info.get("pid")

    try:
        # Kill the process group
        if os.name != 'nt':
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        else:
            os.kill(pid, signal.SIGTERM)

        # Wait a moment for graceful shutdown
        time.sleep(2)

        # Force kill if still running
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass  # Already dead

        log(f"Stopped server on port {port} (PID: {pid})")

    except (OSError, ProcessLookupError):
        log(f"Process {pid} already terminated")

    # Remove from state
    del state[str(port)]
    save_servers_state(state)

    return ExecutionResult.ok(
        data={
            "port": port,
            "pid": pid,
            "stopped": True,
            "was_registered": True
        }
    )


def stop_all_servers() -> ExecutionResult:
    """Stop all managed servers."""
    state = get_servers_state()
    stopped = []

    for port_str in list(state.keys()):
        result = stop_server(int(port_str))
        if result.success:
            stopped.append(int(port_str))

    log(f"Stopped {len(stopped)} servers")
    return ExecutionResult.ok(
        data={
            "stopped_ports": stopped,
            "count": len(stopped)
        }
    )


def list_servers() -> ExecutionResult:
    """List all managed servers with their status."""
    state = get_servers_state()
    servers = []

    for port_str, info in state.items():
        health = check_server_health(int(port_str))
        servers.append({
            **info,
            "healthy": health.data.get("healthy") if health.success else False
        })

    return ExecutionResult.ok(
        data={
            "servers": servers,
            "count": len(servers)
        }
    )


def main():
    parser = argparse.ArgumentParser(description="Dev server manager for auto-dev agent")
    parser.add_argument(
        "--action",
        required=True,
        choices=["start", "stop", "stop-all", "health", "list"],
        help="Action to perform"
    )
    parser.add_argument(
        "--project",
        help="Path to the project (for start)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=3001,
        help="Port number (default: 3001)"
    )
    parser.add_argument(
        "--command",
        help="Override the start command"
    )
    parser.add_argument(
        "--no-wait",
        action="store_true",
        help="Don't wait for server to be ready"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="Timeout for waiting for server (default: 60s)"
    )
    args = parser.parse_args()

    load_env()

    if args.action == "start":
        if not args.project:
            print(ExecutionResult.fail(
                error="--project required for start action"
            ).to_json())
            sys.exit(1)

        result = start_server(
            project_path=args.project,
            port=args.port,
            command_override=args.command,
            wait_for_ready=not args.no_wait,
            ready_timeout=args.timeout
        )

    elif args.action == "stop":
        result = stop_server(args.port)

    elif args.action == "stop-all":
        result = stop_all_servers()

    elif args.action == "health":
        result = check_server_health(args.port)

    elif args.action == "list":
        result = list_servers()

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
