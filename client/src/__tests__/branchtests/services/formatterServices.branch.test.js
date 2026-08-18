/**
 * EVOX — Jest: formatting and role services
 *
 * Sources under test:
 *   src/services/Formatter.js
 *   src/services/Authenticator.js
 *   src/services/DateFormatter.js
 *   src/services/DtrFormatter.js
 *   src/services/Helper.js
 *
 * Menu path: global — Formatter shapes every alert in the app, Authenticator gates every
 *            role/feature-guarded menu item, and the DTR formatters render the punch tables.
 *
 * Coverage before this file: Formatter 1 uncovered branch arm, Authenticator 3,
 *   DateFormatter 2, DtrFormatter 2, Helper 1 uncovered function + 2 branch arms.
 *
 * Rules asserted here (both arms of every conditional):
 *   - alert_error turns a duplicate-request rejection into a silent DO_NOTHING, a 401 into the
 *     re-login modal, and anything else into a visible banner.
 *   - Authenticator answers false for an empty/absent role, permission, feature or level, and
 *     accepts either a single value or a list of acceptable values.
 *   - DateFormatter defaults to today's date and to midnight when either half is missing.
 *   - DtrFormatter's night-differential total is empty for a missing policy set.
 *
 * FINDINGS FMT-DEAD-401-1 and HLP-GETCURRENTDATE-1 are characterized at the bottom.
 */

jest.mock('../../../store', () => ({
    __esModule: true,
    default: { getState: jest.fn(() => ({})) },
}));

import Formatter from '../../../services/Formatter';
import Authenticator from '../../../services/Authenticator';
import DateFormatter from '../../../services/DateFormatter';
import DtrFormatter from '../../../services/DtrFormatter';
import store from '../../../store';
import {
    getDaysArrayInMonth,
    generateWeekList,
    formatBytes,
    getcurrentdate,
} from '../../../services/Helper';

const asUser = (user) => store.getState.mockImplementation(() => ({ user }));

describe('Formatter — alert shaping', () => {
    test('a duplicate request rejection is swallowed instead of shown', () => {
        expect(Formatter.alert_error({ status: 499, statusText: 'DUPLICATE_REQUEST_INTERCEPTED' })).toEqual({
            type: 'DO_NOTHING',
            error: 'DUPLICATE_REQUEST_INTERCEPTED',
            timeOut: 0,
        });
    });

    test('an expired session opens the re-login modal instead of a banner', () => {
        expect(Formatter.alert_error({ status: 401, statusText: 'Unauthorized' })).toEqual({
            type: 'SHOW_MODAL_LOGIN',
        });
    });

    test('any other failure becomes a banner carrying the response and the requested timeout', () => {
        const error = { status: 422, statusText: 'Unprocessable' };

        expect(Formatter.alert_error(error, 3000)).toEqual({
            type: 'SHOW_ALERT',
            error,
            timeOut: 3000,
        });
    });

    test('a success alert carries the server message and defaults to no auto-hide', () => {
        expect(Formatter.alert_success({ data: { message: 'Saved' } })).toEqual({
            type: 'SHOW_ALERT',
            header: 'Saved',
            timeOut: 0,
        });
        expect(Formatter.alert_success({ data: { message: 'Saved' } }, 3000).timeOut).toBe(3000);
    });

    test('a plain message alert is shaped for the message-only reducer arm', () => {
        expect(Formatter.alert_error_message('No User Found...')).toEqual({
            type: 'SHOW_ALERT_MESSAGE',
            errorMessage: 'No User Found...',
        });
    });
});

