# Directive: HikeWise Swarm Coordinator

## Goal
Orchestrate multiple autonomous agents to continuously discover, fix, and verify issues in the HikeWise mobile app.

## Inputs
- **Required:**
  - `kanban_path`: Path to Kanban state file (default: `.tmp/swarm/kanban.json`)
- **Optional:**
  - `max_agents`: Maximum concurrent agents (default: 3)
  - `categories`: Issue categories to work on (default: all)
  - `dry_run`: Preview actions without executing (default: false)

## Execution Scripts
1. `execution/swarm_coordinator.py` - Main orchestration entry point
2. `execution/worktree_manager.py` - Git worktree creation/cleanup
3. `execution/agent_dependency_resolver.py` - Task ordering and dependency tracking
4. `execution/agent_state_manager.py` - Inter-agent communication and locks
5. `execution/kanban_state_manager.py` - Kanban state transitions

## Process
1. **Initialize swarm session:**
   ```bash
   python execution/swarm_coordinator.py --action run --max-agents 3
   ```

2. **Load Kanban state** from `.tmp/swarm/kanban.json`

3. **Resolve task dependencies** using dependency resolver:
   - Build dependency graph
   - Identify ready tasks (no blockers)
   - Order by priority (P0 > P1 > P2 > P3)

4. **Spawn agents** for ready tasks:
   - Create isolated worktree per agent
   - Claim task in state manager
   - Run appropriate specialized agent

5. **Monitor agent progress:**
   - Check state files every 30 seconds
   - Handle completion/failure
   - Transition Kanban state

6. **Cleanup:**
   - Archive worktrees on success
   - Release locks
   - Update Kanban to "done" column

## Agent Spawning Rules
- Maximum 3 concurrent agents
- One agent per issue
- Agents wait if dependencies are in-progress
- Priority order: Critical > High > Medium > Low

## Worktree Naming Convention
```
../hikewise-agent-{N}/  # N = agent slot 1-3
Branch: agent-{N}/{category}-{issue-id}
```

## Outputs
- **Primary:** Updated Kanban state with completed issues
- **Logs:** `.tmp/swarm/logs/{session_id}/`
- **State:** `.tmp/swarm/state.json`

## Error Handling
- **Agent Crash:** Move task back to "suggestions", log error
- **Worktree Conflict:** Wait 60s, retry cleanup
- **Test Failure:** Keep task in-progress, flag for review
- **Build Failure:** Stop swarm, notify user

## Edge Cases
- What if multiple agents need the same file? Lock via state manager
- What if an agent runs > 30 minutes? Timeout and move back to suggestions
- What if Kanban is empty? Run discovery agent first

## Integration with n8n
Trigger swarm via n8n scheduled workflow:
```bash
python execution/swarm_coordinator.py --action run --max-agents 3
```

## State File Schema
```json
{
  "session_id": "swarm-20260206-100000",
  "started_at": "2026-02-06T10:00:00Z",
  "agents": {
    "1": { "status": "working", "task_id": "nav-001", "worktree": "../hikewise-agent-1" },
    "2": { "status": "idle" },
    "3": { "status": "idle" }
  },
  "tasks_completed": 5,
  "tasks_failed": 1
}
```

## Learnings
> Add discoveries here as you use this directive

- [Initial]: Designed for AWS EC2 Mac extraction as SaaS
