#!/usr/bin/env python3
"""
Xcode Simulator Manager for HikeWise Swarm

Controls iOS simulators for automated testing.
Handles boot, install, screenshot, and tap operations.

Usage:
    # Boot a simulator
    python execution/xcode_simulator_manager.py \
        --action boot \
        --device "iPhone 15 Pro"

    # Install app
    python execution/xcode_simulator_manager.py \
        --action install \
        --app-path build.app

    # Take screenshot
    python execution/xcode_simulator_manager.py \
        --action screenshot \
        --output screenshot.png

    # List available devices
    python execution/xcode_simulator_manager.py --action list
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


class XcodeSimulatorManager:
    """
    Manages iOS simulators via xcrun simctl.
    """

    def __init__(self):
        self.screenshots_dir = get_tmp_path("screenshots")
        os.makedirs(self.screenshots_dir, exist_ok=True)

    def list_devices(self, booted_only: bool = False) -> ExecutionResult:
        """List available simulator devices."""
        try:
            result = subprocess.run(
                ["xcrun", "simctl", "list", "devices", "-j"],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"simctl failed: {result.stderr}")

            devices_data = json.loads(result.stdout)
            devices = []

            for runtime, device_list in devices_data.get("devices", {}).items():
                # Extract iOS version from runtime
                if "iOS" not in runtime:
                    continue

                for device in device_list:
                    if booted_only and device.get("state") != "Booted":
                        continue

                    devices.append({
                        "name": device.get("name"),
                        "udid": device.get("udid"),
                        "state": device.get("state"),
                        "runtime": runtime,
                        "isAvailable": device.get("isAvailable", False)
                    })

            return ExecutionResult.ok(data={
                "devices": devices,
                "count": len(devices)
            })

        except FileNotFoundError:
            return ExecutionResult.fail(error="Xcode not installed or simctl not available")
        except json.JSONDecodeError as e:
            return ExecutionResult.fail(error=f"Failed to parse device list: {e}")

    def get_booted_device(self) -> Optional[Dict]:
        """Get the currently booted device."""
        result = self.list_devices(booted_only=True)
        if result.success and result.data["devices"]:
            return result.data["devices"][0]
        return None

    def find_device(self, name: str) -> Optional[Dict]:
        """Find a device by name."""
        result = self.list_devices()
        if not result.success:
            return None

        for device in result.data["devices"]:
            if device["name"] == name and device.get("isAvailable"):
                return device

        return None

    def boot_device(self, device_name: str = "iPhone 15 Pro", wait: bool = True) -> ExecutionResult:
        """Boot a simulator device."""
        # Check if already booted
        booted = self.get_booted_device()
        if booted and booted["name"] == device_name:
            log(f"Device {device_name} is already booted")
            return ExecutionResult.ok(data={
                "udid": booted["udid"],
                "name": device_name,
                "already_booted": True
            })

        # Find device
        device = self.find_device(device_name)
        if not device:
            return ExecutionResult.fail(error=f"Device not found: {device_name}")

        udid = device["udid"]
        log(f"Booting simulator: {device_name} ({udid})")

        try:
            # Boot the device
            result = subprocess.run(
                ["xcrun", "simctl", "boot", udid],
                capture_output=True,
                text=True
            )

            if result.returncode != 0 and "already booted" not in result.stderr.lower():
                return ExecutionResult.fail(error=f"Boot failed: {result.stderr}")

            if wait:
                # Wait for device to be ready
                self._wait_for_boot(udid)

            # Open Simulator app
            subprocess.run(["open", "-a", "Simulator"], capture_output=True)

            return ExecutionResult.ok(data={
                "udid": udid,
                "name": device_name,
                "booted": True
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def _wait_for_boot(self, udid: str, timeout: int = 60):
        """Wait for a device to finish booting."""
        start = time.time()
        while time.time() - start < timeout:
            try:
                result = subprocess.run(
                    ["xcrun", "simctl", "bootstatus", udid, "-b"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    return True
            except subprocess.TimeoutExpired:
                pass
            time.sleep(2)
        return False

    def shutdown_device(self, udid: str = None) -> ExecutionResult:
        """Shutdown a simulator device."""
        if not udid:
            booted = self.get_booted_device()
            if not booted:
                return ExecutionResult.ok(data={"message": "No device to shutdown"})
            udid = booted["udid"]

        try:
            result = subprocess.run(
                ["xcrun", "simctl", "shutdown", udid],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Shutdown failed: {result.stderr}")

            return ExecutionResult.ok(data={
                "udid": udid,
                "shutdown": True
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def install_app(self, app_path: str, udid: str = None) -> ExecutionResult:
        """Install an app on the simulator."""
        if not os.path.exists(app_path):
            return ExecutionResult.fail(error=f"App not found: {app_path}")

        if not udid:
            booted = self.get_booted_device()
            if not booted:
                return ExecutionResult.fail(error="No booted device")
            udid = booted["udid"]

        log(f"Installing app: {app_path}")

        try:
            result = subprocess.run(
                ["xcrun", "simctl", "install", udid, app_path],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Install failed: {result.stderr}")

            return ExecutionResult.ok(data={
                "app_path": app_path,
                "udid": udid,
                "installed": True
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def launch_app(self, bundle_id: str, udid: str = None, env: Dict = None) -> ExecutionResult:
        """Launch an app on the simulator."""
        if not udid:
            booted = self.get_booted_device()
            if not booted:
                return ExecutionResult.fail(error="No booted device")
            udid = booted["udid"]

        log(f"Launching app: {bundle_id}")

        try:
            cmd = ["xcrun", "simctl", "launch", udid, bundle_id]

            # Add environment variables
            if env:
                for key, value in env.items():
                    cmd.extend(["--args", f"-{key}", str(value)])

            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Launch failed: {result.stderr}")

            # Extract PID from output
            pid = None
            if result.stdout:
                parts = result.stdout.strip().split()
                if len(parts) >= 2:
                    try:
                        pid = int(parts[-1])
                    except ValueError:
                        pass

            return ExecutionResult.ok(data={
                "bundle_id": bundle_id,
                "udid": udid,
                "pid": pid,
                "launched": True
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def terminate_app(self, bundle_id: str, udid: str = None) -> ExecutionResult:
        """Terminate an app on the simulator."""
        if not udid:
            booted = self.get_booted_device()
            if not booted:
                return ExecutionResult.fail(error="No booted device")
            udid = booted["udid"]

        try:
            result = subprocess.run(
                ["xcrun", "simctl", "terminate", udid, bundle_id],
                capture_output=True,
                text=True
            )

            return ExecutionResult.ok(data={
                "bundle_id": bundle_id,
                "terminated": True
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def take_screenshot(self, output_path: str = None, udid: str = None) -> ExecutionResult:
        """Capture a screenshot from the simulator."""
        if not udid:
            booted = self.get_booted_device()
            if not booted:
                return ExecutionResult.fail(error="No booted device")
            udid = booted["udid"]

        if not output_path:
            output_path = os.path.join(
                self.screenshots_dir,
                f"screenshot_{timestamp().replace(':', '-')}.png"
            )

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        try:
            result = subprocess.run(
                ["xcrun", "simctl", "io", udid, "screenshot", output_path],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Screenshot failed: {result.stderr}")

            return ExecutionResult.ok(data={
                "screenshot_path": output_path,
                "udid": udid
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def get_app_container(self, bundle_id: str, container_type: str = "data", udid: str = None) -> ExecutionResult:
        """Get the container path for an app."""
        if not udid:
            booted = self.get_booted_device()
            if not booted:
                return ExecutionResult.fail(error="No booted device")
            udid = booted["udid"]

        try:
            result = subprocess.run(
                ["xcrun", "simctl", "get_app_container", udid, bundle_id, container_type],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Failed: {result.stderr}")

            return ExecutionResult.ok(data={
                "container_path": result.stdout.strip(),
                "container_type": container_type
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def erase_device(self, udid: str = None) -> ExecutionResult:
        """Erase all content and settings from device."""
        if not udid:
            booted = self.get_booted_device()
            if not booted:
                return ExecutionResult.fail(error="No booted device")
            udid = booted["udid"]

        try:
            # Shutdown first
            subprocess.run(["xcrun", "simctl", "shutdown", udid], capture_output=True)

            # Erase
            result = subprocess.run(
                ["xcrun", "simctl", "erase", udid],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Erase failed: {result.stderr}")

            return ExecutionResult.ok(data={
                "udid": udid,
                "erased": True
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def set_status_bar(self, udid: str = None, time: str = "9:41", battery: int = 100) -> ExecutionResult:
        """Set status bar for clean screenshots."""
        if not udid:
            booted = self.get_booted_device()
            if not booted:
                return ExecutionResult.fail(error="No booted device")
            udid = booted["udid"]

        try:
            result = subprocess.run([
                "xcrun", "simctl", "status_bar", udid, "override",
                "--time", time,
                "--batteryLevel", str(battery),
                "--batteryState", "charged",
                "--cellularMode", "active",
                "--cellularBars", "4",
                "--wifiBars", "3"
            ], capture_output=True, text=True)

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Failed: {result.stderr}")

            return ExecutionResult.ok(data={
                "udid": udid,
                "time": time,
                "battery": battery
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))


def main():
    parser = argparse.ArgumentParser(
        description="Xcode simulator manager for HikeWise swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["list", "boot", "shutdown", "install", "launch", "terminate",
                 "screenshot", "container", "erase", "status-bar"],
        help="Action to perform"
    )
    parser.add_argument("--device", help="Device name (default: iPhone 15 Pro)")
    parser.add_argument("--udid", help="Device UDID")
    parser.add_argument("--app-path", help="Path to .app bundle")
    parser.add_argument("--bundle-id", help="App bundle ID")
    parser.add_argument("--output", help="Output path")
    parser.add_argument("--booted", action="store_true", help="List only booted devices")
    args = parser.parse_args()

    load_env()
    manager = XcodeSimulatorManager()

    if args.action == "list":
        result = manager.list_devices(booted_only=args.booted)

    elif args.action == "boot":
        device = args.device or "iPhone 15 Pro"
        result = manager.boot_device(device)

    elif args.action == "shutdown":
        result = manager.shutdown_device(args.udid)

    elif args.action == "install":
        if not args.app_path:
            print(ExecutionResult.fail(error="--app-path required").to_json())
            sys.exit(1)
        result = manager.install_app(args.app_path, args.udid)

    elif args.action == "launch":
        if not args.bundle_id:
            print(ExecutionResult.fail(error="--bundle-id required").to_json())
            sys.exit(1)
        # Support TEST_MODE via environment
        env = {}
        if os.environ.get("EXPO_PUBLIC_TEST_MODE"):
            env["EXPO_PUBLIC_TEST_MODE"] = "true"
        result = manager.launch_app(args.bundle_id, args.udid, env if env else None)

    elif args.action == "terminate":
        if not args.bundle_id:
            print(ExecutionResult.fail(error="--bundle-id required").to_json())
            sys.exit(1)
        result = manager.terminate_app(args.bundle_id, args.udid)

    elif args.action == "screenshot":
        result = manager.take_screenshot(args.output, args.udid)

    elif args.action == "container":
        if not args.bundle_id:
            print(ExecutionResult.fail(error="--bundle-id required").to_json())
            sys.exit(1)
        result = manager.get_app_container(args.bundle_id, udid=args.udid)

    elif args.action == "erase":
        result = manager.erase_device(args.udid)

    elif args.action == "status-bar":
        result = manager.set_status_bar(args.udid)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
