const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// withoutInstallReferrer';

/**
 * Leaves Google's Install Referrer library out of the app (D-036). react-native-device-info,
 * a dependency of executorch's legacy API, pulls it in; it reads where the app was installed
 * from, which Tolitoli has no use for. device-info loads it by reflection and does without.
 */
module.exports = function withoutInstallReferrer(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += `
${MARKER}
configurations.all {
    exclude group: 'com.android.installreferrer'
}
`;
    }
    return mod;
  });
};
