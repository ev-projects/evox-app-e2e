'use strict';

const path = require('path');
const rsDir = path.resolve(__dirname, 'node_modules/react-scripts');

module.exports = {
  // Anchor module resolution to the client directory
  rootDir: __dirname,

  // Run ONLY the external suite — zero overlap with old tests in client/src/__tests__
  roots: [
    'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\VishnuTestCases\\EVOX-TEST-SUITE-NETNEW-2026-07-24\\frontend\\branchtests',
  ],
  testMatch: ['**/*.test.js', '**/*.test.jsx'],

  // Re-use CRA's own transform chain so JSX + modern JS compile identically
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': `${rsDir}/config/jest/babelTransform.js`,
    '^.+\\.css$':             `${rsDir}/config/jest/cssTransform.js`,
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': `${rsDir}/config/jest/fileTransform.js`,
  },
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss)$',
  ],

  // Custom resolver: remaps ../../X / ../../../X imports that originate from
  // the external test files to client/src/X. Source files inside client/src
  // are resolved normally — old tests are never touched.
  resolver: path.resolve(__dirname, 'evoxtest_netnew_resolver.js'),

  moduleNameMapper: {
    '^react-native$': 'react-native-web',
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },

  modulePaths: ['<rootDir>/node_modules'],

  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],

  // Coverage: measures how much of client/src the new tests cover on their own
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,jsx}',
    '!<rootDir>/src/**/*.test.{js,jsx}',
    '!<rootDir>/src/index.js',
    '!<rootDir>/src/serviceWorker.js',
  ],
  coverageDirectory: 'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\Gary & Glenn Report\\evoxtest_final-report\\frontend-netnew',
  coverageReporters: ['text', 'html', 'lcov'],
};
