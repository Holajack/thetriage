#!/usr/bin/env python3
"""
Project Config Loader for HikeWise Swarm

Loads project configuration from a config file instead of hardcoded paths.
This abstraction enables future SaaS extraction where multiple projects
can be managed.

Config file: project.json (in project root)

Usage:
    # Load project config
    python execution/project_config_loader.py --action load

    # Validate config
    python execution/project_config_loader.py --action validate

    # Generate default config
    python execution/project_config_loader.py --action init
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional, List

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, ExecutionResult, timestamp


# Default project configuration
DEFAULT_CONFIG = {
    "name": "hikewise",
    "display_name": "HikeWise",
    "version": "1.7.0",
    "platform": "expo",
    "framework": "react-native",

    # Paths
    "paths": {
        "source": "src",
        "screens": "src/screens",
        "components": "src/components",
        "navigation": "src/navigation",
        "hooks": "src/hooks",
        "context": "src/context",
        "utils": "src/utils",
        "assets": "src/assets",
        "backend": "convex",
        "directives": "directives",
        "execution": "execution",
        "maestro_flows": ".maestro/flows",
        "tmp": ".tmp"
    },

    # Build configuration
    "build": {
        "app_id": "com.hikewise.app",
        "bundle_id": "com.hikewise.app",
        "eas_project_id": "8c921112-45b4-48cf-91c3-a1326803d706",
        "apple_team_id": "7YMK4D784T",
        "ios_app_id": "6756673693"
    },

    # Test configuration
    "testing": {
        "simulator_device": "iPhone 15 Pro",
        "test_mode_env": "EXPO_PUBLIC_TEST_MODE",
        "admin_clerk_id": None,  # Set this to enable admin testing
        "maestro_timeout": 300
    },

    # Swarm configuration
    "swarm": {
        "max_agents": 3,
        "base_port": 8081,
        "worktree_prefix": "hikewise-agent",
        "default_branch": "main"
    },

    # Issue tracking
    "issues": {
        "priority_levels": ["critical", "high", "medium", "low"],
        "categories": ["navigation", "ui", "data", "settings", "authentication", "performance"],
        "auto_assign_threshold": "high"  # Auto-assign issues of this priority or higher
    }
}


class ProjectConfigLoader:
    """
    Loads and validates project configuration.

    Configuration sources (in order of precedence):
    1. Environment variables (PROJECT_*)
    2. project.json in project root
    3. Default values
    """

    def __init__(self, project_root: str = None):
        self.project_root = project_root or str(Path(__file__).parent.parent)
        self.config_path = os.path.join(self.project_root, "project.json")

    def load(self) -> Dict:
        """Load project configuration with all sources merged."""
        config = dict(DEFAULT_CONFIG)

        # Load from file if exists
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r") as f:
                    file_config = json.load(f)
                config = self._deep_merge(config, file_config)
                log(f"Loaded config from {self.config_path}")
            except json.JSONDecodeError as e:
                log(f"Invalid project.json: {e}", level="error")

        # Override with environment variables
        config = self._apply_env_overrides(config)

        # Resolve relative paths to absolute
        config = self._resolve_paths(config)

        return config

    def validate(self, config: Dict = None) -> ExecutionResult:
        """Validate project configuration."""
        if config is None:
            config = self.load()

        errors = []
        warnings = []

        # Required fields
        required = ["name", "platform"]
        for field in required:
            if not config.get(field):
                errors.append(f"Missing required field: {field}")

        # Validate paths exist
        paths = config.get("paths", {})
        for path_name, path_value in paths.items():
            if path_name == "tmp":
                continue  # tmp may not exist yet
            full_path = os.path.join(self.project_root, path_value) if not os.path.isabs(path_value) else path_value
            if not os.path.exists(full_path):
                warnings.append(f"Path does not exist: {path_name} = {path_value}")

        # Validate testing config
        testing = config.get("testing", {})
        if not testing.get("admin_clerk_id"):
            warnings.append("No admin_clerk_id set. Admin testing will not be available.")

        # Validate swarm config
        swarm = config.get("swarm", {})
        max_agents = swarm.get("max_agents", 3)
        if max_agents > 5:
            warnings.append(f"max_agents={max_agents} is high. Consider reducing for system stability.")

        return ExecutionResult.ok(data={
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "config": config
        })

    def init_config(self, overwrite: bool = False) -> ExecutionResult:
        """Initialize a project.json file with defaults."""
        if os.path.exists(self.config_path) and not overwrite:
            return ExecutionResult.fail(
                error=f"Config already exists: {self.config_path}. Use --overwrite to replace."
            )

        # Try to auto-detect some values
        config = dict(DEFAULT_CONFIG)

        # Check for app.json (Expo)
        app_json_path = os.path.join(self.project_root, "app.json")
        if os.path.exists(app_json_path):
            try:
                with open(app_json_path, "r") as f:
                    app_json = json.load(f)
                expo = app_json.get("expo", {})
                config["name"] = expo.get("slug", config["name"])
                config["display_name"] = expo.get("name", config["display_name"])
                config["version"] = expo.get("version", config["version"])
                config["build"]["app_id"] = expo.get("android", {}).get("package", config["build"]["app_id"])
                config["build"]["bundle_id"] = expo.get("ios", {}).get("bundleIdentifier", config["build"]["bundle_id"])

                extra = expo.get("extra", {})
                if "eas" in extra:
                    config["build"]["eas_project_id"] = extra["eas"].get("projectId", config["build"]["eas_project_id"])
            except Exception as e:
                log(f"Could not parse app.json: {e}", level="warning")

        # Check for eas.json
        eas_json_path = os.path.join(self.project_root, "eas.json")
        if os.path.exists(eas_json_path):
            try:
                with open(eas_json_path, "r") as f:
                    eas_json = json.load(f)
                submit = eas_json.get("submit", {}).get("production", {}).get("ios", {})
                if "appleTeamId" in submit:
                    config["build"]["apple_team_id"] = submit["appleTeamId"]
                if "appId" in submit:
                    config["build"]["ios_app_id"] = submit["appId"]
            except Exception as e:
                log(f"Could not parse eas.json: {e}", level="warning")

        # Add metadata
        config["_generated"] = {
            "at": timestamp(),
            "by": "project_config_loader.py"
        }

        # Save
        with open(self.config_path, "w") as f:
            json.dump(config, f, indent=2)

        return ExecutionResult.ok(data={
            "config_path": self.config_path,
            "config": config
        })

    def get_path(self, path_key: str) -> Optional[str]:
        """Get an absolute path from config."""
        config = self.load()
        paths = config.get("paths", {})
        rel_path = paths.get(path_key)

        if not rel_path:
            return None

        if os.path.isabs(rel_path):
            return rel_path

        return os.path.join(self.project_root, rel_path)

    def _deep_merge(self, base: Dict, overlay: Dict) -> Dict:
        """Deep merge two dictionaries."""
        result = dict(base)
        for key, value in overlay.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    def _apply_env_overrides(self, config: Dict) -> Dict:
        """Apply environment variable overrides."""
        env_mappings = {
            "PROJECT_NAME": ("name", str),
            "PROJECT_MAX_AGENTS": ("swarm.max_agents", int),
            "PROJECT_BASE_PORT": ("swarm.base_port", int),
            "PROJECT_ADMIN_CLERK_ID": ("testing.admin_clerk_id", str),
            "PROJECT_SIMULATOR_DEVICE": ("testing.simulator_device", str)
        }

        for env_var, (path, converter) in env_mappings.items():
            value = os.environ.get(env_var)
            if value:
                try:
                    converted = converter(value)
                    self._set_nested(config, path, converted)
                except ValueError:
                    pass

        return config

    def _set_nested(self, obj: Dict, path: str, value):
        """Set a nested dictionary value by dot-separated path."""
        keys = path.split(".")
        for key in keys[:-1]:
            obj = obj.setdefault(key, {})
        obj[keys[-1]] = value

    def _resolve_paths(self, config: Dict) -> Dict:
        """Resolve relative paths to absolute."""
        paths = config.get("paths", {})
        for key, value in paths.items():
            if value and not os.path.isabs(value):
                paths[key] = os.path.join(self.project_root, value)
        return config


def main():
    parser = argparse.ArgumentParser(
        description="Project config loader for HikeWise swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["load", "validate", "init", "path"],
        help="Action to perform"
    )
    parser.add_argument("--project-root", help="Project root directory")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing config")
    parser.add_argument("--path-key", help="Path key to retrieve (for path action)")
    args = parser.parse_args()

    load_env()
    loader = ProjectConfigLoader(args.project_root)

    if args.action == "load":
        config = loader.load()
        result = ExecutionResult.ok(data=config)

    elif args.action == "validate":
        result = loader.validate()

    elif args.action == "init":
        result = loader.init_config(overwrite=args.overwrite)

    elif args.action == "path":
        if not args.path_key:
            print(ExecutionResult.fail(error="--path-key required").to_json())
            sys.exit(1)
        path = loader.get_path(args.path_key)
        if path:
            result = ExecutionResult.ok(data={"path": path})
        else:
            result = ExecutionResult.fail(error=f"Path not found: {args.path_key}")

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
