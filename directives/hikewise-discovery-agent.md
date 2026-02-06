# Directive: HikeWise Discovery Agent

## Goal
Autonomously explore the HikeWise app via Maestro E2E tests to discover issues, bugs, and regressions without human intervention.

## Inputs
- **Required:**
  - `flows_dir`: Directory containing Maestro discovery flows (default: `.maestro/flows/discovery`)
- **Optional:**
  - `simulator_name`: iOS Simulator to use (default: "iPhone 15 Pro")
  - `capture_screenshots`: Enable screenshot capture (default: true)

## Execution Scripts
1. `execution/discovery_agent.py` - Main discovery orchestration
2. `execution/xcode_simulator_manager.py` - Simulator boot/control
3. `execution/maestro_test_runner.py` - Maestro flow execution
4. `execution/issue_classifier.py` - Priority classification

## Process
1. **Boot iOS Simulator:**
   ```bash
   python execution/xcode_simulator_manager.py --action boot --device "iPhone 15 Pro"
   ```

2. **Launch app with TEST_MODE:**
   - Set `EXPO_PUBLIC_TEST_MODE=true`
   - App auto-authenticates with mock admin user
   - All subscription features unlocked

3. **Run discovery flows:**
   ```bash
   python execution/discovery_agent.py --action discover --flows .maestro/flows/discovery
   ```

4. **Capture data:**
   - Screenshots at key navigation points
   - Console logs for errors
   - Navigation traces

5. **Analyze results:**
   - Parse Maestro output for failures
   - Match error patterns to issue types
   - Generate issue list with context

6. **Classify issues:**
   ```bash
   python execution/issue_classifier.py --action classify --input .tmp/discovery/issue_report.json
   ```

7. **Output to Kanban:**
   ```bash
   python execution/kanban_state_manager.py --action import --from-file .tmp/swarm/classified_issues.json
   ```

## Discovery Flow Types

### explore-all-screens.yaml
Visits every screen in the app systematically:
- Main tabs: Home, Analytics, Leaderboard, Shop
- Profile and all settings screens
- Study room creation and management
- Focus session flows

### navigation-integrity.yaml
Tests back button behavior on all stack screens:
- Navigate Home > Profile > Settings > Back
- Verify return to correct parent screen
- Test gesture navigation

### data-persistence.yaml
Verifies data saves correctly:
- Create study session, force close, reopen
- Modify profile, reload
- Check settings persistence

### error-hunting.yaml
Deliberately triggers edge cases:
- Network disconnect scenarios
- Invalid input handling
- Rapid screen transitions

## Outputs
- **Issue Report:** `.tmp/discovery/issue_report.json`
- **Screenshots:** `.tmp/discovery/screenshots/`
- **Classified Issues:** `.tmp/swarm/classified_issues.json`
- **Session Log:** `.tmp/discovery/latest_session.json`

## Issue Output Schema
```json
{
  "id": "disc-001-20260206100000",
  "type": "navigation_error",
  "priority": "high",
  "title": "Back button returns to Home instead of Profile",
  "source_flow": "navigation-integrity",
  "screenshot": ".tmp/discovery/screenshots/nav-001.png",
  "affected_files": ["src/navigation/RootNavigator.tsx"],
  "discovered_at": "2026-02-06T10:00:00Z"
}
```

## Error Handling
- **Simulator not booted:** Auto-boot and retry
- **Maestro timeout:** Mark flow as failed, continue others
- **App crash:** Capture crash log, restart app, continue
- **Network error:** Enable airplane mode test or skip

## Edge Cases
- What if TEST_MODE doesn't work? Fall back to real auth (requires credentials)
- What if simulator is busy? Queue discovery, retry in 5 minutes
- What if no issues found? Log success, skip Kanban import

## Priority Classification Rules
| Type | Priority | Trigger |
|------|----------|---------|
| crash | critical | Red screen, app termination |
| navigation_error | high | Wrong screen after navigation |
| element_not_found | high | Missing UI element |
| timeout | medium | Operation took > 10s |
| assertion_failed | medium | Maestro assertion failure |
| network_error | low | API call failed |

## Learnings
> Add discoveries here as you use this directive

- [Initial]: TEST_MODE bypass in AuthContext enables full app access
- [Initial]: Elite subscription tier gives access to all features
