# Apple App Store Deployment

## Goal
Automate IPA submission to App Store Connect for HikeWise with support for TestFlight and production releases.

## Inputs
- **Required:**
  - `build_id`: EAS Build ID from successful iOS build
  - `track`: Target track ("testflight-internal", "testflight-external", "production")
- **Optional:**
  - `release_notes`: What's new text (default: from store-assets/metadata/en-US/whats_new.txt)
  - `auto_release`: Whether to auto-release after review (default: false for production)

## Prerequisites

### Apple Developer Setup
1. Active Apple Developer Program membership ($99/year)
2. App already created in App Store Connect
3. Bundle ID: `com.hikewise.app`

### App Store Connect API Key Setup
1. Go to App Store Connect > Users and Access > Keys
2. Click "+" to create new API key
3. Name: "EAS Submit" or similar
4. Access: "App Manager" role (minimum)
5. Download .p8 file (only downloadable once!)
6. Note the Key ID and Issuer ID

### Required Secrets
Store these as GitHub secrets and/or environment variables:
- `EXPO_APPLE_ID`: Your Apple ID email
- `EXPO_ASC_KEY_ID`: API Key ID (e.g., "ABC123XYZ")
- `EXPO_ASC_ISSUER_ID`: Issuer ID (UUID format)
- `EXPO_ASC_KEY`: Base64-encoded .p8 file content

To base64 encode the .p8 file:
```bash
base64 -i AuthKey_ABC123XYZ.p8 | tr -d '\n'
```

## Process

### Step 1: Verify Build
```bash
# Check build status
eas build:view <build_id>

# Ensure platform is iOS
# Ensure build status is "finished"
# Ensure distribution is "store" (not "internal")
```

### Step 2: Submit to App Store Connect
```bash
# Submit build
eas submit --platform ios --id <build_id> --non-interactive

# Or submit latest build
eas submit --platform ios --latest --non-interactive
```

### Step 3: TestFlight Configuration (if not production)
After successful upload to App Store Connect:
1. Go to App Store Connect > TestFlight
2. For internal testing: Build is auto-available to internal testers
3. For external testing: Fill required test information, submit for Beta App Review

### Step 4: Production Release
1. Go to App Store Connect > App Store > App Version
2. Select the uploaded build
3. Fill in "What's New" if not already set
4. Submit for Review
5. Wait for review (typically 24-48 hours)

## EAS Configuration Reference

In `eas.json`:
```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234"
      }
    }
  }
}
```

Required values:
- `ascAppId`: App Store Connect App ID (found in App Information)
- `appleTeamId`: Your Apple Developer Team ID

## Error Handling

### Common Errors

**"No suitable application record found"**
- Ensure bundle ID matches exactly: `com.hikewise.app`
- Verify app exists in App Store Connect
- Check `ascAppId` is correct

**"Invalid credentials"**
- Verify API key is active in App Store Connect
- Check base64 encoding of .p8 file is correct
- Ensure Issuer ID and Key ID are correct

**"Build already exists"**
- buildNumber must be unique for each upload
- EAS auto-increments when `autoIncrement: true` is set in eas.json

**"Missing compliance information"**
- Set export compliance in app.json:
```json
{
  "ios": {
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false
    }
  }
}
```

**"Missing privacy manifest"**
- Modern Expo versions handle this automatically
- Check iOS build logs for privacy warnings

## TestFlight vs Production

| Feature | TestFlight Internal | TestFlight External | Production |
|---------|---------------------|---------------------|------------|
| Review Required | No | Beta Review (~24h) | Full Review (~24-48h) |
| Max Testers | 100 | 10,000 | Unlimited |
| Expiration | 90 days | 90 days | None |
| Feedback | Built-in | Built-in | App Store reviews |

## Store Listing Requirements

### Screenshots (Required)
- iPhone 6.7" (1290x2796): Required
- iPhone 6.5" (1242x2688): Required
- iPhone 5.5" (1242x2208): Required
- iPad Pro 12.9" (2048x2732): Required if supporting iPad

### App Preview Videos (Optional)
- Same resolutions as screenshots
- 15-30 seconds, H.264, up to 500MB

### Description
- Max 4000 characters
- File: `store-assets/metadata/en-US/full_description.txt`

### Keywords
- Max 100 characters, comma-separated
- File: `store-assets/metadata/en-US/keywords.txt`

### Promotional Text
- Max 170 characters
- File: `store-assets/metadata/en-US/promo_text.txt`

## App Privacy Questionnaire

Answer these in App Store Connect > App Privacy:
1. **Contact Info**: Email collected for account
2. **Identifiers**: User ID for account
3. **Usage Data**: Analytics, crash data
4. **Diagnostics**: Crash logs

Note: Update when adding new data collection features.

## Deep Linking Configuration

Already configured in app.json:
```json
{
  "ios": {
    "associatedDomains": [
      "applinks:ucculvnodabrfwbkzsnx.supabase.co"
    ]
  }
}
```

## Automation Notes

### Automatic Submission After Build
Add to GitHub Actions:
```yaml
- name: Submit to App Store
  run: eas submit --platform ios --latest --non-interactive
  env:
    EXPO_APPLE_ID: ${{ secrets.EXPO_APPLE_ID }}
    EXPO_ASC_KEY_ID: ${{ secrets.EXPO_ASC_KEY_ID }}
    EXPO_ASC_ISSUER_ID: ${{ secrets.EXPO_ASC_ISSUER_ID }}
    EXPO_ASC_KEY: ${{ secrets.EXPO_ASC_KEY }}
```

## Links
- [App Store Connect](https://appstoreconnect.apple.com)
- [EAS Submit iOS Docs](https://docs.expo.dev/submit/ios/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
