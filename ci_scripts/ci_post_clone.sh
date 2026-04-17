#!/bin/sh

# ci_post_clone.sh - Xcode Cloud post-clone script
# Runs pod install to generate RunWithAI.xcworkspace

set -e

echo "=== Installing Node.js dependencies ==="
cd $CI_PRIMARY_REPOSITORY_PATH
npm install --legacy-peer-deps

echo "=== Installing CocoaPods dependencies ==="
cd ios
pod install --repo-update

echo "=== Done - xcworkspace generated ==="
