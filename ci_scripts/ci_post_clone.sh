#!/usr/bin/env bash
set -e          # fail fast
echo "Installing CocoaPods deps…"

# Xcode Cloud runners do NOT have pods yet:
if ! command -v pod &> /dev/null ; then
  brew install cocoapods
fi

cd ios
pod install --repo-update --clean-install
echo "Pods installed 🎉"