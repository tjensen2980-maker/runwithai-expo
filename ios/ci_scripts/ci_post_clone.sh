#!/bin/sh
set -e

echo "=== Installing Node via Homebrew ==="
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
brew install node

echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

echo "=== Installing npm packages ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

echo "=== Installing CocoaPods ==="
brew install cocoapods || true

echo "=== Installing pods ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install

echo "=== Done ==="