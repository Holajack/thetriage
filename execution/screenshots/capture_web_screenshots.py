#!/usr/bin/env python3
"""
Screenshot Capture Orchestrator for HikeWise

This script orchestrates the Playwright screenshot capture process:
1. Verifies Expo Web is running (or starts it)
2. Runs Playwright tests for all device configurations
3. Reports on captured screenshots

Usage:
    python execution/screenshots/capture_web_screenshots.py
    python execution/screenshots/capture_web_screenshots.py --device iphone-6.7
    python execution/screenshots/capture_web_screenshots.py --screen home
"""

import subprocess
import sys
import os
import time
import signal
import json
from pathlib import Path

# Add parent directory to path for utils import
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils import load_env, log

def logger_info(msg): log(msg, "info")
def logger_error(msg): log(msg, "error")
def logger_warning(msg): log(msg, "warning")

class Logger:
    info = staticmethod(logger_info)
    error = staticmethod(logger_error)
    warning = staticmethod(logger_warning)

logger = Logger()


def check_expo_web_running(port: int = 8081) -> bool:
    """Check if Expo Web server is running on the specified port."""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result == 0


def start_expo_web() -> subprocess.Popen:
    """Start Expo Web server in background."""
    logger.info("Starting Expo Web server...")
    process = subprocess.Popen(
        ["npm", "run", "web"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=Path(__file__).parent.parent.parent
    )

    # Wait for server to start
    for _ in range(60):
        if check_expo_web_running():
            logger.info("Expo Web server is running on http://localhost:8081")
            return process
        time.sleep(1)

    raise RuntimeError("Expo Web server failed to start within 60 seconds")


def run_playwright_tests(device: str = None, screen: str = None) -> bool:
    """Run Playwright screenshot tests."""
    cmd = ["npx", "playwright", "test", "playwright/screenshots/capture.spec.ts"]

    if device:
        cmd.extend(["--project", device])
        logger.info(f"Running tests for device: {device}")

    if screen:
        cmd.extend(["-g", f"capture {screen}"])
        logger.info(f"Running tests for screen: {screen}")

    logger.info(f"Executing: {' '.join(cmd)}")

    result = subprocess.run(
        cmd,
        cwd=Path(__file__).parent.parent.parent,
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        logger.info("Playwright tests completed successfully")
        print(result.stdout)
        return True
    else:
        logger.error(f"Playwright tests failed with code {result.returncode}")
        print(result.stderr)
        return False


def count_screenshots() -> dict:
    """Count screenshots in each device directory."""
    base_dir = Path(__file__).parent.parent.parent / "store-assets" / "screenshots"
    counts = {}

    for platform in ["ios", "android"]:
        platform_dir = base_dir / platform
        if platform_dir.exists():
            for device_dir in platform_dir.iterdir():
                if device_dir.is_dir():
                    png_files = list(device_dir.glob("*.png"))
                    key = f"{platform}/{device_dir.name}"
                    counts[key] = len(png_files)

    return counts


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Capture screenshots for app stores")
    parser.add_argument("--device", help="Specific device to capture (e.g., iphone-6.7)")
    parser.add_argument("--screen", help="Specific screen to capture (e.g., home)")
    parser.add_argument("--no-server", action="store_true", help="Skip starting Expo Web server")
    args = parser.parse_args()

    load_env()

    expo_process = None

    try:
        # Start server if needed
        if not args.no_server:
            if check_expo_web_running():
                logger.info("Expo Web server already running")
            else:
                expo_process = start_expo_web()
        else:
            if not check_expo_web_running():
                logger.error("Expo Web server not running and --no-server specified")
                sys.exit(1)

        # Run Playwright tests
        success = run_playwright_tests(device=args.device, screen=args.screen)

        # Report results
        print("\n" + "=" * 50)
        print("Screenshot Capture Results")
        print("=" * 50)

        counts = count_screenshots()
        for device, count in sorted(counts.items()):
            status = "✅" if count >= 7 else "⚠️"
            print(f"{status} {device}: {count} screenshots")

        total = sum(counts.values())
        expected = 7 * 6  # 7 screens × 6 devices
        print(f"\nTotal: {total}/{expected} screenshots")

        if success:
            print("\n✅ Screenshot capture completed successfully")
            sys.exit(0)
        else:
            print("\n❌ Screenshot capture had errors")
            sys.exit(1)

    finally:
        if expo_process:
            logger.info("Stopping Expo Web server...")
            expo_process.terminate()
            try:
                expo_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                expo_process.kill()


if __name__ == "__main__":
    main()
