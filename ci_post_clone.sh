#!/usr/bin/env bash
set -euo pipefail

echo "✅ ci_post_clone.sh running on $(sw_vers -productVersion)"

# Xcode Cloud runners often have CocoaPods pre-installed, but be safe:
if ! command -v pod &> /dev/null; then
  echo "Installing CocoaPods…"
  brew install cocoapods
fi

cd ios
echo "Running pod install…"
pod install --repo-update --clean-install

echo "Pods generated:"
ls -1 Pods/Target\ Support\ Files | head