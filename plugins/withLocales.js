const { withXcodeProject, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const LOCALES = [
  'da', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'sv',
  'fi', 'el', 'cs', 'ro', 'hu', 'bg', 'hr', 'sk', 'sl', 'lt',
  'lv', 'et', 'ga', 'mt'
];

function withLocales(config) {
  // Step 1: Create .lproj directories and InfoPlist.strings files on disk
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const items = fs.readdirSync(iosRoot);
      const xcodeproj = items.find(i => i.endsWith('.xcodeproj'));
      const projectName = xcodeproj
        ? xcodeproj.replace('.xcodeproj', '')
        : config.modRequest.projectName || 'RunWithAI';
      const projectDir = path.join(iosRoot, projectName);

      LOCALES.forEach((locale) => {
        const lprojDir = path.join(projectDir, locale + '.lproj');
        if (!fs.existsSync(lprojDir)) {
          fs.mkdirSync(lprojDir, { recursive: true });
        }
        const stringsFile = path.join(lprojDir, 'InfoPlist.strings');
        if (!fs.existsSync(stringsFile)) {
          fs.writeFileSync(stringsFile, '/* Localized */\n');
        }
      });

      return config;
    },
  ]);

  // Step 2: Add known regions and .lproj resource files to Xcode project
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName || 'RunWithAI';

    // Add all locales as known regions in the Xcode project
    const knownRegions = xcodeProject.pbxProjectSection();
    for (const key in knownRegions) {
      if (knownRegions[key].knownRegions) {
        const regions = knownRegions[key].knownRegions;
        LOCALES.forEach((locale) => {
          if (!regions.includes(locale)) {
            regions.push(locale);
          }
        });
      }
    }

    // Add InfoPlist.strings as variant group resource for each locale
    LOCALES.forEach((locale) => {
      const lprojPath = projectName + '/' + locale + '.lproj/InfoPlist.strings';
      // Only add if not already present
      const files = xcodeProject.pbxFileReferenceSection();
      const alreadyAdded = Object.values(files).some(
        f => f && typeof f === 'object' && f.path && f.path.includes(locale + '.lproj/InfoPlist.strings')
      );
      if (!alreadyAdded) {
        xcodeProject.addResourceFile(
          lprojPath,
          { lastKnownFileType: 'text.plist.strings' }
        );
      }
    });

    return config;
  });

  return config;
}

module.exports = withLocales;
