#!/bin/sh

# ci_post_clone.sh - Xcode Cloud post-clone script
# Location: ios/ci_scripts/ci_post_clone.sh

set -e

echo "=== Installing Homebrew packages ==="
brew install node@20 || brew upgrade node@20 || true
brew link --overwrite node@20 || true
brew install cocoapods || brew upgrade cocoapods || true

# Get absolute paths after brew install
NPM_BIN=$(brew --prefix)/bin/npm
POD_BIN=$(brew --prefix)/bin/pod
NPX_BIN=$(brew --prefix)/bin/npx

echo "npm: $NPM_BIN"
echo "pod: $POD_BIN"
echo "npx: $NPX_BIN"

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
