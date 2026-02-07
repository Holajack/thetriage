#!/usr/bin/env python3
"""
Issue Plan Generator for HikeWise Swarm

Generates detailed fix plans and LLM-ready markdown for discovered issues.
Does NOT fix anything - only documents problems and proposes solutions.

Usage:
    # Generate plans for all issues in kanban
    python execution/issue_plan_generator.py --action generate-plans

    # Generate markdown todos for LLM consumption
    python execution/issue_plan_generator.py --action export-todos --output .tmp/swarm/llm_todos.md

    # Generate full audit report
    python execution/issue_plan_generator.py --action audit-report
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


class IssuePlanGenerator:
    """
    Generates fix plans and documentation for issues without fixing them.
    """

    def __init__(self, project_path: str = None):
        self.project_path = project_path or str(Path(__file__).parent.parent)
        self.plans_dir = get_tmp_path("swarm/plans")
        self.reports_dir = get_tmp_path("swarm/reports")
        os.makedirs(self.plans_dir, exist_ok=True)
        os.makedirs(self.reports_dir, exist_ok=True)

    def generate_fix_plan(self, issue: Dict) -> Dict:
        """Generate a detailed fix plan for a single issue."""
        issue_id = issue.get("id", "unknown")
        category = issue.get("category", "other")
        title = issue.get("title", "")
        priority = issue.get("priority", "medium")

        # Determine affected files based on category
        affected_files = self._infer_affected_files(category, title)

        # Generate investigation steps
        investigation_steps = self._generate_investigation_steps(category, title)

        # Generate fix approach
        fix_approach = self._generate_fix_approach(category, title)

        # Generate verification steps
        verification_steps = self._generate_verification_steps(category)

        plan = {
            "issue_id": issue_id,
            "issue_title": title,
            "category": category,
            "priority": priority,
            "status": "planned",
            "created_at": timestamp(),

            "affected_files": affected_files,

            "investigation": {
                "description": f"Investigate {category} issue: {title}",
                "steps": investigation_steps
            },

            "fix_approach": {
                "description": fix_approach["description"],
                "steps": fix_approach["steps"],
                "estimated_complexity": fix_approach["complexity"]
            },

            "verification": {
                "description": f"Verify fix for: {title}",
                "steps": verification_steps,
                "maestro_flow": self._get_maestro_flow(category)
            },

            "dependencies": self._infer_dependencies(category, title),

            "llm_prompt": self._generate_llm_prompt(issue, affected_files, fix_approach)
        }

        # Save individual plan
        plan_path = os.path.join(self.plans_dir, f"{issue_id}.json")
        with open(plan_path, "w") as f:
            json.dump(plan, f, indent=2)

        return plan

    def _infer_affected_files(self, category: str, title: str) -> List[str]:
        """Infer which files are likely affected by this issue."""
        files = []

        # Category-based file inference
        category_files = {
            "navigation": [
                "src/navigation/RootNavigator.tsx",
                "src/navigation/MainNavigator.tsx",
                "src/navigation/AuthNavigator.tsx",
                "src/navigation/types.ts"
            ],
            "settings": [
                "src/screens/main/SettingsScreen.tsx",
                "src/screens/settings/",
                "convex/users.ts"
            ],
            "profile": [
                "src/screens/main/ProfileScreen.tsx",
                "src/screens/profile/",
                "convex/users.ts"
            ],
            "ui/ux": [
                "src/components/",
                "src/screens/"
            ],
            "onboarding": [
                "src/screens/onboarding/",
                "convex/onboarding.ts",
                "src/context/AuthContext.tsx"
            ],
            "study rooms & communication": [
                "src/screens/main/StudyRoomScreen.tsx",
                "convex/studyRooms.ts",
                "src/utils/convexStudyRoomService.ts"
            ],
            "focus sessions": [
                "src/screens/main/StudySessionScreen.tsx",
                "convex/focusSessions.ts"
            ],
            "data sync": [
                "src/hooks/useConvex.ts",
                "convex/",
                "src/context/AuthContext.tsx"
            ]
        }

        # Get category files
        for cat, cat_files in category_files.items():
            if cat.lower() in category.lower():
                files.extend(cat_files)

        # Title-based inference
        title_lower = title.lower()
        if "back button" in title_lower or "navigation" in title_lower:
            files.append("src/navigation/RootNavigator.tsx")
        if "save" in title_lower or "persist" in title_lower:
            files.append("convex/users.ts")
        if "sound" in title_lower:
            files.append("src/screens/settings/SoundSettingsScreen.tsx")
        if "animation" in title_lower:
            files.append("src/components/animations/")
        if "keyboard" in title_lower or "typing" in title_lower:
            files.append("src/components/")

        return list(set(files))

    def _generate_investigation_steps(self, category: str, title: str) -> List[str]:
        """Generate investigation steps for the issue."""
        steps = [
            f"1. Read and understand the issue: {title}",
            "2. Identify the affected screens/components",
        ]

        if "navigation" in category.lower():
            steps.extend([
                "3. Run navigation flow verifier: `python3 execution/navigation_flow_verifier.py --action verify`",
                "4. Check navigation graph for broken routes",
                "5. Trace navigation calls in affected screens",
                "6. Identify if using navigate() vs goBack() correctly"
            ])
        elif "settings" in category.lower() or "save" in title.lower():
            steps.extend([
                "3. Check if setting is stored in Convex (server) or AsyncStorage (local)",
                "4. Verify mutation is being called on save",
                "5. Check if onboarding data transfers to user record",
                "6. Test persistence across app restart"
            ])
        elif "ui" in category.lower() or "animation" in title.lower():
            steps.extend([
                "3. Identify the component with the animation/UI issue",
                "4. Check animation timing and spring configuration",
                "5. Test on different device sizes",
                "6. Check for KeyboardAvoidingView usage if keyboard-related"
            ])
        else:
            steps.extend([
                "3. Reproduce the issue in iOS Simulator",
                "4. Check console logs for errors",
                "5. Review related Convex queries/mutations",
                "6. Test edge cases"
            ])

        return steps

    def _generate_fix_approach(self, category: str, title: str) -> Dict:
        """Generate fix approach based on issue type."""
        title_lower = title.lower()

        if "back button" in title_lower:
            return {
                "description": "Fix back button navigation to return to correct parent screen",
                "steps": [
                    "1. Check if navigation.goBack() is being used instead of navigation.navigate('Home')",
                    "2. Verify the navigation stack is not being reset unexpectedly",
                    "3. Check initialRouteName in Navigator configuration",
                    "4. Ensure nested navigators are configured correctly",
                    "5. Test with Maestro flow: navigation-back-button.yaml"
                ],
                "complexity": "medium"
            }
        elif "save" in title_lower or "persist" in title_lower:
            return {
                "description": "Fix data persistence issue",
                "steps": [
                    "1. Identify where data should be saved (Convex vs AsyncStorage)",
                    "2. Ensure mutation is called with correct field names (camelCase for Convex)",
                    "3. Add error handling for failed saves",
                    "4. Verify data loads correctly on app restart",
                    "5. Test with Maestro flow: settings-persistence.yaml"
                ],
                "complexity": "medium"
            }
        elif "animation" in title_lower:
            return {
                "description": "Fix animation timing/behavior",
                "steps": [
                    "1. Locate the animation configuration",
                    "2. Adjust duration (typical: 300-500ms for transitions)",
                    "3. Tune spring tension/friction if using spring animation",
                    "4. Ensure useNativeDriver: true for performance",
                    "5. Visual verification via screenshot comparison"
                ],
                "complexity": "low"
            }
        elif "navigation" in category.lower():
            return {
                "description": "Fix navigation flow issue",
                "steps": [
                    "1. Review navigation configuration in RootNavigator/MainNavigator",
                    "2. Check if screen is registered in correct navigator",
                    "3. Update TypeScript navigation types if needed",
                    "4. Test navigation path end-to-end",
                    "5. Verify with Maestro navigation flows"
                ],
                "complexity": "medium"
            }
        else:
            return {
                "description": f"Fix {category} issue: {title}",
                "steps": [
                    "1. Reproduce the issue",
                    "2. Identify root cause",
                    "3. Implement fix",
                    "4. Test locally",
                    "5. Verify with appropriate Maestro flow"
                ],
                "complexity": "unknown"
            }

    def _generate_verification_steps(self, category: str) -> List[str]:
        """Generate verification steps."""
        base_steps = [
            "1. Run the app in iOS Simulator",
            "2. Navigate to affected screen",
            "3. Perform the action that was broken",
            "4. Verify expected behavior"
        ]

        if "navigation" in category.lower():
            base_steps.append("5. Run: `maestro test maestro/flows/verify/navigation-back-button.yaml`")
        elif "settings" in category.lower():
            base_steps.append("5. Run: `maestro test maestro/flows/verify/settings-persistence.yaml`")
        elif "profile" in category.lower():
            base_steps.append("5. Run: `maestro test maestro/flows/verify/profile-save.yaml`")
        else:
            base_steps.append("5. Run appropriate Maestro verification flow")

        base_steps.append("6. Force close and reopen app to verify persistence")

        return base_steps

    def _get_maestro_flow(self, category: str) -> Optional[str]:
        """Get the appropriate Maestro flow for verification."""
        flows = {
            "navigation": "maestro/flows/verify/navigation-back-button.yaml",
            "settings": "maestro/flows/verify/settings-persistence.yaml",
            "profile": "maestro/flows/verify/profile-save.yaml",
            "study rooms": "maestro/flows/verify/study-room-invite.yaml",
            "onboarding": "maestro/flows/verify/onboarding-complete.yaml"
        }

        for key, flow in flows.items():
            if key in category.lower():
                return flow

        return "maestro/flows/discovery/explore-all-screens.yaml"

    def _infer_dependencies(self, category: str, title: str) -> List[str]:
        """Infer what this issue might depend on."""
        deps = []

        # Navigation issues often depend on each other
        if "back button" in title.lower():
            deps.append("Navigation stack configuration must be correct first")

        # Settings depend on data layer
        if "save" in title.lower() or "persist" in title.lower():
            deps.append("Convex schema must have correct fields")
            deps.append("AuthContext must properly sync data")

        return deps

    def _generate_llm_prompt(self, issue: Dict, affected_files: List[str], fix_approach: Dict) -> str:
        """Generate a prompt that can be given to an LLM to fix this issue."""
        return f"""## Task: Fix {issue.get('category', 'unknown')} Issue

