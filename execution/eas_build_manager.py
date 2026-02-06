#!/usr/bin/env python3
"""
EAS Build Manager for HikeWise Swarm

Manages EAS (Expo Application Services) builds for iOS and Android.
Handles triggering builds, checking status, and downloading artifacts.

Usage:
    # Trigger a build
    python execution/eas_build_manager.py \
        --action build \
        --platform ios \
        --profile production

    # Check build status
    python execution/eas_build_manager.py \
        --action status \
        --build-id xxxxxxxx

    # List recent builds
    python execution/eas_build_manager.py --action list
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, timestamp


class EASBuildManager:
    """
    Manages EAS builds via the eas-cli.
    """

    def __init__(self, project_path: str = None):
        self.project_path = project_path or str(Path(__file__).parent.parent)
        self.builds_dir = get_tmp_path("builds")
        os.makedirs(self.builds_dir, exist_ok=True)

    def check_eas_cli(self) -> ExecutionResult:
        """Check if eas-cli is installed."""
        try:
            result = subprocess.run(
                ["eas", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return ExecutionResult.ok(data={
                    "installed": True,
                    "version": result.stdout.strip()
                })
            else:
                return ExecutionResult.fail(error="EAS CLI not working")

        except FileNotFoundError:
            return ExecutionResult.fail(
                error="EAS CLI not installed. Run: npm install -g eas-cli"
            )

    def trigger_build(
        self,
        platform: str,
        profile: str = "production",
        message: str = None,
        auto_submit: bool = False,
        wait: bool = False
    ) -> ExecutionResult:
        """Trigger an EAS build."""
        log(f"Triggering {platform} build with profile: {profile}")

        cmd = [
            "eas", "build",
            "--platform", platform,
            "--profile", profile,
            "--non-interactive",
            "--json"
        ]

        if message:
            cmd.extend(["--message", message])

        if auto_submit:
            cmd.append("--auto-submit")

        if not wait:
            cmd.append("--no-wait")

        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=600 if wait else 60
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Build failed: {result.stderr}")

            # Parse JSON output
            try:
                build_info = json.loads(result.stdout)
            except json.JSONDecodeError:
                build_info = {"raw_output": result.stdout}

            # Save build info
            build_id = build_info.get("id", timestamp().replace(":", "-"))
            save_json(build_info, f"builds/{build_id}.json")

            return ExecutionResult.ok(data={
                "build_id": build_id,
                "platform": platform,
                "profile": profile,
                "status": build_info.get("status", "submitted"),
                "build_info": build_info
            })

        except subprocess.TimeoutExpired:
            return ExecutionResult.fail(error="Build command timed out")
        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def get_build_status(self, build_id: str) -> ExecutionResult:
        """Get status of a specific build."""
        try:
            result = subprocess.run(
                ["eas", "build:view", build_id, "--json"],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Failed to get build: {result.stderr}")

            build_info = json.loads(result.stdout)

            return ExecutionResult.ok(data={
                "build_id": build_id,
                "status": build_info.get("status"),
                "platform": build_info.get("platform"),
                "created_at": build_info.get("createdAt"),
                "completed_at": build_info.get("completedAt"),
                "artifact_url": build_info.get("artifacts", {}).get("buildUrl"),
                "build_info": build_info
            })

        except json.JSONDecodeError:
            return ExecutionResult.fail(error="Failed to parse build info")
        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def list_builds(
        self,
        platform: str = None,
        limit: int = 10,
        status: str = None
    ) -> ExecutionResult:
        """List recent builds."""
        cmd = ["eas", "build:list", "--json", "--limit", str(limit)]

        if platform:
            cmd.extend(["--platform", platform])

        if status:
            cmd.extend(["--status", status])

        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Failed to list builds: {result.stderr}")

            builds = json.loads(result.stdout)

            return ExecutionResult.ok(data={
                "builds": builds,
                "count": len(builds)
            })

        except json.JSONDecodeError:
            return ExecutionResult.fail(error="Failed to parse build list")
        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def cancel_build(self, build_id: str) -> ExecutionResult:
        """Cancel a running build."""
        try:
            result = subprocess.run(
                ["eas", "build:cancel", build_id],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Failed to cancel: {result.stderr}")

            return ExecutionResult.ok(data={
                "build_id": build_id,
                "cancelled": True
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def download_artifact(self, build_id: str, output_dir: str = None) -> ExecutionResult:
        """Download build artifact."""
        # First get the build info
        status_result = self.get_build_status(build_id)
        if not status_result.success:
            return status_result

        artifact_url = status_result.data.get("artifact_url")
        if not artifact_url:
            return ExecutionResult.fail(error="No artifact available for this build")

        output_dir = output_dir or self.builds_dir

        try:
            # Use curl to download
            output_file = os.path.join(output_dir, f"{build_id}.tar.gz")

            result = subprocess.run(
                ["curl", "-L", "-o", output_file, artifact_url],
                capture_output=True,
                timeout=600
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error="Download failed")

            return ExecutionResult.ok(data={
                "build_id": build_id,
                "artifact_path": output_file,
                "downloaded": True
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def submit_to_store(
        self,
        build_id: str = None,
        platform: str = "ios",
        profile: str = "production"
    ) -> ExecutionResult:
        """Submit a build to the app store."""
        cmd = ["eas", "submit", "--platform", platform, "--profile", profile]

        if build_id:
            cmd.extend(["--id", build_id])
        else:
            cmd.append("--latest")

        cmd.append("--non-interactive")

        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=300
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Submit failed: {result.stderr}")

            return ExecutionResult.ok(data={
                "build_id": build_id or "latest",
                "platform": platform,
                "submitted": True,
                "output": result.stdout
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def wait_for_build(self, build_id: str, timeout: int = 1800, poll_interval: int = 30) -> ExecutionResult:
        """Wait for a build to complete."""
        log(f"Waiting for build {build_id} (timeout: {timeout}s)")

        start_time = time.time()
        final_statuses = ["finished", "errored", "cancelled"]

        while time.time() - start_time < timeout:
            status_result = self.get_build_status(build_id)

            if not status_result.success:
                return status_result

            status = status_result.data.get("status", "").lower()

            if status in final_statuses:
                return ExecutionResult.ok(data={
                    **status_result.data,
                    "wait_time": round(time.time() - start_time, 1)
                })

            log(f"Build status: {status}. Waiting...")
            time.sleep(poll_interval)

        return ExecutionResult.fail(error=f"Timeout waiting for build {build_id}")

    def get_credentials_status(self, platform: str = "ios") -> ExecutionResult:
        """Check credentials status for a platform."""
        try:
            result = subprocess.run(
                ["eas", "credentials", "--platform", platform],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=30,
                input="\n"  # Auto-answer prompts
            )

            return ExecutionResult.ok(data={
                "platform": platform,
                "output": result.stdout
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))


def main():
    parser = argparse.ArgumentParser(
        description="EAS build manager for HikeWise"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["check", "build", "status", "list", "cancel", "download", "submit", "wait", "credentials"],
        help="Action to perform"
    )
    parser.add_argument("--platform", choices=["ios", "android", "all"], default="ios")
    parser.add_argument("--profile", default="production")
    parser.add_argument("--build-id", help="Build ID")
    parser.add_argument("--message", help="Build message")
    parser.add_argument("--auto-submit", action="store_true")
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=1800)
    parser.add_argument("--output-dir", help="Output directory for downloads")
    args = parser.parse_args()

    load_env()
    manager = EASBuildManager()

    if args.action == "check":
        result = manager.check_eas_cli()

    elif args.action == "build":
        result = manager.trigger_build(
            args.platform,
            args.profile,
            args.message,
            args.auto_submit,
            args.wait
        )

    elif args.action == "status":
        if not args.build_id:
            print(ExecutionResult.fail(error="--build-id required").to_json())
            sys.exit(1)
        result = manager.get_build_status(args.build_id)

    elif args.action == "list":
        result = manager.list_builds(
            platform=args.platform if args.platform != "all" else None,
            limit=args.limit
        )

    elif args.action == "cancel":
        if not args.build_id:
            print(ExecutionResult.fail(error="--build-id required").to_json())
            sys.exit(1)
        result = manager.cancel_build(args.build_id)

    elif args.action == "download":
        if not args.build_id:
            print(ExecutionResult.fail(error="--build-id required").to_json())
            sys.exit(1)
        result = manager.download_artifact(args.build_id, args.output_dir)

    elif args.action == "submit":
        result = manager.submit_to_store(args.build_id, args.platform, args.profile)

    elif args.action == "wait":
        if not args.build_id:
            print(ExecutionResult.fail(error="--build-id required").to_json())
            sys.exit(1)
        result = manager.wait_for_build(args.build_id, args.timeout)

    elif args.action == "credentials":
        result = manager.get_credentials_status(args.platform)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
