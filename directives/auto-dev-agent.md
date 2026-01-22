# Directive: Auto-Dev Agent (Todo-to-Code Pipeline)

## Goal
Transform structured todos into working, tested code by orchestrating multiple Claude CLI agents in parallel, each implementing features on isolated branches with automated Playwright testing.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTO-DEV ORCHESTRATOR                        │
├─────────────────────────────────────────────────────────────────────┤
│  Reads todos → Creates branches → Spawns agents → Coordinates tests │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│  AGENT POOL   │           │  AGENT POOL   │           │  AGENT POOL   │
│   Worker 1    │           │   Worker 2    │           │   Worker N    │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ Branch: feat/ │           │ Branch: feat/ │           │ Branch: feat/ │
│ todo-001-xyz  │           │ todo-002-abc  │           │ todo-00N-def  │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ Claude CLI    │           │ Claude CLI    │           │ Claude CLI    │
│ Session       │           │ Session       │           │ Session       │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ Dev Server    │           │ Dev Server    │           │ Dev Server    │
│ Port: 3001    │           │ Port: 3002    │           │ Port: 300N    │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ Playwright    │           │ Playwright    │           │ Playwright    │
│ Instance      │           │ Instance      │           │ Instance      │
└───────────────┘           └───────────────┘           └───────────────┘
```

## Inputs
- **Required:**
  - `todos_path`: Path to JSON file containing todos (from `generate_todos.py`)
  - `project_path`: Path to the project to develop against

- **Optional:**
  - `max_parallel_agents`: Maximum concurrent Claude agents (default: 3)
  - `base_port`: Starting port for dev servers (default: 3001)
  - `auto_merge`: Auto-merge passing branches to main (default: false)
  - `test_timeout`: Timeout for Playwright tests in seconds (default: 120)
  - `github_push`: Push branches to GitHub (default: true)
  - `priority_filter`: Only process todos with priority >= N (default: 1)
  - `categories`: Filter by category list (default: all)

## Execution Scripts

1. `execution/todo_processor.py` - Parses todos JSON, prioritizes, and creates work queue
2. `execution/git_branch_manager.py` - Creates/manages feature branches, handles merges
3. `execution/spawn_claude_agent.py` - Spawns Claude CLI agents with specific prompts
4. `execution/dev_server_manager.py` - Manages multiple dev server instances on different ports
5. `execution/playwright_test_runner.py` - Runs Playwright tests against specific ports
6. `execution/agent_coordinator.py` - Main orchestrator that coordinates all the above

## Process

### Phase 1: Initialization
1. **Load and validate todos**
   - Run `execution/todo_processor.py` with todos JSON path
   - Validates todo format, filters by priority/category
   - Creates prioritized work queue
   - Output: `.tmp/auto-dev/work_queue.json`

2. **Initialize git state**
   - Run `execution/git_branch_manager.py --action init`
   - Stash any uncommitted changes
   - Ensure on main/master branch
   - Create `.tmp/auto-dev/git_state.json` with initial state

### Phase 2: Parallel Development
3. **For each todo in work queue (up to max_parallel_agents):**

   a. **Create feature branch**
      ```bash
      python execution/git_branch_manager.py \
        --action create \
        --todo-id "todo_001" \
        --title "add-dark-mode-toggle"
      ```
      - Creates branch: `feat/todo-001-add-dark-mode-toggle`
      - Checks out the branch

   b. **Spawn dev server**
      ```bash
      python execution/dev_server_manager.py \
        --action start \
        --port 3001 \
        --project-path /path/to/project
      ```
      - Starts dev server on allocated port
      - Waits for server to be healthy
      - Returns server PID and URL

   c. **Spawn Claude CLI agent**
      ```bash
      python execution/spawn_claude_agent.py \
        --todo-json '{"id": "todo_001", "title": "...", ...}' \
        --project-path /path/to/project \
        --test-url "http://localhost:3001" \
        --session-id "agent_001"
      ```
      - Creates detailed prompt from todo
      - Spawns `claude` CLI in non-interactive mode
      - Agent implements the feature
      - Agent runs its own tests
      - Captures all output to `.tmp/auto-dev/agents/agent_001.log`

   d. **Run Playwright tests**
      ```bash
      python execution/playwright_test_runner.py \
        --url "http://localhost:3001" \
        --todo-id "todo_001" \
        --screenshots-dir ".tmp/auto-dev/screenshots/todo_001"
      ```
      - Runs visual regression tests
      - Tests acceptance criteria from todo
      - Captures screenshots for each step
      - Output: `.tmp/auto-dev/test_results/todo_001.json`

### Phase 3: Validation & Merge
4. **Validate implementation**
   - Check test results
   - If tests pass:
     - Commit changes with descriptive message
     - Push branch to GitHub
     - Create PR (if configured)
     - Optionally auto-merge to main
   - If tests fail:
     - Log failure reason
     - Keep branch for manual review
     - Move to next todo

5. **Cleanup**
   - Stop dev servers
   - Generate summary report
   - Output: `.tmp/auto-dev/run_report_{timestamp}.json`

## Output Files

```
.tmp/auto-dev/
├── work_queue.json           # Prioritized todo queue
├── git_state.json            # Git state tracking
├── agents/
│   ├── agent_001.log         # Claude CLI output for each agent
│   ├── agent_002.log
│   └── ...
├── test_results/
│   ├── todo_001.json         # Playwright test results
│   ├── todo_002.json
│   └── ...
├── screenshots/
│   ├── todo_001/
│   │   ├── before.png
│   │   ├── after.png
│   │   └── ...
│   └── ...
└── run_report_{timestamp}.json  # Final summary
```

## Claude Agent Prompt Template

The prompt sent to each Claude CLI agent follows this structure:

```markdown
# Implementation Task: {todo.title}

