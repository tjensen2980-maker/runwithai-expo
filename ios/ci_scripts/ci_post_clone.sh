#!/bin/sh
# ci_post_clone.sh - Xcode Cloud post-clone script
set -e
REPO="$CI_PRIMARY_REPOSITORY_PATH"
IOS_DIR="$REPO/ios"
PBXPROJ="$IOS_DIR/RunWithAI.xcodeproj/project.pbxproj"
echo "=== Setting up Node.js via nvm ==="
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then . "$NVM_DIR/nvm.sh"; nvm install 20; nvm use 20; NPM_BIN="$(which npm)"; else export HOMEBREW_NO_AUTO_UPDATE=1; export HOMEBREW_NO_INSTALL_CLEANUP=1; if ! command -v node >/dev/null 2>&1; then brew install node || true; fi; NPM_BIN="$(command -v npm)"; fi
echo "Node: $(node --version 2>/dev/null || echo unknown)"; echo "NPM: $NPM_BIN"
echo "=== Setting up CocoaPods ==="
export HOMEBREW_NO_AUTO_UPDATE=1; export HOMEBREW_NO_INSTALL_CLEANUP=1
if command -v pod >/dev/null 2>&1; then POD_BIN="$(command -v pod)"; else brew install cocoapods || true; POD_BIN="$(brew --prefix)/bin/pod"; fi
echo "Pod: $POD_BIN"
echo "=== Patching objectVersion ==="
sed -i '' 's/objectVersion = 70;/objectVersion = 60;/g' "$PBXPROJ"
echo "=== Fixing version numbers ==="
sed -i '' 's/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = 1.7.3;/g' "$PBXPROJ"
sed -i '' 's/CURRENT_PROJECT_VERSION = [^;]*;/CURRENT_PROJECT_VERSION = 172;/g' "$PBXPROJ"
echo "MARKETING_VERSION after:"; grep "MARKETING_VERSION" "$PBXPROJ" | head -4
echo "=== Adding NSHealth keys to Watch target in pbxproj ==="
python3 -c "import sys; path=sys.argv[1]; f=open(path,'r'); c=f.read(); f.close(); q=chr(34); old='INFOPLIST_KEY_WKBackgroundModes = '+q+'workout-processing'+q+';'; new=old+'\n\t\t\t\tINFOPLIST_KEY_NSHealthShareUsageDescription = '+q+'RunWithAI reads health data.'+q+';\n\t\t\t\tINFOPLIST_KEY_NSHealthUpdateUsageDescription = '+q+'RunWithAI writes workout data.'+q+';'; f=open(path,'w'); f.write(c.replace(old,new) if old in c else c); f.close()" "$PBXPROJ"
echo "=== Creating locale files ==="
SUPPORTING_DIR="$IOS_DIR/RunWithAI/Supporting"
for LOCALE in el lt en hu cs sl fr ga et ro es mt sk nl da sv pl lv hr it fi de bg pt; do mkdir -p "$SUPPORTING_DIR/$LOCALE.lproj"; [ -f "$SUPPORTING_DIR/$LOCALE.lproj/InfoPlist.strings" ] || printf '/* InfoPlist.strings */\n' > "$SUPPORTING_DIR/$LOCALE.lproj/InfoPlist.strings"; done
echo "=== Creating Watch entitlements ==="
WATCH_ENTITLEMENTS="$IOS_DIR/RunWithAI Watch Watch App/RunWithAI Watch Watch App.entitlements"
[ -f "$WATCH_ENTITLEMENTS" ] || printf '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n\t<key>com.apple.developer.healthkit</key>\n\t<true/>\n</dict>\n</plist>\n' > "$WATCH_ENTITLEMENTS"
echo "=== Creating iOS support files ==="
EXPO_PLIST="$IOS_DIR/RunWithAI/Supporting/Expo.plist"
[ -f "$EXPO_PLIST" ] || printf '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n\t<key>EXUpdatesEnabled</key>\n\t<false/>\n</dict>\n</plist>\n' > "$EXPO_PLIST"
APP_DELEGATE="$IOS_DIR/RunWithAI/AppDelegate.swift"
[ -f "$APP_DELEGATE" ] || python3 -c "import sys; q=chr(34); f=open(sys.argv[1],'w'); f.write('import UIKit\nimport React\nimport React_RCTAppDelegate\nimport ReactAppDependencyProvider\n\n@main\nclass AppDelegate: RCTAppDelegate {\n  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {\n    self.automaticallyLoadReactNativeWindow = true\n    self.moduleName = '+q+'main'+q+'\n    self.dependencyProvider = RCTAppDependencyProvider()\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)\n  }\n}\n'); f.close()" "$APP_DELEGATE"
BRIDGING_HEADER="$IOS_DIR/RunWithAI/RunWithAI-Bridging-Header.h"
[ -f "$BRIDGING_HEADER" ] || printf '#ifndef RunWithAI_Bridging_Header_h\n#define RunWithAI_Bridging_Header_h\n#endif\n' > "$BRIDGING_HEADER"
echo "=== Creating iOS Info.plist ==="
INFO_PLIST="$IOS_DIR/RunWithAI/Info.plist"
python3 -c "import sys; q=chr(34); content='<?xml version='+q+'1.0'+q+' encoding='+q+'UTF-8'+q+'?>\n<!DOCTYPE plist PUBLIC '+q+'-//Apple//DTD PLIST 1.0//EN'+q+' '+q+'http://www.apple.com/DTDs/PropertyList-1.0.dtd'+q+'>\n<plist version='+q+'1.0'+q+'><dict>\n<key>CFBundleDevelopmentRegion</key><string>en</string>\n<key>CFBundleDisplayName</key><string>RunWithAI</string>\n<key>CFBundleExecutable</key><string>\$(EXECUTABLE_NAME)</string>\n<key>CFBundleIdentifier</key><string>\$(PRODUCT_BUNDLE_IDENTIFIER)</string>\n<key>CFBundleInfoDictionaryVersion</key><string>6.0</string>\n<key>CFBundleName</key><string>\$(PRODUCT_NAME)</string>\n<key>CFBundlePackageType</key><string>\$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>\n<key>CFBundleShortVersionString</key><string>\$(MARKETING_VERSION)</string>\n<key>CFBundleVersion</key><string>\$(CURRENT_PROJECT_VERSION)</string>\n<key>CFBundleIconName</key><string>AppIcon</string>\n<key>CFBundleIcons</key><dict><key>CFBundlePrimaryIcon</key><dict><key>CFBundleIconName</key><string>AppIcon</string><key>CFBundleIconFiles</key><array/></dict></dict>\n<key>LSRequiresIPhoneOS</key><true/>\n<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><true/></dict>\n<key>NSLocationWhenInUseUsageDescription</key><string>RunWithAI needs location to track runs.</string>\n<key>NSMotionUsageDescription</key><string>RunWithAI uses motion to track activity.</string>\n<key>NSHealthShareUsageDescription</key><string>RunWithAI reads health data.</string>\n<key>NSHealthUpdateUsageDescription</key><string>RunWithAI saves workout data.</string>\n<key>UILaunchScreen</key><dict/>\n<key>UIRequiredDeviceCapabilities</key><array><string>armv7</string></array>\n<key>UISupportedInterfaceOrientations</key><array><string>UIInterfaceOrientationPortrait</string></array>\n<key>UIViewControllerBasedStatusBarAppearance</key><false/>\n<key>CFBundleAllowMixedLocalizations</key><true/>\n</dict></plist>'; f=open(sys.argv[1],'w'); f.write(content); f.close(); print('Created')" "$INFO_PLIST"
echo "=== Installing Node.js dependencies ==="
cd "$REPO"
"$NPM_BIN" install --legacy-peer-deps
"$NPM_BIN" install --legacy-peer-deps @react-native-community/cli
echo "=== Installing pods ==="
cd "$IOS_DIR"
"$POD_BIN" install
echo "=== Patching fmt consteval ==="
FMT_DIR="$IOS_DIR/Pods/fmt"
if [ -d "$FMT_DIR" ]; then find "$FMT_DIR" -type f \( -name "*.h" -o -name "*.cc" -o -name "*.cpp" \) | while read f; do if grep -q "consteval" "$f"; then sed -i '' 's/consteval/inline/g' "$f"; fi; done; fi
echo "=== Fixing WKCompanionAppBundleIdentifier ==="
sed -i '' 's/WKCompanionAppBundleIdentifier = "";/WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"
sed -i '' 's/WKCompanionAppBundleIdentifier = ;/WKCompanionAppBundleIdentifier = "app.runwithai";/g' "$PBXPROJ"
echo "=== Syncing Watch Swift files ==="
WATCH_SRC="$REPO/RunWithAI-Watch"; WATCH_DST="$IOS_DIR/RunWithAI Watch Watch App"
for f in WorkoutManager.swift WatchConnectivityManager.swift ContentView.swift RunningView.swift WorkoutSummaryView.swift TrainingPickerView.swift TrainingPlan.swift RunWithAI_WatchApp.swift RunUploader.swift; do if [ -f "$WATCH_SRC/$f" ]; then cp "$WATCH_SRC/$f" "$WATCH_DST/$f"; fi; done
echo "=== Copying app icons ==="
SRC_ICON="$REPO/assets/icon.png"; FLAT_ICON="/tmp/icon_flat_$$.png"; TEMP_JPEG="/tmp/icon_flat_$$.jpg"
sips -s format jpeg "$SRC_ICON" --out "$TEMP_JPEG" 2>/dev/null && sips -s format png "$TEMP_JPEG" --out "$FLAT_ICON" 2>/dev/null || cp "$SRC_ICON" "$FLAT_ICON"
rm -f "$TEMP_JPEG"
IOS_ICON_DIR="$IOS_DIR/RunWithAI/Images.xcassets/AppIcon.appiconset"; mkdir -p "$IOS_ICON_DIR"
cp "$FLAT_ICON" "$IOS_ICON_DIR/AppIcon.png"
printf '{\n  "images": [{"filename": "AppIcon.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}],\n  "info": {"author": "xcode", "version": 1}\n}\n' > "$IOS_ICON_DIR/Contents.json"
WATCH_ICON_DIR="$IOS_DIR/RunWithAI Watch Watch App/Assets.xcassets/AppIcon.appiconset"; mkdir -p "$WATCH_ICON_DIR"
cp "$FLAT_ICON" "$WATCH_ICON_DIR/AppIcon.png"; rm -f "$FLAT_ICON"
echo "=== Building JavaScript bundle (main.jsbundle) ==="
cd "$REPO"
BUNDLE_OUTPUT="$IOS_DIR/RunWithAI/main.jsbundle"; EXPORT_DIR="$IOS_DIR/RunWithAI/expo-bundle"
node_modules/.bin/expo export --platform ios --output-dir "$EXPORT_DIR"
BUNDLE_FILE=$(find "$EXPORT_DIR/bundles" -name "*.hbc" -o -name "*.js" 2>/dev/null | head -1)
if [ -n "$BUNDLE_FILE" ]; then cp "$BUNDLE_FILE" "$BUNDLE_OUTPUT"; echo "main.jsbundle created from: $BUNDLE_FILE"; else echo "ERROR: No bundle file found in $EXPORT_DIR/bundles"; ls -la "$EXPORT_DIR/bundles/" || true; exit 1; fi
