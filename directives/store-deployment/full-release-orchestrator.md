# Full Release Orchestrator

## Goal
Coordinate a complete HikeWise app release from code to store availability on both Google Play and Apple App Store.

## Inputs
- **Required:**
  - `version`: Version to release (e.g., "1.7.0")
  - `track`: Release track ("internal", "beta", "production")
  - `platforms`: Target platforms ("ios", "android", "both")
- **Optional:**
  - `release_notes`: What's new text (default: from store-assets/metadata/en-US/whats_new.txt)
  - `generate_screenshots`: Whether to regenerate screenshots (default: false)

## Pre-flight Checklist

### Credentials Verification
- [ ] `EXPO_TOKEN` - EAS CLI authentication
- [ ] `EXPO_APPLE_ID` - Apple ID for App Store
- [ ] `EXPO_ASC_KEY_ID` - App Store Connect API Key ID
- [ ] `EXPO_ASC_ISSUER_ID` - ASC API Issuer ID
- [ ] `EXPO_ASC_KEY` - ASC private key (base64)
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` - Google Play service account JSON

### Version Verification
- [ ] Version in app.json matches release version
- [ ] iOS buildNumber will auto-increment via EAS
- [ ] Android versionCode will auto-increment via EAS

### Asset Verification
- [ ] Screenshots exist in store-assets/screenshots/
- [ ] Metadata files exist in store-assets/metadata/en-US/
- [ ] Feature graphic exists (Android only)

## Process

### Phase 1: Pre-flight Checks
1. Verify all required secrets are configured
2. Check version numbers and increment if needed
3. Validate metadata files exist and are within character limits
4. Run `npm run lint` and `npm run typecheck` if available

### Phase 2: Asset Generation (Optional)
If `generate_screenshots: true`:
1. Start Expo Web server
2. Run Playwright screenshot tests
3. Process screenshots (resize, add device frames)
4. Copy to store-assets/screenshots/

### Phase 3: Build Phase
1. Trigger EAS production build for iOS: `eas build --platform ios --profile production --non-interactive`
2. Trigger EAS production build for Android: `eas build --platform android --profile production --non-interactive`
3. Wait for both builds to complete
4. Capture build IDs from output

### Phase 4: Submission Phase
1. Submit iOS to App Store Connect: `eas submit --platform ios --id <build_id> --non-interactive`
2. Submit Android to Google Play: `eas submit --platform android --id <build_id> --non-interactive`
3. Verify submissions succeeded

### Phase 5: Post-Release
1. Create git tag: `git tag -a v<version> -m "Release <version>"`
2. Push tag: `git push origin v<version>`
3. Update CHANGELOG.md if exists
4. Notify team of release status

## Execution Scripts
- `execution/screenshots/capture_web_screenshots.py` - Screenshot automation
- `execution/screenshots/process_screenshots.py` - Screenshot post-processing

## Error Handling

### Build Failures
- Check EAS build logs: `eas build:view <build_id>`
- Common issues: signing credentials, native module conflicts
- Retry with `--clear-cache` flag if caching issues

### Submission Failures
- **iOS**: Check App Store Connect for rejection reasons
- **Android**: Check Google Play Console for policy violations
- Verify version codes are higher than current store version

### Rollback Procedure
If issues discovered post-release:
1. **Google Play**: Halt staged rollout in Play Console
2. **iOS**: Request expedited review for hotfix build
3. **Both**: Use EAS Update for OTA fixes if possible (JS-only changes)

## Track Descriptions

| Track | iOS Equivalent | Use Case |
|-------|----------------|----------|
| internal | TestFlight (internal) | Team testing only |
| beta | TestFlight (external) | Beta testers |
| production | App Store | Public release |

## GitHub Actions Workflow
See: `.github/workflows/full-release.yml`

Trigger manually via workflow_dispatch with inputs:
- `track`: internal, beta, or production
- `platforms`: ios, android, or both
- `generate_screenshots`: true/false

## Dependencies
- Node.js 18+
- EAS CLI (`npm install -g eas-cli`)
- Expo account with EAS access
- Apple Developer account
- Google Play Developer account

## Timing Expectations
- Build (each platform): 15-30 minutes
- iOS review (production): 24-48 hours
- Android review (production): Few hours to 1-2 days
- Internal/beta tracks: Near-instant after build
