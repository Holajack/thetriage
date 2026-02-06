"""
Apple App Store Submission Preflight Check

Validates all requirements are met before submitting to App Store Connect.
This is the final checkpoint before running apple_submit.py.

Usage:
    python execution/apple_submission_preflight.py [--strict]
"""

import json
import os
import sys
from pathlib import Path
from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, PROJECT_ROOT


# Required configurations
REQUIRED_ENV_VARS = [
    "ASC_KEY_ID",
    "ASC_ISSUER_ID",
    "ASC_KEY_PATH"
]

# Required metadata files
REQUIRED_METADATA = [
    "title.txt",
    "full_description.txt",
    "keywords.txt"
]

# Screenshot requirements by device
SCREENSHOT_REQUIREMENTS = {
    "iphone-6.7": {"min": 1, "max": 10, "resolution": (1290, 2796)},
    "iphone-5.5": {"min": 1, "max": 10, "resolution": (1242, 2208)},
}

# Optional but recommended
OPTIONAL_SCREENSHOT_DEVICES = [
    "iphone-6.5",
    "ipad-12.9"
]


class PreflightChecker:
    """Runs all preflight checks and collects results."""

    def __init__(self, strict: bool = False):
        self.strict = strict
        self.checks = []
        self.warnings = []
        self.errors = []

    def check(self, name: str, passed: bool, message: str = "", is_warning: bool = False):
        """Record a check result."""
        status = "PASS" if passed else ("WARN" if is_warning else "FAIL")
        self.checks.append({
            "name": name,
            "status": status,
            "message": message
        })

        if not passed:
            if is_warning:
                self.warnings.append(f"{name}: {message}")
                log(f"[WARN] {name}: {message}", level="warning")
            else:
                self.errors.append(f"{name}: {message}")
                log(f"[FAIL] {name}: {message}", level="error")
        else:
            log(f"[PASS] {name}")

    @property
    def passed(self) -> bool:
        """Return True if all critical checks passed."""
        return len(self.errors) == 0 and (not self.strict or len(self.warnings) == 0)


def check_environment(checker: PreflightChecker):
    """Check required environment variables."""
    env = load_env()

    for var in REQUIRED_ENV_VARS:
        value = env.get(var)
        if value:
            checker.check(f"ENV: {var}", True)
        else:
            checker.check(f"ENV: {var}", False, f"Missing required environment variable")

    # Check ASC key file exists
    key_path = env.get("ASC_KEY_PATH", "")
    if key_path:
        # Expand home directory
        expanded_path = os.path.expanduser(key_path)
        if os.path.exists(expanded_path):
            checker.check("ASC Key File", True)
        else:
            checker.check("ASC Key File", False, f"Key file not found: {expanded_path}")


def check_app_config(checker: PreflightChecker):
    """Check app.json configuration."""
    app_json_path = PROJECT_ROOT / "app.json"

    try:
        with open(app_json_path, "r") as f:
            config = json.load(f)

        expo = config.get("expo", {})
        ios = expo.get("ios", {})

        # Bundle ID
        bundle_id = ios.get("bundleIdentifier")
        if bundle_id:
            checker.check("Bundle ID", True, bundle_id)
        else:
            checker.check("Bundle ID", False, "Missing bundleIdentifier")

        # Version
        version = expo.get("version")
        if version:
            checker.check("App Version", True, version)
        else:
            checker.check("App Version", False, "Missing version")

        # Build number
        build_number = ios.get("buildNumber")
        if build_number:
            checker.check("Build Number", True, build_number)
        else:
            checker.check("Build Number", False, "Missing buildNumber")

        # Privacy manifest
        privacy = ios.get("privacyManifests", {})
        if privacy:
            api_types = len(privacy.get("NSPrivacyAccessedAPITypes", []))
            data_types = len(privacy.get("NSPrivacyCollectedDataTypes", []))
            checker.check("Privacy Manifest", True, f"{api_types} API types, {data_types} data types")
        else:
            checker.check("Privacy Manifest", False, "Missing privacyManifests configuration")

        # Info.plist permissions
        info_plist = ios.get("infoPlist", {})
        required_permissions = [
            "NSCameraUsageDescription",
            "NSPhotoLibraryUsageDescription"
        ]

        for perm in required_permissions:
            if info_plist.get(perm):
                checker.check(f"Permission: {perm}", True)
            else:
                checker.check(f"Permission: {perm}", False, f"Missing usage description", is_warning=True)

        # Tracking transparency
        plugins = expo.get("plugins", [])
        has_tracking = any(
            "tracking-transparency" in str(p).lower()
            for p in plugins
        )
        if has_tracking:
            checker.check("Tracking Transparency", True)
        else:
            checker.check("Tracking Transparency", False, "expo-tracking-transparency not in plugins", is_warning=True)

    except FileNotFoundError:
        checker.check("app.json", False, "File not found")
    except json.JSONDecodeError as e:
        checker.check("app.json", False, f"Invalid JSON: {e}")


def check_eas_config(checker: PreflightChecker):
    """Check EAS configuration."""
    eas_json_path = PROJECT_ROOT / "eas.json"

    try:
        with open(eas_json_path, "r") as f:
            config = json.load(f)

        # Production build profile
        build = config.get("build", {})
        if "production" in build:
            checker.check("EAS Production Build", True)
        else:
            checker.check("EAS Production Build", False, "Missing production build profile")

        # Submit configuration
        submit = config.get("submit", {})
        production_submit = submit.get("production", {})
        ios_submit = production_submit.get("ios", {})

        if ios_submit.get("ascAppId"):
            checker.check("ASC App ID", True, ios_submit["ascAppId"])
        else:
            checker.check("ASC App ID", False, "Missing ascAppId in submit.production.ios")

        if ios_submit.get("appleTeamId"):
            checker.check("Apple Team ID", True, ios_submit["appleTeamId"])
        else:
            checker.check("Apple Team ID", False, "Missing appleTeamId")

    except FileNotFoundError:
        checker.check("eas.json", False, "File not found")
    except json.JSONDecodeError as e:
        checker.check("eas.json", False, f"Invalid JSON: {e}")


