"""
Apple App Store Metadata Sync

Syncs app metadata from local store-assets files to App Store Connect
using fastlane deliver or the App Store Connect API.

Usage:
    python execution/apple_metadata_sync.py [--dry-run] [--skip-screenshots]
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from utils import load_env, log, save_json, ExecutionResult, PROJECT_ROOT


# Metadata file mappings
METADATA_FILES = {
    "title.txt": "name",
    "short_description.txt": "subtitle",
    "full_description.txt": "description",
    "keywords.txt": "keywords",
    "whats_new.txt": "release_notes",
    "promo_text.txt": "promotional_text",
    "support_url.txt": "support_url",
    "privacy_url.txt": "privacy_url",
    "marketing_url.txt": "marketing_url"
}

# Store config location
STORE_CONFIG_PATH = PROJECT_ROOT / "store-assets" / "metadata" / "store-config.json"
METADATA_DIR = PROJECT_ROOT / "store-assets" / "metadata" / "en-US"
SCREENSHOTS_DIR = PROJECT_ROOT / "store-assets" / "screenshots"


def load_store_config() -> dict:
    """Load store configuration."""
    with open(STORE_CONFIG_PATH, "r") as f:
        return json.load(f)


def load_metadata() -> dict:
    """Load all metadata files into a dictionary."""
    metadata = {}

    for filename, key in METADATA_FILES.items():
        filepath = METADATA_DIR / filename
        if filepath.exists():
            with open(filepath, "r") as f:
                content = f.read().strip()
                metadata[key] = content
                log(f"Loaded {key}: {len(content)} chars")
        else:
            log(f"Missing: {filename}", level="warning")

    return metadata


def validate_metadata(metadata: dict) -> tuple[bool, list[str]]:
    """
    Validate metadata meets App Store requirements.

    Returns:
        Tuple of (is_valid, list of issues)
    """
    issues = []

    # Required fields
    required = ["name", "description", "keywords"]
    for field in required:
        if not metadata.get(field):
            issues.append(f"Missing required field: {field}")

    # Field length limits
    limits = {
        "name": 30,
        "subtitle": 30,
        "keywords": 100,
        "promotional_text": 170,
        "description": 4000
    }

    for field, max_len in limits.items():
        if field in metadata and len(metadata[field]) > max_len:
            issues.append(f"{field} exceeds {max_len} characters (current: {len(metadata[field])})")

    # Keywords format (comma-separated)
    if "keywords" in metadata:
        keywords = [k.strip() for k in metadata["keywords"].split(",")]
        if len(keywords) < 3:
            issues.append("Consider adding more keywords (minimum 3 recommended)")

    return len(issues) == 0, issues


def get_screenshots() -> dict[str, list[Path]]:
    """Get available screenshots organized by device."""
    screenshots = {}

    if not SCREENSHOTS_DIR.exists():
        return screenshots

    for device_dir in SCREENSHOTS_DIR.iterdir():
        if device_dir.is_dir():
            device_screenshots = list(device_dir.glob("*.png"))
            if device_screenshots:
                screenshots[device_dir.name] = device_screenshots
                log(f"Found {len(device_screenshots)} screenshots for {device_dir.name}")

    return screenshots


def generate_fastlane_metadata(metadata: dict, output_dir: Path) -> None:
    """Generate fastlane metadata directory structure."""
    # Create en-US directory for fastlane
    locale_dir = output_dir / "metadata" / "en-US"
    locale_dir.mkdir(parents=True, exist_ok=True)

    # Fastlane file mappings
    fastlane_files = {
        "name.txt": metadata.get("name", ""),
        "subtitle.txt": metadata.get("subtitle", ""),
        "description.txt": metadata.get("description", ""),
        "keywords.txt": metadata.get("keywords", ""),
        "release_notes.txt": metadata.get("release_notes", "Bug fixes and performance improvements."),
        "promotional_text.txt": metadata.get("promotional_text", ""),
        "support_url.txt": metadata.get("support_url", "https://hikewise.app/support"),
        "privacy_url.txt": metadata.get("privacy_url", "https://hikewise.app/privacy"),
        "marketing_url.txt": metadata.get("marketing_url", "https://hikewise.app")
    }

    for filename, content in fastlane_files.items():
        filepath = locale_dir / filename
        with open(filepath, "w") as f:
            f.write(content)
        log(f"Generated {filename}")


def run_fastlane_deliver(dry_run: bool = True, skip_screenshots: bool = False) -> bool:
    """
    Run fastlane deliver to upload metadata.

    Args:
        dry_run: If True, only validate without uploading
        skip_screenshots: If True, skip screenshot upload

    Returns:
        True if successful
    """
    cmd = ["fastlane", "deliver"]

    if dry_run:
        cmd.append("--skip_metadata")
        cmd.append("--skip_screenshots")
        cmd.append("--precheck_include_in_app_purchases")
        log("Running in dry-run mode (validation only)")
    else:
        if skip_screenshots:
            cmd.append("--skip_screenshots")

    try:
        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=300
        )

        if result.returncode == 0:
            log("Fastlane deliver completed successfully")
            return True
        else:
            log(f"Fastlane deliver failed: {result.stderr}", level="error")
            return False

    except subprocess.TimeoutExpired:
        log("Fastlane deliver timed out", level="error")
        return False
    except FileNotFoundError:
        log("Fastlane not installed. Install with: gem install fastlane", level="error")
        return False


def main():
    """Main entry point."""
    env = load_env()

    dry_run = "--dry-run" in sys.argv
    skip_screenshots = "--skip-screenshots" in sys.argv

    try:
        # Load store config
        store_config = load_store_config()
        log(f"App: {store_config['app']['name']} v{store_config['app']['version']}")

        # Load metadata
        metadata = load_metadata()

        if not metadata:
            return ExecutionResult.fail("No metadata files found")

        # Validate metadata
        is_valid, issues = validate_metadata(metadata)

        if not is_valid:
            log("Metadata validation failed:", level="warning")
            for issue in issues:
                log(f"  - {issue}", level="warning")

            if not dry_run:
                return ExecutionResult.fail(
                    f"Metadata validation failed with {len(issues)} issues",
                    issues=issues
                )

        # Get screenshots
        screenshots = get_screenshots()

        # Generate fastlane metadata structure
        fastlane_dir = PROJECT_ROOT / "fastlane"
        generate_fastlane_metadata(metadata, fastlane_dir)

        result_data = {
            "metadata": metadata,
            "validation": {
                "is_valid": is_valid,
                "issues": issues
            },
            "screenshots": {
                device: len(paths) for device, paths in screenshots.items()
            },
            "dry_run": dry_run,
            "skip_screenshots": skip_screenshots
        }

        # Run fastlane if not dry run and validation passed
        if is_valid and not dry_run:
            # Check for fastlane Appfile
            appfile = fastlane_dir / "Appfile"
            if not appfile.exists():
                log("Generating Appfile...")
                appfile_content = f"""# Fastlane Appfile for HikeWise
# Generated by apple_metadata_sync.py

app_identifier "{store_config['app']['bundleId']}"
apple_id "{env.get('APPLE_ID', 'your-apple-id@email.com')}"
team_id "{env.get('APPLE_TEAM_ID', '7YMK4D784T')}"

# App Store Connect API Key
# api_key_path "./AuthKey.json"
"""
                with open(appfile, "w") as f:
                    f.write(appfile_content)

            success = run_fastlane_deliver(dry_run=False, skip_screenshots=skip_screenshots)
            result_data["upload_success"] = success

            if not success:
                return ExecutionResult.fail("Fastlane deliver failed", **result_data)

        return ExecutionResult.ok(result_data)

    except FileNotFoundError as e:
        return ExecutionResult.fail(f"Required file not found: {e}")
    except Exception as e:
        log(f"Error: {e}", level="error")
        return ExecutionResult.fail(str(e))


if __name__ == "__main__":
    result = main()
    print(result.to_json())
