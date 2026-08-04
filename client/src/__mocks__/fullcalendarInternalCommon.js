/**
 * Stub for `@fullcalendar/core/internal-common`.
 *
 * WHY THIS EXISTS
 * `DailyTimeRecordPuncher.js` and `ScheduleHistory.js` both carry the line
 *     import { s } from '@fullcalendar/core/internal-common';
 * `s` is never used in either file — it is an accidental IDE auto-import. The real module is
 * shipped as ESM (`import * as preact from 'preact'`), and Jest does not transform node_modules,
 * so the moment any suite loads one of those two containers the run dies with
 *     SyntaxError: Cannot use import statement outside a module
 *
 * Individual suites had been working around this with
 *     jest.mock('@fullcalendar/core/internal-common', () => ({ s: {} }), { virtual: true });
 * That is unreliable: a virtual mock is keyed against the file that declares it, so when the
 * CONTAINER resolves the same specifier from its own directory Jest can still load the real
 * module. The result was an intermittent suite-level failure — roughly one full run in three,
 * always the same suite, with no individual test failing. Exactly the kind of thing that reads
 * as "the test suite is broken" when someone else runs it.
 *
 * Mapping the specifier here fixes it for every suite at once, present and future.
 *
 * THIS IS A TEST-ONLY SHIM, NOT A FIX. The real fix is one line in the application:
 * delete the dead import from both containers. Once that is done, this file and the
 * moduleNameMapper entry in package.json can both be removed. See finding FC-DEADIMPORT-1.
 */
module.exports = { s: {} };
