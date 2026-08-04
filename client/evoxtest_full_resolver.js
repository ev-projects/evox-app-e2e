'use strict';

/**
 * Custom Jest resolver for the EVOX-TEST-SUITE-FULL-2026-07-25 standalone run.
 *
 * Problem: test files in the external frontend/existing/ and frontend/branchtests/
 * directories use relative imports (../../X, ../../../X) written for the in-tree
 * location client/src/__tests__/. Running from the external path breaks those imports.
 *
 * Solution: when the importing file is inside the FULL suite frontend directory
 * and the import starts with '../', strip all leading ../ and resolve from
 * client/src/ directly. Depth-independent — works for both 2-level (../../)
 * and 3-level (../../../) imports. Source files, node_modules, CSS, and assets
 * fall through to Jest's default resolver unchanged.
 */

const path = require('path');
const fs   = require('fs');

const EXTERNAL_DIR = path.normalize(
  'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\VishnuTestCases\\EVOX-TEST-SUITE-FULL-2026-07-25\\frontend'
);
const CLIENT_SRC = path.normalize(
  'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\EVOX Code-Git\\evox-app-e2e\\client\\src'
);

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];

function resolveWithExtensions(base) {
  if (fs.existsSync(base)) return base;
  for (const ext of EXTENSIONS) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  for (const ext of EXTENSIONS) {
    const idx = path.join(base, 'index' + ext);
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

const defaultResolver = require('jest-resolve/build/defaultResolver').default;

module.exports = (moduleName, options) => {
  const { basedir } = options;

  if (
    basedir &&
    path.normalize(basedir).startsWith(EXTERNAL_DIR) &&
    moduleName.startsWith('../')
  ) {
    // Strip all leading ../ — regardless of depth, these resolve to src/
    const rest = moduleName.replace(/^(\.\.\/)+/, '');
    const target = path.join(CLIENT_SRC, rest);
    const resolved = resolveWithExtensions(target);
    if (resolved) return resolved;
    throw new Error(
      `[evoxtest_full resolver] Cannot find '${moduleName}'\n` +
      `  Remapped to: ${target}\n` +
      `  From:        ${basedir}`
    );
  }

  return defaultResolver(moduleName, options);
};
