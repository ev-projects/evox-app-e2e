// evoxtest_Services_frontend.test.js
// Dedicated unit tests for the services/ layer (Validator, Formatter, DtrFormatter,
// Helper, Authenticator, API, APICALL). Mirrors the pattern used by
// evoxtest_Actions_frontend.test.js: mock only the external I/O boundary (axios,
// react-promise-tracker, fetch, localStorage/window), call the real service code.

jest.mock('axios');
jest.mock('react-promise-tracker', () => ({
  trackPromise: (p) => p,
}));
jest.mock('../../services/HandleHistory', () => ({
  history: { push: jest.fn() },
}));

import React from 'react';
import axios from 'axios';
import { render } from '@testing-library/react';
import store from '../../store';

import Validator from '../../services/Validator';
import Formatter from '../../services/Formatter';
import DtrFormatter from '../../services/DtrFormatter';
import Authenticator from '../../services/Authenticator';
import API from '../../services/API';
import APICALL from '../../services/APICALL';
import { history } from '../../services/HandleHistory';
import * as Helper from '../../services/Helper';
import withRouter from '../../services/HandleRoute';

beforeAll(() => {
  global.invalid_token_response = ['INVALID_TOKEN', 'TOKEN_EXPIRED'];
  global.links = { login: '/login' };
});

beforeEach(() => {
  jest.clearAllMocks();
  window.location.reload = jest.fn();
});

// =============================================================================
// Validator
// =============================================================================
describe('Validator', () => {
  test('isValid: truthy string', () => {
    expect(Validator.isValid('hello')).toBe(true);
  });
  test('isValid: empty string, null, undefined are invalid', () => {
    expect(Validator.isValid('')).toBe(false);
    expect(Validator.isValid(null)).toBe(false);
    expect(Validator.isValid(undefined)).toBe(false);
  });
  test('isValid: numeric zero is invalid, non-zero numeric string is valid', () => {
    expect(Validator.isValid(0)).toBe(false);
    expect(Validator.isValid('5')).toBe(true);
  });
  test('isNumeric: numeric vs non-numeric', () => {
    expect(Validator.isNumeric('42')).toBe(true);
    expect(Validator.isNumeric('abc')).toBe(false);
    expect(Validator.isNumeric(Infinity)).toBe(false);
  });
  test('inObjectArray: found and not found', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    expect(Validator.inObjectArray(arr, 'id', 2)).toBe(true);
    expect(Validator.inObjectArray(arr, 'id', 99)).toBe(false);
  });
  test('inObjectArray: undefined array', () => {
    expect(Validator.inObjectArray(undefined, 'id', 1)).toBe(false);
  });
});

