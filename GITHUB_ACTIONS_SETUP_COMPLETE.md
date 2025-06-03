# GitHub Actions CI/CD Setup Guide

## Overview
This guide sets up automated iOS builds and App Store submissions using GitHub Actions and EAS Build.

## ✅ Files Created/Updated

### 1. GitHub Actions Workflow
- **File:** `.github/workflows/build-and-deploy.yml`
- **Purpose:** Automated build and submission pipeline
- **Triggers:** Push to main branch, Pull requests

### 2. EAS Configuration
- **File:** `eas.json` 
- **Updated:** Added iOS Release build configuration for production

## 🔧 Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### Navigate to GitHub Repository Settings
1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of the following:

### Required Secrets

#### 1. EXPO_TOKEN
```bash
# Get your Expo token by running:
npx expo login
npx expo whoami --json
```
- **Name:** `EXPO_TOKEN`
- **Value:** Your Expo authentication token
- **Purpose:** Allows GitHub Actions to authenticate with Expo services

#### 2. Apple Developer Credentials

For App Store submissions, you need App Store Connect API credentials:

##### EXPO_APPLE_ID
- **Name:** `EXPO_APPLE_ID`
- **Value:** Your Apple ID email
- **Purpose:** Apple Developer account identification

##### EXPO_ASC_KEY_ID
- **Name:** `EXPO_ASC_KEY_ID`
- **Value:** App Store Connect API Key ID
- **Purpose:** API authentication with App Store Connect

##### EXPO_ASC_ISSUER_ID
- **Name:** `EXPO_ASC_ISSUER_ID`
- **Value:** App Store Connect API Issuer ID
- **Purpose:** API issuer identification

##### EXPO_ASC_KEY
- **Name:** `EXPO_ASC_KEY`
- **Value:** App Store Connect API Private Key (base64 encoded)
- **Purpose:** API authentication private key

### Getting App Store Connect API Credentials

1. **Go to App Store Connect**
   - Visit: https://appstoreconnect.apple.com
   - Navigate to **Users and Access** → **Keys**

2. **Create API Key**
   - Click **Generate API Key**
   - Name: "GitHub Actions EAS"
   - Access: **Developer**
   - Download the `.p8` file

3. **Get the Values**
   - **Key ID:** Found in the keys list
   - **Issuer ID:** Found at the top of the Keys page
   - **Private Key:** Convert the `.p8` file to base64:
     ```bash
     base64 -i AuthKey_XXXXXXXXXX.p8
     ```

## 🚀 Workflow Details

### Build Job (`build_ios`)
- **Trigger:** Every push/PR
- **Actions:**
  - Checkout code
  - Setup Node.js 18.x
  - Setup EAS CLI
  - Install dependencies
  - Build iOS app using production profile
  - Output build ID for submission job

### Submit Job (`submit_ios`)
- **Trigger:** Only on main branch pushes (after successful build)
- **Actions:**
  - Use build ID from build job
  - Submit to TestFlight using EAS Submit
  - Requires Apple Developer credentials

## 📱 Workflow Behavior

### On Pull Requests
- ✅ Builds iOS app to verify changes
- ❌ Does NOT submit to App Store

### On Main Branch Push
- ✅ Builds iOS app
- ✅ Submits to TestFlight automatically
- ✅ Uses fixed solid icons (no transparency issues)

## 🔍 Monitoring Builds

### GitHub Actions Tab
- View build status and logs
- Monitor EAS build progress
- Check submission results

### EAS Build Dashboard
- Visit: https://expo.dev/accounts/[your-account]/projects/triage-system/builds
- Monitor detailed build logs
- Download build artifacts

### App Store Connect
- Check TestFlight for submitted builds
- Monitor processing status
- Manage beta testing

## 📋 Pre-Deployment Checklist

Before pushing to main branch:

### App Configuration
- ✅ Version updated in `app.json` (currently 1.0.1)
- ✅ Bundle ID configured: `com.triagesystem.app`
- ✅ Solid iOS icons (no transparency): `icon-ios-white-1024.png`
- ✅ EAS project ID: `0abfeee3-c7fb-4a59-afdb-1fa13fd9b09a`

### GitHub Secrets
- ✅ `EXPO_TOKEN` - Expo authentication
- ✅ `EXPO_APPLE_ID` - Apple ID email
- ✅ `EXPO_ASC_KEY_ID` - API Key ID
- ✅ `EXPO_ASC_ISSUER_ID` - API Issuer ID
- ✅ `EXPO_ASC_KEY` - Private key (base64)

### Code Quality
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Supabase integration working
- ✅ All screens functional

## 🎯 Expected Results

### Successful Build
- Green checkmark in GitHub Actions
- IPA file generated in EAS
- No icon transparency errors
- Build time: ~10-15 minutes

### Successful Submission
- Build appears in TestFlight
- Ready for internal testing
- Email notification from App Store Connect
- Submission time: ~5-10 minutes

## 🚨 Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Verify all secrets are set correctly
- Ensure `app.json` configuration is valid
- Check EAS build logs for detailed errors

### Submission Fails
- Verify Apple Developer credentials
- Check App Store Connect API key permissions
- Ensure bundle ID matches Apple Developer account
- Verify app hasn't been rejected for policy violations

### Icon Issues
- Icons are now solid (no transparency)
- Using `icon-ios-white-1024.png` (1024x1024)
- Should pass Apple's validation

## 🔄 Manual Override

If you need to build/submit manually:

```bash
# Build only
eas build --platform ios --profile production

# Submit specific build
eas submit --platform ios --id [BUILD_ID]

# Build and submit in sequence
eas build --platform ios --profile production --auto-submit
```

## ✅ Setup Complete

Once you add the required GitHub secrets, the automated pipeline will:

1. **Build on every commit** to verify changes
2. **Submit to TestFlight** on main branch pushes  
3. **Use solid icons** (transparency issue resolved)
4. **Increment version** automatically (EAS autoIncrement)
5. **Notify on completion** via GitHub and email

**Next Step:** Add the GitHub secrets and push to main branch to trigger the first automated build!

---

*Setup Date: June 2, 2025*  
*Status: Ready for automated iOS deployment*
