'use strict';

/**
 * Custom Jest resolver for the EVOX-TEST-SUITE-NETNEW standalone run.
 *
 * Problem: the new test files live in an external directory but their relative
 * imports (../../X, ../../../X) were written for the in-tree location
 * client/src/__tests__/[role|store/...]. Running from the external path breaks
 * those imports.
 *
 * Solution: when the importing file IS in the external test directory and the
 * import starts with '../', strip all the leading ../ and resolve from
 * client/src/ directly. For every other file (source files inside client/src,
 * node_modules etc.) fall through to Jest's default resolver unchanged.
 */

const path = require('path');
const fs   = require('fs');

const EXTERNAL_DIR = path.normalize(
  'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\VishnuTestCases\\EVOX-TEST-SUITE-NETNEW-2026-07-24\\frontend\\branchtests'
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
    // The test file is in the external directory and uses a relative import.
    // Strip all leading ../ — regardless of depth, these always point to src/.
    const rest = moduleName.replace(/^(\.\.\/)+/, '');
    const target = path.join(CLIENT_SRC, rest);
    const resolved = resolveWithExtensions(target);
    if (resolved) return resolved;
    throw new Error(
      `[evoxtest resolver] Cannot find '${moduleName}'\n` +
      `  Remapped to: ${target}\n` +
      `  From:        ${basedir}`
    );
  }

  // Everything else — source files, node_modules, CSS, assets — use Jest's
  // built-in resolver unchanged.
  return defaultResolver(moduleName, options);
};