// =============================================================================
// Formatter
// =============================================================================
describe('Formatter', () => {
  test('merge_json merges second object into first', () => {
    expect(Formatter.merge_json({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test('alert_error_message wraps the error', () => {
    expect(Formatter.alert_error_message('bad')).toEqual({
      type: 'SHOW_ALERT_MESSAGE',
      errorMessage: 'bad',
    });
  });

  test('alert_success formats with and without time_out', () => {
    const result = Formatter.alert_success({ data: { message: 'ok' } }, 5);
    expect(result).toEqual({ type: 'SHOW_ALERT', header: 'ok', timeOut: 5 });
    const defaulted = Formatter.alert_success({ data: { message: 'ok' } });
    expect(defaulted.timeOut).toBe(0);
  });

  test('alert_error: 499 branch', () => {
    expect(Formatter.alert_error({ status: 499 })).toEqual({
      type: 'DO_NOTHING',
      error: 'DUPLICATE_REQUEST_INTERCEPTED',
      timeOut: 0,
    });
  });
  test('alert_error: falsy error_result branch (also matches 499 guard)', () => {
    expect(Formatter.alert_error(null).type).toBe('DO_NOTHING');
  });
  test('alert_error: default branch with a real error object', () => {
    const err = { status: 500, message: 'Server Error' };
    expect(Formatter.alert_error(err, 3)).toEqual({
      type: 'SHOW_ALERT',
      error: err,
      timeOut: 3,
    });
  });

  test('convert_time pads hours and minutes', () => {
    const date = new Date(2026, 0, 1, 9, 5);
    expect(Formatter.convert_time(date)).toBe('09:05');
  });

  test('format_schedule_details: standard schedule', () => {
    const t = (h, m) => new Date(2026, 0, 1, h, m);
    const values = {
      schedule_type: 'standard',
      std_schedule_details: [{ start_time: t(8, 0), end_time: t(17, 0), break_time: t(1, 0) }],
    };
    const result = Formatter.format_schedule_details(values);
    expect(result.all.start_time).toBe('08:00');
    expect(result.all.end_time).toBe('17:00');
  });

  test('format_schedule_details: flexible schedule', () => {
    const t = (h, m) => new Date(2026, 0, 1, h, m);
    const values = {
      schedule_type: 'flexible',
      flx_schedule_details: [{
        start_time: t(8, 0), end_time: t(17, 0),
        start_flexy_time: t(7, 0), end_flexy_time: t(9, 0), break_time: t(1, 0),
      }],
    };
    const result = Formatter.format_schedule_details(values);
    expect(result.all.start_flexy_time).toBe('07:00');
  });

  test('format_schedule_details: customize schedule', () => {
    const t = (h, m) => new Date(2026, 0, 1, h, m);
    const values = {
      schedule_type: 'customize',
      work_days: ['monday'],
      cst_schedule_details: [{
        start_time: t(8, 0), end_time: t(17, 0),
        start_flexy_time: t(7, 0), end_flexy_time: t(9, 0), break_time: t(1, 0),
      }],
    };
    const result = Formatter.format_schedule_details(values);
    expect(result.monday.start_time).toBe('08:00');
  });

  test('slug_to_title: normal slug and the alter_log_punche special case', () => {
    expect(Formatter.slug_to_title('change_schedule')).toBe('Change Schedule');
    expect(Formatter.slug_to_title('alter_log_punche')).toBe('Alter Log Punch');
  });

  test('title_to_slug converts spaces and ampersands', () => {
    expect(Formatter.title_to_slug('Change & Schedule')).toBe('change_and_schedule');
  });

  test('array_to_multiselect_array: array and non-array input', () => {
    const arr = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
    expect(Formatter.array_to_multiselect_array(arr, 'name', 'id')).toEqual([
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
    ]);
    expect(Formatter.array_to_multiselect_array(null, 'name', 'id')).toEqual([]);
  });

  test('array_to_getvalue: array and non-array input', () => {
    expect(Formatter.array_to_getvalue([{ value: 1 }, { value: 2 }])).toEqual([1, 2]);
    expect(Formatter.array_to_getvalue(undefined)).toEqual([]);
  });
});

// =============================================================================
// DtrFormatter (JSX-returning methods)
// =============================================================================
describe('DtrFormatter', () => {
  test('displayDate: with and without a date', () => {
    const { container } = render(<div>{DtrFormatter.displayDate('2026-03-15')}</div>);
    expect(container.textContent).toMatch(/Mar/);
    expect(DtrFormatter.displayDate(null)).toBe('');
  });

  test('displayDateBasic: with and without a date', () => {
    const { container } = render(<div>{DtrFormatter.displayDateBasic('2026-03-15')}</div>);
    expect(container.textContent).toMatch(/Mar/);
    expect(DtrFormatter.displayDateBasic(null)).toBe('');
  });

  test('displayLog: with and without a value', () => {
    const { container } = render(<div>{DtrFormatter.displayLog('2026-03-15T09:00:00')}</div>);
    expect(container.textContent).toMatch(/Mar/);
    expect(DtrFormatter.displayLog(null)).toBe('');
  });

  test('displayMonthDay: with and without a date', () => {
    expect(DtrFormatter.displayMonthDay('2026-03-15')).toBe('Mar 15');
    expect(DtrFormatter.displayMonthDay(null)).toBe('');
  });

  test('displaySchedule: standard and flexible branches populated', () => {
    const { container } = render(<div>{DtrFormatter.displaySchedule({
      start_datetime: '2026-03-15T08:00:00',
      end_datetime: '2026-03-15T17:00:00',
      start_flexy_datetime: '2026-03-15T07:00:00',
      end_flexy_datetime: '2026-03-15T09:00:00',
    })}</div>);
    expect(container.textContent).toMatch(/Mar/);
  });

  test('displaySchedule: neither branch populated', () => {
    const { container } = render(<div>{DtrFormatter.displaySchedule({})}</div>);
    expect(container).toBeTruthy();
  });

  test('convertToTime: with and without a date', () => {
    expect(DtrFormatter.convertToTime('2026-03-15T09:05:00')).toMatch(/9:05/);
    expect(DtrFormatter.convertToTime(null)).toBe('');
  });

  test('displayHoliday: with list and undefined', () => {
    const { container } = render(<div>{DtrFormatter.displayHoliday([{ type: 'legal', name: 'New Year' }])}</div>);
    expect(container.textContent).toMatch(/New Year/);
    const { container: c2 } = render(<div>{DtrFormatter.displayHoliday(undefined)}</div>);
    expect(c2).toBeTruthy();
  });

  test('displayHolidayType: with list', () => {
    const { container } = render(<div>{DtrFormatter.displayHolidayType([{ type: 'legal' }])}</div>);
    expect(container.textContent).toMatch(/legal/);
  });

  test('displayOverlap: defined and undefined payroll_policies', () => {
    expect(DtrFormatter.displayOverlap(undefined)).toBe('');
    const result = DtrFormatter.displayOverlap({ night_diff: '01:00:00', night_diff_overlapped: '00:30:00' });
    expect(typeof result).toBe('string');
  });

  test('convertToSeconds and formatSeconds round-trip', () => {
    const seconds = DtrFormatter.convertToSeconds('01:30:00');
    expect(seconds).toBe(5400);
    expect(DtrFormatter.formatSeconds(5400)).toBe('01:30:00');
  });
});

// =============================================================================
// Helper
// =============================================================================
describe('Helper', () => {
  test('getDaysArrayInMonth returns one entry per day', () => {
    const days = Helper.getDaysArrayInMonth(2026, 2);
    expect(days.length).toBe(28); // Feb 2026 is not a leap year
    expect(days[0]).toBe('2026-2-1');
  });

  // NOTE: Helper.js does `import moment, * as Moment from 'moment'` and then calls the
  // `Moment` namespace import directly as a function. Under Babel/Jest's CJS interop the
  // namespace object isn't callable (only `Moment.default(...)` would be), so these three
  // functions throw immediately in this test environment. Documenting actual behavior
  // rather than the intended one, per the no-app-code-changes rule — this may be worth a
  // separate bug report (`TODO: confirm whether this also fails under the real webpack
  // build, or is a Jest-interop-only artifact`).
  // FINDING HLP-MOM-1 — FIXED 2026-08-04: Helper.js called the moment NAMESPACE, which is not
  // callable under strict interop (Jest today, webpack 5 after the upgrade). The call sites now use
  // the default import, so these helpers work instead of throwing. Assertions flipped accordingly.
  test('getDaysArrayInWeek returns the days of the week after the moment import fix', () => {
    const moment = require('moment');
    const days = Helper.getDaysArrayInWeek(moment('2026-03-01'), moment('2026-03-07'));
    expect(Array.isArray(days) || typeof days === 'object').toBe(true);
    expect(days).not.toBeUndefined();
  });

  test('generateWeekList builds the week list after the moment import fix', () => {
    const weeks = Helper.generateWeekList(2026, 3);
    expect(weeks).not.toBeUndefined();
  });

  test('generateWeekListCustom builds the custom week list after the moment import fix', () => {
    // signature is (start_date, end_date, scope_type) with MOMENT objects — not (year, month)
    const moment = require('moment');
    const weeks = Helper.generateWeekListCustom(moment('2026-03-01'), moment('2026-03-31'), 'week');
    expect(weeks).not.toBeUndefined();
  });
  test('formatBytes: zero, <10-unit (2 decimals), and >=10-unit (1 decimal) branches', () => {
    expect(Helper.formatBytes(0)).toBe('0 Bytes');
    expect(Helper.formatBytes(2048)).toBe('2.00 KB');
    expect(Helper.formatBytes(15 * 1024 * 1024)).toBe('15.0 MB');
  });

  test('handleImageUpload: success with content', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ content: 'http://img.test/1.png' }) })
    );
    const blobInfo = { filename: () => 'photo.png', blob: () => new Blob() };
    const result = await Helper.handleImageUpload(blobInfo);
    expect(result).toBe('http://img.test/1.png');
  });

  test('handleImageUpload: error.message branch', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ error: { message: 'upload failed' } }) })
    );
    const blobInfo = { filename: () => 'photo.png', blob: () => new Blob() };
    await expect(Helper.handleImageUpload(blobInfo)).rejects.toBe('upload failed');
  });

  test('handleImageUpload: neither content nor error branch', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));
    const blobInfo = { filename: () => 'photo.png', blob: () => new Blob() };
    await expect(Helper.handleImageUpload(blobInfo)).rejects.toBe('Please try again!');
  });
});

