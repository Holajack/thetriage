#!/usr/bin/env python3
"""
Issue Classifier for HikeWise Swarm

Automatically classifies and prioritizes discovered issues.
Uses rule-based classification with optional AI enhancement.

Priority Levels:
- P0 (Critical): Crashes, data loss, security issues
- P1 (High): Core feature broken, blocking navigation
- P2 (Medium): Feature partially works, data issues
- P3 (Low): Visual/UX issues, polish items

Usage:
    # Classify issues from discovery
    python execution/issue_classifier.py \
        --action classify \
        --input .tmp/discovery/issue_report.json

    # Reclassify with custom rules
    python execution/issue_classifier.py \
        --action classify \
        --input issues.json \
        --rules custom_rules.json
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, load_json, get_tmp_path, ExecutionResult, timestamp


# Default classification rules
DEFAULT_RULES = {
    "critical": {
        "patterns": [
            r"crash",
            r"fatal",
            r"data loss",
            r"security",
            r"red screen",
            r"unhandled.*exception",
            r"out of memory",
            r"infinite loop"
        ],
        "types": ["crash", "security_vulnerability", "data_corruption"],
        "conditions": {
            "affects_all_users": True
        }
    },
    "high": {
        "patterns": [
            r"navigation.*fail",
            r"cannot navigate",
            r"back button.*home",
            r"screen.*not.*load",
            r"feature.*broken",
            r"authentication.*fail",
            r"login.*fail"
        ],
        "types": ["navigation_error", "feature_broken", "auth_failure"],
        "categories": ["navigation", "authentication"]
    },
    "medium": {
        "patterns": [
            r"not.*saving",
            r"sync.*fail",
            r"data.*not.*display",
            r"timeout",
            r"slow.*response",
            r"cache.*issue"
        ],
        "types": ["data_sync", "persistence", "timeout", "performance"],
        "categories": ["settings", "data", "profile"]
    },
    "low": {
        "patterns": [
            r"animation",
            r"visual",
            r"alignment",
            r"color",
            r"font",
            r"spacing",
            r"bounce",
            r"flicker"
        ],
        "types": ["ui_glitch", "animation_issue", "styling"],
        "categories": ["ui", "animation", "styling"]
    }
}

# Category inference from file paths
CATEGORY_PATTERNS = {
    "navigation": [r"navigation", r"navigator", r"router"],
    "authentication": [r"auth", r"login", r"signup", r"clerk"],
    "settings": [r"settings", r"preferences", r"config"],
    "profile": [r"profile", r"user", r"account"],
    "data": [r"convex", r"database", r"storage", r"sync"],
    "ui": [r"component", r"screen", r"view"],
    "animation": [r"animation", r"animated", r"reanimated"]
}


class IssueClassifier:
    """
    Classifies issues by priority based on rules and patterns.
    """

    def __init__(self, rules: Dict = None):
        self.rules = rules or DEFAULT_RULES

    def classify_issue(self, issue: Dict) -> Tuple[str, float, List[str]]:
        """
        Classify a single issue.

        Returns:
            Tuple of (priority, confidence, reasons)
        """
        reasons = []
        scores = {"critical": 0, "high": 0, "medium": 0, "low": 0}

        # Get issue attributes
        issue_type = issue.get("type", "").lower()
        title = issue.get("title", "").lower()
        description = issue.get("description", "").lower()
        category = issue.get("category", "").lower()
        affected_files = issue.get("affected_files", [])
        text = f"{title} {description} {issue_type}"

        # Check each priority level's rules
        for priority, rules in self.rules.items():
            # Pattern matching
            for pattern in rules.get("patterns", []):
                if re.search(pattern, text, re.IGNORECASE):
                    scores[priority] += 2
                    reasons.append(f"Matched pattern '{pattern}' for {priority}")

            # Type matching
            if issue_type in rules.get("types", []):
                scores[priority] += 3
                reasons.append(f"Issue type '{issue_type}' maps to {priority}")

            # Category matching
            if category in rules.get("categories", []):
                scores[priority] += 1
                reasons.append(f"Category '{category}' associated with {priority}")

            # Condition checks
            conditions = rules.get("conditions", {})
            if conditions.get("affects_all_users") and issue.get("affects_all_users"):
                scores[priority] += 2
                reasons.append(f"Affects all users, escalating to {priority}")

        # Infer category from files if not set
        if not category and affected_files:
            inferred = self._infer_category(affected_files)
            if inferred:
                issue["category"] = inferred
                # Re-check category rules
                for priority, rules in self.rules.items():
                    if inferred in rules.get("categories", []):
                        scores[priority] += 1

        # Determine winner
        max_score = max(scores.values())
        if max_score == 0:
            # Default to low if no matches
            return "low", 0.5, ["No specific rules matched, defaulting to low"]

        # Find priority with highest score
        priority = max(scores, key=scores.get)
        confidence = min(1.0, max_score / 5)  # Normalize to 0-1

        return priority, confidence, reasons

    def _infer_category(self, files: List[str]) -> Optional[str]:
        """Infer category from file paths."""
        for file_path in files:
            path_lower = file_path.lower()
            for category, patterns in CATEGORY_PATTERNS.items():
                for pattern in patterns:
                    if re.search(pattern, path_lower):
                        return category
        return None

    def classify_batch(self, issues: List[Dict]) -> List[Dict]:
        """Classify a batch of issues."""
        classified = []

        for issue in issues:
            priority, confidence, reasons = self.classify_issue(issue)

            classified_issue = {
                **issue,
                "priority": priority,
                "classification_confidence": confidence,
                "classification_reasons": reasons,
                "classified_at": timestamp()
            }
            classified.append(classified_issue)

        # Sort by priority (critical first) then confidence
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        classified.sort(key=lambda x: (
            priority_order.get(x["priority"], 4),
            -x["classification_confidence"]
        ))

        return classified

    def generate_summary(self, classified_issues: List[Dict]) -> Dict:
        """Generate classification summary."""
        by_priority = {"critical": [], "high": [], "medium": [], "low": []}

        for issue in classified_issues:
            priority = issue.get("priority", "low")
            by_priority[priority].append(issue)

        summary = {
            "total": len(classified_issues),
            "by_priority": {
                priority: {
                    "count": len(issues),
                    "issue_ids": [i.get("id") for i in issues]
                }
                for priority, issues in by_priority.items()
            },
            "categories": {},
            "generated_at": timestamp()
        }

        # Count by category
        for issue in classified_issues:
            cat = issue.get("category", "uncategorized")
            summary["categories"][cat] = summary["categories"].get(cat, 0) + 1

        return summary


def classify_from_discovery(input_path: str, output_path: str = None, rules_path: str = None) -> ExecutionResult:
    """Classify issues from a discovery report."""
    # Load input
    try:
        with open(input_path, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        return ExecutionResult.fail(error=f"Input file not found: {input_path}")
    except json.JSONDecodeError as e:
        return ExecutionResult.fail(error=f"Invalid JSON: {e}")

    # Load custom rules if provided
    rules = None
    if rules_path:
        try:
            with open(rules_path, "r") as f:
                rules = json.load(f)
        except Exception as e:
            log(f"Could not load custom rules: {e}", level="warning")

    classifier = IssueClassifier(rules)

    # Extract issues from different formats
    issues = []
    if "issues" in data:
        issues = data["issues"]
    elif "issues_by_priority" in data:
        for priority_issues in data["issues_by_priority"].values():
            issues.extend(priority_issues)
    elif isinstance(data, list):
        issues = data

    if not issues:
        return ExecutionResult.fail(error="No issues found in input")

    # Classify
    classified = classifier.classify_batch(issues)
    summary = classifier.generate_summary(classified)

    # Build output
    result = {
        "source": input_path,
        "classified_at": timestamp(),
        "summary": summary,
        "issues": classified
    }

    # Save output
    output = output_path or get_tmp_path("swarm/classified_issues.json")
    with open(output, "w") as f:
        json.dump(result, f, indent=2)

    return ExecutionResult.ok(data={
        "output_path": output,
        "total_classified": len(classified),
        "summary": summary
    })


def classify_single(issue_json: str, rules_path: str = None) -> ExecutionResult:
    """Classify a single issue from JSON string."""
    try:
        issue = json.loads(issue_json)
    except json.JSONDecodeError as e:
        return ExecutionResult.fail(error=f"Invalid JSON: {e}")

    rules = None
    if rules_path:
        try:
            with open(rules_path, "r") as f:
                rules = json.load(f)
        except Exception:
            pass

    classifier = IssueClassifier(rules)
    priority, confidence, reasons = classifier.classify_issue(issue)

    return ExecutionResult.ok(data={
        "priority": priority,
        "confidence": confidence,
        "reasons": reasons,
        "issue": {**issue, "priority": priority}
    })


def main():
    parser = argparse.ArgumentParser(
        description="Issue classifier for HikeWise swarm"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["classify", "single", "rules"],
        help="Action to perform"
    )
    parser.add_argument("--input", help="Input file path")
    parser.add_argument("--output", help="Output file path")
    parser.add_argument("--rules", help="Custom rules JSON file")
    parser.add_argument("--issue", help="Single issue JSON (for single action)")
    args = parser.parse_args()

    load_env()

    if args.action == "classify":
        if not args.input:
            print(ExecutionResult.fail(error="--input required").to_json())
            sys.exit(1)
        result = classify_from_discovery(args.input, args.output, args.rules)

    elif args.action == "single":
        if not args.issue:
            print(ExecutionResult.fail(error="--issue required").to_json())
            sys.exit(1)
        result = classify_single(args.issue, args.rules)

    elif args.action == "rules":
        # Output default rules
        result = ExecutionResult.ok(data=DEFAULT_RULES)

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
