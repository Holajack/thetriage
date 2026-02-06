#!/usr/bin/env python3
"""
n8n Workflow Generator for HikeWise Swarm

Generates n8n workflow JSON files for scheduling and automating the swarm.

Usage:
    # Generate swarm trigger workflow
    python execution/n8n_workflow_generator.py \
        --action generate \
        --workflow swarm-trigger

    # Generate all workflows
    python execution/n8n_workflow_generator.py --action generate-all

    # Export workflow to file
    python execution/n8n_workflow_generator.py \
        --action export \
        --workflow swarm-trigger \
        --output workflows/swarm-trigger.json
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, timestamp


class N8nWorkflowGenerator:
    """
    Generates n8n workflow definitions for the swarm.
    """

    def __init__(self, project_path: str = None):
        self.project_path = project_path or str(Path(__file__).parent.parent)
        self.workflows_dir = os.path.join(self.project_path, "n8n-workflows")
        os.makedirs(self.workflows_dir, exist_ok=True)

    def generate_swarm_trigger_workflow(self) -> Dict:
        """Generate workflow to trigger the swarm coordinator."""
        return {
            "name": "HikeWise Swarm Trigger",
            "nodes": [
                {
                    "parameters": {
                        "rule": {
                            "interval": [
                                {
                                    "field": "hours",
                                    "hoursInterval": 4
                                }
                            ]
                        }
                    },
                    "id": "cron-trigger",
                    "name": "Every 4 Hours",
                    "type": "n8n-nodes-base.scheduleTrigger",
                    "typeVersion": 1.2,
                    "position": [250, 300]
                },
                {
                    "parameters": {
                        "command": f"cd {self.project_path} && python execution/swarm_coordinator.py --action run --max-agents 3"
                    },
                    "id": "run-swarm",
                    "name": "Run Swarm Coordinator",
                    "type": "n8n-nodes-base.executeCommand",
                    "typeVersion": 1,
                    "position": [450, 300]
                },
                {
                    "parameters": {
                        "conditions": {
                            "boolean": [
                                {
                                    "value1": "={{ $json.exitCode }}",
                                    "value2": 0
                                }
                            ]
                        }
                    },
                    "id": "check-success",
                    "name": "Check Success",
                    "type": "n8n-nodes-base.if",
                    "typeVersion": 1,
                    "position": [650, 300]
                },
                {
                    "parameters": {
                        "content": "=Swarm run completed successfully!\n\nOutput:\n{{ $json.stdout }}",
                        "options": {}
                    },
                    "id": "success-note",
                    "name": "Success Log",
                    "type": "n8n-nodes-base.set",
                    "typeVersion": 3.2,
                    "position": [850, 200]
                },
                {
                    "parameters": {
                        "content": "=Swarm run failed!\n\nError:\n{{ $json.stderr }}",
                        "options": {}
                    },
                    "id": "failure-note",
                    "name": "Failure Log",
                    "type": "n8n-nodes-base.set",
                    "typeVersion": 3.2,
                    "position": [850, 400]
                }
            ],
            "connections": {
                "Every 4 Hours": {
                    "main": [[{"node": "Run Swarm Coordinator", "type": "main", "index": 0}]]
                },
                "Run Swarm Coordinator": {
                    "main": [[{"node": "Check Success", "type": "main", "index": 0}]]
                },
                "Check Success": {
                    "main": [
                        [{"node": "Success Log", "type": "main", "index": 0}],
                        [{"node": "Failure Log", "type": "main", "index": 0}]
                    ]
                }
            },
            "settings": {
                "executionOrder": "v1"
            },
            "staticData": None,
            "tags": ["hikewise", "swarm", "automation"]
        }

    def generate_discovery_workflow(self) -> Dict:
        """Generate workflow for discovery runs."""
        return {
            "name": "HikeWise Discovery",
            "nodes": [
                {
                    "parameters": {
                        "rule": {
                            "interval": [
                                {
                                    "field": "hours",
                                    "hoursInterval": 6
                                }
                            ]
                        }
                    },
                    "id": "discovery-trigger",
                    "name": "Every 6 Hours",
                    "type": "n8n-nodes-base.scheduleTrigger",
                    "typeVersion": 1.2,
                    "position": [250, 300]
                },
                {
                    "parameters": {
                        "command": f"cd {self.project_path} && python execution/discovery_agent.py --action discover"
                    },
                    "id": "run-discovery",
                    "name": "Run Discovery",
                    "type": "n8n-nodes-base.executeCommand",
                    "typeVersion": 1,
                    "position": [450, 300]
                },
                {
                    "parameters": {
                        "command": f"cd {self.project_path} && python execution/issue_classifier.py --action classify --input .tmp/discovery/issue_report.json"
                    },
                    "id": "classify-issues",
                    "name": "Classify Issues",
                    "type": "n8n-nodes-base.executeCommand",
                    "typeVersion": 1,
                    "position": [650, 300]
                },
                {
                    "parameters": {
                        "command": f"cd {self.project_path} && python execution/kanban_state_manager.py --action import --from-file .tmp/swarm/classified_issues.json"
                    },
                    "id": "update-kanban",
                    "name": "Update Kanban",
                    "type": "n8n-nodes-base.executeCommand",
                    "typeVersion": 1,
                    "position": [850, 300]
                }
            ],
            "connections": {
                "Every 6 Hours": {
                    "main": [[{"node": "Run Discovery", "type": "main", "index": 0}]]
                },
                "Run Discovery": {
                    "main": [[{"node": "Classify Issues", "type": "main", "index": 0}]]
                },
                "Classify Issues": {
                    "main": [[{"node": "Update Kanban", "type": "main", "index": 0}]]
                }
            },
            "settings": {"executionOrder": "v1"},
            "tags": ["hikewise", "discovery", "automation"]
        }

    def generate_pr_testing_workflow(self) -> Dict:
        """Generate workflow for PR testing via webhook."""
        return {
            "name": "HikeWise PR Testing",
            "nodes": [
                {
                    "parameters": {
                        "path": "hikewise-pr-test",
                        "options": {}
                    },
                    "id": "webhook-trigger",
                    "name": "GitHub Webhook",
                    "type": "n8n-nodes-base.webhook",
                    "typeVersion": 1.1,
                    "position": [250, 300],
                    "webhookId": "hikewise-pr-webhook"
                },
                {
                    "parameters": {
                        "conditions": {
                            "string": [
                                {
                                    "value1": "={{ $json.body.action }}",
                                    "operation": "equals",
                                    "value2": "opened"
                                }
                            ]
                        }
                    },
                    "id": "check-action",
                    "name": "Is PR Opened?",
                    "type": "n8n-nodes-base.if",
                    "typeVersion": 1,
                    "position": [450, 300]
                },
                {
                    "parameters": {
                        "command": "=cd " + self.project_path + " && python execution/maestro_test_runner.py --action run --flows .maestro/flows/verify"
                    },
                    "id": "run-tests",
                    "name": "Run Maestro Tests",
                    "type": "n8n-nodes-base.executeCommand",
                    "typeVersion": 1,
                    "position": [650, 200]
                },
                {
                    "parameters": {
                        "method": "POST",
                        "url": "=https://api.github.com/repos/{{ $json.body.repository.full_name }}/issues/{{ $json.body.number }}/comments",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                        "sendBody": True,
                        "bodyParameters": {
                            "parameters": [
                                {
                                    "name": "body",
                                    "value": "=## Automated Test Results\n\n{{ $('Run Maestro Tests').item.json.stdout }}"
                                }
                            ]
                        },
                        "options": {}
                    },
                    "id": "post-comment",
                    "name": "Post PR Comment",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.1,
                    "position": [850, 200]
                }
            ],
            "connections": {
                "GitHub Webhook": {
                    "main": [[{"node": "Is PR Opened?", "type": "main", "index": 0}]]
                },
                "Is PR Opened?": {
                    "main": [
                        [{"node": "Run Maestro Tests", "type": "main", "index": 0}],
                        []
                    ]
                },
                "Run Maestro Tests": {
                    "main": [[{"node": "Post PR Comment", "type": "main", "index": 0}]]
                }
            },
            "settings": {"executionOrder": "v1"},
            "tags": ["hikewise", "testing", "github"]
        }

    def generate_release_workflow(self) -> Dict:
        """Generate workflow for release automation."""
        return {
            "name": "HikeWise Release",
            "nodes": [
                {
                    "parameters": {
                        "rule": {
                            "interval": [
                                {
                                    "field": "cronExpression",
                                    "expression": "0 10 * * 5"  # Friday 10am
                                }
                            ]
                        }
                    },
                    "id": "release-trigger",
                    "name": "Friday 10am",
                    "type": "n8n-nodes-base.scheduleTrigger",
                    "typeVersion": 1.2,
                    "position": [250, 300]
                },
                {
                    "parameters": {
                        "command": f"cd {self.project_path} && python execution/version_bumper.py --action current"
                    },
                    "id": "check-version",
                    "name": "Check Version",
                    "type": "n8n-nodes-base.executeCommand",
                    "typeVersion": 1,
                    "position": [450, 300]
                },
                {
                    "parameters": {
                        "command": f"cd {self.project_path} && python execution/eas_build_manager.py --action list --limit 1 --platform ios"
                    },
                    "id": "check-builds",
                    "name": "Check Recent Builds",
                    "type": "n8n-nodes-base.executeCommand",
                    "typeVersion": 1,
                    "position": [650, 300]
                },
                {
                    "parameters": {
                        "content": "=Weekly Release Check Complete\n\nVersion: {{ $('Check Version').item.json.stdout }}\nBuilds: {{ $('Check Recent Builds').item.json.stdout }}",
                        "options": {}
                    },
                    "id": "summary",
                    "name": "Summary",
                    "type": "n8n-nodes-base.set",
                    "typeVersion": 3.2,
                    "position": [850, 300]
                }
            ],
            "connections": {
                "Friday 10am": {
                    "main": [[{"node": "Check Version", "type": "main", "index": 0}]]
                },
                "Check Version": {
                    "main": [[{"node": "Check Recent Builds", "type": "main", "index": 0}]]
                },
                "Check Recent Builds": {
                    "main": [[{"node": "Summary", "type": "main", "index": 0}]]
                }
            },
            "settings": {"executionOrder": "v1"},
            "tags": ["hikewise", "release", "automation"]
        }

    def generate_all_workflows(self) -> ExecutionResult:
        """Generate all workflows and save to files."""
        workflows = {
            "swarm-trigger": self.generate_swarm_trigger_workflow(),
            "discovery": self.generate_discovery_workflow(),
            "pr-testing": self.generate_pr_testing_workflow(),
            "release": self.generate_release_workflow()
        }

        saved = []
        for name, workflow in workflows.items():
            output_path = os.path.join(self.workflows_dir, f"{name}.json")
            with open(output_path, "w") as f:
                json.dump(workflow, f, indent=2)
            saved.append(output_path)

        return ExecutionResult.ok(data={
            "workflows_generated": len(workflows),
            "files": saved
        })

    def export_workflow(self, workflow_name: str, output_path: str = None) -> ExecutionResult:
        """Export a specific workflow."""
        generators = {
            "swarm-trigger": self.generate_swarm_trigger_workflow,
            "discovery": self.generate_discovery_workflow,
            "pr-testing": self.generate_pr_testing_workflow,
            "release": self.generate_release_workflow
        }

        if workflow_name not in generators:
            return ExecutionResult.fail(
                error=f"Unknown workflow: {workflow_name}. Available: {list(generators.keys())}"
            )

        workflow = generators[workflow_name]()

        if output_path:
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
            with open(output_path, "w") as f:
                json.dump(workflow, f, indent=2)

        return ExecutionResult.ok(data={
            "workflow": workflow,
            "output_path": output_path
        })

    def get_docker_setup_instructions(self) -> str:
        """Get Docker setup instructions for n8n."""
        return f"""
