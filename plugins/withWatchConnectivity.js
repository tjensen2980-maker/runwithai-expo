/**
 * withWatchConnectivity.js
 *
 * Expo Config Plugin der tilføjer RCTWatchConnectivity native filer
 * til Xcode-projektet automatisk under prebuild.
 */

const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withWatchConnectivity = (config) => {
    return withXcodeProject(config, async (config) => {
        const xcodeProject = config.modResults;
        const projectRoot = config.modRequest.projectRoot;
        const iosDir = path.join(projectRoot, 'ios');
        
        // Filer der skal tilføjes til Xcode-projektet
        const filesToAdd = [
            'RCTWatchConnectivity.h',
            'RCTWatchConnectivity.mm',
        ];
        
        // Find target gruppen (normalt samme navn som appen)
        const targetName = config.name.replace(/[^a-zA-Z0-9]/g, '');
        
        for (const fileName of filesToAdd) {
            const filePath = path.join(iosDir, fileName);
            
            // Tjek at filen eksisterer
            if (!fs.existsSync(filePath)) {
                console.warn(`[withWatchConnectivity] File not found: ${filePath}`);
                continue;
            }
            
            // Tjek om filen allerede er i projektet
            const existingFile = xcodeProject.hasFile(`ios/${fileName}`);
            if (existingFile) {
                console.log(`[withWatchConnectivity] File already in project: ${fileName}`);
                continue;
            }
            
            // Tilføj filen til Xcode-projektet
            const sourceFile = xcodeProject.addSourceFile(
                fileName,
                {},
                undefined // Tilføj til default target
            );
            
            if (sourceFile) {
                console.log(`[withWatchConnectivity] Added ${fileName} to Xcode project`);
            }
        }
        
        return config;
    });
};

module.exports = withWatchConnectivity;
