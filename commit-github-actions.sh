#!/bin/bash

# GitHub Actions Commit Helper
# Commits the GitHub Actions setup to repository

PROJECT_DIR="/Users/jackenholland/The Triage System/StudyTrackerNew"

echo "📤 Committing GitHub Actions Setup"
echo "================================="
echo ""

cd "$PROJECT_DIR"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Initialize git first:"
    echo "   git init"
    echo "   git remote add origin https://github.com/your-username/your-repo.git"
    exit 1
fi

echo "📁 Files to commit:"
echo "✅ .github/workflows/build-and-deploy.yml"
echo "✅ eas.json (updated)"
echo "✅ GITHUB_ACTIONS_SETUP_COMPLETE.md"
echo "✅ setup-github-actions.sh"
echo "✅ All icon fixes and app.json updates"
echo ""

# Add files to git
git add .github/workflows/build-and-deploy.yml
git add eas.json
git add GITHUB_ACTIONS_SETUP_COMPLETE.md
git add setup-github-actions.sh
git add app.json
git add assets/icon-ios-white-1024.png
git add assets/icon-ios-brand-1024.png
git add assets/icon-ios-black-1024.png

echo "📝 Committing changes..."
git commit -m "feat: Add GitHub Actions CI/CD pipeline for iOS

- Add automated build and TestFlight submission workflow
- Update EAS configuration for production builds
- Use solid iOS icons (fixes transparency validation errors)
- Increment app version to 1.0.1
- Add comprehensive setup documentation

Workflow features:
- Build on every PR (validation)
- Build + submit on main branch pushes
- Auto-increment version numbers
- Use fixed solid icons for App Store compliance

Ready for automated iOS deployment!"

echo ""
echo "🚀 Changes committed successfully!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Add required secrets to GitHub repository"
echo "3. Monitor first automated build in GitHub Actions tab"
echo ""
echo "Required GitHub Secrets:"
echo "• EXPO_TOKEN"
echo "• EXPO_APPLE_ID" 
echo "• EXPO_ASC_KEY_ID"
echo "• EXPO_ASC_ISSUER_ID"
echo "• EXPO_ASC_KEY"
echo ""
echo "✅ Ready to push and deploy!"
