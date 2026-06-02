#!/bin/bash

# Clean build script for icon updates
echo "🧹 Cleaning build cache..."

cd "/Users/jackenholland/The Triage System/StudyTrackerNew"

# Clear Expo cache
npx expo install --fix

# Clear Metro cache
npx react-native start --reset-cache &
sleep 2
kill $!

# Clear iOS build if needed
if [ -d "ios" ]; then
    echo "🍎 Clearing iOS build cache..."
    cd ios
    xcodebuild clean -workspace TriageSystem.xcworkspace -scheme TriageSystem 2>/dev/null || echo "iOS workspace not found, skipping"
    cd ..
fi

echo "✅ Cache cleared! Now rebuild with:"
echo "npx expo run:ios --clear"
echo "npx expo run:android --clear"
