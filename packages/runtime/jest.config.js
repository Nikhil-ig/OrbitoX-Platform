const baseConfig = require('@orbitox-io/jest-config');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...baseConfig,
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