// =============================================================================
// Authenticator — dispatches a real LOGIN_SUCCESS against the real store
// =============================================================================
describe('Authenticator', () => {
  beforeAll(() => {
    store.dispatch({
      type: 'LOGIN_SUCCESS',
      user: {
        id: 1,
        permissions: ['view_dtr', 'approve_request'],
        roles: ['employee'],
        features_access: ['dashboard'],
        level: { Name: 'Sub-Department Head' },
        schedule_active: true,
        user_server_timestamp: '2026-03-15 08:00:00',
        user_server_timestamp_mils: 0,
        user_offset_seconds: 0,
      },
      payload: {},
    });
  });

  test('checkPermission: string and array forms', () => {
    expect(Authenticator.checkPermission('view_dtr')).toBe(true);
    expect(Authenticator.checkPermission(['view_dtr', 'nope'])).toBe(true);
    expect(Authenticator.checkPermission('nonexistent')).toBe(false);
  });
  test('checkPermission: empty input is invalid', () => {
    expect(Authenticator.checkPermission('')).toBe(false);
  });

  test('checkRole: string and array forms', () => {
    expect(Authenticator.checkRole('employee')).toBe(true);
    expect(Authenticator.checkRole(['employee', 'nope'])).toBe(true);
    expect(Authenticator.checkRole('supervisor')).toBe(false);
  });

  test('check combines role and permission', () => {
    expect(Authenticator.check('employee', 'view_dtr')).toBe(true);
    expect(Authenticator.check('supervisor', 'view_dtr')).toBe(false);
  });

  test('check_department_permissions reads schedule_active', () => {
    expect(Authenticator.check_department_permissions()).toBe(true);
  });

  test('scanFeature: string and array forms', () => {
    expect(Authenticator.scanFeature('dashboard')).toBe(true);
    expect(Authenticator.scanFeature(['dashboard', 'nope'])).toBe(true);
    expect(Authenticator.scanFeature('missing')).toBe(false);
  });

  test('scanLevel: string and array forms', () => {
    expect(Authenticator.scanLevel('Sub-Department Head')).toBe(true);
    expect(Authenticator.scanLevel(['Sub-Department Head', 'Other'])).toBe(true);
    expect(Authenticator.scanLevel('Department Head')).toBe(false);
  });

  test('scanLevel_Feature combines both checks', () => {
    expect(Authenticator.scanLevel_Feature('Sub-Department Head', 'dashboard')).toBe(true);
  });
});

