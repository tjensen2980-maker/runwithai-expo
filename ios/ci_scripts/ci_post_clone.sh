#!/bin/sh

# ci_post_clone.sh - Xcode Cloud post-clone script
# Location: ios/ci_scripts/ci_post_clone.sh

set -e

# Prevent bash from finding local files named npm/pod/npx
# by using full absolute paths
NPM_BIN=$(command -v npm 2>/dev/null || echo "/usr/local/bin/npm")
POD_BIN=$(command -v pod 2>/dev/null || echo "/usr/local/bin/pod")
NPX_BIN=$(command -v npx 2>/dev/null || echo "/usr/local/bin/npx")

echo "npm path: $NPM_BIN"
echo "pod path: $POD_BIN"
echo "npx path: $NPX_BIN"

echo "=== Installing Node.js dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
"$NPM_BIN" install --legacy-peer-deps

echo "=== Generating Podfile via expo prebuild ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
"$NPX_BIN" expo prebuild --no-install --platform ios

echo "=== Installing CocoaPods dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
"$POD_BIN" install --repo-update

echo "=== Done ==="
