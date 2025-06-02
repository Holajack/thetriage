#!/bin/bash

# App Icon Update Script
# Run this after saving the new icon image as 'new-app-icon.png' in the assets folder

echo "🔄 Updating app icons with new image..."

cd "/Users/jackenholland/The Triage System/StudyTrackerNew/assets"

# Check if new icon exists
if [ ! -f "new-app-icon.png" ]; then
    echo "❌ Error: new-app-icon.png not found in assets folder"
    echo "Please save the attached image as 'new-app-icon.png' first"
    exit 1
fi

echo "✅ New icon image found"

# Backup current icons
echo "📦 Backing up current icons..."
cp triage-app-logo.png triage-app-logo-backup-$(date +%Y%m%d).png
cp icon.png icon-backup-$(date +%Y%m%d).png
cp adaptive-icon.png adaptive-icon-backup-$(date +%Y%m%d).png
cp favicon.png favicon-backup-$(date +%Y%m%d).png

# Replace main icons
echo "🔄 Replacing app icons..."
cp new-app-icon.png triage-app-logo.png
cp new-app-icon.png icon.png
cp new-app-icon.png adaptive-icon.png
cp new-app-icon.png favicon.png

# Update iOS app icon
echo "🍎 Updating iOS app icon..."
cp new-app-icon.png "../ios/TriageSystem/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"

echo "✅ App icons updated successfully!"
echo ""
echo "📱 Next steps:"
echo "1. Clean and rebuild your app: npx expo run:ios --clear"
echo "2. For Android: npx expo run:android --clear"
echo "3. The changes will be visible after the next build"

# Optional: Generate different sizes using ImageMagick if available
if command -v convert &> /dev/null; then
    echo "🎨 Generating additional icon sizes with ImageMagick..."
    mkdir -p icon-sizes
    
    # Standard sizes for iOS
    convert new-app-icon.png -resize 180x180 icon-sizes/icon-180.png
    convert new-app-icon.png -resize 120x120 icon-sizes/icon-120.png
    convert new-app-icon.png -resize 87x87 icon-sizes/icon-87.png
    convert new-app-icon.png -resize 80x80 icon-sizes/icon-80.png
    convert new-app-icon.png -resize 76x76 icon-sizes/icon-76.png
    convert new-app-icon.png -resize 60x60 icon-sizes/icon-60.png
    convert new-app-icon.png -resize 58x58 icon-sizes/icon-58.png
    convert new-app-icon.png -resize 40x40 icon-sizes/icon-40.png
    convert new-app-icon.png -resize 29x29 icon-sizes/icon-29.png
    convert new-app-icon.png -resize 20x20 icon-sizes/icon-20.png
    
    echo "✅ Additional icon sizes generated in icon-sizes/ folder"
else
    echo "💡 Install ImageMagick to automatically generate different icon sizes"
fi
