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
sed -i '' 's/objectVersion = 70;/objectVersion = 60;/g' "$PBXPROJ"
echo "objectVersion after patch:"
grep "objectVersion" "$PBXPROJ"

echo "=== Creating missing InfoPlist.strings locale files ==="
SUPPORTING_DIR="$IOS_DIR/RunWithAI/Supporting"
for LOCALE in el lt en hu cs sl fr ga et ro es mt sk nl da sv pl lv hr it fi de bg pt; do
  mkdir -p "$SUPPORTING_DIR/$LOCALE.lproj"
    if [ ! -f "$SUPPORTING_DIR/$LOCALE.lproj/InfoPlist.strings" ]; then
        printf '/* InfoPlist.strings */\n' > "$SUPPORTING_DIR/$LOCALE.lproj/InfoPlist.strings"
            echo "Created $LOCALE.lproj/InfoPlist.strings"
              fi
              done

              echo "=== Creating Watch app entitlements file ==="
              WATCH_ENTITLEMENTS="$IOS_DIR/RunWithAI Watch Watch App/RunWithAI Watch Watch App.entitlements"
              if [ ! -f "$WATCH_ENTITLEMENTS" ]; then
                printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>com.apple.developer.healthkit</key>\n\t<true/>\n\t<key>com.apple.developer.healthkit.access</key>\n\t<array/>\n</dict>\n</plist>\n' > "$WATCH_ENTITLEMENTS"
                  echo "Created Watch entitlements: $WATCH_ENTITLEMENTS"
                  fi

echo "=== Installing Node.js dependencies ==="
cd "$REPO"
"$NPM_BIN" install --legacy-peer-deps
"$NPM_BIN" install --legacy-peer-deps @react-native-community/cli

echo "=== Installing pods ==="
cd "$IOS_DIR"
"$POD_BIN" install

echo "=== Patching fmt for Xcode 26 consteval compatibility ==="
# fmt headers are at Pods/fmt/include/fmt/ (not Pods/fmt/fmt/)
FMT_INCLUDE="$IOS_DIR/Pods/fmt/include/fmt"
if [ -d "$FMT_INCLUDE" ]; then
  echo "Found fmt include dir: $FMT_INCLUDE"
    find "$FMT_INCLUDE" -type f \( -name "*.h" -o -name "*.cc" -o -name "*.cpp" \) | while read f; do
        if grep -q "consteval" "$f"; then
              sed -i '' 's/consteval/inline/g' "$f"
                    echo "Patched consteval in: $f"
                        fi
                          done
                          else
                            echo "WARNING: fmt include dir not found, trying broader search"
                              find "$IOS_DIR/Pods/fmt" -type f -name "*.h" 2>/dev/null | while read f; do
                                  if grep -q "consteval" "$f"; then
                                        sed -i '' 's/consteval/inline/g' "$f"
                                              echo "Patched consteval in: $f"
                                                  fi
                                                    done
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