describe('Formatter — conversions', () => {
    test('merge_json copies the second object over the first and returns the first', () => {
        const first = { a: 1, b: 2 };

        const merged = Formatter.merge_json(first, { b: 3, c: 4 });

        expect(merged).toBe(first);
        expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    });

    test('merge_json with nothing to merge leaves the first object alone', () => {
        expect(Formatter.merge_json({ a: 1 }, undefined)).toEqual({ a: 1 });
    });

    test('convert_time renders a Date as zero-padded HH:mm', () => {
        expect(Formatter.convert_time(new Date(2026, 7, 18, 9, 5))).toBe('09:05');
        expect(Formatter.convert_time(new Date(2026, 7, 18, 21, 45))).toBe('21:45');
    });

    test('a standard schedule is formatted as a single "all days" entry', () => {
        const values = {
            schedule_type: 'standard',
            std_schedule_details: [{
                start_time: new Date(2026, 7, 18, 9, 0),
                end_time: new Date(2026, 7, 18, 18, 0),
                break_time: new Date(2026, 7, 18, 1, 0),
            }],
        };

        expect(Formatter.format_schedule_details(values)).toEqual({
            all: { start_time: '09:00', end_time: '18:00', break_time: '01:00' },
        });
    });

    test('a flexible schedule adds the flexy window to the "all days" entry', () => {
        const values = {
            schedule_type: 'flexible',
            flx_schedule_details: [{
                start_time: new Date(2026, 7, 18, 9, 0),
                end_time: new Date(2026, 7, 18, 18, 0),
                start_flexy_time: new Date(2026, 7, 18, 8, 0),
                end_flexy_time: new Date(2026, 7, 18, 10, 0),
                break_time: new Date(2026, 7, 18, 1, 0),
            }],
        };

        expect(Formatter.format_schedule_details(values)).toEqual({
            all: {
                start_time: '09:00',
                end_time: '18:00',
                start_flexy_time: '08:00',
                end_flexy_time: '10:00',
                break_time: '01:00',
            },
        });
    });

    test('a customised schedule is keyed by each working day', () => {
        const detail = (hour) => ({
            start_time: new Date(2026, 7, 18, hour, 0),
            end_time: new Date(2026, 7, 18, hour + 8, 0),
            start_flexy_time: new Date(2026, 7, 18, hour - 1, 0),
            end_flexy_time: new Date(2026, 7, 18, hour + 1, 0),
            break_time: new Date(2026, 7, 18, 1, 0),
        });

        const result = Formatter.format_schedule_details({
            schedule_type: 'customize',
            work_days: ['monday', 'tuesday'],
            cst_schedule_details: [detail(9), detail(10)],
        });

        expect(Object.keys(result)).toEqual(['monday', 'tuesday']);
        expect(result.monday.start_time).toBe('09:00');
        expect(result.tuesday.start_time).toBe('10:00');
    });

    test('the punch request slug is spelled out, with its known typo corrected', () => {
        expect(Formatter.slug_to_title('alter_log_punche')).toBe('Alter Log Punch');
        expect(Formatter.slug_to_title('rest_day_work')).toBe('Rest Day Work');
        expect(Formatter.title_to_slug('Rest Day & Work')).toBe('rest_day_and_work');
    });

    test('a list of records becomes multiselect options, and a non-list becomes an empty list', () => {
        const options = Formatter.array_to_multiselect_array(
            [{ id: 1, name: 'Finance' }, { id: 2, name: 'Operations' }],
            'name',
            'id',
        );

        expect(options).toEqual([
            { label: 'Finance', value: 1 },
            { label: 'Operations', value: 2 },
        ]);
        expect(Formatter.array_to_multiselect_array(null, 'name', 'id')).toEqual([]);
        expect(Formatter.array_to_multiselect_array({ id: 1 }, 'name', 'id')).toEqual([]);
    });

    test('selected multiselect options are reduced to their values, and a non-list to nothing', () => {
        expect(Formatter.array_to_getvalue([{ label: 'Finance', value: 1 }, { label: 'Ops', value: 2 }]))
            .toEqual([1, 2]);
        expect(Formatter.array_to_getvalue(undefined)).toEqual([]);
    });
});

