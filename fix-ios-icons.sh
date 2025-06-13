#!/bin/bash

# Fix iOS App Icon - Remove transparency and create proper app icons
# This script will create non-transparent versions of the app icons

echo "🔧 Fixing iOS App Icons - Removing transparency..."

# Create a new app icon without transparency using ImageMagick (if available) or manual process
# For iOS, we need solid background icons

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick found, creating non-transparent icons..."
    
    # Create non-transparent icon with solid background
    convert ./assets/triage-app-logo.png -background "#1B4A3A" -alpha remove -alpha off ./assets/icon-ios-solid.png
    convert ./assets/triage-app-logo.png -background "#1B4A3A" -alpha remove -alpha off ./assets/triage-app-logo-solid.png
    
    # Also create a version with white background for better App Store visibility
    convert ./assets/triage-app-logo.png -background "#FFFFFF" -alpha remove -alpha off ./assets/icon-ios-white-bg.png
    
    echo "✅ Created solid background icons:"
    echo "  - icon-ios-solid.png (with green background)"
    echo "  - triage-app-logo-solid.png (with green background)" 
    echo "  - icon-ios-white-bg.png (with white background)"
    
    # Update app.json to use the new solid icon
    echo "📝 Updating app.json to use solid icon..."
    
else
    echo "⚠️ ImageMagick not found. Please install it with: brew install imagemagick"
    echo "📋 Manual steps needed:"
    echo "1. Open ./assets/triage-app-logo.png in an image editor"
    echo "2. Add a solid background color (remove transparency)"
    echo "3. Save as ./assets/triage-app-logo-solid.png"
    echo "4. Update app.json to use the new solid icon"
fi

echo ""
echo "🎯 iOS App Icon Requirements:"
echo "- No transparency/alpha channel allowed"
echo "- Solid background color required"
echo "- Square format (1024x1024 recommended)"
echo "- PNG format"

echo ""
echo "📱 Next steps:"
echo "1. Update app.json to use the solid icon"
echo "2. Test the build again"
echo "3. Submit to TestFlight"