## Context
You are implementing a feature for: {app_context}
Working in: {project_path}
Test URL: {test_url}

## Task Details
**ID:** {todo.id}
**Priority:** {todo.priority}
**Category:** {todo.category}
**Description:** {todo.description}

## Acceptance Criteria
{for criterion in todo.acceptance_criteria}
- [ ] {criterion}
{/for}

## Related Files (Suggested)
{todo.related_files}

## Instructions
1. First, explore the codebase to understand the existing patterns
2. Implement the feature following existing code conventions
3. Test your changes by visiting {test_url} in a browser
4. Commit your changes with a descriptive message
5. Ensure all acceptance criteria are met

## Constraints
- DO NOT modify unrelated files
- DO NOT add dependencies without necessity
- Follow existing code patterns and style
- Write tests if the project has a test suite
```

## Error Handling

- **Claude CLI not installed:** Exit with instructions to install
- **Port already in use:** Try next available port (base_port + N)
- **Git conflict on merge:** Keep branch, flag for manual review
- **Agent timeout:** Kill agent, log partial progress, continue with next todo
- **Dev server crash:** Restart server, retry up to 3 times
- **Playwright timeout:** Capture current state, mark as failed
- **GitHub push fails:** Log error, continue (branch saved locally)

## Edge Cases

- **Todos with dependencies:** Process in order, wait for dependent todos to complete
- **Same file modified by multiple todos:** Process sequentially, not in parallel
- **Very large todos:** Split into subtasks if possible
- **No test criteria:** Run smoke test (page loads without errors)
- **React Native project:** Use Expo web mode for Playwright testing

## Configuration

Environment variables in `.env`:
```
# Required
ANTHROPIC_API_KEY=sk-ant-...     # For Claude CLI

# Optional
GITHUB_TOKEN=ghp_...              # For creating PRs
MAX_PARALLEL_AGENTS=3             # Override default
AUTO_MERGE_PASSING=false          # Override default
```

## Example Usage

```bash
# Basic usage - process all todos
python execution/agent_coordinator.py \
  --todos .tmp/todos/video_20240115.json \
  --project /path/to/my-app

# With filters
python execution/agent_coordinator.py \
  --todos .tmp/todos/video_20240115.json \
  --project /path/to/my-app \
  --max-agents 5 \
  --priority-filter 3 \
  --categories "feature,enhancement"

# Dry run (shows what would be done)
python execution/agent_coordinator.py \
  --todos .tmp/todos/video_20240115.json \
  --project /path/to/my-app \
  --dry-run
```

## Learnings
> Add discoveries here as you use this directive

- [Initial]: Claude CLI works best with clear, specific prompts - include file paths when known
- [Initial]: Running more than 3 parallel agents can cause system slowdown
- [Initial]: Always wait for dev server health check before running tests
