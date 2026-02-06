#!/usr/bin/env python3
"""
Version Bumper for HikeWise Swarm

Handles semantic versioning for the HikeWise app.
Updates app.json, package.json, and generates changelogs.

Usage:
    # Bump patch version (1.7.0 -> 1.7.1)
    python execution/version_bumper.py --action bump --type patch

    # Bump minor version (1.7.0 -> 1.8.0)
    python execution/version_bumper.py --action bump --type minor

    # Bump major version (1.7.0 -> 2.0.0)
    python execution/version_bumper.py --action bump --type major

    # Generate changelog
    python execution/version_bumper.py --action changelog
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, ExecutionResult, timestamp


class VersionBumper:
    """
    Manages semantic versioning for the app.
    """

    def __init__(self, project_path: str = None):
        self.project_path = project_path or str(Path(__file__).parent.parent)
        self.app_json_path = os.path.join(self.project_path, "app.json")
        self.package_json_path = os.path.join(self.project_path, "package.json")
        self.changelog_path = os.path.join(self.project_path, "CHANGELOG.md")

    def get_current_version(self) -> ExecutionResult:
        """Get current version info from app.json."""
        try:
            with open(self.app_json_path, "r") as f:
                app_json = json.load(f)

            expo = app_json.get("expo", {})

            return ExecutionResult.ok(data={
                "version": expo.get("version"),
                "ios_build_number": expo.get("ios", {}).get("buildNumber"),
                "android_version_code": expo.get("android", {}).get("versionCode"),
                "runtime_version": expo.get("runtimeVersion")
            })

        except FileNotFoundError:
            return ExecutionResult.fail(error="app.json not found")
        except json.JSONDecodeError as e:
            return ExecutionResult.fail(error=f"Invalid app.json: {e}")

    def bump_version(
        self,
        bump_type: str,
        prerelease: str = None,
        sync_package: bool = True
    ) -> ExecutionResult:
        """
        Bump version according to semver.

        Args:
            bump_type: major, minor, patch, or prerelease
            prerelease: Prerelease identifier (alpha, beta, rc)
            sync_package: Also update package.json
        """
        current = self.get_current_version()
        if not current.success:
            return current

        old_version = current.data["version"]
        new_version = self._calculate_new_version(old_version, bump_type, prerelease)

        log(f"Bumping version: {old_version} -> {new_version}")

        # Update app.json
        app_result = self._update_app_json(new_version)
        if not app_result.success:
            return app_result

        # Update package.json
        if sync_package:
            pkg_result = self._update_package_json(new_version)
            if not pkg_result.success:
                log(f"Warning: Could not update package.json: {pkg_result.error}", level="warning")

        return ExecutionResult.ok(data={
            "old_version": old_version,
            "new_version": new_version,
            "bump_type": bump_type,
            "ios_build_number": app_result.data.get("ios_build_number"),
            "android_version_code": app_result.data.get("android_version_code")
        })

    def _calculate_new_version(self, version: str, bump_type: str, prerelease: str = None) -> str:
        """Calculate new version based on bump type."""
        # Parse version
        match = re.match(r"^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$", version)
        if not match:
            raise ValueError(f"Invalid version format: {version}")

        major, minor, patch = int(match.group(1)), int(match.group(2)), int(match.group(3))
        pre = match.group(4)

        if bump_type == "major":
            major += 1
            minor = 0
            patch = 0
            pre = None
        elif bump_type == "minor":
            minor += 1
            patch = 0
            pre = None
        elif bump_type == "patch":
            patch += 1
            pre = None
        elif bump_type == "prerelease":
            if prerelease:
                if pre and pre.startswith(prerelease):
                    # Increment prerelease number
                    pre_match = re.match(rf"^{prerelease}\.(\d+)$", pre)
                    if pre_match:
                        pre = f"{prerelease}.{int(pre_match.group(1)) + 1}"
                    else:
                        pre = f"{prerelease}.1"
                else:
                    pre = f"{prerelease}.1"
            else:
                raise ValueError("prerelease identifier required for prerelease bump")

        new_version = f"{major}.{minor}.{patch}"
        if pre:
            new_version += f"-{pre}"

        return new_version

    def _update_app_json(self, new_version: str) -> ExecutionResult:
        """Update version in app.json."""
        try:
            with open(self.app_json_path, "r") as f:
                app_json = json.load(f)

            expo = app_json.get("expo", {})

            # Update version
            expo["version"] = new_version

            # Update runtimeVersion to match
            expo["runtimeVersion"] = new_version

            # Increment build numbers
            ios_config = expo.setdefault("ios", {})
            current_ios_build = ios_config.get("buildNumber", "1")
            new_ios_build = str(int(current_ios_build) + 1)
            ios_config["buildNumber"] = new_ios_build

            android_config = expo.setdefault("android", {})
            current_android_code = android_config.get("versionCode", 1)
            new_android_code = current_android_code + 1
            android_config["versionCode"] = new_android_code

            app_json["expo"] = expo

            # Write back
            with open(self.app_json_path, "w") as f:
                json.dump(app_json, f, indent=2)

            return ExecutionResult.ok(data={
                "version": new_version,
                "ios_build_number": new_ios_build,
                "android_version_code": new_android_code
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def _update_package_json(self, new_version: str) -> ExecutionResult:
        """Update version in package.json."""
        try:
            with open(self.package_json_path, "r") as f:
                package_json = json.load(f)

            package_json["version"] = new_version

            with open(self.package_json_path, "w") as f:
                json.dump(package_json, f, indent=2)

            return ExecutionResult.ok(data={"version": new_version})

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def generate_changelog(
        self,
        from_tag: str = None,
        to_ref: str = "HEAD"
    ) -> ExecutionResult:
        """Generate changelog from git commits."""
        try:
            # Get current version
            current = self.get_current_version()
            version = current.data["version"] if current.success else "Unreleased"

            # Get last tag if not specified
            if not from_tag:
                result = subprocess.run(
                    ["git", "describe", "--tags", "--abbrev=0"],
                    cwd=self.project_path,
                    capture_output=True,
                    text=True
                )
                from_tag = result.stdout.strip() if result.returncode == 0 else None

            # Get commits
            if from_tag:
                cmd = ["git", "log", f"{from_tag}..{to_ref}", "--pretty=format:%s|%h|%an"]
            else:
                cmd = ["git", "log", "-50", "--pretty=format:%s|%h|%an"]

            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return ExecutionResult.fail(error=f"Git log failed: {result.stderr}")

            # Parse commits
            commits = []
            categories = {
                "feat": [],
                "fix": [],
                "docs": [],
                "style": [],
                "refactor": [],
                "perf": [],
                "test": [],
                "chore": [],
                "other": []
            }

            for line in result.stdout.strip().split("\n"):
                if not line:
                    continue

                parts = line.split("|")
                if len(parts) >= 2:
                    message = parts[0]
                    commit_hash = parts[1]
                    author = parts[2] if len(parts) > 2 else "Unknown"

                    # Categorize by conventional commit type
                    categorized = False
                    for cat in categories:
                        if message.lower().startswith(f"{cat}:") or message.lower().startswith(f"{cat}("):
                            categories[cat].append({
                                "message": message,
                                "hash": commit_hash,
                                "author": author
                            })
                            categorized = True
                            break

                    if not categorized:
                        categories["other"].append({
                            "message": message,
                            "hash": commit_hash,
                            "author": author
                        })

            # Generate markdown
            changelog_entry = self._format_changelog(version, categories)

            # Prepend to existing changelog
            if os.path.exists(self.changelog_path):
                with open(self.changelog_path, "r") as f:
                    existing = f.read()

                # Insert after header
                if existing.startswith("# Changelog"):
                    header_end = existing.find("\n\n") + 2
                    new_content = existing[:header_end] + changelog_entry + "\n" + existing[header_end:]
                else:
                    new_content = f"# Changelog\n\n{changelog_entry}\n\n{existing}"
            else:
                new_content = f"# Changelog\n\n{changelog_entry}"

            with open(self.changelog_path, "w") as f:
                f.write(new_content)

            return ExecutionResult.ok(data={
                "version": version,
                "changelog_path": self.changelog_path,
                "commits_processed": sum(len(c) for c in categories.values()),
                "entry": changelog_entry
            })

        except Exception as e:
            return ExecutionResult.fail(error=str(e))

    def _format_changelog(self, version: str, categories: Dict[str, List]) -> str:
        """Format changelog entry from categorized commits."""
        date = datetime.now().strftime("%Y-%m-%d")
        lines = [f"## [{version}] - {date}\n"]

        category_titles = {
            "feat": "Features",
            "fix": "Bug Fixes",
            "perf": "Performance",
            "refactor": "Refactoring",
            "docs": "Documentation",
            "style": "Styling",
            "test": "Tests",
            "chore": "Chores",
            "other": "Other Changes"
        }

        for cat, title in category_titles.items():
            commits = categories.get(cat, [])
            if commits:
                lines.append(f"\n### {title}\n")
                for commit in commits:
                    # Clean up message
                    msg = commit["message"]
                    # Remove conventional commit prefix
                    msg = re.sub(r"^(feat|fix|docs|style|refactor|perf|test|chore)(\([^)]+\))?:\s*", "", msg, flags=re.IGNORECASE)
                    lines.append(f"- {msg} ({commit['hash']})")

        return "\n".join(lines)

    def set_version(self, version: str) -> ExecutionResult:
        """Set a specific version (for overrides)."""
        # Validate version format
        if not re.match(r"^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$", version):
            return ExecutionResult.fail(error=f"Invalid version format: {version}")

        return self._update_app_json(version)


def main():
    parser = argparse.ArgumentParser(
        description="Version bumper for HikeWise"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["current", "bump", "set", "changelog"],
        help="Action to perform"
    )
    parser.add_argument(
        "--type",
        choices=["major", "minor", "patch", "prerelease"],
        help="Bump type"
    )
    parser.add_argument("--version", help="Specific version (for set action)")
    parser.add_argument("--prerelease", help="Prerelease identifier (alpha, beta, rc)")
    parser.add_argument("--from-tag", help="Git tag to generate changelog from")
    parser.add_argument("--no-sync-package", action="store_true", help="Don't sync package.json")
    args = parser.parse_args()

    load_env()
    bumper = VersionBumper()

    if args.action == "current":
        result = bumper.get_current_version()

    elif args.action == "bump":
        if not args.type:
            print(ExecutionResult.fail(error="--type required for bump").to_json())
            sys.exit(1)
        result = bumper.bump_version(
            args.type,
            prerelease=args.prerelease,
            sync_package=not args.no_sync_package
        )

    elif args.action == "set":
        if not args.version:
            print(ExecutionResult.fail(error="--version required for set").to_json())
            sys.exit(1)
        result = bumper.set_version(args.version)

    elif args.action == "changelog":
        result = bumper.generate_changelog(from_tag=args.from_tag)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
