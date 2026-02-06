# Directive: Apple Distribution Automation

> Complete SOP for preparing and submitting HikeWise to the Apple App Store.

## Goal
Automate the entire Apple App Store distribution workflow including privacy compliance, screenshots, metadata sync, and submission.

## Inputs
- **Required:**
  - `ASC_KEY_ID`: App Store Connect API Key ID (from `.env.local`)
  - `ASC_ISSUER_ID`: App Store Connect Issuer ID (from `.env.local`)
  - `ASC_KEY_PATH`: Path to AuthKey `.p8` file (`~/credentials/AuthKey_*.p8`)
- **Optional:**
  - `--skip-screenshots`: Skip screenshot generation
  - `--dry-run`: Validate without submitting

## Execution Scripts
1. `execution/apple_privacy_manifest.py` - Generate PrivacyInfo.xcprivacy
2. `execution/generate_privacy_policy.py` - Generate privacy policy document
3. `execution/apple_screenshot_generator.py` - Capture App Store screenshots
4. `execution/apple_metadata_sync.py` - Upload metadata via fastlane
5. `execution/apple_submission_preflight.py` - Validate all requirements
6. `execution/apple_submit.py` - Orchestrate full submission

## Process

### Phase 1: Pre-Submission Setup (One-time)
1. Ensure App Store Connect API key is configured
2. Configure IAP subscriptions in App Store Connect:
   - `com.hikewise.app.premium.monthly` - $14.99/mo
   - `com.hikewise.app.premium.yearly` - $119.99/yr (33% savings)
   - `com.hikewise.app.elite.monthly` - $29.99/mo
   - `com.hikewise.app.elite.yearly` - $239.99/yr (33% savings)
3. Complete App Privacy questionnaire in ASC
4. Complete export compliance in ASC

### Phase 2: Build Preparation
1. Run `python execution/apple_privacy_manifest.py`
   - Generates privacy manifest for iOS 17.4+ compliance
   - Updates app.json with privacy config plugin
2. Run `python execution/generate_privacy_policy.py`
   - Generates privacy policy document
   - Output to Google Doc or deploy to hikewise.app/privacy

### Phase 3: Asset Generation
1. Run `python execution/apple_screenshot_generator.py`
   - Captures screenshots for all required device sizes
   - Stores in `store-assets/screenshots/`
   - Device sizes: 6.7", 6.5", 5.5", iPad 12.9"

### Phase 4: Submission
1. Run `python execution/apple_submission_preflight.py`
   - Validates all metadata files exist
   - Checks screenshot dimensions
   - Verifies privacy manifest
   - Confirms IAP configuration
2. Run `python execution/apple_submit.py`
   - Builds production iOS binary via EAS
   - Uploads to App Store Connect
   - Submits for review

## Outputs
- **Primary:** App submitted to App Store Connect for review
- **Intermediate:**
  - `store-assets/screenshots/` - Generated screenshots
  - `.tmp/privacy-policy.md` - Generated privacy policy
  - Build artifacts via EAS

## Environment Variables
```env
# Apple Distribution (in .env.local)
ASC_KEY_ID=<your-key-id>
ASC_ISSUER_ID=<your-issuer-id>
ASC_KEY_PATH=~/credentials/AuthKey_XXXXXX.p8
APPLE_TEAM_ID=7YMK4D784T
ASC_APP_ID=6756673693
```

## Error Handling
- **Build Failed:** Check EAS build logs, fix errors, rebuild
- **Missing Screenshots:** Re-run screenshot generator
- **Metadata Validation Failed:** Update store-assets/metadata files
- **API Rate Limit:** Wait 60 seconds and retry
- **Invalid Binary:** Ensure correct provisioning profile and certificates

## Edge Cases
- **New Device Size Required:** Update `store-config.json` with new resolution
- **Privacy Policy Changes:** Re-run policy generator, redeploy to website
- **Subscription Price Change:** Update this directive and ASC manually

## Verification Checklist
- [ ] Privacy manifest included in build (no warnings)
- [ ] All permission dialogs have proper descriptions
- [ ] Privacy policy live at hikewise.app/privacy
- [ ] All screenshots for each device size (6.7", 6.5", 5.5", iPad)
- [ ] Store metadata synced to ASC
- [ ] Subscriptions configured and approved
- [ ] App Privacy details completed in ASC
- [ ] Export compliance answered
- [ ] TestFlight build successful
- [ ] Ready for App Review submission

## Quick Commands
```bash
# Full submission workflow
python execution/apple_submit.py

# Preflight check only
python execution/apple_submission_preflight.py

# Generate screenshots only
python execution/apple_screenshot_generator.py

# Sync metadata only
python execution/apple_metadata_sync.py
```

## Learnings
> Add discoveries here as you use this directive

- [2025-02-05]: Initial directive created
