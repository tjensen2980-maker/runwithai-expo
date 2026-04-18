#!/bin/sh

# ci_post_clone.sh - Xcode Cloud post-clone script
set -e

REPO="$CI_PRIMARY_REPOSITORY_PATH"
IOS_DIR="$REPO/ios"

echo "=== Installing Homebrew packages ==="
brew install node@20 || brew upgrade node@20 || true
brew link --overwrite node@20 || true
brew install cocoapods || brew upgrade cocoapods || true

NPM_BIN=$(brew --prefix)/bin/npm
POD_BIN=$(brew --prefix)/bin/pod

echo "=== Installing Node.js dependencies ==="
cd "$REPO"
"$NPM_BIN" install --legacy-peer-deps
"$NPM_BIN" install --legacy-peer-deps @react-native-community/cli

echo "=== Installing pods ==="
cd "$IOS_DIR"
"$POD_BIN" install

echo "=== Fixing Watch app configuration ==="
PBXPROJ="$IOS_DIR/RunWithAI.xcodeproj/project.pbxproj"

# Fix WKCompanionAppBundleIdentifier
sed -i '' 's/WKCompanionAppBundleIdentifier = "";/WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"
sed -i '' 's/WKCompanionAppBundleIdentifier = ;/WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"

# Fix Watch app MARKETING_VERSION to match iOS
APP_VERSION=$(grep '"version"' "$REPO/app.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo "App version: $APP_VERSION"

perl -i -pe '
  if (/DC27E1FC|DC27E1FD/) { $in_watch = 1 }
    if ($in_watch && /MARKETING_VERSION/) {
        s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = '"$APP_VERSION"';/;
            $in_watch = 0;
              }
              ' "$PBXPROJ"

              # Fix NSHealth usage descriptions in Watch Info.plist
              WATCH_PLIST="$IOS_DIR/RunWithAI Watch Watch App/Info.plist"
              if [ -f "$WATCH_PLIST" ]; then
                if ! grep -q "NSHealthUpdateUsageDescription" "$WATCH_PLIST"; then
                    sed -i '' 's|</dict>|<key>NSHealthUpdateUsageDescription</key><string>RunWithAI uses HealthKit to save your workout data.</string><key>NSHealthShareUsageDescription</key><string>RunWithAI reads your health data to personalize your training.</string></dict>|' "$WATCH_PLIST"
                      fi
                      fi

                      echo "=== Fixing Watch app icon ==="
                      WATCH_ICON_DIR="$IOS_DIR/RunWithAI Watch Watch App/Assets.xcassets/AppIcon.appiconset"
                      mkdir -p "$WATCH_ICON_DIR"

                      cp "$REPO/assets/icon.png" "$WATCH_ICON_DIR/AppIcon.png"
                      sips -s format png --out "$WATCH_ICON_DIR/AppIcon.png" "$WATCH_ICON_DIR/AppIcon.png" 2>/dev/null || true
                      sips -d transparency "$WATCH_ICON_DIR/AppIcon.png" 2>/dev/null || true

                      echo "Icon info:"
                      sips -g all "$WATCH_ICON_DIR/AppIcon.png" 2>/dev/null | grep -E "pixelWidth|pixelHeight|hasAlpha|format" || true

                      echo "=== Done ==="
