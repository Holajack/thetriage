#!/bin/bash

# iOS Icon Fix Script
# This script ensures proper iOS app icons without transparency

echo "🔧 Fixing iOS App Icons..."

PROJECT_DIR="/Users/jackenholland/The Triage System/StudyTrackerNew"
ASSETS_DIR="$PROJECT_DIR/assets"

cd "$PROJECT_DIR"

echo "📁 Current assets directory:"
ls -la "$ASSETS_DIR"/*.png

echo ""
echo "🔍 Checking for transparency in current icons..."

# Check if ImageMagick is available
if command -v magick &> /dev/null; then
    echo "✅ ImageMagick found, checking transparency..."
    
    for icon in "$ASSETS_DIR"/*.png; do
        if [ -f "$icon" ]; then
            filename=$(basename "$icon")
            has_alpha=$(magick identify -format "%A" "$icon")
            if [ "$has_alpha" = "True" ]; then
                echo "⚠️  $filename has transparency/alpha channel"
            else
                echo "✅ $filename is solid (no transparency)"
            fi
        fi
    done
    
    echo ""
    echo "🔨 Creating solid iOS icon if needed..."
    
    # Create a solid white background version of the icon for iOS
    if [ -f "$ASSETS_DIR/triage-app-logo-solid.png" ]; then
        echo "Creating iOS-compatible solid icon..."
        
        # Create icon with white background
        magick "$ASSETS_DIR/triage-app-logo-solid.png" -background white -alpha remove -alpha off "$ASSETS_DIR/icon-ios-solid.png"
        
        # Also create with the app's brand color background
        magick "$ASSETS_DIR/triage-app-logo-solid.png" -background "#1B4A3A" -alpha remove -alpha off "$ASSETS_DIR/icon-ios-brand-bg.png"
        
        echo "✅ Created solid iOS icons"
    else
        echo "❌ Source icon not found: triage-app-logo-solid.png"
    fi
    
else
    echo "⚠️  ImageMagick not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install imagemagick
        echo "✅ ImageMagick installed"
    else
        echo "❌ Homebrew not found. Please install ImageMagick manually or use online tools to remove transparency from icons."
    fi
fi

echo ""
echo "📋 App.json configuration:"
echo "Main icon: ./assets/icon-ios-solid.png"
echo "iOS specific icon: ./assets/icon-ios-solid.png"
echo "Bundle ID: com.triagesystem.app"

echo ""
echo "🎯 Next steps:"
echo "1. Verify icons are solid (no transparency)"
echo "2. Rebuild the app: eas build --platform ios"
echo "3. Submit to TestFlight again"

echo ""
echo "✅ iOS icon fix script completed!"
