# Google Play Store Deployment

## Goal
Automate AAB submission to Google Play Console with appropriate track selection for HikeWise.

## Inputs
- **Required:**
  - `build_id`: EAS Build ID from successful Android build
  - `track`: Target track (internal, alpha, beta, production)
- **Optional:**
  - `release_notes`: What's new text (default: from store-assets/metadata/en-US/whats_new.txt)
  - `rollout_percentage`: For staged rollouts (default: 100)

## Prerequisites

### Google Play Console Setup
1. App must already exist in Google Play Console
2. Package name: `com.hikewise.app`
3. At least one APK/AAB must have been manually uploaded once

### Service Account Setup
1. Go to Google Cloud Console > IAM & Admin > Service Accounts
2. Create service account with name like "eas-submit"
3. Download JSON key file
4. In Google Play Console > Users & Permissions > Invite new users
5. Add service account email with "Release manager" permission
6. Save JSON key as `google-service-account.json` in project root (gitignored)
7. For CI/CD, base64 encode and store as `GOOGLE_SERVICE_ACCOUNT_KEY` secret

### Required Files
- `google-service-account.json` - Service account credentials (gitignored)
- `eas.json` - Configured with Android submit settings
- `store-assets/metadata/en-US/` - Store listing content

## Process

### Step 1: Verify Build
```bash
# Check build status
eas build:view <build_id>

# Ensure build type is AAB (Android App Bundle)
# Ensure build status is "finished"
```

### Step 2: Validate Version Code
```bash
# Version code must be higher than current Play Store version
# Current versionCode in app.json: check android.versionCode
# EAS auto-increments this in production profile
```

### Step 3: Submit to Track
```bash
# Submit to internal track
eas submit --platform android --id <build_id> --profile internal --non-interactive

# Submit to beta track
eas submit --platform android --id <build_id> --profile beta --non-interactive

# Submit to production track
eas submit --platform android --id <build_id> --profile production --non-interactive
```

### Step 4: Verify Submission
1. Go to Google Play Console > Release > Production/Testing
2. Verify new release appears with correct version
3. Check for any policy warnings

## Track Selection Guide

| Track | Visibility | Use Case |
|-------|------------|----------|
| internal | Up to 100 internal testers | Team testing, QA |
| alpha | Closed testing group | Early beta testers |
| beta | Open beta | Public beta testing |
| production | Everyone | Public release |

## EAS Configuration Reference

In `eas.json`:
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal",
        "releaseStatus": "completed",
        "changesNotSentForReview": false
      }
    }
  }
}
```

## Error Handling

### Common Errors

**"Version code already used"**
- Solution: Increment versionCode in app.json and rebuild
- Or ensure EAS autoIncrement is enabled

**"APK/AAB must be signed with upload key"**
- Solution: Use the same signing key that was used for initial upload
- EAS manages this automatically if using EAS-managed credentials

**"Policy violation detected"**
- Check Google Play Console for specific violation
- Common issues: privacy policy, permissions justification, content rating

**"Service account not authorized"**
- Verify service account has "Release manager" permission in Play Console
- Check email matches exactly

## Staged Rollout
For production releases, consider staged rollout:
```json
{
  "android": {
    "track": "production",
    "releaseStatus": "inProgress",
    "rollout": 0.1
  }
}
```
This releases to 10% of users. Increase via Play Console.

## Store Listing Requirements

### Screenshots (Required)
- Phone: Min 2, Max 8 (1080x1920 or 16:9)
- 7" Tablet: Min 0, Max 8 (1200x1920)
- 10" Tablet: Min 0, Max 8 (1920x1200)

### Feature Graphic (Required)
- Size: 1024x500 pixels
- Format: PNG or JPEG

### Short Description
- Max 80 characters
- File: `store-assets/metadata/en-US/short_description.txt`

### Full Description
- Max 4000 characters
- File: `store-assets/metadata/en-US/full_description.txt`

## Automation Script
See: `execution/store/google_play_upload.py` (if direct API access needed)

## Links
- [Google Play Console](https://play.google.com/console)
- [EAS Submit Docs](https://docs.expo.dev/submit/android/)
- [Play Console API](https://developers.google.com/android-publisher)
