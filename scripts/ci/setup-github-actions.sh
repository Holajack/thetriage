#!/bin/bash

# GitHub Actions Setup Script
# Helps configure the repository for automated iOS builds

PROJECT_DIR="/Users/jackenholland/The Triage System/StudyTrackerNew"

echo "🚀 GitHub Actions CI/CD Setup"
echo "============================="
echo ""

cd "$PROJECT_DIR"

echo "📋 Current Project Status:"
echo "App: Triage System"
echo "Version: 1.0.1"
echo "Bundle ID: com.triagesystem.app"
echo "EAS Project: 0abfeee3-c7fb-4a59-afdb-1fa13fd9b09a"
echo ""

echo "✅ Files Created:"
echo "1. .github/workflows/build-and-deploy.yml - GitHub Actions workflow"
echo "2. eas.json - Updated with iOS production configuration"
echo "3. GITHUB_ACTIONS_SETUP_COMPLETE.md - Complete setup guide"
echo ""

echo "📁 Checking GitHub Actions workflow file..."
if [ -f ".github/workflows/build-and-deploy.yml" ]; then
    echo "✅ GitHub Actions workflow file exists"
    echo "   File size: $(wc -c < .github/workflows/build-and-deploy.yml) bytes"
else
    echo "❌ GitHub Actions workflow file missing"
fi
echo ""

echo "🔐 Required GitHub Secrets (add these to your repository):"
echo ""
echo "Repository Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "1. EXPO_TOKEN"
echo "   Description: Expo authentication token"
echo "   Get it by running: npx expo whoami --json"
echo ""
echo "2. EXPO_APPLE_ID"
echo "   Description: Your Apple ID email"
echo "   Example: your.email@example.com"
echo ""
echo "3. EXPO_ASC_KEY_ID"
echo "   Description: App Store Connect API Key ID"
echo "   Get from: https://appstoreconnect.apple.com → Users and Access → Keys"
echo ""
echo "4. EXPO_ASC_ISSUER_ID"
echo "   Description: App Store Connect API Issuer ID"
echo "   Get from: App Store Connect Keys page (top of page)"
echo ""
echo "5. EXPO_ASC_KEY"
echo "   Description: App Store Connect API Private Key (base64 encoded)"
echo "   Convert .p8 file: base64 -i AuthKey_XXXXXXXXXX.p8"
echo ""

echo "🎯 Workflow Behavior:"
echo "📝 Pull Requests: Build only (test changes)"
echo "🚀 Main Branch Push: Build + Submit to TestFlight"
echo "🔄 Auto-increment version numbers"
echo "✅ Use solid icons (transparency issue fixed)"
echo ""

echo "🔍 Monitor Builds:"
echo "• GitHub Actions tab in your repository"
echo "• EAS Build dashboard: https://expo.dev/accounts/[account]/projects/triage-system/builds"
echo "• App Store Connect: https://appstoreconnect.apple.com"
echo ""

echo "⚡ Quick Test Commands:"
echo "# Check if EAS is properly configured"
echo "eas build:list --platform=ios --limit=5"
echo ""
echo "# Test credentials (after adding secrets)"
echo "eas submit --platform ios --latest --non-interactive"
echo ""

echo "🌐 Next Steps:"
echo "1. Add the 5 required secrets to your GitHub repository"
echo "2. Push this commit to GitHub"
echo "3. Check GitHub Actions tab for the first automated build"
echo "4. Monitor TestFlight for the submitted app"
echo ""

echo "📚 Documentation:"
echo "• Full setup guide: GITHUB_ACTIONS_SETUP_COMPLETE.md"
echo "• EAS documentation: https://docs.expo.dev/build/introduction/"
echo "• GitHub Actions: https://docs.github.com/en/actions"
echo ""

echo "✅ GitHub Actions setup complete!"
echo "Ready for automated iOS deployment! 🎉"
