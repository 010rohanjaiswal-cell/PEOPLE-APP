/**
 * Expo Config Plugin for PhonePe Maven Repository and SDK Requirements
 * - Adds PhonePe Maven repository to Android project build.gradle
 * - Ensures Android SDK versions meet PhonePe requirements:
 *   - compileSdkVersion: 28 or higher (set to 34)
 *   - minSdkVersion: 21 or higher (set to 21)
 *   - targetSdkVersion: 28 or higher (set to 34)
 */

const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withPhonePeMaven(config) {
  // Step 1: Add Maven repository to project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const buildGradle = config.modResults.contents;

      // Check if PhonePe Maven repository already exists
      if (!buildGradle.includes('phonepe-intentsdk-android')) {
        // Find the allprojects.repositories block and add PhonePe Maven repo
        const mavenRepo = `\n        maven {\n            url "https://phonepe.mycloudrepo.io/public/repositories/phonepe-intentsdk-android"\n        }`;

        // Add after google() repository in allprojects block
        if (buildGradle.includes('allprojects')) {
          // Find allprojects { repositories { ... } }
          const allProjectsRegex = /(allprojects\s*\{[^}]*repositories\s*\{[^}]*)(google\(\))/;
          if (allProjectsRegex.test(buildGradle)) {
            config.modResults.contents = buildGradle.replace(
              allProjectsRegex,
              `$1$2${mavenRepo}`
            );
          } else {
            // Add to repositories block if it exists
            const repositoriesRegex = /(repositories\s*\{)/;
            if (repositoriesRegex.test(buildGradle)) {
              config.modResults.contents = buildGradle.replace(
                repositoriesRegex,
                `$1${mavenRepo}`
              );
            }
          }
        } else {
          // If no allprojects block, add it
          const mavenBlock = `\nallprojects {\n    repositories {\n        google()${mavenRepo}\n        mavenCentral()\n    }\n}\n`;
          config.modResults.contents = mavenBlock + buildGradle;
        }
      }
    }

    return config;
  });

  // Step 2: Ensure Android SDK versions in app build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;

      // PhonePe SDK Requirements:
      // - compileSdkVersion: 28 or higher
      // - minSdkVersion: 21 or higher
      // - targetSdkVersion: 28 or higher

      // Update compileSdkVersion (default to 34 if not set or lower than 28)
      const compileSdkMatch = buildGradle.match(/compileSdkVersion\s+(\d+)/);
      if (!compileSdkMatch || parseInt(compileSdkMatch[1]) < 28) {
        if (compileSdkMatch) {
          buildGradle = buildGradle.replace(/compileSdkVersion\s+\d+/, 'compileSdkVersion 34');
        } else {
          // Add after android { block
          buildGradle = buildGradle.replace(
            /(android\s*\{)/,
            '$1\n        compileSdkVersion 34'
          );
        }
      }

      // Update minSdkVersion (ensure it's at least 21)
      const minSdkMatch = buildGradle.match(/minSdkVersion\s+(\d+)/);
      if (!minSdkMatch || parseInt(minSdkMatch[1]) < 21) {
        if (minSdkMatch) {
          buildGradle = buildGradle.replace(/minSdkVersion\s+\d+/, 'minSdkVersion 21');
        } else {
          // Add after defaultConfig { block
          buildGradle = buildGradle.replace(
            /(defaultConfig\s*\{)/,
            '$1\n            minSdkVersion 21'
          );
        }
      }

      // Update targetSdkVersion (default to 34 if not set or lower than 28)
      const targetSdkMatch = buildGradle.match(/targetSdkVersion\s+(\d+)/);
      if (!targetSdkMatch || parseInt(targetSdkMatch[1]) < 28) {
        if (targetSdkMatch) {
          buildGradle = buildGradle.replace(/targetSdkVersion\s+\d+/, 'targetSdkVersion 34');
        } else {
          // Add after minSdkVersion in defaultConfig
          buildGradle = buildGradle.replace(
            /(minSdkVersion\s+\d+)/,
            '$1\n            targetSdkVersion 34'
          );
        }
      }

      config.modResults.contents = buildGradle;
    }

    return config;
  });

  return config;
};

