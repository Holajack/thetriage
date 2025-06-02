#!/bin/zsh

# Verify new app icon script
echo "🔍 Checking new app icon..."

cd "/Users/jackenholland/The Triage System/StudyTrackerNew/assets"

if [ ! -f "new-app-icon.png" ]; then
    echo "❌ new-app-icon.png not found"
    echo "Please save the attached green diamond logo as 'new-app-icon.png' in the assets folder"
    exit 1
fi

# Check file size
size=$(wc -c < "new-app-icon.png")
if [ $size -eq 0 ]; then
    echo "❌ new-app-icon.png is empty"
    echo "Please make sure to properly save the image file"
    exit 1
fi

# Check file type
file_type=$(file new-app-icon.png)
echo "✅ File info: $file_type"
echo "✅ File size: $size bytes"

if [[ $file_type == *"PNG"* ]]; then
    echo "✅ Valid PNG file detected"
    echo "🎯 Ready to run: ./update-icons.sh"
else
    echo "⚠️  Warning: File might not be a valid PNG"
fi