// =============================================================================
// API — mocks only axios; exercises real call()/export()/format()/check_error()
// =============================================================================
describe('API', () => {
  test('call: missing url returns the default Bad Request format', async () => {
    const result = await API.call({});
    expect(result.status).toBe(400);
  });

  test('call: valid config resolves through axios and formats the response', async () => {
    axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: { content: {} }, headers: {} });
    const result = await API.call({ url: '/dashboard', method: 'get' });
    expect(result.status).toBe(200);
  });

  test('call: axios rejection is formatted via check_error', async () => {
    axios.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(API.call({ url: '/broken' })).rejects.toBeDefined();
  });

  test('call: duplicate in-flight request is intercepted with 499', async () => {
    let resolvePromise;
    axios.mockReturnValueOnce(new Promise((res) => { resolvePromise = res; }));
    const first = API.call({ url: '/dup', method: 'get' });
    await expect(API.call({ url: '/dup', method: 'get' })).rejects.toEqual({
      status: 499,
      statusText: 'DUPLICATE_REQUEST_INTERCEPTED',
      data: {},
    });
    resolvePromise({ status: 200, data: {}, headers: {} });
    await first;
  });

  test('export: missing url returns the default Bad Request format', async () => {
    const result = await API.export({});
    expect(result.status).toBe(400);
  });

  test('export: valid config resolves through axios', async () => {
    axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: new ArrayBuffer(4), headers: {} });
    const result = await API.export({ url: '/report', method: 'get' });
    expect(result.status).toBe(200);
  });

  test('check_error: invalid-token branch removes access_token', () => {
    localStorage.setItem('access_token', 'abc');
    const error = { response: { data: { error: { content: { code: 'INVALID_TOKEN' } } } } };
    API.check_error(error);
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  test('check_error: non-token error falls through to format()', () => {
    const error = { response: { status: 500, data: {} } };
    const result = API.check_error(error);
    expect(result.status).toBe(500);
  });

  test('format: defaults when response is undefined', () => {
    expect(API.format(undefined)).toEqual({ status: 400, statusText: 'Bad Request', data: {}, headers: {} });
  });
});