# n8n Docker Setup for HikeWise Swarm

## Quick Start

```bash
# Create data directory
mkdir -p ~/n8n-data

# Run n8n in Docker
docker run -d \\
  --name n8n \\
  -p 5678:5678 \\
  -v ~/n8n-data:/home/node/.n8n \\
  -v {self.project_path}:/project:ro \\
  -e GENERIC_TIMEZONE="America/Chicago" \\
  n8nio/n8n

# Access n8n at http://localhost:5678
```

## Import Workflows

1. Open n8n at http://localhost:5678
2. Go to Workflows > Import from File
3. Import the JSON files from: {self.workflows_dir}

## Available Workflows

- **swarm-trigger.json**: Runs swarm coordinator every 4 hours
- **discovery.json**: Runs discovery agent every 6 hours
- **pr-testing.json**: Tests PRs via GitHub webhook
- **release.json**: Weekly release check (Friday 10am)

## Environment Variables

Set these in n8n settings or docker environment:

- GITHUB_TOKEN: For PR commenting
- ANTHROPIC_API_KEY: For Claude agents

## Webhook Setup

For PR testing, configure GitHub webhook:
- URL: http://your-n8n-host:5678/webhook/hikewise-pr-test
- Events: Pull requests
"""


def main():
    parser = argparse.ArgumentParser(
        description="n8n workflow generator for HikeWise"
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["generate", "generate-all", "export", "setup"],
        help="Action to perform"
    )
    parser.add_argument("--workflow", help="Workflow name")
    parser.add_argument("--output", help="Output file path")
    args = parser.parse_args()

    load_env()
    generator = N8nWorkflowGenerator()

    if args.action == "generate":
        if not args.workflow:
            print(ExecutionResult.fail(error="--workflow required").to_json())
            sys.exit(1)
        result = generator.export_workflow(args.workflow, args.output)

    elif args.action == "generate-all":
        result = generator.generate_all_workflows()

    elif args.action == "export":
        if not args.workflow:
            print(ExecutionResult.fail(error="--workflow required").to_json())
            sys.exit(1)
        result = generator.export_workflow(args.workflow, args.output)

    elif args.action == "setup":
        instructions = generator.get_docker_setup_instructions()
        print(instructions)
        result = ExecutionResult.ok(data={"instructions": "printed"})

    else:
        result = ExecutionResult.fail(error=f"Unknown action: {args.action}")

    if args.action != "setup":
        print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
