# Directive: HikeWise Xcode Simulator Tester

## Goal
Manage iOS simulator lifecycle and run automated tests via Maestro to verify fixes before merging.

## Inputs
- **Required:**
  - `test_flows`: Path to Maestro test flows to run
- **Optional:**
  - `device`: Simulator device name (default: "iPhone 15 Pro")
  - `ios_version`: iOS runtime version (default: "17.4")
  - `timeout`: Test timeout in seconds (default: 300)

## Execution Scripts
1. `execution/xcode_simulator_manager.py` - Simulator control
2. `execution/maestro_test_runner.py` - Test execution
3. `execution/navigation_flow_verifier.py` - Navigation validation

## Process
1. **Ensure simulator is available:**
   ```bash
   python execution/xcode_simulator_manager.py --action list
   ```

2. **Boot target simulator:**
   ```bash
   python execution/xcode_simulator_manager.py --action boot --device "iPhone 15 Pro"
   ```

3. **Install dev build (if needed):**
   ```bash
   python execution/xcode_simulator_manager.py --action install --app-path .tmp/builds/latest.app
   ```

4. **Run verification tests:**
   ```bash
   python execution/maestro_test_runner.py \
     --action run \
     --flows .maestro/flows/verify \
     --env TEST_MODE=true
   ```

5. **Capture results:**
   - JUnit XML report
   - Screenshots on failure
   - Console logs

6. **Cleanup:**
   ```bash
   python execution/xcode_simulator_manager.py --action shutdown
   ```

## Simulator Management Commands

### List available simulators
```bash
python execution/xcode_simulator_manager.py --action list
```

### Boot a specific device
```bash
python execution/xcode_simulator_manager.py --action boot --device "iPhone 15 Pro"
```

### Capture screenshot
```bash
python execution/xcode_simulator_manager.py --action screenshot --output screen.png
```

### Shutdown all simulators
```bash
python execution/xcode_simulator_manager.py --action shutdown
```

### Reset simulator state
```bash
python execution/xcode_simulator_manager.py --action reset --device "iPhone 15 Pro"
```

## Test Flow Categories

### Verification Flows (.maestro/flows/verify/)
Run after bug fixes to confirm resolution:
- `navigation-back-button.yaml` - Back button behavior
- `settings-persistence.yaml` - Settings save correctly
- `profile-save.yaml` - Profile updates persist
- `study-room-invite.yaml` - Study room invitations
- `onboarding-complete.yaml` - Full onboarding flow

### Smoke Tests (.maestro/flows/smoke/)
Quick sanity checks before PR merge:
- App launches successfully
- Main navigation works
- User can start/end session

## Outputs
- **Test Report:** `.tmp/tests/junit-{timestamp}.xml`
- **Screenshots:** `.tmp/tests/screenshots/`
- **Logs:** `.tmp/tests/maestro.log`

## Test Result Schema
```json
{
  "session_id": "test-20260206-100000",
  "device": "iPhone 15 Pro",
  "flows_run": 5,
  "passed": 4,
  "failed": 1,
  "duration_seconds": 180,
  "failures": [
    {
      "flow": "navigation-back-button",
      "step": "assertVisible: Profile",
      "error": "Element not visible after 5s",
      "screenshot": "failure-001.png"
    }
  ]
}
```

## Error Handling
- **Simulator won't boot:** Reset device state, retry
- **App won't install:** Check build exists, re-download from EAS
- **Test timeout:** Kill Maestro process, capture state
- **Simulator locked:** Unlock via xcrun simctl

## Edge Cases
- What if no simulators available? Create one via xcrun simctl create
- What if iOS version mismatch? Download runtime via xcodebuild
- What if disk full? Clear derived data and simulator caches

## Pre-requisites
```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify Xcode CLI
xcode-select --install

# List available runtimes
xcrun simctl list runtimes
```

## Learnings
> Add discoveries here as you use this directive

- [Initial]: iPhone 15 Pro is a good default for testing
- [Initial]: TEST_MODE env var must be set for auth bypass
