const expoPreset = require('jest-expo/jest-preset');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // The formatjs Intl polyfills ship as ES modules only (D-012).
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.startsWith('/node_modules/(?!(') ? pattern.replace('(?!(', '(?!(@formatjs|') : pattern,
  ),
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  // First render of a screen transforms a lot of code on a cold cache.
  testTimeout: 15000,
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**'],
};
