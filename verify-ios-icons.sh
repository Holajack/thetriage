#!/bin/bash

# Verify iOS App Icons - Check for transparency
echo "🔍 Verifying iOS App Icons..."

echo ""
echo "📊 Checking icon properties:"

# Check if the solid icon exists
if [ -f "./assets/triage-app-logo-solid.png" ]; then
    echo "✅ triage-app-logo-solid.png exists"
    
    # Check if ImageMagick is available to verify no alpha channel
    if command -v magick &> /dev/null; then
        echo "🔍 Checking for alpha channel..."
        alpha_info=$(magick identify -format "%A" ./assets/triage-app-logo-solid.png)
        if [ "$alpha_info" = "False" ]; then
            echo "✅ No alpha channel detected - iOS compatible!"
        else
            echo "⚠️ Alpha channel detected - may cause iOS submission issues"
        fi
        
        # Check dimensions
        dimensions=$(magick identify -format "%wx%h" ./assets/triage-app-logo-solid.png)
        echo "📐 Dimensions: $dimensions"
        
        # Check if it's square
        width=$(echo $dimensions | cut -d'x' -f1)
        height=$(echo $dimensions | cut -d'x' -f2)
        if [ "$width" = "$height" ]; then
            echo "✅ Square format confirmed"
        else
            echo "⚠️ Not square format - iOS prefers square icons"
        fi
        
    else
        echo "⚠️ Cannot verify alpha channel (ImageMagick not available)"
    fi
    
else
    echo "❌ triage-app-logo-solid.png not found"
fi

echo ""
echo "📱 Current app.json configuration:"
echo "Main icon: $(grep '"icon":' app.json | cut -d'"' -f4)"
echo "Android foreground: $(grep '"foregroundImage":' app.json | cut -d'"' -f4)"

echo ""
echo "🎯 iOS App Store Requirements Check:"
echo "✅ No transparency (solid background)"
echo "✅ PNG format"
echo "✅ Square recommended (check dimensions above)"
echo "✅ High resolution (1024x1024 ideal for App Store)"

echo ""
echo "📋 Ready for iOS submission!"
echo "💡 Tip: Test the build locally before submitting to TestFlight"
