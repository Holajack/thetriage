"""
Apple App Store Screenshot Generator

Automates capturing App Store screenshots using iOS Simulator
and Maestro for UI automation.

Requirements:
    - Xcode with iOS Simulators installed
    - Maestro CLI (brew install maestro)
    - ImageMagick (brew install imagemagick) for post-processing

Usage:
    python execution/apple_screenshot_generator.py [--device DEVICE] [--screen SCREEN]
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Optional
from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, PROJECT_ROOT


# Device configurations for App Store
DEVICE_CONFIGS = {
    "iphone-6.7": {
        "name": "iPhone 15 Pro Max",
        "simulator": "iPhone 15 Pro Max",
        "resolution": (1290, 2796),
        "required": True
    },
    "iphone-6.5": {
        "name": "iPhone 15 Plus",
        "simulator": "iPhone 15 Plus",
        "resolution": (1242, 2688),
        "required": True,
        "can_use_6.7": True  # Can use 6.7" screenshots scaled
    },
    "iphone-5.5": {
        "name": "iPhone 8 Plus",
        "simulator": "iPhone 8 Plus",
        "resolution": (1242, 2208),
        "required": True
    },
    "ipad-12.9": {
        "name": "iPad Pro 12.9\"",
        "simulator": "iPad Pro (12.9-inch) (6th generation)",
        "resolution": (2048, 2732),
        "required": False  # Only if supporting iPad
    }
}

# Screens to capture (from store-config.json)
SCREENS_TO_CAPTURE = [
    {
        "id": "home",
        "name": "HomeScreen",
        "description": "Main landing with Focus button",
        "caption": "Start your focused study session"
    },
    {
        "id": "study",
        "name": "StudySessionScreen",
        "description": "Timer in progress with forest background",
        "caption": "Beautiful focus timer with ambient sounds"
    },
    {
        "id": "nora",
        "name": "NoraScreen",
        "description": "AI assistant chat",
        "caption": "AI-powered study assistant"
    },
    {
        "id": "analytics",
        "name": "AnalyticsScreen",
        "description": "Progress charts and statistics",
        "caption": "Track your study progress"
    },
    {
        "id": "leaderboard",
        "name": "LeaderboardScreen",
        "description": "Community rankings",
        "caption": "Compete with the community"
    },
    {
        "id": "subscription",
        "name": "SubscriptionScreen",
        "description": "Premium features showcase",
        "caption": "Unlock premium features"
    },
    {
        "id": "profile",
        "name": "ProfileScreen",
        "description": "User customization",
        "caption": "Personalize your experience"
    }
]


def get_screenshot_dir() -> Path:
    """Get/create the screenshots output directory."""
    screenshot_dir = PROJECT_ROOT / "store-assets" / "screenshots"
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    return screenshot_dir


def check_dependencies() -> tuple[bool, list[str]]:
    """Check if required dependencies are installed."""
    missing = []

    # Check xcrun (Xcode)
    try:
        subprocess.run(["xcrun", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        missing.append("Xcode command line tools (xcrun)")

    # Check Maestro
    try:
        subprocess.run(["maestro", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        missing.append("Maestro CLI (brew install maestro)")

    # Check ImageMagick (optional for post-processing)
    try:
        subprocess.run(["convert", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        log("ImageMagick not found - screenshot framing will be skipped", level="warning")

    return len(missing) == 0, missing


def list_available_simulators() -> list[dict]:
    """List available iOS simulators."""
    try:
        result = subprocess.run(
            ["xcrun", "simctl", "list", "devices", "--json"],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(result.stdout)

        simulators = []
        for runtime, devices in data.get("devices", {}).items():
            if "iOS" in runtime:
                for device in devices:
                    if device.get("isAvailable", False):
                        simulators.append({
                            "name": device["name"],
                            "udid": device["udid"],
                            "state": device["state"],
                            "runtime": runtime
                        })
        return simulators
    except Exception as e:
        log(f"Error listing simulators: {e}", level="error")
        return []


def boot_simulator(device_name: str) -> Optional[str]:
    """Boot a simulator and return its UDID."""
    simulators = list_available_simulators()

    # Find matching simulator
    for sim in simulators:
        if device_name.lower() in sim["name"].lower():
            udid = sim["udid"]

            if sim["state"] != "Booted":
                log(f"Booting simulator: {sim['name']}")
                subprocess.run(["xcrun", "simctl", "boot", udid], check=True)
            else:
                log(f"Simulator already booted: {sim['name']}")

            return udid

    log(f"Simulator not found: {device_name}", level="error")
    return None


def capture_screenshot(udid: str, output_path: Path) -> bool:
    """Capture a screenshot from a running simulator."""
    try:
        subprocess.run(
            ["xcrun", "simctl", "io", udid, "screenshot", str(output_path)],
            check=True,
            capture_output=True
        )
        log(f"Captured: {output_path.name}")
        return True
    except subprocess.CalledProcessError as e:
        log(f"Screenshot failed: {e}", level="error")
        return False


def generate_maestro_flow(screens: list[dict]) -> str:
    """Generate a Maestro flow file for automated navigation."""
    flow = """appId: com.hikewise.app