### Issue
**ID:** {issue.get('id', 'unknown')}
**Title:** {issue.get('title', '')}
**Priority:** {issue.get('priority', 'medium')}
**Category:** {issue.get('category', 'other')}

### Affected Files
Review these files first:
{chr(10).join(f'- `{f}`' for f in affected_files)}

### Fix Approach
{fix_approach.get('description', '')}

**Steps:**
{chr(10).join(fix_approach.get('steps', []))}

### Instructions
1. Read the affected files to understand current implementation
2. Follow the fix approach steps
3. Make minimal changes - only fix what's broken
4. Do NOT refactor unrelated code
5. Test your changes with the appropriate Maestro flow
6. Commit with message: `fix({issue.get('category', 'other')}): {issue.get('title', '')[:50]}`

### Verification
Run: `maestro test {self._get_maestro_flow(issue.get('category', ''))}`
"""

    def generate_all_plans(self) -> ExecutionResult:
        """Generate plans for all issues in the kanban."""
        try:
            kanban = load_json("swarm/kanban.json")
        except FileNotFoundError:
            return ExecutionResult.fail(error="Kanban not found. Run discovery first.")

        suggestions = kanban.get("columns", {}).get("suggestions", [])

        if not suggestions:
            return ExecutionResult.fail(error="No issues in suggestions column")

        plans = []
        for issue in suggestions:
            plan = self.generate_fix_plan(issue)
            plans.append(plan)
            log(f"Generated plan for: {issue.get('id')}")

        # Save all plans index
        plans_index = {
            "generated_at": timestamp(),
            "total_plans": len(plans),
            "plans": [{"id": p["issue_id"], "title": p["issue_title"], "priority": p["priority"]} for p in plans]
        }
        save_json(plans_index, "swarm/plans_index.json")

        return ExecutionResult.ok(data={
            "plans_generated": len(plans),
            "plans_dir": self.plans_dir
        })

    def export_todos_markdown(self, output_path: str = None) -> ExecutionResult:
        """Export all plans as LLM-ready markdown todos."""
        try:
            plans_index = load_json("swarm/plans_index.json")
        except FileNotFoundError:
            # Generate plans first
            self.generate_all_plans()
            plans_index = load_json("swarm/plans_index.json")

        # Load all plans
        plans = []
        for plan_ref in plans_index.get("plans", []):
            plan_path = os.path.join(self.plans_dir, f"{plan_ref['id']}.json")
            if os.path.exists(plan_path):
                with open(plan_path, "r") as f:
                    plans.append(json.load(f))

        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        plans.sort(key=lambda p: priority_order.get(p.get("priority", "low"), 4))

        # Generate markdown
        md = self._generate_todos_markdown(plans)

        # Save to file
        output_path = output_path or get_tmp_path("swarm/llm_todos.md")
        with open(output_path, "w") as f:
            f.write(md)

        return ExecutionResult.ok(data={
            "output_path": output_path,
            "issues_count": len(plans)
        })

    def _generate_todos_markdown(self, plans: List[Dict]) -> str:
        """Generate the full markdown document."""
        lines = [
            "# HikeWise Issue Fix Queue",
            "",
            f"Generated: {timestamp()}",
            "",
            "## Overview",
            "",
            f"Total issues: {len(plans)}",
            "",
            "### Priority Breakdown",
            ""
        ]

        # Count by priority
        priority_counts = {}
        for p in plans:
            pri = p.get("priority", "low")
            priority_counts[pri] = priority_counts.get(pri, 0) + 1

        for pri in ["critical", "high", "medium", "low"]:
            count = priority_counts.get(pri, 0)
            if count > 0:
                emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(pri, "⚪")
                lines.append(f"- {emoji} **{pri.title()}**: {count}")

        lines.extend([
            "",
            "---",
            "",
            "## Issues To Fix",
            "",
            "*Each issue below includes an LLM-ready prompt you can copy.*",
            ""
        ])

        # Group by category
        by_category = {}
        for p in plans:
            cat = p.get("category", "other")
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(p)

        for category, category_plans in by_category.items():
            lines.extend([
                f"### {category.title()}",
                ""
            ])

            for plan in category_plans:
                priority = plan.get("priority", "low")
                emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(priority, "⚪")

                lines.extend([
                    f"#### {emoji} [{plan['issue_id']}] {plan['issue_title']}",
                    "",
                    f"**Priority:** {priority} | **Complexity:** {plan.get('fix_approach', {}).get('estimated_complexity', 'unknown')}",
                    "",
                    "**Affected Files:**",
                    ""
                ])

                for f in plan.get("affected_files", []):
                    lines.append(f"- `{f}`")

                lines.extend([
                    "",
                    "<details>",
                    "<summary>📋 LLM Prompt (click to expand)</summary>",
                    "",
                    "```markdown",
                    plan.get("llm_prompt", "No prompt generated"),
                    "```",
                    "",
                    "</details>",
                    "",
                    "---",
                    ""
                ])

        lines.extend([
            "",
            "## How To Use This Document",
            "",
            "1. Start with **Critical** and **High** priority issues",
            "2. Copy the LLM prompt for each issue",
            "3. Give it to Claude/GPT with access to the codebase",
            "4. Review the proposed fix before applying",
            "5. Run the verification Maestro flow",
            "6. Mark as complete in the Kanban",
            "",
            "## Quick Commands",
            "",
            "```bash",
            "# View kanban status",
            "python3 execution/kanban_state_manager.py --action stats",
            "",
            "# Move issue to in-progress",
            "python3 execution/kanban_state_manager.py --action move --issue-id <ID> --to in_progress",
            "",
            "# Mark issue as done",
            "python3 execution/kanban_state_manager.py --action move --issue-id <ID> --to done",
            "",
            "# Run verification tests",
            "maestro test maestro/flows/verify/navigation-back-button.yaml",
            "```"
        ])

        return "\n".join(lines)

    def generate_audit_report(self) -> ExecutionResult:
        """Generate a comprehensive audit report."""
        # Run navigation verification
        from navigation_flow_verifier import NavigationFlowVerifier
        nav_verifier = NavigationFlowVerifier(self.project_path)
        nav_verifier.parse_navigation_files()
        nav_result = nav_verifier.verify_navigation()

        # Load kanban
        try:
            kanban = load_json("swarm/kanban.json")
        except FileNotFoundError:
            kanban = {"columns": {"suggestions": [], "in_progress": [], "done": []}}

        # Generate report
        report = {
            "generated_at": timestamp(),
            "project": "HikeWise",

            "navigation_audit": {
                "screens_found": len(nav_verifier.screens),
                "navigation_calls": len(nav_verifier.navigations),
                "issues": nav_result.data if nav_result.success else {}
            },

            "issue_summary": {
                "total_issues": len(kanban.get("columns", {}).get("suggestions", [])),
                "by_priority": {},
                "by_category": {}
            },

            "recommendations": []
        }

        # Count by priority and category
        for issue in kanban.get("columns", {}).get("suggestions", []):
            pri = issue.get("priority", "low")
            cat = issue.get("category", "other")
            report["issue_summary"]["by_priority"][pri] = report["issue_summary"]["by_priority"].get(pri, 0) + 1
            report["issue_summary"]["by_category"][cat] = report["issue_summary"]["by_category"].get(cat, 0) + 1

        # Add recommendations
        nav_issues = nav_result.data.get("by_severity", {}) if nav_result.success else {}
        if nav_issues.get("high", 0) > 0:
            report["recommendations"].append(
                f"CRITICAL: {nav_issues['high']} high-severity navigation issues detected. Fix these first."
            )

        if report["issue_summary"]["by_category"].get("navigation", 0) > 3:
            report["recommendations"].append(
                "Multiple navigation issues suggest systemic problem in RootNavigator.tsx"
            )

        if report["issue_summary"]["by_category"].get("settings", 0) > 3:
            report["recommendations"].append(
                "Multiple settings issues suggest data persistence layer needs review"
            )

        # Save report
        report_path = os.path.join(self.reports_dir, f"audit_{timestamp().replace(':', '-')}.json")
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)

        # Also generate markdown version
        md_report = self._generate_audit_markdown(report)
        md_path = report_path.replace(".json", ".md")
        with open(md_path, "w") as f:
            f.write(md_report)

        return ExecutionResult.ok(data={
            "report_path": report_path,
            "markdown_path": md_path,
            "total_issues": report["issue_summary"]["total_issues"],
            "navigation_issues": nav_issues
        })

    def _generate_audit_markdown(self, report: Dict) -> str:
        """Generate markdown version of audit report."""
        lines = [
            "# HikeWise App Audit Report",
            "",
            f"**Generated:** {report['generated_at']}",
            "",
            "---",
            "",
            "## Executive Summary",
            "",
            f"Total issues discovered: **{report['issue_summary']['total_issues']}**",
            ""
        ]

        # Recommendations
        if report.get("recommendations"):
            lines.extend([
                "### Critical Recommendations",
                ""
            ])
            for rec in report["recommendations"]:
                lines.append(f"- ⚠️ {rec}")
            lines.append("")

        # Navigation Audit
        nav = report.get("navigation_audit", {})
        lines.extend([
            "---",
            "",
            "## Navigation Audit",
            "",
            f"- Screens found: {nav.get('screens_found', 0)}",
            f"- Navigation calls: {nav.get('navigation_calls', 0)}",
            ""
        ])

        nav_issues = nav.get("issues", {}).get("by_severity", {})
        if nav_issues:
            lines.extend([
                "### Navigation Issues by Severity",
                "",
                f"- 🔴 High: {nav_issues.get('high', 0)}",
                f"- 🟡 Medium: {nav_issues.get('medium', 0)}",
                f"- 🟢 Low: {nav_issues.get('low', 0)}",
                ""
            ])

        # Issue Breakdown
        lines.extend([
            "---",
            "",
            "## Issue Breakdown",
            "",
            "### By Priority",
            ""
        ])

        for pri in ["critical", "high", "medium", "low"]:
            count = report["issue_summary"]["by_priority"].get(pri, 0)
            emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(pri, "⚪")
            lines.append(f"- {emoji} {pri.title()}: {count}")

        lines.extend([
            "",
            "### By Category",
            ""
        ])

        for cat, count in sorted(report["issue_summary"]["by_category"].items(), key=lambda x: -x[1]):
            lines.append(f"- {cat.title()}: {count}")

        lines.extend([
            "",
            "---",
            "",
            "## Next Steps",
            "",
            "1. Review this audit report",
            "2. Export LLM todos: `python3 execution/issue_plan_generator.py --action export-todos`",
            "3. Start fixing high-priority issues first",
            "4. Verify each fix with Maestro tests",
            "5. Re-run audit to track progress",
            ""
        ])

        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Issue plan generator for HikeWise"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["generate-plans", "export-todos", "audit-report", "plan"],
        help="Action to perform"
    )
    parser.add_argument("--issue-id", help="Specific issue ID")
    parser.add_argument("--output", help="Output file path")
    args = parser.parse_args()

    load_env()
    generator = IssuePlanGenerator()

    if args.action == "generate-plans":
        result = generator.generate_all_plans()

    elif args.action == "export-todos":
        result = generator.export_todos_markdown(args.output)

    elif args.action == "audit-report":
        result = generator.generate_audit_report()

    elif args.action == "plan":
        if not args.issue_id:
            print(ExecutionResult.fail(error="--issue-id required").to_json())
            sys.exit(1)
        # Load issue from kanban
        kanban = load_json("swarm/kanban.json")
        issue = None
        for col in kanban.get("columns", {}).values():
            for i in col:
                if i.get("id") == args.issue_id:
                    issue = i
                    break
        if not issue:
            print(ExecutionResult.fail(error=f"Issue not found: {args.issue_id}").to_json())
            sys.exit(1)
        plan = generator.generate_fix_plan(issue)
        result = ExecutionResult.ok(data=plan)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
