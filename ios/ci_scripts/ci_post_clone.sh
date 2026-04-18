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

# Get the iOS app version from app.json to sync Watch version
APP_VERSION=$(node -e "const a=require('$REPO/app.json');console.log(a.expo.version)" 2>/dev/null || echo "1.8.5")
echo "iOS app version: $APP_VERSION"

echo "=== Fixing Watch app settings in pbxproj ==="
# Fix WKCompanionAppBundleIdentifier (currently empty, must be app.runwithai)
sed -i "" 's/INFOPLIST_KEY_WKCompanionAppBundleIdentifier = "";/INFOPLIST_KEY_WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"

# Fix Watch MARKETING_VERSION to match iOS app version
# The Watch target configs are DC27E1FC (Debug) and DC27E1FD (Release)
# We need to update MARKETING_VERSION = 1.0 to match app version in Watch sections only
# Use Python for multi-line context-aware replacement
python3 - "$PBXPROJ" "$APP_VERSION" <<'PYEOF'
import sys, re

pbxproj_path = sys.argv[1]
app_version = sys.argv[2]

with open(pbxproj_path, 'r') as f:
    content = f.read()

    # Fix MARKETING_VERSION in Watch target sections (DC27E1FC and DC27E1FD)
    # These are the only configs with SDKROOT = watchos
    # Replace MARKETING_VERSION = 1.0 within Watch sections
    def fix_watch_marketing_version(content, new_version):
        # Find Watch build config sections by their IDs and fix MARKETING_VERSION
            pattern = r'(DC27E1FC2F92417B008D2915[^}]+?MARKETING_VERSION = )([^;]+)(;)'
                content = re.sub(pattern, r'\g<1>' + new_version + r'\3', content, flags=re.DOTALL)
                    pattern = r'(DC27E1FD2F92417B008D2915[^}]+?MARKETING_VERSION = )([^;]+)(;)'
                        content = re.sub(pattern, r'\g<1>' + new_version + r'\3', content, flags=re.DOTALL)
                            return content

                            content = fix_watch_marketing_version(content, app_version)

                            # Add Health usage descriptions if missing
                            health_update = 'INFOPLIST_KEY_NSHealthUpdateUsageDescription = "RunWithAI needs HealthKit access to track your workouts and health data.";'
                            health_share = 'INFOPLIST_KEY_NSHealthShareUsageDescription = "RunWithAI reads your health data to display workout statistics.";'

                            # Add to Watch Debug config (DC27E1FC) if missing
                            if 'NSHealthUpdateUsageDescription' not in content:
                                # Insert before INFOPLIST_KEY_WKCompanionAppBundleIdentifier in Watch sections
                                    content = content.replace(
                                            'INFOPLIST_KEY_WKCompanionAppBundleIdentifier = "app.runwithai";',
                                                    health_share + '\n\t\t\t\t' + health_update + '\n\t\t\t\tINFOPLIST_KEY_WKCompanionAppBundleIdentifier = "app.runwithai";'
                                                        )

                                                        with open(pbxproj_path, 'w') as f:
                                                            f.write(content)

                                                            print("pbxproj Watch settings fixed successfully")
                                                            PYEOF

                                                            echo "Watch settings fixed in pbxproj"

echo "=== ci_post_clone.sh completed successfully ==="