def check_metadata(checker: PreflightChecker):
    """Check store metadata files."""
    metadata_dir = PROJECT_ROOT / "store-assets" / "metadata" / "en-US"

    for filename in REQUIRED_METADATA:
        filepath = metadata_dir / filename
        if filepath.exists():
            with open(filepath, "r") as f:
                content = f.read().strip()
                if len(content) > 10:
                    checker.check(f"Metadata: {filename}", True, f"{len(content)} chars")
                else:
                    checker.check(f"Metadata: {filename}", False, "Content too short")
        else:
            checker.check(f"Metadata: {filename}", False, "File not found")


def check_screenshots(checker: PreflightChecker):
    """Check screenshot availability."""
    screenshots_dir = PROJECT_ROOT / "store-assets" / "screenshots"

    if not screenshots_dir.exists():
        checker.check("Screenshots Directory", False, "store-assets/screenshots not found")
        return

    checker.check("Screenshots Directory", True)

    for device, req in SCREENSHOT_REQUIREMENTS.items():
        device_dir = screenshots_dir / device
        if device_dir.exists():
            screenshots = list(device_dir.glob("*.png"))
            count = len(screenshots)

            if count >= req["min"]:
                checker.check(f"Screenshots: {device}", True, f"{count} screenshots")
            else:
                checker.check(f"Screenshots: {device}", False, f"Need at least {req['min']}, found {count}")
        else:
            checker.check(f"Screenshots: {device}", False, f"Missing {device} screenshots", is_warning=True)

    # Optional devices
    for device in OPTIONAL_SCREENSHOT_DEVICES:
        device_dir = screenshots_dir / device
        if device_dir.exists():
            screenshots = list(device_dir.glob("*.png"))
            checker.check(f"Screenshots: {device}", True, f"{len(screenshots)} screenshots (optional)")
        else:
            checker.check(f"Screenshots: {device}", True, "Not provided (optional)", is_warning=True)


def check_legal(checker: PreflightChecker):
    """Check legal requirements."""
    # Privacy policy
    privacy_paths = [
        PROJECT_ROOT / "store-assets" / "legal" / "privacy-policy.md",
        PROJECT_ROOT / ".tmp" / "privacy-policy.md"
    ]

    privacy_found = any(p.exists() for p in privacy_paths)
    if privacy_found:
        checker.check("Privacy Policy", True)
    else:
        checker.check("Privacy Policy", False, "Run generate_privacy_policy.py first")

    # Check store-config for URLs
    store_config_path = PROJECT_ROOT / "store-assets" / "metadata" / "store-config.json"
    try:
        with open(store_config_path, "r") as f:
            config = json.load(f)

        privacy_url = config.get("privacyPolicyUrl")
        if privacy_url and privacy_url.startswith("https://"):
            checker.check("Privacy URL", True, privacy_url)
        else:
            checker.check("Privacy URL", False, "Missing or invalid privacyPolicyUrl")

        support_url = config.get("supportUrl")
        if support_url:
            checker.check("Support URL", True, support_url)
        else:
            checker.check("Support URL", False, "Missing supportUrl", is_warning=True)

    except (FileNotFoundError, json.JSONDecodeError):
        checker.check("Store Config", False, "store-config.json not found or invalid")


def main():
    """Main entry point."""
    strict = "--strict" in sys.argv

    log("Starting Apple App Store Submission Preflight Check")
    log(f"Mode: {'Strict' if strict else 'Normal'}")
    log("-" * 50)

    checker = PreflightChecker(strict=strict)

    # Run all checks
    log("\n[Environment]")
    check_environment(checker)

    log("\n[App Configuration]")
    check_app_config(checker)

    log("\n[EAS Configuration]")
    check_eas_config(checker)

    log("\n[Store Metadata]")
    check_metadata(checker)

    log("\n[Screenshots]")
    check_screenshots(checker)

    log("\n[Legal]")
    check_legal(checker)

    # Summary
    log("\n" + "=" * 50)
    total_checks = len(checker.checks)
    passed = sum(1 for c in checker.checks if c["status"] == "PASS")
    warnings = len(checker.warnings)
    errors = len(checker.errors)

    log(f"Results: {passed}/{total_checks} passed, {warnings} warnings, {errors} errors")

    # Save report
    report = {
        "passed": checker.passed,
        "summary": {
            "total": total_checks,
            "passed": passed,
            "warnings": warnings,
            "errors": errors
        },
        "checks": checker.checks,
        "errors": checker.errors,
        "warnings": checker.warnings
    }

    report_path = save_json(report, "preflight-report.json")

    if checker.passed:
        log("\n[SUCCESS] All preflight checks passed. Ready for submission!")
        return ExecutionResult.ok(report)
    else:
        log(f"\n[FAILED] {errors} critical issues must be resolved before submission.")
        return ExecutionResult.fail(
            f"Preflight failed with {errors} errors",
            **report
        )


if __name__ == "__main__":
    result = main()
    print("\n" + result.to_json())
