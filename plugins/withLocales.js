const { withDangerousMod } = require('expo/config-plugins');
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
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, 'ios', config.modRequest.projectName);

      LOCALES.forEach((locale) => {
        const lprojDir = path.join(iosPath, locale + '.lproj');
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