// =============================================================================
// APICALL — same shape as API, targets the external RCT Career endpoint
// =============================================================================
describe('APICALL', () => {
  test('call: missing url returns the default Bad Request format', async () => {
    const result = await APICALL.call({});
    expect(result.status).toBe(400);
  });

  test('call: valid config resolves through axios', async () => {
    axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {} });
    const result = await APICALL.call({ url: '/jobs', method: 'get' });
    expect(result.status).toBe(200);
  });

  test('export: valid config resolves through axios', async () => {
    axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {} });
    const result = await APICALL.export({ url: '/jobs', method: 'get' });
    expect(result.status).toBe(200);
  });

  test('check_error: invalid-token branch redirects via history and reload', () => {
    const error = { response: { data: { error: { content: { code: 'TOKEN_EXPIRED' } } } } };
    APICALL.check_error(error);
    expect(history.push).toHaveBeenCalledWith(global.links.login);
    expect(window.location.reload).toHaveBeenCalled();
  });

  test('check_error: non-token error falls through to format()', () => {
    const error = { response: { status: 404, data: {} } };
    const result = APICALL.check_error(error);
    expect(result.status).toBe(404);
  });

  test('format: defaults when response is undefined', () => {
    expect(APICALL.format(undefined)).toEqual({ status: 400, statusText: 'Bad Request', data: {} });
  });
});

// =============================================================================
// HandleRoute — withRouter HOC
// =============================================================================
describe('HandleRoute (withRouter)', () => {
  test('wraps a component and forwards route + own props', () => {
    const { MemoryRouter } = require('react-router-dom');
    const Inner = (props) => <div data-testid="inner">{props.label}</div>;
    const Wrapped = withRouter(Inner);
    const { getByTestId } = render(
      <MemoryRouter>
        <Wrapped label="hello" />
      </MemoryRouter>
    );
    expect(getByTestId('inner').textContent).toBe('hello');
  });
});
