#!/bin/sh

# ci_post_clone.sh - Xcode Cloud post-clone script
set -e

REPO="$CI_PRIMARY_REPOSITORY_PATH"
IOS_DIR="$REPO/ios"
PBXPROJ="$IOS_DIR/RunWithAI.xcodeproj/project.pbxproj"

echo "=== Installing Homebrew packages ==="
brew install node@20 || brew upgrade node@20 || true
brew link --overwrite node@20 || true
brew install cocoapods || brew upgrade cocoapods || true

NPM_BIN=$(brew --prefix)/bin/npm
POD_BIN=$(brew --prefix)/bin/pod

echo "=== Patching objectVersion for CocoaPods compatibility ==="
# CocoaPods xcodeproj 1.27.0 only supports objectVersion up to 60.
# Xcode 26 generates objectVersion = 70. Downgrade to 60 for pod install.
sed -i '' 's/objectVersion = 70;/objectVersion = 60;/g' "$PBXPROJ"
echo "objectVersion after patch:"
grep "objectVersion" "$PBXPROJ"

echo "=== Installing Node.js dependencies ==="
cd "$REPO"
"$NPM_BIN" install --legacy-peer-deps
"$NPM_BIN" install --legacy-peer-deps @react-native-community/cli

echo "=== Installing pods ==="
cd "$IOS_DIR"
"$POD_BIN" install

echo "=== Patching fmt for Xcode 26 consteval compatibility ==="
# Xcode 26 clang rejects fmt's use of consteval in FMT_COMPILE_STRING.
# Patch the fmt headers to disable consteval by adding a define at the top.
FMT_CORE="$IOS_DIR/Pods/Headers/Public/fmt/core.h"
FMT_BASE="$IOS_DIR/Pods/fmt/fmt/base.h"
FMT_FORMAT="$IOS_DIR/Pods/fmt/fmt/format.h"
FMT_FORMAT_INL="$IOS_DIR/Pods/fmt/fmt/format-inl.h"

# Patch all fmt headers we can find - add FMT_USE_CONSTEVAL=0 define
for FMT_FILE in \
  "$IOS_DIR/Pods/fmt/fmt/base.h" \
    "$IOS_DIR/Pods/fmt/fmt/core.h" \
      "$IOS_DIR/Pods/fmt/fmt/format.h" \
        "$IOS_DIR/Pods/fmt/fmt/format-inl.h" \
          "$IOS_DIR/Pods/Headers/Public/fmt/base.h" \
            "$IOS_DIR/Pods/Headers/Public/fmt/core.h" \
              "$IOS_DIR/Pods/Headers/Public/fmt/format.h"; do
                if [ -f "$FMT_FILE" ]; then
                    # Only add if not already patched
                        if ! grep -q "FMT_USE_CONSTEVAL 0" "$FMT_FILE"; then
                              sed -i '' '1s/^/#ifndef FMT_USE_CONSTEVAL\n#define FMT_USE_CONSTEVAL 0\n#endif\n/' "$FMT_FILE"
                                    echo "Patched: $FMT_FILE"
                                        fi
                                          fi
                                          done

                                          # Also patch format-inl.h directly - replace consteval keyword
                                          FMTINL="$IOS_DIR/Pods/fmt/fmt/format-inl.h"
                                          if [ -f "$FMTINL" ]; then
                                            sed -i '' 's/FMT_CONSTEVAL/inline/g' "$FMTINL"
                                              echo "Patched FMT_CONSTEVAL in format-inl.h"
                                              fi

                                              echo "=== Fixing Watch app configuration ==="

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
