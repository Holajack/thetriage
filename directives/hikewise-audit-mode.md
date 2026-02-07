# Directive: HikeWise Audit Mode

## Goal
Run the swarm in audit-only mode to discover, document, and generate fix plans for all issues WITHOUT making any code changes.

## Inputs
- **Optional:**
  - `--skip-maestro`: Skip Maestro E2E tests (faster, no simulator needed)
  - `--skip-discovery`: Skip discovery phase, use existing todo list

## Execution Scripts
1. `execution/swarm_coordinator.py --action audit` - Main audit orchestration
2. `execution/issue_plan_generator.py` - Generate fix plans and LLM todos
3. `execution/navigation_flow_verifier.py` - Navigation analysis
4. `execution/kanban_state_manager.py` - Track issues in Kanban

## Process

### Quick Start (No Simulator Required)
```bash
# Run audit without Maestro (uses todo list + navigation analysis)
python3 execution/swarm_coordinator.py --action audit --skip-maestro
```

### Full Audit (Requires Mac with Simulator)
```bash
# Boot simulator first
python3 execution/xcode_simulator_manager.py --action boot --device "iPhone 15 Pro"

# Run full audit with Maestro discovery
python3 execution/swarm_coordinator.py --action audit
```

## What the Audit Does

### Phase 1: Navigation Analysis
- Parses all navigation files
- Builds navigation graph
- Identifies broken routes, orphaned screens, missing back handlers
- Generates Mermaid diagram

### Phase 2: Maestro Discovery (if enabled)
- Runs `explore-all-screens.yaml`
- Runs `navigation-integrity.yaml`
- Runs `data-persistence.yaml`
- Runs `error-hunting.yaml`
- Captures screenshots and logs

### Phase 3: Issue Classification
- Classifies all discovered issues by priority (P0-P3)
- Categorizes by type (navigation, settings, profile, etc.)
- Imports to Kanban

### Phase 4: Generate Fix Plans
- Creates detailed fix plan for each issue
- Identifies affected files
- Generates investigation steps
- Proposes fix approach

### Phase 5: Export LLM Todos
- Generates markdown document with all issues
- Each issue includes a ready-to-use LLM prompt
- Sorted by priority

### Phase 6: Audit Report
- Comprehensive summary of findings
- Recommendations for critical issues
- Statistics by category and priority

## Outputs

| File | Description |
|------|-------------|
| `.tmp/swarm/llm_todos.md` | **Main output** - LLM-ready fix prompts |
| `.tmp/swarm/reports/audit_*.md` | Human-readable audit report |
| `.tmp/swarm/kanban.json` | Kanban board state |
| `.tmp/swarm/plans/*.json` | Individual fix plans |
| `.tmp/swarm/navigation_diagram.mermaid` | Navigation flow diagram |
| `.tmp/navigation/verification.json` | Navigation issues |

## Using the LLM Todos

### 1. View the todos
```bash
cat .tmp/swarm/llm_todos.md
```

### 2. Pick an issue by priority
Start with 🔴 Critical and 🟠 High priority issues.

### 3. Copy the LLM prompt
Each issue has an expandable prompt section. Copy it.

### 4. Give to Claude/GPT
Paste the prompt into Claude or GPT with access to your codebase.

### 5. Review the fix
Don't apply blindly - review the proposed changes.

### 6. Apply and verify
```bash
# After applying fix, verify with Maestro
maestro test maestro/flows/verify/navigation-back-button.yaml
```

### 7. Update Kanban
```bash
# Move issue to done
python3 execution/kanban_state_manager.py --action move --issue-id <ID> --to done
```

## Example LLM Prompt Format

```markdown
## Task: Fix navigation Issue

### Issue
**ID:** nav-001
**Title:** Back button returns to Home instead of Profile
**Priority:** high

### Affected Files
- `src/navigation/RootNavigator.tsx`
- `src/navigation/MainNavigator.tsx`

### Fix Approach
Check if navigation.goBack() is being used instead of navigation.navigate('Home')

### Instructions
1. Read the affected files
2. Follow the fix approach
3. Test with Maestro
4. Commit with message: `fix(navigation): Back button returns to correct parent`
```

## Workflow for Teams

### Daily Standup
1. Run audit each morning: `python3 execution/swarm_coordinator.py --action audit --skip-maestro`
2. Review new issues in `.tmp/swarm/llm_todos.md`
3. Assign issues to team members

### Individual Developer
1. Claim an issue: `python3 execution/kanban_state_manager.py --action move --issue-id <ID> --to in_progress`
2. Copy LLM prompt from `llm_todos.md`
3. Use Claude/GPT to generate fix
4. Review, apply, and test
5. Mark done: `python3 execution/kanban_state_manager.py --action move --issue-id <ID> --to done`

### Weekly Review
1. Run full audit with Maestro
2. Compare current issues vs last week
3. Track fix rate and remaining issues

## Error Handling
- **Simulator not available:** Use `--skip-maestro` flag
- **No issues found:** Check if todo list exists, run Maestro manually
- **Plan generation fails:** Check `.tmp/swarm/kanban.json` has issues

## Learnings
> Add discoveries here as you use this directive

- [Initial]: `--skip-maestro` allows running on any machine without Mac/Xcode
- [Initial]: LLM prompts are designed for Claude/GPT without codebase access to start
