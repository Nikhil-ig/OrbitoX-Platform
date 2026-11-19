const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.module.ts',
  ],
  moduleNameMapper: {
    '^@nestjs/common$': path.resolve(__dirname, 'nestjs-common-shim.js'),
    '^@nestjs/core$': path.resolve(__dirname, 'nestjs-core-shim.js'),
    '^@nestjs/jwt$': path.resolve(__dirname, 'nestjs-jwt-shim.js'),
    '^@nestjs/passport$': path.resolve(__dirname, 'nestjs-passport-shim.js'),
    '^otplib$': path.resolve(__dirname, 'otplib-shim.js'),
    '^uuid$': path.resolve(__dirname, 'uuid-shim.js'),
  },




  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};



