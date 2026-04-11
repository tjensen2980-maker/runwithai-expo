const { withDangerousMod, IOSConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const LOCALES = [
  'da', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'sv',
  'fi', 'el', 'cs', 'ro', 'hu', 'bg', 'hr', 'sk', 'sl', 'lt',
  'lv', 'et', 'ga', 'mt'
];

function withLocales(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;

      // Find the .xcodeproj to determine the project name
      const items = fs.readdirSync(iosRoot);
      const xcodeproj = items.find(i => i.endsWith('.xcodeproj'));
      const projectName = xcodeproj ? xcodeproj.replace('.xcodeproj', '') : config.modRequest.projectName || 'RunWithAI';
      const projectDir = path.join(iosRoot, projectName);

      // Create .lproj directories with InfoPlist.strings
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
}

module.exports = withLocales;
