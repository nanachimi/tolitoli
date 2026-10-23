const { withGradleProperties } = require('expo/config-plugins');

/**
 * Native ABIs to build (D-036, owner: option A for 1.0). executorch exists in arm64 and
 * x86_64 only, so production leaves 32-bit devices out and Play excludes them by itself.
 */
module.exports = function withArchitectures(config, architectures) {
  return withGradleProperties(config, (mod) => {
    const value = architectures.join(',');
    const existing = mod.modResults.find(
      (item) => item.type === 'property' && item.key === 'reactNativeArchitectures',
    );
    if (existing) existing.value = value;
    else mod.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value });
    return mod;
  });
};
