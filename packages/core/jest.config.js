const baseConfig = require('@orbitox/jest-config');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  rootDir: '.',
  moduleNameMapper: {
    '^@nestjs/common$': '<rootDir>/src/__mocks__/nestjs-common.js',
  },
};
