"""
Apple App Store Submission Orchestrator

Orchestrates the complete submission workflow:
1. Run preflight checks
2. Build production binary via EAS
3. Submit to App Store Connect
4. Provide status and next steps

Usage:
    python execution/apple_submit.py [--skip-preflight] [--skip-build] [--testflight-only]
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, PROJECT_ROOT


def run_preflight() -> tuple[bool, dict]:
    """Run preflight checks."""
    log("Running preflight checks...")

    try:
        result = subprocess.run(
            [sys.executable, str(PROJECT_ROOT / "execution" / "apple_submission_preflight.py")],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT
        )

        # Parse the JSON output
        output_lines = result.stdout.strip().split("\n")
        for line in reversed(output_lines):
            if line.startswith("{"):
                report = json.loads(line)
                return report.get("success", False), report

        return False, {"error": "Could not parse preflight output"}

    except Exception as e:
        return False, {"error": str(e)}


def run_eas_build(profile: str = "production") -> tuple[bool, dict]:
    """
    Run EAS build for iOS.

    Args:
        profile: Build profile (production, client-testing, etc.)

    Returns:
        Tuple of (success, build_info)
    """
    log(f"Starting EAS build with profile: {profile}")

    cmd = [
        "eas", "build",
        "--platform", "ios",
        "--profile", profile,
        "--non-interactive",
        "--json"
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            timeout=1800  # 30 minute timeout
        )

        if result.returncode == 0:
            # Parse build info from JSON output
            try:
                build_info = json.loads(result.stdout)
                log(f"Build started successfully")
                return True, build_info
            except json.JSONDecodeError:
                log("Build started but couldn't parse output")
                return True, {"status": "started", "output": result.stdout}
        else:
            log(f"Build failed: {result.stderr}", level="error")
            return False, {"error": result.stderr}

    except subprocess.TimeoutExpired:
        log("Build timed out", level="error")
        return False, {"error": "Build timed out after 30 minutes"}
    except FileNotFoundError:
        log("EAS CLI not found. Install with: npm install -g eas-cli", level="error")
        return False, {"error": "EAS CLI not installed"}


def run_eas_submit(profile: str = "production", testflight_only: bool = False) -> tuple[bool, dict]:
    """
    Run EAS submit to upload to App Store Connect.

    Args:
        profile: Submit profile
        testflight_only: If True, submit to TestFlight only

    Returns:
        Tuple of (success, submit_info)
    """
    log("Starting EAS submit...")

    cmd = [
        "eas", "submit",
        "--platform", "ios",
        "--profile", profile,
        "--non-interactive",
        "--latest"  # Use latest successful build
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            timeout=600  # 10 minute timeout
        )

        if result.returncode == 0:
            log("Submit completed successfully")
            return True, {"status": "submitted", "output": result.stdout}
        else:
            log(f"Submit failed: {result.stderr}", level="error")
            return False, {"error": result.stderr}

    except subprocess.TimeoutExpired:
        log("Submit timed out", level="error")
        return False, {"error": "Submit timed out"}
    except FileNotFoundError:
        log("EAS CLI not found", level="error")
        return False, {"error": "EAS CLI not installed"}


def generate_submission_report(results: dict) -> str:
    """Generate a human-readable submission report."""
    report = f"""
================================================================================
                    HikeWise App Store Submission Report
                    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
================================================================================

SUMMARY
-------
Overall Status: {'SUCCESS' if results.get('success') else 'FAILED'}

STEPS COMPLETED
---------------
"""

    steps = results.get("steps", {})
    for step, info in steps.items():
        status = "PASS" if info.get("success") else "FAIL"
        report += f"  [{status}] {step}\n"
        if info.get("error"):
            report += f"        Error: {info['error']}\n"

    if results.get("success"):
        report += """
NEXT STEPS
----------
1. Check App Store Connect for build processing status
2. Once processed, the build will appear in TestFlight
3. Add internal/external testers to TestFlight
4. After testing, submit for App Review
5. Fill out any remaining App Store Connect questions:
   - App Privacy questionnaire
   - Export compliance
   - Age rating

LINKS
-----
- App Store Connect: https://appstoreconnect.apple.com
- EAS Dashboard: https://expo.dev/accounts/hollaj/projects/thetriage/builds

"""
    else:
        report += """
TROUBLESHOOTING
---------------
1. Check the error messages above
2. Verify your Apple credentials are valid
3. Ensure your app is registered in App Store Connect
4. Run preflight check: python execution/apple_submission_preflight.py
5. Check EAS status: eas build:list

"""

    return report


def main():
    """Main entry point."""
    env = load_env()

    # Parse arguments
    skip_preflight = "--skip-preflight" in sys.argv
    skip_build = "--skip-build" in sys.argv
    testflight_only = "--testflight-only" in sys.argv

    results = {
        "success": False,
        "timestamp": datetime.now().isoformat(),
        "steps": {}
    }

    log("=" * 60)
    log("HikeWise App Store Submission")
    log("=" * 60)

    try:
        # Step 1: Preflight checks
        if not skip_preflight:
            preflight_ok, preflight_report = run_preflight()
            results["steps"]["preflight"] = {
                "success": preflight_ok,
                "report": preflight_report
            }

            if not preflight_ok:
                log("Preflight checks failed. Aborting submission.", level="error")
                results["error"] = "Preflight checks failed"

                # Generate and save report
                report = generate_submission_report(results)
                report_path = save_json(results, "submission-report.json")
                print(report)

                return ExecutionResult.fail("Preflight checks failed", **results)
        else:
            log("Skipping preflight checks")
            results["steps"]["preflight"] = {"success": True, "skipped": True}

        # Step 2: EAS Build
        if not skip_build:
            build_ok, build_info = run_eas_build("production")
            results["steps"]["build"] = {
                "success": build_ok,
                "info": build_info
            }

            if not build_ok:
                log("Build failed. Aborting submission.", level="error")
                results["error"] = "Build failed"

                report = generate_submission_report(results)
                save_json(results, "submission-report.json")
                print(report)

                return ExecutionResult.fail("Build failed", **results)

            log("Build submitted. Waiting for completion...")
            log("Note: Build processing happens asynchronously on EAS servers")
        else:
            log("Skipping build (using latest)")
            results["steps"]["build"] = {"success": True, "skipped": True}

        # Step 3: Submit to App Store Connect
        submit_ok, submit_info = run_eas_submit("production", testflight_only)
        results["steps"]["submit"] = {
            "success": submit_ok,
            "info": submit_info
        }

        if not submit_ok:
            log("Submit failed.", level="error")
            results["error"] = "Submit failed"

            report = generate_submission_report(results)
            save_json(results, "submission-report.json")
            print(report)

            return ExecutionResult.fail("Submit failed", **results)

        # Success!
        results["success"] = True
        log("Submission completed successfully!")

        # Generate final report
        report = generate_submission_report(results)
        report_path = save_json(results, "submission-report.json")
        print(report)

        return ExecutionResult.ok(results)

    except KeyboardInterrupt:
        log("Submission cancelled by user", level="warning")
        results["error"] = "Cancelled by user"
        return ExecutionResult.fail("Cancelled", **results)

    except Exception as e:
        log(f"Unexpected error: {e}", level="error")
        results["error"] = str(e)
        return ExecutionResult.fail(str(e), **results)


if __name__ == "__main__":
    result = main()
    print("\n" + result.to_json())
