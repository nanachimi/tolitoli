const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The drizzle migrations are bundled from .sql files (babel.config.js).
config.resolver.sourceExts.push('sql');

module.exports = config;
