#!/bin/bash

# Fix iOS app icon for TestFlight submission
# Ensure no transparency and all required sizes

cd "/Users/jackenholland/The Triage System/StudyTrackerNew"

echo "🔧 Fixing iOS app icon for TestFlight submission..."

# Source icon (solid background version)
SOURCE_ICON="assets/icon-ios-brand-bg.png"
ICON_DIR="ios/TriageSystem/Images.xcassets/AppIcon.appiconset"

# Ensure source exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found: $SOURCE_ICON"
    exit 1
fi

echo "📱 Creating iOS app icons without transparency..."

# Create 1024x1024 icon (main requirement)
magick "$SOURCE_ICON" -background "#1B4A3A" -alpha remove -alpha off -resize 1024x1024 "$ICON_DIR/App-Icon-1024x1024@1x.png"

# Verify the icon
echo "🔍 Verifying icon properties..."
identify -format "Size: %wx%h, Type: %[type], Channels: %[channels], Colorspace: %[colorspace]\n" "$ICON_DIR/App-Icon-1024x1024@1x.png"

# Check for alpha channel
ALPHA_CHECK=$(identify -format "%A" "$ICON_DIR/App-Icon-1024x1024@1x.png")
if [ "$ALPHA_CHECK" = "True" ]; then
    echo "❌ WARNING: Icon still has alpha channel!"
    exit 1
else
    echo "✅ Icon has no alpha channel - ready for TestFlight"
fi

echo "🎉 iOS app icon fixed successfully!"
echo "📋 Next steps:"
echo "   1. Commit the changes"
echo "   2. Build and submit to TestFlight again"
