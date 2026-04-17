#!/bin/sh

# ci_post_clone.sh - Xcode Cloud post-clone script
# Must be at ios/ci_scripts/ci_post_clone.sh (next to .xcworkspace)
# Runs npm install + pod install to generate RunWithAI.xcworkspace

set -e

echo "=== Installing Node.js dependencies ==="
cd $CI_PRIMARY_REPOSITORY_PATH
npm install --legacy-peer-deps

echo "=== Installing CocoaPods dependencies ==="
cd ios
pod install --repo-update

echo "=== Done - xcworkspace generated ==="