describe('Authenticator — role, permission, feature and level gates', () => {
    beforeEach(() => {
        store.getState.mockReset();
        store.getState.mockImplementation(() => ({}));
    });

    test('a permission held by the user is granted and one they lack is refused', () => {
        asUser({ permissions: ['dtr.view', 'request.approve'] });

        expect(Authenticator.checkPermission('dtr.view')).toBe(true);
        expect(Authenticator.checkPermission('dtr.delete')).toBe(false);
    });

    test('a list of permissions is granted when the user holds any one of them', () => {
        asUser({ permissions: ['request.approve'] });

        expect(Authenticator.checkPermission(['dtr.delete', 'request.approve'])).toBe(true);
        expect(Authenticator.checkPermission(['dtr.delete', 'dtr.purge'])).toBe(false);
    });

    test('an empty, null or undefined permission is always refused', () => {
        asUser({ permissions: ['dtr.view'] });

        expect(Authenticator.checkPermission('')).toBe(false);
        expect(Authenticator.checkPermission(null)).toBe(false);
        expect(Authenticator.checkPermission(undefined)).toBe(false);
    });

    test('a permission check for a user with no permission list answers undefined, not a crash', () => {
        asUser({});

        expect(Authenticator.checkPermission('dtr.view')).toBeUndefined();
    });

    test('a role held by the user is granted and one they lack is refused', () => {
        asUser({ roles: ['supervisor'] });

        expect(Authenticator.checkRole('supervisor')).toBe(true);
        expect(Authenticator.checkRole('admin')).toBe(false);
        expect(Authenticator.checkRole(['admin', 'supervisor'])).toBe(true);
        expect(Authenticator.checkRole(['admin', 'hr'])).toBe(false);
        expect(Authenticator.checkRole('')).toBe(false);
        expect(Authenticator.checkRole(null)).toBe(false);
    });

    test('the combined check needs both the role and the permission', () => {
        asUser({ roles: ['supervisor'], permissions: ['request.approve'] });

        expect(Authenticator.check('supervisor', 'request.approve')).toBe(true);
        expect(Authenticator.check('supervisor', 'request.delete')).toBe(false);
        expect(Authenticator.check('admin', 'request.approve')).toBe(false);
    });

    test('the department schedule gate follows the schedule_active flag exactly', () => {
        asUser({ schedule_active: true });
        expect(Authenticator.check_department_permissions()).toBe(true);

        asUser({ schedule_active: false });
        expect(Authenticator.check_department_permissions()).toBe(false);

        asUser({});
        expect(Authenticator.check_department_permissions()).toBe(false);
    });

    test('a feature the user has access to is granted, one they lack is refused', () => {
        asUser({ features_access: ['dtr', 'reports'] });

        expect(Authenticator.scanFeature('dtr')).toBe(true);
        expect(Authenticator.scanFeature('payroll')).toBe(false);
        expect(Authenticator.scanFeature(['payroll', 'reports'])).toBe(true);
        expect(Authenticator.scanFeature(['payroll', 'admin'])).toBe(false);
        expect(Authenticator.scanFeature('')).toBe(false);
        expect(Authenticator.scanFeature(null)).toBe(false);
    });

    test('a level gate accepts a single level name or a list of acceptable names', () => {
        asUser({ level: { Name: 'Supervisor' } });

        expect(Authenticator.scanLevel('Supervisor')).toBe(true);
        expect(Authenticator.scanLevel('Manager')).toBe(false);
        expect(Authenticator.scanLevel(['Manager', 'Supervisor'])).toBe(true);
        expect(Authenticator.scanLevel(['Manager', 'Admin'])).toBe(false);
    });

    test('a user with no level at all is refused every level gate', () => {
        asUser({ level: { Name: '' } });
        expect(Authenticator.scanLevel('Supervisor')).toBe(false);

        asUser({ level: {} });
        expect(Authenticator.scanLevel('Supervisor')).toBe(false);

        asUser({});
        expect(Authenticator.scanLevel('Supervisor')).toBe(false);
    });

    test('an empty level argument is refused whatever the user holds', () => {
        asUser({ level: { Name: 'Supervisor' } });

        expect(Authenticator.scanLevel('')).toBe(false);
        expect(Authenticator.scanLevel(null)).toBe(false);
        expect(Authenticator.scanLevel(undefined)).toBe(false);
    });

    test('the combined level-and-feature gate needs both to pass', () => {
        asUser({ level: { Name: 'Supervisor' }, features_access: ['dtr'] });

        expect(Authenticator.scanLevel_Feature('Supervisor', 'dtr')).toBe(true);
        expect(Authenticator.scanLevel_Feature('Supervisor', 'payroll')).toBe(false);
        expect(Authenticator.scanLevel_Feature('Manager', 'dtr')).toBe(false);
    });
});

describe('DateFormatter', () => {
    test('a date and time given together are combined into one instant', () => {
        const result = DateFormatter.get_specific_datetime('2026-08-18', '14:30:15');

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(7);
        expect(result.getDate()).toBe(18);
        expect(result.getHours()).toBe(14);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(15);
    });

    test('a date with no time is taken at midnight', () => {
        const result = DateFormatter.get_specific_datetime('2026-08-18', null);

        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
    });

    test('no date at all falls back to today at the requested time', () => {
        const today = new Date();

        const result = DateFormatter.get_specific_datetime(null, '08:15:00');

        expect(result.getFullYear()).toBe(today.getFullYear());
        expect(result.getMonth()).toBe(today.getMonth());
        expect(result.getHours()).toBe(8);
        expect(result.getMinutes()).toBe(15);
    });

    test('adding days moves the given datetime forwards and backwards', () => {
        expect(DateFormatter.add_day_to_datetime('2026-08-18T00:00:00', 3).getDate()).toBe(21);
        expect(DateFormatter.add_day_to_datetime('2026-08-18T00:00:00', -1).getDate()).toBe(17);
    });

    test('adding days with no datetime starts from today', () => {
        const expected = new Date();
        expected.setDate(expected.getDate() + 1);

        const result = DateFormatter.add_day_to_datetime(null, 1);

        expect(result.getDate()).toBe(expected.getDate());
        expect(result.getMonth()).toBe(expected.getMonth());
    });
});

