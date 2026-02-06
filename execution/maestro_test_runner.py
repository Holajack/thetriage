#!/usr/bin/env python3
"""
Maestro Test Runner for HikeWise Swarm

Runs Maestro E2E tests for mobile app testing.
Supports both discovery flows (finding issues) and verification flows (confirming fixes).

Usage:
    # Run all flows in a directory
    python execution/maestro_test_runner.py \
        --action run \
        --flows .maestro/flows/discovery

    # Run a single flow
    python execution/maestro_test_runner.py \
        --action run-single \
        --flow .maestro/flows/verify/navigation.yaml

    # Check Maestro installation
    python execution/maestro_test_runner.py --action check
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

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


class MaestroTestRunner:
    """
    Runs Maestro E2E tests and captures results.
    """

    def __init__(self, project_path: str = None):
        self.project_path = project_path or str(Path(__file__).parent.parent)
        self.results_dir = get_tmp_path("maestro/results")
        self.screenshots_dir = get_tmp_path("maestro/screenshots")

        os.makedirs(self.results_dir, exist_ok=True)
        os.makedirs(self.screenshots_dir, exist_ok=True)

    def check_installation(self) -> ExecutionResult:
        """Check if Maestro is installed and working."""
        try:
            result = subprocess.run(
                ["maestro", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                version = result.stdout.strip()
                return ExecutionResult.ok(data={
                    "installed": True,
                    "version": version
                })
            else:
                return ExecutionResult.fail(error="Maestro not working properly")

        except FileNotFoundError:
            return ExecutionResult.fail(
                error="Maestro not installed. Run: curl -Ls 'https://get.maestro.mobile.dev' | bash"
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult.fail(error="Maestro command timed out")

    def run_flow(
        self,
        flow_path: str,
        env_vars: Dict = None,
        timeout: int = 300,
        debug: bool = False
    ) -> ExecutionResult:
        """Run a single Maestro flow."""
        if not os.path.exists(flow_path):
            return ExecutionResult.fail(error=f"Flow not found: {flow_path}")

        flow_name = Path(flow_path).stem
        run_id = f"{flow_name}_{timestamp().replace(':', '-').replace(' ', '_')}"
        run_dir = os.path.join(self.results_dir, run_id)
        os.makedirs(run_dir, exist_ok=True)

        log(f"Running Maestro flow: {flow_name}")

        # Build environment
        env = os.environ.copy()
        env["EXPO_PUBLIC_TEST_MODE"] = "true"  # Enable test mode by default
        if env_vars:
            env.update(env_vars)

        # Build command
        cmd = ["maestro", "test", flow_path]

        if debug:
            cmd.append("--debug-output")
            cmd.append(run_dir)

        try:
            start_time = time.time()

            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env
            )

            duration = time.time() - start_time
            success = result.returncode == 0

            # Save output
            with open(os.path.join(run_dir, "stdout.log"), "w") as f:
                f.write(result.stdout)
            with open(os.path.join(run_dir, "stderr.log"), "w") as f:
                f.write(result.stderr)

            # Parse results
            test_result = {
                "flow": flow_name,
                "flow_path": flow_path,
                "run_id": run_id,
                "success": success,
                "duration_seconds": round(duration, 2),
                "return_code": result.returncode,
                "run_dir": run_dir,
                "timestamp": timestamp()
            }

            # Extract any failures from output
            if not success:
                test_result["failures"] = self._extract_failures(result.stdout, result.stderr)

            # Save result
            save_json(test_result, f"maestro/results/{run_id}/result.json")

            return ExecutionResult.ok(data=test_result)

        except subprocess.TimeoutExpired:
            return ExecutionResult.fail(error=f"Flow {flow_name} timed out after {timeout}s")
        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def run_flows(
        self,
        flows_dir: str,
        pattern: str = "*.yaml",
        env_vars: Dict = None,
        timeout_per_flow: int = 300,
        stop_on_failure: bool = False
    ) -> ExecutionResult:
        """Run all flows in a directory."""
        flows_path = Path(flows_dir)
        if not flows_path.exists():
            return ExecutionResult.fail(error=f"Directory not found: {flows_dir}")

        # Find flows
        flows = list(flows_path.glob(pattern))
        flows.extend(flows_path.glob(pattern.replace(".yaml", ".yml")))

        if not flows:
            return ExecutionResult.fail(error=f"No flows found in {flows_dir}")

        log(f"Found {len(flows)} flows to run")

        # Run each flow
        results = []
        passed = 0
        failed = 0

        for flow in sorted(flows):
            result = self.run_flow(str(flow), env_vars, timeout_per_flow)

            flow_result = {
                "flow": flow.stem,
                "success": result.success and result.data.get("success", False) if result.success else False
            }

            if result.success:
                flow_result["duration"] = result.data.get("duration_seconds")
                if result.data.get("success"):
                    passed += 1
                else:
                    failed += 1
                    flow_result["failures"] = result.data.get("failures", [])
            else:
                failed += 1
                flow_result["error"] = result.error

            results.append(flow_result)

            if not flow_result["success"] and stop_on_failure:
                log("Stopping due to failure (stop_on_failure=True)")
                break

        # Generate summary
        summary = {
            "session_id": f"maestro_{timestamp().replace(':', '-')}",
            "flows_dir": flows_dir,
            "total_flows": len(flows),
            "executed": len(results),
            "passed": passed,
            "failed": failed,
            "pass_rate": round(passed / len(results) * 100, 1) if results else 0,
            "results": results,
            "timestamp": timestamp()
        }

        save_json(summary, "maestro/latest_run.json")

        return ExecutionResult.ok(data=summary)

    def _extract_failures(self, stdout: str, stderr: str) -> List[Dict]:
        """Extract failure information from Maestro output."""
        failures = []
        combined = stdout + "\n" + stderr

        # Common failure patterns
        import re

        # Element not found
        matches = re.findall(r"Unable to find.*?element.*?['\"]([^'\"]+)['\"]", combined, re.IGNORECASE)
        for match in matches:
            failures.append({
                "type": "element_not_found",
                "element": match
            })

        # Assertion failures
        matches = re.findall(r"Assertion.*?failed.*?visible.*?['\"]([^'\"]+)['\"]", combined, re.IGNORECASE)
        for match in matches:
            failures.append({
                "type": "assertion_failed",
                "expected": match
            })

        # Timeout
        if re.search(r"timeout|timed out", combined, re.IGNORECASE):
            failures.append({
                "type": "timeout"
            })

        return failures

    def record_flow(self, output_path: str = None, app_id: str = "com.hikewise.app") -> ExecutionResult:
        """Record user actions to create a new flow."""
        if not output_path:
            output_path = os.path.join(
                self.project_path,
                ".maestro/flows/recorded",
                f"recorded_{timestamp().replace(':', '-')}.yaml"
            )

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        log(f"Recording new flow to: {output_path}")
        log("Perform actions in the simulator, then press Ctrl+C to stop")

        try:
            result = subprocess.run(
                ["maestro", "record", output_path, "--app-id", app_id],
                cwd=self.project_path
            )

            if result.returncode == 0:
                return ExecutionResult.ok(data={
                    "flow_path": output_path,
                    "recorded": True
                })
            else:
                return ExecutionResult.fail(error="Recording failed")

        except KeyboardInterrupt:
            return ExecutionResult.ok(data={
                "flow_path": output_path,
                "recorded": True,
                "interrupted": True
            })
        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def studio(self) -> ExecutionResult:
        """Open Maestro Studio for interactive testing."""
        log("Opening Maestro Studio...")

        try:
            subprocess.Popen(
                ["maestro", "studio"],
                cwd=self.project_path,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

            return ExecutionResult.ok(data={
                "message": "Maestro Studio opened. Visit http://localhost:9999"
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def hierarchy(self, output_path: str = None) -> ExecutionResult:
        """Get the current view hierarchy."""
        try:
            result = subprocess.run(
                ["maestro", "hierarchy"],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                if output_path:
                    with open(output_path, "w") as f:
                        f.write(result.stdout)

                return ExecutionResult.ok(data={
                    "hierarchy": result.stdout,
                    "saved_to": output_path
                })
            else:
                return ExecutionResult.fail(error=result.stderr)

        except Exception as e:
            return ExecutionResult.fail(error=str(e))


def main():
    parser = argparse.ArgumentParser(
        description="Maestro test runner for HikeWise swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["check", "run", "run-single", "record", "studio", "hierarchy"],
        help="Action to perform"
    )
    parser.add_argument("--flows", help="Directory containing flows")
    parser.add_argument("--flow", help="Single flow file path")
    parser.add_argument("--output", help="Output path")
    parser.add_argument("--timeout", type=int, default=300, help="Timeout per flow in seconds")
    parser.add_argument("--stop-on-failure", action="store_true", help="Stop on first failure")
    parser.add_argument("--debug", action="store_true", help="Enable debug output")
    args = parser.parse_args()

    load_env()
    runner = MaestroTestRunner()

    if args.action == "check":
        result = runner.check_installation()

    elif args.action == "run":
        if not args.flows:
            flows_dir = os.path.join(runner.project_path, ".maestro/flows")
        else:
            flows_dir = args.flows
        result = runner.run_flows(
            flows_dir,
            timeout_per_flow=args.timeout,
            stop_on_failure=args.stop_on_failure
        )

    elif args.action == "run-single":
        if not args.flow:
            print(ExecutionResult.fail(error="--flow required").to_json())
            sys.exit(1)
        result = runner.run_flow(args.flow, timeout=args.timeout, debug=args.debug)

    elif args.action == "record":
        result = runner.record_flow(args.output)

    elif args.action == "studio":
        result = runner.studio()

    elif args.action == "hierarchy":
        result = runner.hierarchy(args.output)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
