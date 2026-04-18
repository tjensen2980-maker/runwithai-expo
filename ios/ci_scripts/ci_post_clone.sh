#!/bin/sh

# ci_post_clone.sh - Xcode Cloud post-clone script
# Location: ios/ci_scripts/ci_post_clone.sh
# Purpose: Install Node, generate iOS native files via expo prebuild (preserving Watch targets), run pod install

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

echo "=== Backing up Watch targets and xcodeproj ==="
REPO="$CI_PRIMARY_REPOSITORY_PATH"
IOS_DIR="$REPO/ios"
BACKUP_DIR="$REPO/_watch_backup"

mkdir -p "$BACKUP_DIR"

# Backup Watch app folders and xcodeproj
cp -R "$IOS_DIR/RunWithAI Watch Watch App" "$BACKUP_DIR/" 2>/dev/null || true
cp -R "$IOS_DIR/RunWithAI Watch Watch AppTests" "$BACKUP_DIR/" 2>/dev/null || true
cp -R "$IOS_DIR/RunWithAI Watch Watch AppUITests" "$BACKUP_DIR/" 2>/dev/null || true
cp -R "$IOS_DIR/watchkitapp Watch App" "$BACKUP_DIR/" 2>/dev/null || true
cp -R "$IOS_DIR/watchkitapp Watch AppTests" "$BACKUP_DIR/" 2>/dev/null || true
cp -R "$IOS_DIR/watchkitapp Watch AppUITests" "$BACKUP_DIR/" 2>/dev/null || true
cp -R "$IOS_DIR/RunWithAI.xcodeproj" "$BACKUP_DIR/" 2>/dev/null || true
cp "$IOS_DIR/RCTWatchConnectivity.h" "$BACKUP_DIR/" 2>/dev/null || true
cp "$IOS_DIR/RCTWatchConnectivity.mm" "$BACKUP_DIR/" 2>/dev/null || true
cp -R "$IOS_DIR/ci_scripts" "$BACKUP_DIR/" 2>/dev/null || true

echo "=== Removing ios/ folder for clean prebuild ==="
rm -rf "$IOS_DIR"

echo "=== Generating iOS native files via expo prebuild ==="
cd "$REPO"
"$NPX_BIN" expo prebuild --no-install --platform ios

echo "=== Running pod install (before restoring Watch xcodeproj) ==="
cd "$IOS_DIR"
"$POD_BIN" install --repo-update

echo "=== Restoring Watch targets and xcodeproj ==="
cp -R "$BACKUP_DIR/RunWithAI Watch Watch App" "$IOS_DIR/" 2>/dev/null || true
cp -R "$BACKUP_DIR/RunWithAI Watch Watch AppTests" "$IOS_DIR/" 2>/dev/null || true
cp -R "$BACKUP_DIR/RunWithAI Watch Watch AppUITests" "$IOS_DIR/" 2>/dev/null || true
cp -R "$BACKUP_DIR/watchkitapp Watch App" "$IOS_DIR/" 2>/dev/null || true
cp -R "$BACKUP_DIR/watchkitapp Watch AppTests" "$IOS_DIR/" 2>/dev/null || true
cp -R "$BACKUP_DIR/watchkitapp Watch AppUITests" "$IOS_DIR/" 2>/dev/null || true
cp -R "$BACKUP_DIR/RunWithAI.xcodeproj" "$IOS_DIR/" 2>/dev/null || true
cp "$BACKUP_DIR/RCTWatchConnectivity.h" "$IOS_DIR/" 2>/dev/null || true
cp "$BACKUP_DIR/RCTWatchConnectivity.mm" "$IOS_DIR/" 2>/dev/null || true
cp -R "$BACKUP_DIR/ci_scripts" "$IOS_DIR/" 2>/dev/null || true

echo "=== Setting build number in pbxproj ==="
BUILD_NUMBER=78
PBXPROJ="$IOS_DIR/RunWithAI.xcodeproj/project.pbxproj"
sed -i "" "s/CURRENT_PROJECT_VERSION = [0-9]*/CURRENT_PROJECT_VERSION = $BUILD_NUMBER/g" "$PBXPROJ"
echo "Build number set to: $BUILD_NUMBER"

echo "=== ci_post_clone.sh completed successfully ==="
