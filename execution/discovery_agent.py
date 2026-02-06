#!/usr/bin/env python3
"""
Discovery Agent for HikeWise Swarm

Runs E2E exploration of the app via Maestro to discover issues.
Captures screenshots, console logs, and navigation traces for analysis.

Usage:
    # Run full discovery
    python execution/discovery_agent.py \
        --action discover \
        --flows .maestro/flows/discovery

    # Analyze captured data
    python execution/discovery_agent.py \
        --action analyze \
        --screenshots .tmp/discovery/screenshots

    # Generate issue report
    python execution/discovery_agent.py \
        --action report
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


class DiscoveryAgent:
    """
    Discovers issues by running Maestro flows and analyzing results.

    Process:
    1. Boot iOS Simulator (with TEST_MODE for auth bypass)
    2. Run Maestro exploration flows
    3. Capture screenshots and console output
    4. Analyze for anomalies
    5. Generate prioritized issue list
    """

    def __init__(self, project_path: str = None):
        self.project_path = project_path or str(Path(__file__).parent.parent)
        self.discovery_dir = get_tmp_path("discovery")
        self.screenshots_dir = os.path.join(self.discovery_dir, "screenshots")
        self.logs_dir = os.path.join(self.discovery_dir, "logs")

        os.makedirs(self.screenshots_dir, exist_ok=True)
        os.makedirs(self.logs_dir, exist_ok=True)

    def run_maestro_flow(self, flow_path: str, env_vars: Dict = None) -> ExecutionResult:
        """Run a single Maestro flow and capture results."""
        flow_name = Path(flow_path).stem
        run_id = f"{flow_name}_{timestamp().replace(':', '-')}"

        log(f"Running Maestro flow: {flow_name}")

        # Set up environment for test mode
        env = os.environ.copy()
        env["EXPO_PUBLIC_TEST_MODE"] = "true"
        if env_vars:
            env.update(env_vars)

        # Create output directory for this run
        run_dir = os.path.join(self.discovery_dir, "runs", run_id)
        os.makedirs(run_dir, exist_ok=True)

        try:
            result = subprocess.run(
                [
                    "maestro", "test",
                    flow_path,
                    "--output", run_dir,
                    "--format", "junit"
                ],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout per flow
                env=env
            )

            success = result.returncode == 0

            # Save logs
            with open(os.path.join(run_dir, "stdout.log"), "w") as f:
                f.write(result.stdout)
            with open(os.path.join(run_dir, "stderr.log"), "w") as f:
                f.write(result.stderr)

            # Parse for errors/issues
            issues = self._parse_maestro_output(result.stdout, result.stderr, flow_name)

            return ExecutionResult.ok(data={
                "flow": flow_name,
                "run_id": run_id,
                "success": success,
                "issues_found": len(issues),
                "issues": issues,
                "run_dir": run_dir
            })

        except subprocess.TimeoutExpired:
            return ExecutionResult.fail(error=f"Flow {flow_name} timed out")
        except FileNotFoundError:
            return ExecutionResult.fail(error="Maestro not installed. Run: curl -Ls 'https://get.maestro.mobile.dev' | bash")
        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def run_all_discovery_flows(self, flows_dir: str) -> ExecutionResult:
        """Run all discovery flows in a directory."""
        flows_path = Path(flows_dir)
        if not flows_path.exists():
            return ExecutionResult.fail(error=f"Flows directory not found: {flows_dir}")

        flows = list(flows_path.glob("*.yaml")) + list(flows_path.glob("*.yml"))
        if not flows:
            return ExecutionResult.fail(error=f"No flow files found in {flows_dir}")

        log(f"Running {len(flows)} discovery flows")

        results = []
        all_issues = []

        for flow in flows:
            result = self.run_maestro_flow(str(flow))
            results.append({
                "flow": flow.stem,
                "success": result.success,
                "issues": result.data.get("issues", []) if result.success else []
            })

            if result.success:
                all_issues.extend(result.data.get("issues", []))

        # Save discovery session
        session = {
            "session_id": f"discovery_{timestamp().replace(':', '-')}",
            "started_at": timestamp(),
            "flows_run": len(flows),
            "results": results,
            "total_issues": len(all_issues),
            "issues": all_issues
        }
        save_json(session, "discovery/latest_session.json")

        return ExecutionResult.ok(data=session)

    def _parse_maestro_output(self, stdout: str, stderr: str, flow_name: str) -> List[Dict]:
        """Parse Maestro output for issues."""
        issues = []

        # Pattern matches for common issues
        patterns = [
            # Element not found
            (r"Unable to find.*element", "element_not_found", "high"),
            # Assertion failed
            (r"Assertion failed.*visible.*\"(.+)\"", "assertion_failed", "high"),
            # Timeout
            (r"Timeout.*waiting", "timeout", "medium"),
            # Navigation error
            (r"Cannot navigate|Navigation failed", "navigation_error", "high"),
            # Crash indicators
            (r"Application.*crash|Fatal error|Red screen", "crash", "critical"),
            # Network error
            (r"Network.*error|Failed to fetch", "network_error", "medium"),
        ]

        combined = stdout + "\n" + stderr

        for pattern, issue_type, priority in patterns:
            matches = re.findall(pattern, combined, re.IGNORECASE)
            for match in matches:
                issues.append({
                    "id": f"disc-{len(issues)+1}-{timestamp().replace(':', '')}",
                    "type": issue_type,
                    "priority": priority,
                    "source_flow": flow_name,
                    "match": match if isinstance(match, str) else match[0] if match else "",
                    "discovered_at": timestamp()
                })

        return issues

    def capture_simulator_screenshot(self, name: str = None) -> ExecutionResult:
        """Capture a screenshot from the iOS simulator."""
        screenshot_name = name or f"screen_{timestamp().replace(':', '-')}"
        output_path = os.path.join(self.screenshots_dir, f"{screenshot_name}.png")

        try:
            # Get booted simulator UDID
            result = subprocess.run(
                ["xcrun", "simctl", "list", "devices", "booted", "-j"],
                capture_output=True,
                text=True
            )
            devices = json.loads(result.stdout)

            udid = None
            for runtime, device_list in devices.get("devices", {}).items():
                for device in device_list:
                    if device.get("state") == "Booted":
                        udid = device.get("udid")
                        break

            if not udid:
                return ExecutionResult.fail(error="No booted simulator found")

            # Capture screenshot
            subprocess.run(
                ["xcrun", "simctl", "io", udid, "screenshot", output_path],
                check=True
            )

            return ExecutionResult.ok(data={
                "screenshot_path": output_path,
                "udid": udid
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def analyze_screenshots(self, screenshots_dir: str = None) -> ExecutionResult:
        """
        Analyze screenshots for visual issues.

        This is a placeholder for future Claude vision integration.
        Currently does basic file analysis.
        """
        screenshots_path = screenshots_dir or self.screenshots_dir

        if not os.path.exists(screenshots_path):
            return ExecutionResult.fail(error=f"Screenshots directory not found: {screenshots_path}")

        screenshots = list(Path(screenshots_path).glob("*.png"))

        analysis = {
            "screenshot_count": len(screenshots),
            "screenshots": [],
            "analyzed_at": timestamp()
        }

        for screenshot in screenshots:
            file_size = screenshot.stat().st_size
            analysis["screenshots"].append({
                "name": screenshot.name,
                "path": str(screenshot),
                "size_bytes": file_size,
                # Placeholder for vision analysis
                "vision_analysis": None
            })

        save_json(analysis, "discovery/screenshot_analysis.json")

        return ExecutionResult.ok(data=analysis)

    def generate_issue_report(self) -> ExecutionResult:
        """Generate a consolidated issue report from all discovery data."""
        # Load latest session
        try:
            session = load_json("discovery/latest_session.json")
        except FileNotFoundError:
            return ExecutionResult.fail(error="No discovery session found. Run discovery first.")

        # Group issues by type and priority
        issues_by_priority = {
            "critical": [],
            "high": [],
            "medium": [],
            "low": []
        }

        for issue in session.get("issues", []):
            priority = issue.get("priority", "low")
            issues_by_priority[priority].append(issue)

        # Generate report
        report = {
            "generated_at": timestamp(),
            "session_id": session.get("session_id"),
            "summary": {
                "total_issues": len(session.get("issues", [])),
                "critical": len(issues_by_priority["critical"]),
                "high": len(issues_by_priority["high"]),
                "medium": len(issues_by_priority["medium"]),
                "low": len(issues_by_priority["low"])
            },
            "issues_by_priority": issues_by_priority,
            "recommendations": self._generate_recommendations(issues_by_priority)
        }

        save_json(report, "discovery/issue_report.json")

        return ExecutionResult.ok(data=report)

    def _generate_recommendations(self, issues_by_priority: Dict) -> List[str]:
        """Generate actionable recommendations from issues."""
        recommendations = []

        if issues_by_priority["critical"]:
            recommendations.append(
                f"URGENT: {len(issues_by_priority['critical'])} critical issues require immediate attention"
            )

        # Count issue types
        type_counts = {}
        for priority_issues in issues_by_priority.values():
            for issue in priority_issues:
                issue_type = issue.get("type", "unknown")
                type_counts[issue_type] = type_counts.get(issue_type, 0) + 1

        if type_counts.get("navigation_error", 0) > 0:
            recommendations.append(
                "Navigation issues detected. Review RootNavigator.tsx and MainNavigator.tsx"
            )

        if type_counts.get("timeout", 0) > 2:
            recommendations.append(
                "Multiple timeout issues. Check for slow API calls or infinite loops"
            )

        if type_counts.get("element_not_found", 0) > 0:
            recommendations.append(
                "UI elements not found. Check component visibility and testID attributes"
            )

        return recommendations


def main():
    parser = argparse.ArgumentParser(
        description="Discovery agent for HikeWise swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["discover", "flow", "screenshot", "analyze", "report"],
        help="Action to perform"
    )
    parser.add_argument("--flows", help="Directory containing Maestro flows")
    parser.add_argument("--flow", help="Single flow file to run")
    parser.add_argument("--screenshots", help="Screenshots directory to analyze")
    parser.add_argument("--name", help="Screenshot name")
    args = parser.parse_args()

    load_env()
    agent = DiscoveryAgent()

    if args.action == "discover":
        flows_dir = args.flows or os.path.join(agent.project_path, ".maestro/flows/discovery")
        result = agent.run_all_discovery_flows(flows_dir)

    elif args.action == "flow":
        if not args.flow:
            print(ExecutionResult.fail(error="--flow required").to_json())
            sys.exit(1)
        result = agent.run_maestro_flow(args.flow)

    elif args.action == "screenshot":
        result = agent.capture_simulator_screenshot(args.name)

    elif args.action == "analyze":
        result = agent.analyze_screenshots(args.screenshots)

    elif args.action == "report":
        result = agent.generate_issue_report()

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