describe('DtrFormatter', () => {
    test('a punch time is rendered as H:mm:ss and a missing punch as an empty string', () => {
        expect(DtrFormatter.convertToTime('2026-08-18T09:05:07')).toBe('9:05:07');
        expect(DtrFormatter.convertToTime(null)).toBe('');
    });

    test('a duration in H:i:s converts to seconds and back', () => {
        expect(DtrFormatter.convertToSeconds('01:30:15')).toBe(5415);
        expect(DtrFormatter.formatSeconds(5415)).toBe('01:30:15');
        expect(DtrFormatter.formatSeconds(0)).toBe('00:00:00');
    });

    test('the night differential total adds the regular and the overlapped hours', () => {
        expect(DtrFormatter.displayOverlap({
            night_diff: '01:00:00',
            night_diff_overlapped: '00:30:00',
        })).toBe('01:30:00');
    });

    test('a policy set with no night differential at all yields an empty total', () => {
        expect(DtrFormatter.displayOverlap(undefined)).toBe('');
    });

    test('a policy set without the night differential field totals nothing', () => {
        expect(DtrFormatter.displayOverlap({ regular: '08:00:00' })).toBe('00:00:00');
    });
});

describe('Helper', () => {
    test('the days of a month are listed from the first to the last', () => {
        const days = getDaysArrayInMonth(2026, 2);

        expect(days).toHaveLength(28);
        expect(days[0]).toBe('2026-2-1');
        expect(days[27]).toBe('2026-2-28');
    });

    test('a leap February is listed with its extra day', () => {
        expect(getDaysArrayInMonth(2024, 2)).toHaveLength(29);
    });

    test('the week list of a month pairs the first and last working day of each week', () => {
        const { week_list, dates_list } = generateWeekList(2026, 2);

        expect(week_list.length).toBeGreaterThan(3);
        week_list.forEach((week) => expect(week).toHaveLength(2));
        dates_list.forEach((dates) => {
            dates.forEach((date) => expect(date.format('YYYY-MM')).toBe('2026-02'));
        });
    });

    test('the week list called with no year or month still describes one whole month', () => {
        const { week_list, dates_list } = generateWeekList();

        expect(week_list.length).toBeGreaterThan(3);
        week_list.forEach((week) => expect(week).toHaveLength(2));
        const months = new Set();
        dates_list.forEach((dates) => dates.forEach((date) => months.add(date.format('YYYY-MM'))));
        expect(months.size).toBe(1);
    });

    test('file sizes below ten units keep two decimals and larger ones keep one', () => {
        expect(formatBytes(0)).toBe('0 Bytes');
        expect(formatBytes(512)).toBe('512.0 Bytes');
        expect(formatBytes(2048)).toBe('2.00 KB');
        expect(formatBytes(1024)).toBe('1.00 KB');
        expect(formatBytes(1024 * 1024 * 15)).toBe('15.0 MB');
    });
});

/**
 * FINDING FMT-DEAD-401-1 — the 401 arm of Formatter.alert_error can never be reached with a
 * missing error object.
 *
 * src/services/Formatter.js line 48 returns early for `!error_result`, so the identical
 * `!error_result ||` test on line 55 is dead: a call with no argument at all is always
 * reported as an intercepted duplicate request rather than as an expired session. Only an
 * object that actually carries `status: 401` reaches the re-login modal (asserted above).
 * This is control flow, not a test-environment artefact.
 *
 * The practical consequence: a caller that loses its error object (the manual axios thunks
 * pass `e.response`, which is undefined on a network failure) silently swallows the failure
 * as DO_NOTHING instead of prompting the user to sign in again.
 */
test('_FINDING_FMT_DEAD_401_1 an alert_error called with no error is reported as a duplicate request, never as a 401', () => {
    expect(Formatter.alert_error()).toEqual({
        type: 'DO_NOTHING',
        error: 'DUPLICATE_REQUEST_INTERCEPTED',
        timeOut: 0,
    });
    expect(Formatter.alert_error(undefined)).not.toEqual({ type: 'SHOW_MODAL_LOGIN' });
});

/**
 * FINDING HLP-GETCURRENTDATE-1 — Helper.getcurrentdate() throws whenever it is called.
 *
 * src/services/Helper.js line 145 calls `moment.format("YYYY-MM-DD")` on the moment FACTORY
 * rather than on a moment instance (`moment().format(...)`). The factory has no `format`
 * method, so the call raises a TypeError in any environment, browser included.
 *
 * It is currently harmless only because nothing invokes it: src/container/Dashboard/Dashboard.js
 * imports `getcurrentdate` (line 43) but never calls it, and a repo-wide search finds no other
 * caller. The moment anyone wires that import to a click handler the Dashboard will crash.
 *
 * When the call is corrected to `moment().format(...)`, this test fails — that is the signal to
 * assert the returned Y-m-d string instead.
 */
test('_FINDING_HLP_GETCURRENTDATE_1 getcurrentdate throws instead of returning today', () => {
    expect(() => getcurrentdate()).toThrow(TypeError);
});
