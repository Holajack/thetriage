"""
Apple Privacy Manifest Generator

Generates and validates the iOS privacy manifest (PrivacyInfo.xcprivacy)
for App Store compliance. Since Expo SDK 54 supports privacyManifests
in app.json, this script validates the configuration.

Usage:
    python execution/apple_privacy_manifest.py [--validate]
"""

import json
import sys
from pathlib import Path
from utils import load_env, log, ExecutionResult, PROJECT_ROOT


# Required privacy API types for HikeWise
REQUIRED_API_TYPES = [
    {
        "type": "NSPrivacyAccessedAPICategoryUserDefaults",
        "reasons": ["CA92.1"],  # Access to user defaults for app functionality
        "description": "AsyncStorage, SecureStore, Clerk auth state"
    },
    {
        "type": "NSPrivacyAccessedAPICategoryFileTimestamp",
        "reasons": ["C617.1"],  # File timestamps for document handling
        "description": "expo-file-system for document management"
    },
    {
        "type": "NSPrivacyAccessedAPICategoryDiskSpace",
        "reasons": ["E174.1"],  # Disk space for storage management
        "description": "Storage quota checks"
    }
]

# Data types collected by HikeWise
COLLECTED_DATA_TYPES = [
    {
        "type": "NSPrivacyCollectedDataTypeEmailAddress",
        "linked": True,
        "tracking": False,
        "purposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        "description": "User email for Clerk authentication"
    },
    {
        "type": "NSPrivacyCollectedDataTypeName",
        "linked": True,
        "tracking": False,
        "purposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        "description": "User name for profile display"
    },
    {
        "type": "NSPrivacyCollectedDataTypeUserID",
        "linked": True,
        "tracking": False,
        "purposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        "description": "Clerk user ID for data association"
    },
    {
        "type": "NSPrivacyCollectedDataTypeProductInteraction",
        "linked": False,
        "tracking": False,
        "purposes": ["NSPrivacyCollectedDataTypePurposeAnalytics"],
        "description": "Study session data, feature usage analytics"
    }
]


def load_app_json() -> dict:
    """Load and parse app.json."""
    app_json_path = PROJECT_ROOT / "app.json"
    with open(app_json_path, "r") as f:
        return json.load(f)


def validate_privacy_manifest(app_config: dict) -> tuple[bool, list[str]]:
    """
    Validate that app.json has proper privacy manifest configuration.

    Returns:
        Tuple of (is_valid, list of issues)
    """
    issues = []
    ios_config = app_config.get("expo", {}).get("ios", {})
    privacy_manifests = ios_config.get("privacyManifests", {})

    if not privacy_manifests:
        issues.append("Missing 'privacyManifests' in ios configuration")
        return False, issues

    # Check API types
    api_types = privacy_manifests.get("NSPrivacyAccessedAPITypes", [])
    configured_types = {t.get("NSPrivacyAccessedAPIType") for t in api_types}

    for required in REQUIRED_API_TYPES:
        if required["type"] not in configured_types:
            issues.append(f"Missing required API type: {required['type']} ({required['description']})")

    # Check data collection types
    data_types = privacy_manifests.get("NSPrivacyCollectedDataTypes", [])
    configured_data = {t.get("NSPrivacyCollectedDataType") for t in data_types}

    for required in COLLECTED_DATA_TYPES:
        if required["type"] not in configured_data:
            issues.append(f"Missing data type declaration: {required['type']} ({required['description']})")

    # Check tracking flag
    if "NSPrivacyTracking" not in privacy_manifests:
        issues.append("Missing NSPrivacyTracking declaration")

    return len(issues) == 0, issues


def generate_privacy_manifest_config() -> dict:
    """
    Generate the privacy manifest configuration for app.json.

    Returns:
        Privacy manifest config dictionary
    """
    return {
        "NSPrivacyAccessedAPITypes": [
            {
                "NSPrivacyAccessedAPIType": api["type"],
                "NSPrivacyAccessedAPITypeReasons": api["reasons"]
            }
            for api in REQUIRED_API_TYPES
        ],
        "NSPrivacyCollectedDataTypes": [
            {
                "NSPrivacyCollectedDataType": data["type"],
                "NSPrivacyCollectedDataTypeLinked": data["linked"],
                "NSPrivacyCollectedDataTypeTracking": data["tracking"],
                "NSPrivacyCollectedDataTypePurposes": data["purposes"]
            }
            for data in COLLECTED_DATA_TYPES
        ],
        "NSPrivacyTracking": False
    }


def main():
    """Main entry point."""
    load_env()

    validate_only = "--validate" in sys.argv

    try:
        app_config = load_app_json()
        log("Loaded app.json")

        is_valid, issues = validate_privacy_manifest(app_config)

        if is_valid:
            log("Privacy manifest configuration is valid")
            return ExecutionResult.ok({
                "status": "valid",
                "api_types": len(REQUIRED_API_TYPES),
                "data_types": len(COLLECTED_DATA_TYPES),
                "tracking_enabled": False
            })

        if validate_only:
            log("Privacy manifest has issues:", level="warning")
            for issue in issues:
                log(f"  - {issue}", level="warning")
            return ExecutionResult.fail(
                f"Privacy manifest validation failed with {len(issues)} issues",
                issues=issues
            )

        # Generate and show recommended configuration
        log("Current privacy manifest has issues. Recommended configuration:")
        recommended = generate_privacy_manifest_config()
        print("\n" + json.dumps({"privacyManifests": recommended}, indent=2))

        return ExecutionResult.ok({
            "status": "needs_update",
            "issues": issues,
            "recommended_config": recommended
        })

    except FileNotFoundError:
        return ExecutionResult.fail("app.json not found")
    except json.JSONDecodeError as e:
        return ExecutionResult.fail(f"Invalid JSON in app.json: {e}")
    except Exception as e:
        log(f"Error: {e}", level="error")
        return ExecutionResult.fail(str(e))


if __name__ == "__main__":
    result = main()
    print(result.to_json())
