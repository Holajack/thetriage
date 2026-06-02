#!/bin/bash

echo "🚀 DEPLOYING STUDY TRACKER APP"
echo "====================================="

# GitHub deployment
echo "📦 Deploying to GitHub..."
echo "-------------------------------------"

# Replace these with your GitHub username and repository name
GITHUB_USERNAME="your-username"
REPO_NAME="StudyTrackerNew"

# Add the remote repository
if ! git remote | grep -q "origin"; then
  git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
  echo "✅ GitHub remote added"
else
  echo "✅ GitHub remote already exists"
fi

# Push to the GitHub repository
git push -u origin main
echo "✅ Code pushed to GitHub"
echo "📌 Your project is now available at: https://github.com/$GITHUB_USERNAME/$REPO_NAME"

# Expo deployment
echo ""
echo "📱 Deploying to Expo..."
echo "-------------------------------------"

# Ensure all dependencies are installed
npm install
echo "✅ Dependencies installed"

# Clear any previous builds
npx expo prebuild --clean
echo "✅ Previous builds cleared"

# Publish to Expo
npx expo publish --non-interactive
echo "✅ App published to Expo"
echo "📌 You can view your project on the Expo dashboard: https://expo.dev/accounts/hollaj/projects"

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "====================================="
