#!/usr/bin/env python3
"""
Navigation Flow Verifier for HikeWise Swarm

Parses React Navigation configuration and verifies all routes are connected.
Detects orphaned screens, circular navigation, and missing back handlers.

Usage:
    # Parse navigation files
    python execution/navigation_flow_verifier.py \
        --action parse \
        --nav-dir src/navigation

    # Find broken links
    python execution/navigation_flow_verifier.py --action verify

    # Generate flow diagram
    python execution/navigation_flow_verifier.py \
        --action diagram \
        --output navigation.mermaid
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, timestamp


class NavigationFlowVerifier:
    """
    Parses React Navigation and verifies connectivity.
    """

    def __init__(self, project_path: str = None):
        self.project_path = project_path or str(Path(__file__).parent.parent)
        self.screens: Dict[str, Dict] = {}  # screen_name -> {file, type, parent}
        self.navigations: List[Dict] = []  # list of navigation calls
        self.graph: Dict[str, Set[str]] = defaultdict(set)  # from -> set(to)

    def parse_navigation_files(self, nav_dir: str = None) -> ExecutionResult:
        """Parse all navigation-related files."""
        if nav_dir is None:
            nav_dir = os.path.join(self.project_path, "src/navigation")

        if not os.path.exists(nav_dir):
            return ExecutionResult.fail(error=f"Navigation directory not found: {nav_dir}")

        log(f"Parsing navigation files in {nav_dir}")

        # Find all TypeScript files
        nav_files = list(Path(nav_dir).glob("**/*.tsx"))
        nav_files.extend(Path(nav_dir).glob("**/*.ts"))

        for file_path in nav_files:
            self._parse_file(str(file_path))

        # Also parse screens for navigation calls
        screens_dir = os.path.join(self.project_path, "src/screens")
        if os.path.exists(screens_dir):
            screen_files = list(Path(screens_dir).glob("**/*.tsx"))
            for file_path in screen_files:
                self._parse_screen_file(str(file_path))

        # Build graph
        self._build_graph()

        # Save parsed data
        data = {
            "screens": self.screens,
            "navigations": self.navigations,
            "graph": {k: list(v) for k, v in self.graph.items()},
            "parsed_at": timestamp()
        }
        save_json(data, "navigation/parsed.json")

        return ExecutionResult.ok(data={
            "screens_found": len(self.screens),
            "navigation_calls": len(self.navigations),
            "files_parsed": len(nav_files)
        })

    def _parse_file(self, file_path: str):
        """Parse a navigation configuration file."""
        with open(file_path, "r") as f:
            content = f.read()

        # Find Stack.Screen, Drawer.Screen, Tab.Screen definitions
        screen_patterns = [
            # Stack.Screen name="ScreenName"
            r'<(?:Stack|Drawer|Tab|Screen)\.Screen\s+name=["\']([^"\']+)["\']',
            # createStackNavigator screens
            r'(?:Stack|Drawer|Tab)\.Screen.*?name:\s*["\']([^"\']+)["\']',
        ]

        for pattern in screen_patterns:
            matches = re.findall(pattern, content, re.DOTALL)
            for match in matches:
                screen_name = match if isinstance(match, str) else match[0]
                self.screens[screen_name] = {
                    "file": file_path,
                    "type": self._infer_navigator_type(content),
                    "defined_in": os.path.basename(file_path)
                }

        # Find navigation type definitions
        type_pattern = r'type\s+(\w+ParamList)\s*=\s*\{([^}]+)\}'
        type_matches = re.findall(type_pattern, content, re.DOTALL)

        for type_name, type_body in type_matches:
            # Extract screen names from type
            screen_names = re.findall(r'(\w+)\s*:', type_body)
            for name in screen_names:
                if name not in self.screens:
                    self.screens[name] = {
                        "file": file_path,
                        "type": "from_types",
                        "defined_in": os.path.basename(file_path)
                    }

    def _parse_screen_file(self, file_path: str):
        """Parse a screen file for navigation calls."""
        with open(file_path, "r") as f:
            content = f.read()

        screen_name = Path(file_path).stem

        # Find navigation.navigate() calls
        nav_patterns = [
            r'navigation\.navigate\(["\']([^"\']+)["\']',
            r'navigation\.push\(["\']([^"\']+)["\']',
            r'navigation\.replace\(["\']([^"\']+)["\']',
            r'navigate\(["\']([^"\']+)["\']',
        ]

        for pattern in nav_patterns:
            matches = re.findall(pattern, content)
            for target in matches:
                self.navigations.append({
                    "from": screen_name,
                    "to": target,
                    "type": "navigate",
                    "file": file_path
                })

        # Find navigation.goBack() calls
        if re.search(r'navigation\.goBack\(\)', content):
            self.navigations.append({
                "from": screen_name,
                "to": "_back",
                "type": "goBack",
                "file": file_path
            })

    def _infer_navigator_type(self, content: str) -> str:
        """Infer the type of navigator from file content."""
        if "createStackNavigator" in content or "Stack.Navigator" in content:
            return "stack"
        elif "createDrawerNavigator" in content or "Drawer.Navigator" in content:
            return "drawer"
        elif "createBottomTabNavigator" in content or "Tab.Navigator" in content:
            return "tab"
        elif "createNativeStackNavigator" in content:
            return "native-stack"
        return "unknown"

    def _build_graph(self):
        """Build navigation graph from parsed data."""
        for nav in self.navigations:
            if nav["to"] != "_back":
                self.graph[nav["from"]].add(nav["to"])

    def verify_navigation(self) -> ExecutionResult:
        """Verify all navigation routes are valid."""
        issues = []

        # 1. Find navigation calls to undefined screens
        defined_screens = set(self.screens.keys())

        for nav in self.navigations:
            if nav["to"] != "_back" and nav["to"] not in defined_screens:
                issues.append({
                    "type": "undefined_screen",
                    "severity": "high",
                    "from": nav["from"],
                    "target": nav["to"],
                    "file": nav["file"],
                    "message": f"Navigation to undefined screen '{nav['to']}'"
                })

        # 2. Find orphaned screens (defined but never navigated to)
        navigated_to = {nav["to"] for nav in self.navigations}
        entry_screens = {"Home", "HomeScreen", "Landing", "LandingPage", "Main"}

        for screen in defined_screens:
            if screen not in navigated_to and screen not in entry_screens:
                issues.append({
                    "type": "orphaned_screen",
                    "severity": "low",
                    "screen": screen,
                    "message": f"Screen '{screen}' is defined but never navigated to"
                })

        # 3. Find screens without goBack handling (potential back button issues)
        screens_with_back = {
            nav["from"] for nav in self.navigations
            if nav["type"] == "goBack"
        }

        # Stack screens should typically have back capability
        stack_screens = {
            name for name, data in self.screens.items()
            if data.get("type") in ["stack", "native-stack"]
        }

        for screen in stack_screens:
            if screen not in screens_with_back:
                issues.append({
                    "type": "missing_back_handler",
                    "severity": "medium",
                    "screen": screen,
                    "message": f"Stack screen '{screen}' has no explicit goBack() call"
                })

        # 4. Detect potential circular navigation
        cycles = self._find_cycles()
        for cycle in cycles:
            issues.append({
                "type": "circular_navigation",
                "severity": "medium",
                "cycle": cycle,
                "message": f"Circular navigation detected: {' -> '.join(cycle)}"
            })

        # Categorize by severity
        by_severity = {"high": [], "medium": [], "low": []}
        for issue in issues:
            by_severity[issue["severity"]].append(issue)

        result = {
            "valid": len(by_severity["high"]) == 0,
            "total_issues": len(issues),
            "by_severity": {
                s: len(issues) for s, issues in by_severity.items()
            },
            "issues": issues,
            "verified_at": timestamp()
        }

        save_json(result, "navigation/verification.json")

        return ExecutionResult.ok(data=result)

    def _find_cycles(self) -> List[List[str]]:
        """Find cycles in the navigation graph using DFS."""
        cycles = []
        visited = set()
        rec_stack = set()
        path = []

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in self.graph.get(node, set()):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    cycle_start = path.index(neighbor)
                    cycles.append(path[cycle_start:] + [neighbor])
                    return False

            path.pop()
            rec_stack.remove(node)
            return False

        for node in self.graph:
            if node not in visited:
                dfs(node)

        return cycles[:5]  # Limit to first 5 cycles

    def generate_diagram(self, output_path: str = None) -> ExecutionResult:
        """Generate a Mermaid diagram of the navigation flow."""
        lines = ["graph TD"]

        # Add nodes
        for screen, data in self.screens.items():
            nav_type = data.get("type", "unknown")
            if nav_type == "stack":
                lines.append(f"    {screen}[{screen}]")
            elif nav_type == "drawer":
                lines.append(f"    {screen}({screen})")
            elif nav_type == "tab":
                lines.append(f"    {screen}[/{screen}/]")
            else:
                lines.append(f"    {screen}[{screen}]")

        lines.append("")

        # Add edges
        for from_screen, to_screens in self.graph.items():
            for to_screen in to_screens:
                if to_screen in self.screens:
                    lines.append(f"    {from_screen} --> {to_screen}")

        diagram = "\n".join(lines)

        if output_path:
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
            with open(output_path, "w") as f:
                f.write(diagram)

        return ExecutionResult.ok(data={
            "diagram": diagram,
            "output_path": output_path,
            "nodes": len(self.screens),
            "edges": sum(len(targets) for targets in self.graph.values())
        })

    def get_screen_info(self, screen_name: str) -> ExecutionResult:
        """Get detailed info about a specific screen."""
        if screen_name not in self.screens:
            return ExecutionResult.fail(error=f"Screen not found: {screen_name}")

        screen = self.screens[screen_name]

        # Find what navigates to this screen
        incoming = [
            nav["from"] for nav in self.navigations
            if nav["to"] == screen_name
        ]

        # Find what this screen navigates to
        outgoing = list(self.graph.get(screen_name, set()))

        return ExecutionResult.ok(data={
            "screen": screen_name,
            "file": screen.get("file"),
            "type": screen.get("type"),
            "incoming": incoming,
            "outgoing": outgoing
        })


def main():
    parser = argparse.ArgumentParser(
        description="Navigation flow verifier for HikeWise"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["parse", "verify", "diagram", "screen"],
        help="Action to perform"
    )
    parser.add_argument("--nav-dir", help="Navigation directory")
    parser.add_argument("--output", help="Output file path")
    parser.add_argument("--screen", help="Screen name (for screen action)")
    args = parser.parse_args()

    load_env()
    verifier = NavigationFlowVerifier()

    if args.action == "parse":
        result = verifier.parse_navigation_files(args.nav_dir)

    elif args.action == "verify":
        # Parse first if not already done
        verifier.parse_navigation_files(args.nav_dir)
        result = verifier.verify_navigation()

    elif args.action == "diagram":
        verifier.parse_navigation_files(args.nav_dir)
        output = args.output or get_tmp_path("navigation/flow.mermaid")
        result = verifier.generate_diagram(output)

    elif args.action == "screen":
        if not args.screen:
            print(ExecutionResult.fail(error="--screen required").to_json())
            sys.exit(1)
        verifier.parse_navigation_files(args.nav_dir)
        result = verifier.get_screen_info(args.screen)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
