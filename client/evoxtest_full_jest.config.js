'use strict';

/**
 * EVOX-TEST-SUITE-FULL-2026-07-25 — Standalone frontend Jest run.
 * Runs all 138 Jest files from the external FULL suite without touching
 * client/src/__tests__/. Covers:
 *   frontend/existing/    116 files — component render tests
 *   frontend/branchtests/  22 files — store actions/reducers + role-aware
 *
 * Run from: C:\DFolder\Projects\EVOX\E2eTesting\EVOX Code-Git\evox-app-e2e\client\
 * Command:
 *   node node_modules/.bin/jest --config evoxtest_full_jest.config.js --runInBand
 */

const path = require('path');
const rsDir = path.resolve(__dirname, 'node_modules/react-scripts');

module.exports = {
  rootDir: __dirname,

  roots: [
    'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\VishnuTestCases\\EVOX-TEST-SUITE-FULL-2026-07-25\\frontend\\existing',
    'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\VishnuTestCases\\EVOX-TEST-SUITE-FULL-2026-07-25\\frontend\\branchtests',
  ],
  testMatch: ['**/*.test.js', '**/*.test.jsx'],

  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': `${rsDir}/config/jest/babelTransform.js`,
    '^.+\\.css$':             `${rsDir}/config/jest/cssTransform.js`,
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': `${rsDir}/config/jest/fileTransform.js`,
  },
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss)$',
  ],

  resolver: path.resolve(__dirname, 'evoxtest_full_resolver.js'),

  moduleNameMapper: {
    '^react-native$': 'react-native-web',
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },

  modulePaths: ['<rootDir>/node_modules'],

  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],

  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,jsx}',
    '!<rootDir>/src/**/*.test.{js,jsx}',
    '!<rootDir>/src/index.js',
    '!<rootDir>/src/serviceWorker.js',
  ],
  coverageDirectory: 'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\VishnuTestCases\\EVOX-TEST-SUITE-FULL-2026-07-25\\Coverage\\frontend',
  coverageReporters: ['text', 'html', 'lcov'],
};
