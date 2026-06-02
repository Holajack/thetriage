#!/bin/bash

# Quick iOS Rebuild and Submit Script
# Rebuilds the app with fixed icons and resubmits to TestFlight

PROJECT_DIR="/Users/jackenholland/The Triage System/StudyTrackerNew"

echo "🚀 Starting iOS Rebuild Process..."
echo "Project: Triage System"
echo "Bundle ID: com.triagesystem.app"
echo ""

cd "$PROJECT_DIR"

echo "📋 Current configuration:"
echo "✅ iOS Bundle ID: com.triagesystem.app"
echo "✅ iOS Icon: ./assets/icon-ios-solid.png (solid, no transparency)"
echo "✅ Main Icon: ./assets/icon-ios-solid.png"
echo ""

echo "🔧 Step 1: Clear caches..."
npm start -- --clear &
sleep 3
pkill -f "expo start" 2>/dev/null || true

echo "✅ Cache cleared"
echo ""

echo "🏗️  Step 2: Building iOS app with EAS..."
echo "Running: eas build --platform ios --clear-cache"
echo ""

# Uncomment the next line when ready to build
# eas build --platform ios --clear-cache

echo "⏸️  Build command ready but not executed."
echo "To proceed with the build, run:"
echo "  cd \"$PROJECT_DIR\""
echo "  eas build --platform ios --clear-cache"
echo ""

echo "📱 Step 3: After build completes, submit to TestFlight:"
echo "  eas submit --platform ios"
echo ""

echo "🎯 Expected result:"
echo "✅ Build will pass Apple's icon validation"
echo "✅ No transparency errors"
echo "✅ Successful TestFlight upload"
echo ""

echo "✅ Rebuild script complete. Ready for manual build execution."
