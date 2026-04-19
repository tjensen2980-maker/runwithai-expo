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
  NPM_BIN=$(command -v npm)
else
  brew install node@20 --build-from-source 2>/dev/null || brew install node@20 || true
  brew link --overwrite node@20 || true
  NPM_BIN=$(brew --prefix)/bin/npm
fi

if command -v pod >/dev/null 2>&1; then
  POD_BIN=$(command -v pod)
else
  brew install cocoapods --build-from-source 2>/dev/null || brew install cocoapods || true
  POD_BIN=$(brew --prefix)/bin/pod
fi
echo "Using npm: $NPM_BIN / pod: $POD_BIN"

echo "=== Patching objectVersion ==="
sed -i '' 's/objectVersion = 70;/objectVersion = 60;/g' "$PBXPROJ"

echo "=== Fixing version numbers ==="
sed -i '' 's/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = 1.7.3;/g' "$PBXPROJ"
sed -i '' 's/CURRENT_PROJECT_VERSION = [^;]*;/CURRENT_PROJECT_VERSION = 155;/g' "$PBXPROJ"
echo "MARKETING_VERSION after:"
grep "MARKETING_VERSION" "$PBXPROJ" | head -4

echo "=== Creating locale files ==="
SUPPORTING_DIR="$IOS_DIR/RunWithAI/Supporting"
for LOCALE in el lt en hu cs sl fr ga et ro es mt sk nl da sv pl lv hr it fi de bg pt; do
  mkdir -p "$SUPPORTING_DIR/$LOCALE.lproj"
  [ -f "$SUPPORTING_DIR/$LOCALE.lproj/InfoPlist.strings" ] || printf '/* InfoPlist.strings */\n' > "$SUPPORTING_DIR/$LOCALE.lproj/InfoPlist.strings"
done

echo "=== Creating Watch entitlements ==="
WATCH_ENTITLEMENTS="$IOS_DIR/RunWithAI Watch Watch App/RunWithAI Watch Watch App.entitlements"
[ -f "$WATCH_ENTITLEMENTS" ] || printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>com.apple.developer.healthkit</key>\n\t<true/>\n</dict>\n</plist>\n' > "$WATCH_ENTITLEMENTS"

echo "=== Creating iOS support files ==="
EXPO_PLIST="$IOS_DIR/RunWithAI/Supporting/Expo.plist"
[ -f "$EXPO_PLIST" ] || printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>EXUpdatesEnabled</key>\n\t<false/>\n</dict>\n</plist>\n' > "$EXPO_PLIST"

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
with open(sys.argv[1], 'w') as f: f.write(content)
" "$APP_DELEGATE"
fi

BRIDGING_HEADER="$IOS_DIR/RunWithAI/RunWithAI-Bridging-Header.h"
[ -f "$BRIDGING_HEADER" ] || printf '#ifndef RunWithAI_Bridging_Header_h\n#define RunWithAI_Bridging_Header_h\n#endif\n' > "$BRIDGING_HEADER"

echo "=== Creating iOS Info.plist (via python3) ==="
INFO_PLIST="$IOS_DIR/RunWithAI/Info.plist"
python3 - "$INFO_PLIST" << 'PYEOF'
import sys
content = open("/dev/stdin").read() if False else """\
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
</plist>"""
with open(sys.argv[1], "w") as f: f.write(content.lstrip())
PYEOF
echo "Created iOS Info.plist"

echo "=== Creating Watch Info.plist (via python3) ==="
WATCH_PLIST_PATH="$IOS_DIR/RunWithAI Watch Watch App/Info.plist"
python3 - "$WATCH_PLIST_PATH" << 'PYEOF'
import sys
content = """\
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
</plist>"""
with open(sys.argv[1], "w") as f: f.write(content.lstrip())
PYEOF
echo "Created Watch Info.plist"

echo "=== Installing Node.js dependencies ==="
cd "$REPO"
"$NPM_BIN" install --legacy-peer-deps
"$NPM_BIN" install --legacy-peer-deps @react-native-community/cli

echo "=== Installing pods ==="
cd "$IOS_DIR"
"$POD_BIN" install

echo "=== Patching fmt consteval ==="
FMT_DIR="$IOS_DIR/Pods/fmt"
if [ -d "$FMT_DIR" ]; then
  find "$FMT_DIR" -type f \( -name "*.h" -o -name "*.cc" -o -name "*.cpp" \) | while read f; do
    if grep -q "consteval" "$f"; then
      sed -i '' 's/consteval/inline/g' "$f"
      echo "Patched: $f"
    fi
  done
fi

echo "=== Fixing WKCompanionAppBundleIdentifier ==="
sed -i '' 's/WKCompanionAppBundleIdentifier = "";/WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"
sed -i '' 's/WKCompanionAppBundleIdentifier = ;/WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"

echo "=== Copying app icons (flatten alpha via JPEG roundtrip) ==="
SRC_ICON="$REPO/assets/icon.png"
FLAT_ICON="/tmp/icon_flat_$$.png"
TEMP_JPEG="/tmp/icon_flat_$$.jpg"
# PNG -> JPEG (drops alpha) -> PNG (no alpha)
sips -s format jpeg "$SRC_ICON" --out "$TEMP_JPEG" 2>/dev/null && \
  sips -s format png "$TEMP_JPEG" --out "$FLAT_ICON" 2>/dev/null || cp "$SRC_ICON" "$FLAT_ICON"
rm -f "$TEMP_JPEG"
echo "Flat icon hasAlpha:"
sips -g hasAlpha "$FLAT_ICON" 2>/dev/null || true

# iOS icon
IOS_ICON_DIR="$IOS_DIR/RunWithAI/Images.xcassets/AppIcon.appiconset"
mkdir -p "$IOS_ICON_DIR"
cp "$FLAT_ICON" "$IOS_ICON_DIR/AppIcon.png"
cat > "$IOS_ICON_DIR/Contents.json" << 'CONTENTS_EOF'
{
  "images": [
    {
      "filename": "AppIcon.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
CONTENTS_EOF

# Watch icon
WATCH_ICON_DIR="$IOS_DIR/RunWithAI Watch Watch App/Assets.xcassets/AppIcon.appiconset"
mkdir -p "$WATCH_ICON_DIR"
cp "$FLAT_ICON" "$WATCH_ICON_DIR/AppIcon.png"
rm -f "$FLAT_ICON"

echo "=== Done ==="
