# Directive: HikeWise Release Manager

## Goal
Automate the App Store release process including version bumping, building, TestFlight distribution, and App Store submission.

## Inputs
- **Required:**
  - `action`: release action (build, submit, bump-version)
- **Optional:**
  - `platform`: ios, android, or all (default: ios)
  - `profile`: EAS build profile (default: production)
  - `bump_type`: major, minor, or patch (default: patch)

## Execution Scripts
1. `execution/eas_build_manager.py` - EAS build triggers and monitoring
2. `execution/version_bumper.py` - Semantic versioning
3. `execution/maestro_test_runner.py` - Pre-release verification

## Current App Configuration
```json
{
  "version": "1.7.0",
  "ios": {
    "buildNumber": "15",
    "bundleIdentifier": "com.hikewise.app"
  },
  "android": {
    "versionCode": 19,
    "package": "com.hikewise.app"
  },
  "appleTeamId": "7YMK4D784T",
  "iosAppId": "6756673693"
}
```

## Process

### Full Release Workflow
1. **Run verification tests:**
   ```bash
   python execution/maestro_test_runner.py \
     --action run \
     --flows .maestro/flows/verify
   ```

2. **Bump version:**
   ```bash
   python execution/version_bumper.py --action bump --type patch
   ```

3. **Generate changelog:**
   ```bash
   python execution/version_bumper.py --action changelog
   ```

4. **Trigger EAS build:**
   ```bash
   python execution/eas_build_manager.py \
     --action build \
     --platform ios \
     --profile production
   ```

5. **Wait for build completion:**
   ```bash
   python execution/eas_build_manager.py \
     --action wait \
     --build-id {build_id} \
     --timeout 3600
   ```

6. **Submit to TestFlight:**
   ```bash
   python execution/eas_build_manager.py \
     --action submit \
     --platform ios
   ```

### Version Only
```bash
# Check current version
python execution/version_bumper.py --action current

# Bump patch (1.7.0 -> 1.7.1)
python execution/version_bumper.py --action bump --type patch

# Bump minor (1.7.0 -> 1.8.0)
python execution/version_bumper.py --action bump --type minor

# Bump major (1.7.0 -> 2.0.0)
python execution/version_bumper.py --action bump --type major

# Pre-release (1.7.0 -> 1.7.1-beta.1)
python execution/version_bumper.py --action bump --type prerelease --prerelease beta
```

### Build Only
```bash
# iOS Production
python execution/eas_build_manager.py --action build --platform ios --profile production

# iOS Preview (for testing)
python execution/eas_build_manager.py --action build --platform ios --profile preview

# Android Production
python execution/eas_build_manager.py --action build --platform android --profile production

# List recent builds
python execution/eas_build_manager.py --action list --limit 5
```

## EAS Build Profiles
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

## Release Checklist
- [ ] All E2E tests passing
- [ ] Version bumped appropriately
- [ ] Changelog updated
- [ ] Build completed successfully
- [ ] TestFlight submission accepted
- [ ] App Store metadata updated (if needed)
- [ ] Screenshots updated (if UI changed)

## Outputs
- **Build Info:** `.tmp/builds/{build_id}.json`
- **Changelog:** `CHANGELOG.md` (updated)
- **Version Files:** `app.json`, `package.json` (updated)

## Build Status Monitoring
```bash
# Check specific build
python execution/eas_build_manager.py --action status --build-id {id}

# Output includes:
# - status: "new" | "in-queue" | "in-progress" | "finished" | "errored"
# - artifact_url: Download link when finished
# - created_at, completed_at: Timestamps
```

## Error Handling
- **Build fails:** Check EAS logs, fix issue, rebuild
- **Submit rejected:** Review App Store rejection reason
- **Version conflict:** Ensure buildNumber is incremented

## Edge Cases
- What if build queue is long? Wait or use priority queue
- What if TestFlight review takes long? Normal, can take 24-48h
- What if app rejected? Fix issues, resubmit

## App Store Connect URLs
- [App Store Connect](https://appstoreconnect.apple.com)
- [TestFlight](https://appstoreconnect.apple.com/apps/{app_id}/testflight)
- [App Analytics](https://appstoreconnect.apple.com/analytics)

## Release Cadence
Recommended schedule:
- **Weekly:** Bug fixes (patch version)
- **Bi-weekly:** New features (minor version)
- **Quarterly:** Major updates (major version)

## Learnings
> Add discoveries here as you use this directive

- [Initial]: iOS builds take ~15-20 minutes on EAS
- [Initial]: TestFlight review typically 24-48 hours
- [Initial]: Always test on device before submission
