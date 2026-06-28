// withBackgroundLocation.js
// Config plugin der registrerer BackgroundLocationModule.swift/.m i Xcode-
// projektet saa de kompileres med ind. Filerne ligger allerede i ios/.
const { withXcodeProject } = require('@expo/config-plugins');

const FILES = ['BackgroundLocationModule.swift', 'BackgroundLocationModule.m'];

const withBackgroundLocation = (config) => {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;

    // Find (eller opret) en gruppe til projektets kildefiler.
    const group = project.pbxGroupByName(projectName) ? projectName : null;

    FILES.forEach((file) => {
      // Undgaa at tilfoeje samme fil to gange ved gentagne prebuilds.
      const already = Object.values(project.pbxFileReferenceSection()).some(
        (ref) => ref && typeof ref.path === 'string' && ref.path.indexOf(file) !== -1
      );
      if (already) return;
      project.addSourceFile(
        file,
        { target: project.getFirstTarget().uuid },
        group
      );
    });

    return cfg;
  });
};

module.exports = withBackgroundLocation;
