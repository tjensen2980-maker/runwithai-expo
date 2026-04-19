#!/bin/sh
# ci_post_clone.sh - Xcode Cloud post-clone script
set -e

REPO="$CI_PRIMARY_REPOSITORY_PATH"
IOS_DIR="$REPO/ios"
PBXPROJ="$IOS_DIR/RunWithAI.xcodeproj/project.pbxproj"

echo "=== Installing Homebrew packages ==="
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_BOTTLE_SOURCE_FALLBACK=0
export HOMEBREW_CURL_RETRIES=3

if command -v node >/dev/null 2>&1; then
  echo "Node.js already available: $(node --version)"
  NPM_BIN=$(command -v npm)
else
  echo "Installing node@20 via brew..."
  brew install node@20 --build-from-source 2>/dev/null || brew install node@20 || true
  brew link --overwrite node@20 || true
  NPM_BIN=$(brew --prefix)/bin/npm
fi

if command -v pod >/dev/null 2>&1; then
  echo "CocoaPods already available: $(pod --version)"
  POD_BIN=$(command -v pod)
else
  echo "Installing cocoapods..."
  brew install cocoapods --build-from-source 2>/dev/null || brew install cocoapods || true
  POD_BIN=$(brew --prefix)/bin/pod
fi

echo "Using npm: $NPM_BIN"
echo "Using pod: $POD_BIN"

echo "=== Patching objectVersion for CocoaPods compatibility ==="
sed -i '' 's/objectVersion = 70;/objectVersion = 60;/g' "$PBXPROJ"

echo "=== Fixing version numbers ==="
sed -i '' 's/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = 1.7.3;/g' "$PBXPROJ"
sed -i '' 's/CURRENT_PROJECT_VERSION = [^;]*;/CURRENT_PROJECT_VERSION = 154;/g' "$PBXPROJ"
echo "Versions after patch:"
grep "MARKETING_VERSION" "$PBXPROJ" | head -4

echo "=== Creating missing InfoPlist.strings locale files ==="
SUPPORTING_DIR="$IOS_DIR/RunWithAI/Supporting"
for LOCALE in el lt en hu cs sl fr ga et ro es mt sk nl da sv pl lv hr it fi de bg pt; do
  mkdir -p "$SUPPORTING_DIR/$LOCALE.lproj"
  if [ ! -f "$SUPPORTING_DIR/$LOCALE.lproj/InfoPlist.strings" ]; then
    printf '/* InfoPlist.strings */\n' > "$SUPPORTING_DIR/$LOCALE.lproj/InfoPlist.strings"
  fi
done

echo "=== Creating Watch app entitlements file ==="
WATCH_ENTITLEMENTS="$IOS_DIR/RunWithAI Watch Watch App/RunWithAI Watch Watch App.entitlements"
if [ ! -f "$WATCH_ENTITLEMENTS" ]; then
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>com.apple.developer.healthkit</key>\n\t<true/>\n</dict>\n</plist>\n' > "$WATCH_ENTITLEMENTS"
  echo "Created Watch entitlements"
fi

echo "=== Creating missing iOS resource files ==="
EXPO_PLIST="$IOS_DIR/RunWithAI/Supporting/Expo.plist"
if [ ! -f "$EXPO_PLIST" ]; then
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>EXUpdatesCheckOnLaunch</key>\n\t<string>ALWAYS</string>\n\t<key>EXUpdatesEnabled</key>\n\t<false/>\n\t<key>EXUpdatesLaunchWaitMs</key>\n\t<integer>0</integer>\n</dict>\n</plist>\n' > "$EXPO_PLIST"
fi

APP_DELEGATE="$IOS_DIR/RunWithAI/AppDelegate.swift"
if [ ! -f "$APP_DELEGATE" ]; then
  python3 -c "
content = '''import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    self.automaticallyLoadReactNativeWindow = true
    self.moduleName = \"main\"
    self.dependencyProvider = RCTAppDependencyProvider()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
'''
import sys
with open(sys.argv[1], 'w') as f:
  f.write(content)
" "$APP_DELEGATE"
fi

BRIDGING_HEADER="$IOS_DIR/RunWithAI/RunWithAI-Bridging-Header.h"
if [ ! -f "$BRIDGING_HEADER" ]; then
  python3 -c "
content = '''//
// RunWithAI-Bridging-Header.h
#ifndef RunWithAI_Bridging_Header_h
#define RunWithAI_Bridging_Header_h
#endif
'''
import sys
with open(sys.argv[1], 'w') as f:
  f.write(content)
" "$BRIDGING_HEADER"
fi