---
# HikeWise Screenshot Automation Flow
# Generated by apple_screenshot_generator.py

- launchApp

# Wait for app to fully load
- waitForAnimationToEnd:
    timeout: 5000

"""

    for screen in screens:
        flow += f"""
# {screen['description']}
- tapOn: "{screen['name']}"
- waitForAnimationToEnd:
    timeout: 2000
- takeScreenshot: "{screen['id']}"

"""

    return flow


def create_manual_instructions() -> str:
    """Generate manual screenshot instructions if automation fails."""
    instructions = """# Manual Screenshot Instructions for HikeWise

Since automated screenshot capture requires additional setup, follow these steps:

## Prerequisites
1. Install Maestro: `brew install maestro`
2. Have iOS Simulator running with a development build

## Device Setup

### iPhone 6.7" (Required)
1. Open Simulator > File > Open Device > iPhone 15 Pro Max
2. Window > Physical Size

### iPhone 5.5" (Required)
1. Open Simulator > File > Open Device > iPhone 8 Plus
2. Window > Physical Size

## Screens to Capture

For EACH device, capture these screens:

"""

    for i, screen in enumerate(SCREENS_TO_CAPTURE, 1):
        instructions += f"""{i}. **{screen['name']}** - {screen['description']}
   - Navigate to the screen
   - Cmd+S to save screenshot
   - Save as `{screen['id']}_[device].png`

"""

    instructions += """
## Screenshot Naming Convention

Save files as: `[screen_id]_[device].png`

Examples:
- home_iphone-6.7.png
- study_iphone-6.7.png
- home_iphone-5.5.png

## Output Location

Save all screenshots to: `store-assets/screenshots/`

## Post-Processing (Optional)

Use the ImageMagick commands below to add device frames:
```bash
# Example: Add iPhone frame
convert input.png -resize 1290x2796 \\
  -gravity center -extent 1290x2796 \\
  output.png
```
"""

    return instructions


def main():
    """Main entry point."""
    load_env()

    # Parse arguments
    target_device = None
    target_screen = None

    for arg in sys.argv[1:]:
        if arg.startswith("--device="):
            target_device = arg.split("=")[1]
        elif arg.startswith("--screen="):
            target_screen = arg.split("=")[1]

    try:
        # Check dependencies
        deps_ok, missing = check_dependencies()

        if not deps_ok:
            log("Missing dependencies - generating manual instructions", level="warning")

            # Generate manual instructions
            instructions = create_manual_instructions()
            output_path = get_tmp_path("screenshot-instructions.md")
            with open(output_path, "w") as f:
                f.write(instructions)

            # Also save Maestro flow template
            flow = generate_maestro_flow(SCREENS_TO_CAPTURE)
            flow_path = PROJECT_ROOT / "maestro" / "screenshots.yaml"
            flow_path.parent.mkdir(parents=True, exist_ok=True)
            with open(flow_path, "w") as f:
                f.write(flow)

            return ExecutionResult.ok({
                "mode": "manual",
                "instructions_path": str(output_path),
                "maestro_flow_path": str(flow_path),
                "missing_dependencies": missing,
                "devices_needed": [d for d, c in DEVICE_CONFIGS.items() if c["required"]],
                "screens_to_capture": [s["id"] for s in SCREENS_TO_CAPTURE]
            })

        screenshot_dir = get_screenshot_dir()
        captured = []

        # Filter devices if specified
        devices = DEVICE_CONFIGS.items()
        if target_device:
            devices = [(k, v) for k, v in devices if k == target_device]

        for device_id, config in devices:
            if not config["required"] and not target_device:
                continue

            log(f"Processing device: {config['name']}")

            # Boot simulator
            udid = boot_simulator(config["simulator"])
            if not udid:
                log(f"Skipping {device_id} - simulator not available", level="warning")
                continue

            # Create device output directory
            device_dir = screenshot_dir / device_id
            device_dir.mkdir(exist_ok=True)

            # Capture each screen
            screens = SCREENS_TO_CAPTURE
            if target_screen:
                screens = [s for s in screens if s["id"] == target_screen]

            for screen in screens:
                output_path = device_dir / f"{screen['id']}.png"

                # Note: In a full implementation, this would use Maestro
                # to navigate to the screen before capturing
                log(f"  Capturing {screen['id']}...")

                if capture_screenshot(udid, output_path):
                    captured.append({
                        "device": device_id,
                        "screen": screen["id"],
                        "path": str(output_path)
                    })

        return ExecutionResult.ok({
            "mode": "automated",
            "captured": captured,
            "total_captured": len(captured),
            "output_dir": str(screenshot_dir)
        })

    except Exception as e:
        log(f"Error: {e}", level="error")
        return ExecutionResult.fail(str(e))


if __name__ == "__main__":
    result = main()
    print(result.to_json())
