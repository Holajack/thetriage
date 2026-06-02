#!/bin/bash

# Build iOS app with fixed app icons
echo "Building iOS app with fixed app icons..."

# Navigate to project directory
cd "/Users/jackenholland/The Triage System/StudyTrackerNew"

# Start EAS build
echo "Starting EAS build..."
expect << EOF
spawn npx eas build --platform ios --clear-cache
expect "Do you want to log in to your Apple account?" { send "Y\r" }
expect eof
EOF

echo "Build started. Check EAS dashboard for progress."