echo "=== Creating Info.plist (always overwrite) ==="
INFO_PLIST="$IOS_DIR/RunWithAI/Info.plist"
cat > "$INFO_PLIST" << 'PLIST_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>RunWithAI</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIconName</key>
	<string>AppIcon</string>
	<key>CFBundleIcons</key>
	<dict>
		<key>CFBundlePrimaryIcon</key>
		<dict>
			<key>CFBundleIconName</key>
			<string>AppIcon</string>
			<key>CFBundleIconFiles</key>
			<array/>
		</dict>
	</dict>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleSignature</key>
	<string>????</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
	<key>NSLocationWhenInUseUsageDescription</key>
	<string>RunWithAI needs location to track your runs.</string>
	<key>NSMotionUsageDescription</key>
	<string>RunWithAI uses motion to track activity.</string>
	<key>NSHealthShareUsageDescription</key>
	<string>RunWithAI reads health data to personalize training.</string>
	<key>NSHealthUpdateUsageDescription</key>
	<string>RunWithAI saves workout data to Health.</string>
	<key>UILaunchScreen</key>
	<dict/>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>armv7</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<false/>
	<key>CFBundleAllowMixedLocalizations</key>
	<true/>
</dict>
</plist>
PLIST_EOF
echo "Created/updated Info.plist"

echo "=== Installing Node.js dependencies ==="
cd "$REPO"
"$NPM_BIN" install --legacy-peer-deps
"$NPM_BIN" install --legacy-peer-deps @react-native-community/cli

echo "=== Installing pods ==="
cd "$IOS_DIR"
"$POD_BIN" install

echo "=== Patching fmt for Xcode 26 consteval compatibility ==="
FMT_INCLUDE="$IOS_DIR/Pods/fmt/include/fmt"
if [ -d "$FMT_INCLUDE" ]; then
  find "$FMT_INCLUDE" -type f \( -name "*.h" -o -name "*.cc" -o -name "*.cpp" \) | while read f; do
    if grep -q "consteval" "$f"; then
      sed -i '' 's/consteval/inline/g' "$f"
    fi
  done
else
  find "$IOS_DIR/Pods/fmt" -type f -name "*.h" 2>/dev/null | while read f; do
    if grep -q "consteval" "$f"; then
      sed -i '' 's/consteval/inline/g' "$f"
    fi
  done
fi

echo "=== Fixing Watch app configuration ==="
sed -i '' 's/WKCompanionAppBundleIdentifier = "";/WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"
sed -i '' 's/WKCompanionAppBundleIdentifier = ;/WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"

echo "=== Fixing Watch Info.plist (overwrite entire file) ==="
WATCH_PLIST="$IOS_DIR/RunWithAI Watch Watch App/Info.plist"
if [ -f "$WATCH_PLIST" ]; then
  cat > "$WATCH_PLIST" << 'WATCH_PLIST_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>RunWithAI</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>NSHealthShareUsageDescription</key>
	<string>RunWithAI reads your health data to personalize your training.</string>
	<key>NSHealthUpdateUsageDescription</key>
	<string>RunWithAI uses HealthKit to save your workout data.</string>
	<key>UISupportedInterfaceOrientations</key>
	<array/>
	<key>WKWatchOnly</key>
	<false/>
</dict>
</plist>
WATCH_PLIST_EOF
  echo "Overwrote Watch Info.plist"
fi

echo "=== Fixing Watch app icon (remove alpha via sips flatten) ==="
WATCH_ICON_DIR="$IOS_DIR/RunWithAI Watch Watch App/Assets.xcassets/AppIcon.appiconset"
mkdir -p "$WATCH_ICON_DIR"
SRC_ICON="$REPO/assets/icon.png"
DEST_ICON="$WATCH_ICON_DIR/AppIcon.png"

# Flatten alpha by converting PNG -> JPEG (loses alpha) -> PNG
TEMP_JPEG="/tmp/icon_flat_$$.jpg"
sips -s format jpeg "$SRC_ICON" --out "$TEMP_JPEG" 2>/dev/null || cp "$SRC_ICON" "$DEST_ICON"
if [ -f "$TEMP_JPEG" ]; then
  sips -s format png "$TEMP_JPEG" --out "$DEST_ICON" 2>/dev/null || cp "$SRC_ICON" "$DEST_ICON"
  rm -f "$TEMP_JPEG"
fi

echo "Icon info after flatten:"
sips -g all "$DEST_ICON" 2>/dev/null | grep -E "pixelWidth|pixelHeight|hasAlpha|format" || true

echo "=== Done ==="
