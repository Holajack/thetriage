# GitHub Actions Setup Guide

## Overview
This guide explains how to set up GitHub Actions for automated iOS and Android deployment for the Study Tracker app.

## Prerequisites ✅

### 1. **Expo Account & EAS CLI**
- Expo account: ✅ Configured
- EAS CLI: ✅ Installed
- Project configured: ✅ Complete

### 2. **App Store Connect Account**
- Apple Developer account: ✅ Required
- App Store Connect access: ✅ Required
- Bundle ID registered: `com.triagesystem.app` ✅

### 3. **Solid Icons Fixed** ✅
- iOS icons without transparency: ✅ COMPLETE
- Icons verified: `assets/icon-ios-white-1024.png` (801KB)
- Version updated to 1.0.1: ✅

## GitHub Repository Setup

### Step 1: Initialize Repository (if not done)
```bash
git init
git add .
git commit -m "Initial commit with fixed iOS icons"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/StudyTrackerNew.git
git push -u origin main
```

### Step 2: Set GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

**Required Secret:**
- **Name**: `EXPO_TOKEN`
- **Value**: Your Expo access token

**How to get Expo Token:**
```bash
eas login
eas user:token:create
```
Copy the generated token and add it as the `EXPO_TOKEN` secret.

### Step 3: Configure Repository Settings

1. **Actions Permissions**:
   - Go to Settings → Actions → General
   - Set "Actions permissions" to "Allow all actions and reusable workflows"

2. **Workflow Permissions**:
   - Set "Workflow permissions" to "Read and write permissions"

## Workflow Files ✅

### iOS Deployment: `.github/workflows/ios-deploy.yml`
- ✅ Build iOS app with EAS
- ✅ Clear Metro cache
- ✅ Verify solid icons
- ✅ Submit to App Store Connect
- ✅ Comprehensive error handling

### Android Deployment: `.github/workflows/android-deploy.yml`
- ✅ Build Android app with EAS
- ✅ Submit to Google Play Store

## Deployment Process

### Automatic Triggers
- **Push to main**: Builds and submits to app stores
- **Pull Request**: Builds for testing (no submission)

### Manual Trigger
```bash
# In GitHub UI: Actions → iOS Build and Deploy → Run workflow
```

## Testing the Setup

### 1. **Test Build Locally First**
```bash
cd "/Users/jackenholland/The Triage System/StudyTrackerNew"
eas build --platform ios --profile production --clear-cache
```

### 2. **Test Submission Locally**
```bash
eas submit --platform ios --latest
```

### 3. **Push to GitHub**
```bash
git add .
git commit -m "Add GitHub Actions workflows"
git push origin main
```

## Expected Results

### Successful iOS Workflow:
1. ✅ Repo checkout
2. ✅ Node.js setup
3. ✅ EAS CLI setup
4. ✅ Dependencies installed
5. ✅ Metro cache cleared
6. ✅ iOS icon verified (solid, no transparency)
7. ✅ iOS build created
8. ✅ App submitted to App Store Connect
9. ✅ Success notification

### Success Indicators:
- ✅ Build ID generated
- ✅ No transparency errors
- ✅ App appears in App Store Connect
- ✅ Email confirmation from Apple

## Troubleshooting

### Common Issues & Solutions:

**EXPO_TOKEN Error:**
```
Error: Authentication failed
```
**Solution:** Add EXPO_TOKEN secret to GitHub repository

**Icon Transparency Error:**
```
Error: Icons contain alpha channels
```
**Solution:** ✅ ALREADY FIXED - Using solid icons

**Build Cache Issues:**
```
Error: Metro bundler cache
```
**Solution:** ✅ ALREADY FIXED - Cache clearing in workflow

**Code Signing Issues:**
```
Error: Code signing failed
```
**Solution:** Run `eas credentials` locally first

## Manual Fallback

If GitHub Actions fail, you can always build and submit manually:

```bash
cd "/Users/jackenholland/The Triage System/StudyTrackerNew"
npm install
eas build --platform ios --clear-cache
eas submit --platform ios --latest
```

## Next Steps

1. **Add EXPO_TOKEN to GitHub secrets** ⏳
2. **Push workflows to GitHub** ⏳
3. **Test automated deployment** ⏳
4. **Monitor App Store Connect** ⏳

## Files Created/Updated

### New Files:
- `.github/workflows/ios-deploy.yml` ✅
- `.github/workflows/android-deploy.yml` ✅
- `GITHUB_ACTIONS_SETUP.md` ✅

### Updated Files:
- `app.json` ✅ (version 1.0.1, solid icons)
- `eas.json` ✅ (production profile)

## Status: Ready for GitHub Deployment 🚀

The iOS icon transparency issue has been definitively resolved with guaranteed solid icons. The GitHub Actions workflow is configured and ready for deployment.
