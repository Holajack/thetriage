#!/bin/bash

echo "🚀 Publishing to Expo..."
echo "===================================="

# Ensure all dependencies are installed
npm install

# Clear any previous builds
npx expo prebuild --clean

# Publish to Expo
npx expo publish --non-interactive

echo "===================================="
echo "✅ App published to Expo successfully!"
echo "You can view your project on the Expo dashboard:"
echo "https://expo.dev/accounts/hollaj/projects"
