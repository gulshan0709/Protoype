const { withAppBuildGradle } = require("expo/config-plugins");

// Windows builds fail when autolinked codegen object paths pass 260 characters.
// Above this limit CMake replaces an object's source directory with a short hash.
const marker = "-DCMAKE_OBJECT_PATH_MAX=";
const block = `
        externalNativeBuild {
            cmake {
                arguments "${marker}250"
            }
        }`;

module.exports = function withWindowsCmakePaths(config) {
  return withAppBuildGradle(config, (config) => {
    const gradle = config.modResults.contents;
    if (!gradle.includes(marker)) {
      config.modResults.contents = gradle.replace(
        /defaultConfig \{/,
        (match) => match + block,
      );
    }
    return config;
  });
};
