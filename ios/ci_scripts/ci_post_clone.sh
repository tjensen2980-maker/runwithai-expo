#!/bin/sh

# ci_post_clone.sh - Xcode Cloud post-clone script
# Location: ios/ci_scripts/ci_post_clone.sh

set -e

echo "=== Installing Homebrew packages ==="
brew install node@20 || brew upgrade node@20 || true
brew link --overwrite node@20 || true
brew install cocoapods || brew upgrade cocoapods || true

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

echo "=== Running pod install ==="
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

PBXPROJ="$IOS_DIR/RunWithAI.xcodeproj/project.pbxproj"

echo "=== Fixing Watch app settings ==="

# Fix WKCompanionAppBundleIdentifier (empty -> app.runwithai)
sed -i "" 's/INFOPLIST_KEY_WKCompanionAppBundleIdentifier = "";/INFOPLIST_KEY_WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"

# Get iOS app version from app.json
APP_VERSION=$(node -e "console.log(require('$REPO/app.json').expo.version)" 2>/dev/null || echo "1.8.5")
echo "App version: $APP_VERSION"

# Fix Watch MARKETING_VERSION - replace 1.0 with app version in Watch Debug config block
# Use perl for reliable multi-line replacement
perl -i -0pe "s/(DC27E1FC2F92417B008D2915.*?MARKETING_VERSION = )([^;]+)(;)/\${1}${APP_VERSION}\${3}/s" "$PBXPROJ"
perl -i -0pe "s/(DC27E1FD2F92417B008D2915.*?MARKETING_VERSION = )([^;]+)(;)/\${1}${APP_VERSION}\${3}/s" "$PBXPROJ"

# Add NSHealth usage descriptions to Watch Debug config (DC27E1FC) if missing
grep -q "NSHealthUpdateUsageDescription" "$PBXPROJ" || \
  sed -i "" 's/INFOPLIST_KEY_WKCompanionAppBundleIdentifier = "app.runwithai";/INFOPLIST_KEY_NSHealthShareUsageDescription = "RunWithAI reads health data to show workout stats.";\n\t\t\t\tINFOPLIST_KEY_NSHealthUpdateUsageDescription = "RunWithAI needs HealthKit to track your workouts.";\n\t\t\t\tINFOPLIST_KEY_WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"

  echo "Watch settings fixed successfully"

  echo "=== ci_post_clone.sh completed ==="
