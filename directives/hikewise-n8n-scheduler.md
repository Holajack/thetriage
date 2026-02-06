# Directive: HikeWise n8n Scheduler

## Goal
Configure and manage n8n workflows for scheduled swarm operations, including automated discovery, testing, and release checks.

## Inputs
- **Required:**
  - `action`: setup, generate, deploy, list
- **Optional:**
  - `workflow`: Specific workflow to generate
  - `schedule`: Cron expression for scheduling

## Execution Scripts
1. `execution/n8n_workflow_generator.py` - Generate n8n workflow JSON

## n8n Docker Setup

### Quick Start
```bash
# Create data directory
mkdir -p ~/n8n-data

# Run n8n in Docker
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/n8n-data:/home/node/.n8n \
  -v /Users/jackenholland/AppDev/thetriage:/project:ro \
  -e GENERIC_TIMEZONE="America/Chicago" \
  n8nio/n8n

# Access n8n at http://localhost:5678
```

### With Environment Variables
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/n8n-data:/home/node/.n8n \
  -v /Users/jackenholland/AppDev/thetriage:/project:ro \
  -e GENERIC_TIMEZONE="America/Chicago" \
  -e N8N_BASIC_AUTH_ACTIVE="true" \
  -e N8N_BASIC_AUTH_USER="admin" \
  -e N8N_BASIC_AUTH_PASSWORD="password" \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  -e GITHUB_TOKEN="${GITHUB_TOKEN}" \
  n8nio/n8n
```

## Process

### Generate All Workflows
```bash
python execution/n8n_workflow_generator.py --action generate-all
```

### Generate Specific Workflow
```bash
python execution/n8n_workflow_generator.py --action generate --workflow swarm-trigger
```

### Export to File
```bash
python execution/n8n_workflow_generator.py \
  --action export \
  --workflow swarm-trigger \
  --output n8n-workflows/swarm-trigger.json
```

### View Setup Instructions
```bash
python execution/n8n_workflow_generator.py --action setup
```

## Available Workflows

### 1. Swarm Trigger (swarm-trigger.json)
**Schedule:** Every 4 hours (9am-9pm)
**Action:** Runs swarm coordinator with max 3 agents

```yaml
Trigger: Schedule (every 4 hours)
  │
  └──► Execute Command: python execution/swarm_coordinator.py --action run --max-agents 3
        │
        └──► Check Success
              ├──► Success: Log completion
              └──► Failure: Log error
```

### 2. Discovery (discovery.json)
**Schedule:** Every 6 hours
**Action:** Discovers new issues via Maestro

```yaml
Trigger: Schedule (every 6 hours)
  │
  └──► Run Discovery: python execution/discovery_agent.py --action discover
        │
        └──► Classify Issues: python execution/issue_classifier.py --action classify
              │
              └──► Update Kanban: python execution/kanban_state_manager.py --action import
```

### 3. PR Testing (pr-testing.json)
**Trigger:** GitHub webhook on PR open
**Action:** Runs verification tests on new PRs

```yaml
Trigger: GitHub Webhook (PR opened)
  │
  └──► Check: Is PR Opened?
        │
        └──► Yes: Run Maestro Tests
              │
              └──► Post PR Comment with results
```

### 4. Release Check (release.json)
**Schedule:** Friday 10am
**Action:** Weekly release readiness check

```yaml
Trigger: Cron (Friday 10am)
  │
  └──► Check Version
        │
        └──► Check Recent Builds
              │
              └──► Generate Summary
```

## Importing Workflows to n8n

1. Open n8n at http://localhost:5678
2. Go to **Workflows** > **Import from File**
3. Select workflow JSON from `n8n-workflows/`
4. Configure credentials (GitHub token, etc.)
5. Activate workflow

## Webhook Configuration

### GitHub PR Webhook
1. Go to GitHub repo > Settings > Webhooks
2. Add webhook:
   - URL: `http://your-n8n-host:5678/webhook/hikewise-pr-test`
   - Events: Pull requests
   - Secret: (optional)

## Schedule Reference
| Workflow | Cron Expression | Human Readable |
|----------|-----------------|----------------|
| Swarm | `0 */4 9-21 * *` | Every 4 hours, 9am-9pm |
| Discovery | `0 */6 * * *` | Every 6 hours |
| Release | `0 10 * * 5` | Friday 10am |

## Outputs
- **Workflows:** `n8n-workflows/*.json`
- **Logs:** Accessible in n8n UI > Executions

## Environment Variables for n8n
```bash
# Required for swarm
ANTHROPIC_API_KEY=sk-ant-xxx

# Required for GitHub integration
GITHUB_TOKEN=ghp_xxx

# Optional: Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
```

## Error Handling
- **Docker not running:** Start Docker Desktop
- **Port conflict:** Change -p 5678:5678 to different port
- **Workflow fails:** Check n8n executions log for details
- **Webhook not receiving:** Check firewall/ngrok for local dev

## Edge Cases
- What if n8n restarts? Workflows persist in ~/n8n-data
- What if execution takes long? n8n has built-in timeout handling
- What if API key expires? Update in n8n credentials

## Monitoring
```bash
# View n8n logs
docker logs -f n8n

# Check n8n status
docker ps | grep n8n

# Restart n8n
docker restart n8n
```

## Advanced: n8n with Claude Integration
n8n has native Claude/Anthropic nodes:
1. Go to Credentials > New
2. Select "Anthropic API"
3. Enter API key
4. Use "AI Agent" or "Anthropic Claude" nodes in workflows

## Learnings
> Add discoveries here as you use this directive

- [Initial]: n8n persists data in ~/n8n-data volume
- [Initial]: Webhook needs public URL or ngrok for GitHub
