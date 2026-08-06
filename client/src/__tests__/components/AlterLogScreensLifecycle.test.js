/**
 * AlterLogScreensLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. container/Request/AlterLog/AlterLog.js            Menu: Requests -> Alter Log
 *                                                        (also reached from My Team -> Requests -> Alter Log
 *                                                         when the record belongs to a supervisee = "approval" mode)
 *   2. container/Request/AlterLogPunch/AlterLogPunch.js  Menu: Requests -> Alter Log Punch
 *
 * 29-JUL-2026 COVERAGE BASELINE (fe-per-file-gaps-20260729.csv)
 *   AlterLog.js        87 statements / 24 covered / 63 uncovered  -> 27.6 %
 *   AlterLogPunch.js  115 statements / 35 covered / 80 uncovered  -> 30.4 %
 *   combined uncovered lines: 143
 *
 * These are the two "correction request" screens: an employee disputes what the biometric
 * recorded and asks for the log (AlterLog) or the whole punch list (AlterLogPunch) to be
 * altered.  Both are Formik screens with three render modes driven by the same expression:
 *      onApproval = instance.is_under_supervisee
 *      method     = onApproval ? 'approval' : (params.id ? 'update' : 'store')
 *
 * The suite walks each screen the way a user does:
 *   PHASE 1  MOUNT           componentWillMount clear + conditional fetch, componentDidUpdate re-fetch
 *   PHASE 2  RENDER GATES    store/update/approval arms, loading arm, per-status button sets
 *   PHASE 3  USER ACTIONS    date selection, add / remove punch rows, note typing
 *   PHASE 4  VALIDATION      Yup schema both arms (valid pair vs inverted pair, missing project)
 *   PHASE 5  SUBMIT          exact FormData payload + exact action-creator arguments for
 *                            store / update / approve / decline / cancel, and the refusal arms
 *
 * FINDINGS (characterised, NOT fixed - each test asserts what the code does TODAY)
 *   ALOG-OFFSET-1   AlterLog: when the logged-in user record has no `user_offset_seconds`,
 *                   the target date arithmetic yields NaN and the page title renders the
 *                   literal string "Alter Log - Invalid date".
 *   ALOG-RANGE-1    AlterLog: request-validity Result "1" whose date falls OUTSIDE the returned
 *                   StartDate..EndDate window falls through with confirmMessage = "" and
 *                   request_mode never set - the browser shows an EMPTY confirm dialog and,
 *                   if the user accepts, the request is posted with no request_mode at all.
 *   ALOG-NULL-1     AlterLog: checkRequestValidity returns null for any non-200 / empty-content
 *                   response, and the caller immediately dereferences `.Result` on it, so the
 *                   submit rejects with a TypeError instead of telling the user anything.
 *   ALP-USER-IGN-1  AlterLogPunch: showOriginalHandler(user, date) ignores its `user` argument
 *                   entirely and always fetches this.props.user.id, so an approver looking at a
 *                   supervisee's request would pull the APPROVER's own punches.
 *   ALP-UPD-NOOP-1  AlterLogPunch: method "update" is a silent no-op - the user is asked to
 *                   confirm, accepts, and nothing at all is dispatched (the update call is
 *                   commented out in the source).
 *   ALP-OLDPUNCH-1  AlterLogPunch: in approval/update mode the punch table is read from
 *                   instance.old_punch with no guard, so an instance without old_punch throws
 *                   during render.
 *   ALP-DESYNC-1    AlterLogPunch: addRecordHandler pushes the placeholder {count:"sample"} into
 *                   state.records, but minusRecordHandler overwrites state.records with the real
 *                   new_punch rows - so the same state key holds two different shapes depending
 *                   on which button was pressed last.
 *
 * ADDITIVE ONLY - no existing test file and no application source was modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

/* ------------------------------------------------------------------ *
 * Mocks - all declared before the components are require()'d          *
 * ------------------------------------------------------------------ */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const R = require('react');
    return {
        ContainerHeader:  ({ children }) => R.createElement('div', null, children),
        Content:          ({ children, title, subtitle }) =>
            R.createElement('div', null,
                R.createElement('h3', { 'data-testid': 'content-title' }, title),
                subtitle, children),
        ContainerWrapper: ({ children }) => R.createElement('div', null, children),
        ContainerBody:    ({ children }) => R.createElement('div', null, children),
        Row:              ({ children }) => R.createElement('div', null, children),
        Col:              ({ children }) => R.createElement('div', null, children),
    };
});

jest.mock('../../components/Template/Wrapper', () => {
    const R = require('react');
    return ({ children }) => R.createElement('div', null, children);
});

jest.mock('../../container/PageLoading', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'page-loading' });
});

// Formik-aware datepicker stubs: they keep the REAL wiring (setFieldValue on the exact
// field path the source asks for) but drop the react-datepicker calendar popup.
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    const { useFormikContext, ErrorMessage } = require('formik');

    const iso = (d) => {
        if (d === undefined || d === null || d === false) return '';
        const t = new Date(d);
        return isNaN(t.getTime()) ? '' : t.toISOString();
    };

    const Plain = (props) => {
        const form = useFormikContext();
        return R.createElement('span', null,
            R.createElement('input', {
                'data-testid': 'dt-' + props.name,
                'data-readonly': String(props.readOnly === undefined ? false : !!props.readOnly),
                'data-mindate': iso(props.minDate),
                'data-maxdate': iso(props.maxDate),
                'data-contrast': props.contrast_too === undefined ? '' : String(props.contrast_too),
                value: '',
                onChange: (e) => form.setFieldValue(props.name, new Date(e.target.value)),
            }),
            R.createElement(ErrorMessage, { name: props.name, component: 'div' }));
    };

    const Indexed = (props) => {
        const form = useFormikContext();
        const path = 'new_punch[' + props.indexid + '].' + props.name;
        return R.createElement('span', null,
            R.createElement('input', {
                'data-testid': 'dtx-' + props.indexid + '-' + props.name,
                'data-mindate': iso(props.minDate),
                'data-maxdate': iso(props.maxDate),
                value: '',
                onChange: (e) => form.setFieldValue(path, new Date(e.target.value)),
            }));
    };

    return { InputDate: Plain, InputTime: Plain, InputDateTime: Plain, InputDateTimeIndex: Indexed };
});

// AlterLogPunch imports react-datepicker directly for its own Date field.
jest.mock('react-datepicker', () => {
    const R = require('react');
    return ({ onChange, selected, readOnly, maxDate }) => {
        const iso = (d) => {
            if (d === undefined || d === null || d === false) return '';
            const t = new Date(d);
            return isNaN(t.getTime()) ? '' : t.toISOString();
        };
        return R.createElement('input', {
            'data-testid': 'punch-date',
            'data-selected': iso(selected),
            'data-readonly': String(!!readOnly),
            'data-maxdate': iso(maxDate),
            value: '',
            onChange: (e) => onChange(new Date(e.target.value)),
        });
    };
});

jest.mock('../../services/API', () => ({ call: jest.fn() }));

jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn((e, t) => ({ type: 'ALERT_ERROR', error: e, timeout: t })),
    alert_success: jest.fn(() => ({ type: 'ALERT_SUCCESS' })),
    merge_json: jest.fn((a, b) => Object.assign({}, a, b)),
}));

jest.mock('../../store/actions/requests/alterLogActions', () => ({
    fetchAlterLog: jest.fn(), addAlterLog: jest.fn(), updateAlterLog: jest.fn(),
    updateAlterLogStatus: jest.fn(), resetAlterLogInstance: jest.fn(), clearAlterLogInstance: jest.fn(),
}));
jest.mock('../../store/actions/requests/alterPunchLogActions', () => ({
    fetchAlterLogPunch: jest.fn(), addAlterLogPunch: jest.fn(), updateAlterLogPunch: jest.fn(),
    updateAlterLogPunchStatus: jest.fn(), resetAlterLogPunchInstance: jest.fn(),
    clearAlterLogPunchInstance: jest.fn(),
}));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getMyDtrNotifications: jest.fn(), getRecentPunches2: jest.fn(), clearRecentPunches2: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn(), clearRedirect: jest.fn(),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';

global.links = new Proxy({}, { get: () => '/x/' });

const AlterLog      = require('../../container/Request/AlterLog/AlterLog').default;
const AlterLogPunch = require('../../container/Request/AlterLogPunch/AlterLogPunch').default;

/* ------------------------------------------------------------------ *
 * Fixtures                                                            *
 * ------------------------------------------------------------------ */

const USER = { id: 77, name: 'Ana Cruz', user_offset_seconds: 0, pov_timezone: '08:00', user_server_date: '2026-07-31' };

const SETTINGS = { current_payroll_cutoff: { start_date: '2026-07-01', end_date: '2026-07-15' } };

const HISTORY = { goBack: jest.fn(), push: jest.fn() };

let dispatchSpy;

const alterLogProps = (over = {}) => ({
    params: {},
    location: {},
    instance: {},
    isInstanceLoaded: false,
    user: USER,
    settings: SETTINGS,
    constant: {},
    history: HISTORY,
    dispatch: dispatchSpy,
    fetchAlterLog: jest.fn(),
    addAlterLog: jest.fn(),
    updateAlterLog: jest.fn(),
    updateAlterLogStatus: jest.fn(),
    setRedirect: jest.fn(),
    resetAlterLogInstance: jest.fn(),
    clearAlterLogInstance: jest.fn(),
    getMyDtrNotifications: jest.fn(),
    ...over,
});

const punchProps = (over = {}) => ({
    params: {},
    location: {},
    instance: {},
    isInstanceLoaded: false,
    user: USER,
    settings: SETTINGS,
    constant: {},
    dtr: { single_punch_list: [], isSingleListPunchLoaded: true },
    history: HISTORY,
    dispatch: dispatchSpy,
    fetchAlterLogPunch: jest.fn(),
    addAlterLogPunch: jest.fn(),
    updateAlterLogPunch: jest.fn(),
    updateAlterLogPunchStatus: jest.fn(),
    getRecentPunches2: jest.fn(),
    clearRecentPunches2: jest.fn(),
    setRedirect: jest.fn(),
    resetAlterLogPunchInstance: jest.fn(),
    clearAlterLogPunchInstance: jest.fn(),
    getMyDtrNotifications: jest.fn(),
    ...over,
});

// Values object shaped exactly like AlterLog's Formik initialValues.
const alterLogValues = (over = {}) => ({
    action: null,
    method: 'store',
    id: null,
    date: new Date('2026-07-10T00:00:00'),
    user_id: '77',
    current_time_in: new Date('2026-07-10T09:00:00'),
    current_time_out: new Date('2026-07-10T18:00:00'),
    new_time_in: new Date('2026-07-10T08:30:00'),
    new_time_out: new Date('2026-07-10T17:30:00'),
    employee_note: 'biometric missed my out punch',
    approver_note: null,
    pov_current_time_in: null,
    pov_current_time_out: null,
    pov_new_time_in: null,
    pov_new_time_out: null,
    pov_timezone: null,
    ...over,
});

const punchValues = (over = {}) => ({
    action: null,
    method: 'store',
    id: null,
    date: new Date('2026-07-10T00:00:00'),
    employee_note: 'forgot to punch out',
    user_id: '77',
    approver_note: null,
    new_punch: [],
    ...over,
});

const validityOk = (over = {}) => ({
    status: 200,
    data: { content: { Result: '1', StartDate: '2026-07-01', EndDate: '2026-07-15', ...over } },
});

const renderAlterLog = (over = {}) => {
    const props = alterLogProps(over);
    const ref = React.createRef();
    const utils = render(<AlterLog {...props} ref={ref} />);
    return { ...utils, props, ref };
};

const renderPunch = (over = {}) => {
    const props = punchProps(over);
    const ref = React.createRef();
    const utils = render(<AlterLogPunch {...props} ref={ref} />);
    return { ...utils, props, ref };
};

const submitButton = (container, label) =>
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === label);

const buttonLabels = (container) =>
    Array.from(container.querySelectorAll('button')).map((b) => b.textContent.trim());

/* ------------------------------------------------------------------ */

let confirmSpy, alertSpy, logSpy;

beforeEach(() => {
    jest.clearAllMocks();
    dispatchSpy = jest.fn();
    confirmSpy = jest.fn(() => true);
    alertSpy = jest.fn();
    window.confirm = confirmSpy;
    window.alert = alertSpy;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    API.call.mockResolvedValue(validityOk());
});

afterEach(() => {
    logSpy.mockRestore();
});

/* ================================================================== *
 * PHASE 1 - AlterLog mount / update lifecycle                         *
 * ================================================================== */

describe('AlterLog | Requests -> Alter Log | mount and route-change lifecycle', () => {

    test('mounting without a route id clears the cached instance and does not fetch anything', () => {
        const { props } = renderAlterLog();
        expect(props.clearAlterLogInstance).toHaveBeenCalledTimes(1);
        expect(props.fetchAlterLog).not.toHaveBeenCalled();
    });

    test('mounting with a route id clears the cache first and then fetches that exact id', () => {
        const { props } = renderAlterLog({ params: { id: '412' } });
        expect(props.clearAlterLogInstance).toHaveBeenCalledTimes(1);
        expect(props.fetchAlterLog).toHaveBeenCalledTimes(1);
        expect(props.fetchAlterLog).toHaveBeenCalledWith('412');
    });

    test('navigating from one request id to another re-clears and re-fetches with the new id', () => {
        const props = alterLogProps({ params: { id: '412' } });
        const { rerender } = render(<AlterLog {...props} />);
        props.fetchAlterLog.mockClear();
        props.clearAlterLogInstance.mockClear();

        rerender(<AlterLog {...{ ...props, params: { id: '999' } }} />);

        expect(props.clearAlterLogInstance).toHaveBeenCalledTimes(1);
        expect(props.fetchAlterLog).toHaveBeenCalledWith('999');
    });

    test('re-rendering with the SAME route id does not fetch a second time', () => {
        const props = alterLogProps({ params: { id: '412' } });
        const { rerender } = render(<AlterLog {...props} />);
        props.fetchAlterLog.mockClear();

        rerender(<AlterLog {...props} />);

        expect(props.fetchAlterLog).not.toHaveBeenCalled();
    });

    test('leaving the detail route (id becomes undefined) clears the instance without fetching', () => {
        const props = alterLogProps({ params: { id: '412' } });
        const { rerender } = render(<AlterLog {...props} />);
        props.fetchAlterLog.mockClear();
        props.clearAlterLogInstance.mockClear();

        rerender(<AlterLog {...{ ...props, params: {} }} />);

        expect(props.clearAlterLogInstance).toHaveBeenCalledTimes(1);
        expect(props.fetchAlterLog).not.toHaveBeenCalled();
    });
});

/* ================================================================== *
 * PHASE 2 - AlterLog render gates                                     *
 * ================================================================== */

describe('AlterLog | render gates decide form vs loading screen', () => {

    test('a new request with no date carried in from the DTR row shows the loading screen, not the form', () => {
        const { getByTestId, queryByTestId } = renderAlterLog();
        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryByTestId('dt-new_time_in')).not.toBeInTheDocument();
    });

    test('a new request carrying a date from the DTR row renders the alter-log form', () => {
        const { getByTestId, getByText } = renderAlterLog({ location: { date: '2026-07-10' } });
        expect(getByTestId('dt-new_time_in')).toBeInTheDocument();
        expect(getByTestId('dt-new_time_out')).toBeInTheDocument();
        expect(getByText('Current Time-In:')).toBeInTheDocument();
        expect(getByTestId('content-title').textContent).toMatch(/^Alter Log - \w+ \d{1,2} \d{4}$/);
    });

    test('an existing request that has not finished loading shows the loading screen', () => {
        const { getByTestId, queryByTestId } = renderAlterLog({
            params: { id: '412' }, isInstanceLoaded: false,
        });
        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryByTestId('dt-new_time_in')).not.toBeInTheDocument();
    });

    test('a loaded existing request titles the page from the instance date, not the route date', () => {
        const { getByTestId } = renderAlterLog({
            params: { id: '412' }, isInstanceLoaded: true,
            instance: { id: 412, date: '2026-07-10', status: 'pending', user_id: 77 },
        });
        expect(getByTestId('content-title')).toHaveTextContent('Alter Log - July 10 2026');
    });

    test('the employee editing their own request sees the Note box and no approver fields', () => {
        const { container, queryByText } = renderAlterLog({ location: { date: '2026-07-10' } });
        expect(container.querySelector('textarea[name="employee_note"]')).toBeInTheDocument();
        expect(container.querySelector('textarea[name="approver_note"]')).not.toBeInTheDocument();
        expect(queryByText('Supervisor Perspective Timezone')).not.toBeInTheDocument();
    });

    test('an approver opening a supervisee request sees both timezone perspectives and the approver note box', () => {
        const { container, getByText } = renderAlterLog({
            params: { id: '412' }, isInstanceLoaded: true,
            instance: {
                id: 412, date: '2026-07-10', status: 'pending', user_id: 5,
                is_under_supervisee: true, pov_timezone: '05:30',
                user: { full_name: 'Ben Reyes', department: 'Ops' },
                employee_note: 'please fix',
            },
        });
        expect(getByText('Supervisor Perspective Timezone')).toBeInTheDocument();
        expect(getByText('Employee Perspective Timezone')).toBeInTheDocument();
        expect(container.querySelector('textarea[name="approver_note"]')).toBeInTheDocument();
        expect(container.querySelector('textarea[name="employee_note"]')).not.toBeInTheDocument();
        expect(getByText("Employee's Note:")).toBeInTheDocument();
    });

    test('approval mode renders the read-only employee-perspective punch fields', () => {
        const { getByTestId } = renderAlterLog({
            params: { id: '412' }, isInstanceLoaded: true,
            instance: { id: 412, date: '2026-07-10', status: 'pending', user_id: 5, is_under_supervisee: true },
        });
        expect(getByTestId('dt-pov_new_time_in')).toHaveAttribute('data-readonly', 'true');
        expect(getByTestId('dt-pov_new_time_out')).toHaveAttribute('data-readonly', 'true');
        expect(getByTestId('dt-current_time_in')).toHaveAttribute('data-readonly', 'true');
    });

    test('the editable New Time-Out may run one day past the log date while New Time-In may not', () => {
        const { getByTestId } = renderAlterLog({ location: { date: '2026-07-10' } });
        const inMax  = new Date(getByTestId('dt-new_time_in').getAttribute('data-maxdate')).getTime();
        const outMax = new Date(getByTestId('dt-new_time_out').getAttribute('data-maxdate')).getTime();
        expect(outMax - inMax).toBe(24 * 60 * 60 * 1000);
    });

    test('the editable time fields are wired to the timezone-contrast handler, the read-only ones are not', () => {
        const { getByTestId } = renderAlterLog({ location: { date: '2026-07-10' } });
        expect(getByTestId('dt-new_time_in')).toHaveAttribute('data-contrast', 'new_time_in');
        expect(getByTestId('dt-new_time_out')).toHaveAttribute('data-contrast', 'new_time_out');
        expect(getByTestId('dt-current_time_in')).toHaveAttribute('data-contrast', '');
    });

    // FINDING ALOG-OFFSET-1
    // render() does:  target_date.setSeconds(getSeconds() + user.user_offset_seconds + tzOffset)
    // If the logged-in user record has no user_offset_seconds the sum is NaN, setSeconds(NaN)
    // produces an Invalid Date, and moment() stringifies that as the literal "Invalid date"
    // straight into the page heading. The form still renders and is still submittable.
    test('a user record with no timezone offset renders the heading as a literal Invalid date _FINDING_ALOG-OFFSET-1', () => {
        const { getByTestId } = renderAlterLog({
            location: { date: '2026-07-10' },
            user: { id: 77, name: 'Ana Cruz' },
        });
        expect(getByTestId('content-title')).toHaveTextContent('Alter Log - Invalid date');
        expect(getByTestId('dt-new_time_in')).toBeInTheDocument();
    });
});

/* ================================================================== *
 * PHASE 2b - AlterLog per-status action buttons                       *
 * ================================================================== */

describe('AlterLog | which action buttons the request status unlocks', () => {

    const loaded = (status, extra = {}) => renderAlterLog({
        params: { id: '412' }, isInstanceLoaded: true,
        instance: { id: 412, date: '2026-07-10', status, user_id: 77, ...extra },
    });

    test('a brand new request offers only Submit', () => {
        const { container } = renderAlterLog({ location: { date: '2026-07-10' } });
        expect(buttonLabels(container)).toEqual(expect.arrayContaining(['Submit']));
        expect(buttonLabels(container)).not.toEqual(expect.arrayContaining(['Update']));
    });

    test('a pending request the employee owns offers Update and Cancel', () => {
        const { container } = loaded('pending');
        const labels = buttonLabels(container);
        expect(labels).toEqual(expect.arrayContaining(['Update', 'Cancel']));
        expect(labels).not.toEqual(expect.arrayContaining(['Update and Reopen']));
    });

    test('an already cancelled request offers Update but no second Cancel', () => {
        const { container } = loaded('canceled');
        const labels = buttonLabels(container);
        expect(labels).toEqual(expect.arrayContaining(['Update']));
        expect(labels).not.toEqual(expect.arrayContaining(['Cancel']));
    });

    test('an approved request can only be reopened, never cancelled from this screen', () => {
        const { container } = loaded('approved');
        const labels = buttonLabels(container);
        expect(labels).toEqual(expect.arrayContaining(['Update and Reopen']));
        expect(labels).not.toEqual(expect.arrayContaining(['Cancel']));
    });

    test('an approver looking at a pending request gets Approve and Decline', () => {
        const { container } = loaded('pending', { is_under_supervisee: true });
        const labels = buttonLabels(container);
        expect(labels).toEqual(expect.arrayContaining(['Approve', 'Decline']));
    });

    test('an approver looking at an already approved request gets Decline only', () => {
        const { container } = loaded('approved', { is_under_supervisee: true });
        const labels = buttonLabels(container);
        expect(labels).toEqual(expect.arrayContaining(['Decline']));
        expect(labels).not.toEqual(expect.arrayContaining(['Approve']));
    });

    test('an approver looking at a declined request gets Approve only', () => {
        const { container } = loaded('declined', { is_under_supervisee: true });
        const labels = buttonLabels(container);
        expect(labels).toEqual(expect.arrayContaining(['Approve']));
        expect(labels).not.toEqual(expect.arrayContaining(['Decline']));
    });

    test('an approver looking at a cancelled request gets no approval action at all', () => {
        const { container } = loaded('canceled', { is_under_supervisee: true });
        const labels = buttonLabels(container);
        expect(labels).not.toEqual(expect.arrayContaining(['Approve']));
        expect(labels).not.toEqual(expect.arrayContaining(['Decline']));
        expect(labels).toEqual(expect.arrayContaining(['Back']));
    });
});

/* ================================================================== *
 * PHASE 5 - AlterLog submit payload and action-creator arguments      *
 * ================================================================== */

describe('AlterLog | submitting a correction request', () => {

    test('a request inside the open payroll window is posted as a regular request with formatted dates', async () => {
        const { ref, props } = renderAlterLog();
        await act(async () => { await ref.current.onSubmitHandler(alterLogValues()); });

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/request/request-validity-check/',
            params: { date: '2026-07-10' },
        });
        expect(props.addAlterLog).toHaveBeenCalledTimes(1);

        const fd = props.addAlterLog.mock.calls[0][0];
        expect(fd.get('request_mode')).toBe('regular');
        expect(fd.get('date')).toBe('2026-07-10');
        expect(fd.get('new_time_in')).toBe('2026-07-10 08:30:00');
        expect(fd.get('new_time_out')).toBe('2026-07-10 17:30:00');
        expect(fd.get('current_time_in')).toBe('2026-07-10 09:00:00');
        expect(fd.get('method')).toBe('store');
        expect(fd.get('user_id')).toBe('77');
        expect(fd.get('employee_note')).toBe('biometric missed my out punch');
    });

    test('the DTR notification badge is refreshed for the submitting user after a store', async () => {
        const { ref, props } = renderAlterLog();
        await act(async () => { await ref.current.onSubmitHandler(alterLogValues()); });
        expect(props.getMyDtrNotifications).toHaveBeenCalledWith(77);
    });

    test('null fields are dropped from the payload instead of being posted as the string null', async () => {
        const { ref, props } = renderAlterLog();
        await act(async () => {
            await ref.current.onSubmitHandler(alterLogValues({ employee_note: null, approver_note: null }));
        });
        const fd = props.addAlterLog.mock.calls[0][0];
        expect(fd.has('employee_note')).toBe(false);
        expect(fd.has('approver_note')).toBe(false);
        expect(fd.has('action')).toBe(false);
        expect(fd.has('id')).toBe(false);
    });

    test('the confirm prompt for an in-window request asks about submit/update and nothing about disputes', async () => {
        const { ref } = renderAlterLog();
        await act(async () => { await ref.current.onSubmitHandler(alterLogValues()); });
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit/update this request?');
    });

    test('declining the confirm prompt cancels the whole submission', async () => {
        confirmSpy.mockReturnValue(false);
        const { ref, props } = renderAlterLog();
        await act(async () => { await ref.current.onSubmitHandler(alterLogValues()); });
        expect(props.addAlterLog).not.toHaveBeenCalled();
        expect(props.getMyDtrNotifications).not.toHaveBeenCalled();
    });

    test('while DTR generation is still running the request is refused with an alert and never posted', async () => {
        API.call.mockResolvedValue(validityOk({ Result: '0' }));
        const { ref, props } = renderAlterLog();
        await act(async () => { await ref.current.onSubmitHandler(alterLogValues()); });

        expect(alertSpy).toHaveBeenCalledWith(
            'Request not allowed at the moment. Please wait until DTR generation is complete.');
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(props.addAlterLog).not.toHaveBeenCalled();
    });

    test('a date past the payroll cut-off is posted as a dispute after an explicit dispute warning', async () => {
        API.call.mockResolvedValue(validityOk({ Result: '2' }));
        const { ref, props } = renderAlterLog();
        await act(async () => { await ref.current.onSubmitHandler(alterLogValues()); });

        expect(confirmSpy.mock.calls[0][0]).toContain('recorded as a dispute');
        expect(props.addAlterLog).toHaveBeenCalledTimes(1);
        expect(props.addAlterLog.mock.calls[0][0].get('request_mode')).toBe('dispute');
    });

    // FINDING ALOG-RANGE-1
    // Result "1" only sets request_mode when the date sits inside StartDate..EndDate.
    // Outside that window neither the "1" branch nor the "2" branch arms, so confirmMessage
    // stays "" - the user is shown a blank confirm box, and accepting it posts a request that
    // carries NO request_mode field at all for the backend to classify.
    test('an in-cutoff-result request dated outside the returned window prompts with a blank message and posts with no request_mode _FINDING_ALOG-RANGE-1', async () => {
        API.call.mockResolvedValue(validityOk({ Result: '1', StartDate: '2026-08-01', EndDate: '2026-08-15' }));
        const { ref, props } = renderAlterLog();
        await act(async () => { await ref.current.onSubmitHandler(alterLogValues()); });

        expect(confirmSpy).toHaveBeenCalledWith('');
        expect(props.addAlterLog).toHaveBeenCalledTimes(1);
        expect(props.addAlterLog.mock.calls[0][0].has('request_mode')).toBe(false);
    });

    test('editing an existing request calls update with the record id and a PUT method override', async () => {
        const { ref, props } = renderAlterLog({ params: { id: '412' } });
        await act(async () => {
            await ref.current.onSubmitHandler(alterLogValues({ method: 'update', id: 412 }));
        });

        expect(props.updateAlterLog).toHaveBeenCalledTimes(1);
        expect(props.updateAlterLog.mock.calls[0][0]).toBe(412);
        const fd = props.updateAlterLog.mock.calls[0][1];
        expect(fd.get('_method')).toBe('PUT');
        expect(fd.get('id')).toBe('412');
        expect(props.addAlterLog).not.toHaveBeenCalled();
    });

    test('an unrecognised submit method passes validity checking but dispatches nothing', async () => {
        const { ref, props } = renderAlterLog();
        await act(async () => {
            await ref.current.onSubmitHandler(alterLogValues({ method: 'delete' }));
        });
        expect(confirmSpy).toHaveBeenCalled();
        expect(props.addAlterLog).not.toHaveBeenCalled();
        expect(props.updateAlterLog).not.toHaveBeenCalled();
    });

    test('approving forwards the id, action, approver id and both payroll cut-off dates', async () => {
        const { ref, props } = renderAlterLog({ params: { id: '412' } });
        await act(async () => {
            await ref.current.onSubmitHandler(alterLogValues({ action: 'approve', method: 'approval', id: 412 }));
        });

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to approve this request?');
        expect(props.updateAlterLogStatus).toHaveBeenCalledTimes(1);
        const args = props.updateAlterLogStatus.mock.calls[0];
        expect(args[0]).toBe(412);
        expect(args[1].get('_method')).toBe('PUT');
        expect(args[2]).toBe('approve');
        expect(args[3]).toBe(77);
        expect(args[4]).toBe('2026-07-01');
        expect(args[5]).toBe('2026-07-15');
        expect(props.getMyDtrNotifications).toHaveBeenCalledWith(77);
        expect(API.call).not.toHaveBeenCalled();
    });

    test('declining reuses the same status endpoint with the decline action', async () => {
        const { ref, props } = renderAlterLog({ params: { id: '412' } });
        await act(async () => {
            await ref.current.onSubmitHandler(alterLogValues({ action: 'decline', method: 'approval', id: 412 }));
        });
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to decline this request?');
        expect(props.updateAlterLogStatus.mock.calls[0][2]).toBe('decline');
    });

    test('declining the cancel confirmation leaves the request untouched', async () => {
        confirmSpy.mockReturnValue(false);
        const { ref, props } = renderAlterLog({ params: { id: '412' } });
        await act(async () => {
            await ref.current.onSubmitHandler(alterLogValues({ action: 'cancel', method: 'update', id: 412 }));
        });
        expect(props.updateAlterLogStatus).not.toHaveBeenCalled();
        expect(props.getMyDtrNotifications).not.toHaveBeenCalled();
    });

    test('an action value outside the known set is silently ignored - no prompt, no call', async () => {
        const { ref, props } = renderAlterLog();
        await act(async () => {
            await ref.current.onSubmitHandler(alterLogValues({ action: 'bulk_action' }));
        });
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(API.call).not.toHaveBeenCalled();
        expect(props.addAlterLog).not.toHaveBeenCalled();
        expect(props.updateAlterLogStatus).not.toHaveBeenCalled();
    });

    // FINDING ALOG-NULL-1
    // checkRequestValidity returns null when the endpoint answers with anything other than
    // 200 + a content body. onSubmitHandler then reads requestValidity.Result on that null,
    // so the employee's submit dies with an unhandled TypeError and no user-facing message.
    test('a non-200 validity response makes submit die with a TypeError instead of warning the user _FINDING_ALOG-NULL-1', async () => {
        API.call.mockResolvedValue({ status: 500, data: {} });
        const { ref, props } = renderAlterLog();

        await expect(ref.current.onSubmitHandler(alterLogValues())).rejects.toThrow(TypeError);
        expect(alertSpy).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(props.addAlterLog).not.toHaveBeenCalled();
    });

    test('a thrown validity call raises the alert toast and aborts the submission', async () => {
        const boom = new Error('network down');
        API.call.mockRejectedValue(boom);
        const { ref, props } = renderAlterLog();

        await expect(ref.current.onSubmitHandler(alterLogValues())).rejects.toThrow('network down');
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom, 3000);
        expect(dispatchSpy).toHaveBeenCalledWith({ type: 'ALERT_ERROR', error: boom, timeout: 3000 });
        expect(props.addAlterLog).not.toHaveBeenCalled();
    });
});

/* ================================================================== *
 * PHASE 4 - AlterLog Yup validation, both arms                        *
 * ================================================================== */

describe('AlterLog | punch-pair validation on the form', () => {

    test('a New Time-In later than the New Time-Out is rejected and never reaches the API', async () => {
        const { container, getByTestId, findByText, props } = renderAlterLog({ location: { date: '2026-07-10' } });

        fireEvent.change(getByTestId('dt-new_time_in'),  { target: { value: '2026-07-10T18:00:00' } });
        fireEvent.change(getByTestId('dt-new_time_out'), { target: { value: '2026-07-10T09:00:00' } });

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(await findByText('Please select a valid Time-In.')).toBeInTheDocument();
        expect(props.addAlterLog).not.toHaveBeenCalled();
        expect(API.call).not.toHaveBeenCalled();
    });

    test('a correctly ordered punch pair passes validation and runs the payroll-window check', async () => {
        const { container, getByTestId, props } = renderAlterLog({ location: { date: '2026-07-10' } });

        fireEvent.change(getByTestId('dt-new_time_in'),  { target: { value: '2026-07-10T09:00:00' } });
        fireEvent.change(getByTestId('dt-new_time_out'), { target: { value: '2026-07-10T18:00:00' } });

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(API.call).toHaveBeenCalled();
        expect(props.addAlterLog).toHaveBeenCalled();
        expect(props.addAlterLog.mock.calls[0][0].get('new_time_in')).toBe('2026-07-10 09:00:00');
    });

    test('typing a note updates the value that will be submitted', async () => {
        const { container, getByTestId, props } = renderAlterLog({ location: { date: '2026-07-10' } });

        fireEvent.change(getByTestId('dt-new_time_in'),  { target: { value: '2026-07-10T09:00:00' } });
        fireEvent.change(getByTestId('dt-new_time_out'), { target: { value: '2026-07-10T18:00:00' } });
        fireEvent.change(container.querySelector('textarea[name="employee_note"]'),
            { target: { value: 'scanner was offline' } });

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(props.addAlterLog.mock.calls[0][0].get('employee_note')).toBe('scanner was offline');
    });
});

/* ================================================================== *
 * AlterLogPunch - PHASE 1 mount                                       *
 * ================================================================== */

describe('AlterLogPunch | Requests -> Alter Log Punch | mount lifecycle', () => {

    test('mounting clears both the cached punch list and the cached request instance', () => {
        const { props } = renderPunch();
        expect(props.clearRecentPunches2).toHaveBeenCalledTimes(1);
        expect(props.clearAlterLogPunchInstance).toHaveBeenCalledTimes(1);
        expect(props.fetchAlterLogPunch).not.toHaveBeenCalled();
    });

    test('mounting on an existing request fetches it and shows the loading screen until it lands', () => {
        const { props, getByTestId } = renderPunch({ params: { id: '88' } });
        expect(props.fetchAlterLogPunch).toHaveBeenCalledWith('88');
        expect(getByTestId('page-loading')).toBeInTheDocument();
    });

    test('the constructor starts with an empty date, empty notes and no punch rows', () => {
        const { ref } = renderPunch({ params: { id: '88' } });
        expect(ref.current.state).toEqual({
            date: '', employee_note: '', approver_note: '', records: [], new_punch: [],
        });
    });
});

/* ================================================================== *
 * AlterLogPunch - PHASE 3 row handlers                                *
 * ================================================================== */

describe('AlterLogPunch | adding and removing punch rows', () => {

    test('the plus button seeds a new row whose on-duty and off-duty both start at the chosen date', () => {
        const { ref } = renderPunch({ params: { id: '88' } });
        act(() => { ref.current.addRecordHandler(punchValues()); });

        expect(ref.current.state.records).toHaveLength(1);
        expect(ref.current.state.new_punch).toHaveLength(1);
        const row = ref.current.state.new_punch[0];
        expect(row.start_time.getTime()).toBe(new Date('2026-07-10T00:00:00').getTime());
        expect(row.end_time.getTime()).toBe(row.start_time.getTime());
    });

    test('the plus button also carries the current notes into component state', () => {
        const { ref } = renderPunch({ params: { id: '88' } });
        act(() => {
            ref.current.addRecordHandler(punchValues({ employee_note: 'note A', approver_note: 'note B' }));
        });
        expect(ref.current.state.employee_note).toBe('note A');
        expect(ref.current.state.approver_note).toBe('note B');
    });

    test('pressing plus twice produces two independent rows', () => {
        const { ref } = renderPunch({ params: { id: '88' } });
        act(() => { ref.current.addRecordHandler(punchValues()); });
        act(() => { ref.current.addRecordHandler(punchValues({ new_punch: ref.current.state.new_punch })); });
        expect(ref.current.state.new_punch).toHaveLength(2);
        expect(ref.current.state.records).toHaveLength(2);
    });

    test('the minus button drops the LAST row and keeps the earlier ones intact', () => {
        const { ref } = renderPunch({ params: { id: '88' } });
        const rows = [
            { start_time: new Date('2026-07-10T08:00:00'), end_time: new Date('2026-07-10T12:00:00'), project_name: 'EVOX' },
            { start_time: new Date('2026-07-10T13:00:00'), end_time: new Date('2026-07-10T17:00:00'), project_name: 'ODOO' },
            { start_time: new Date('2026-07-10T18:00:00'), end_time: new Date('2026-07-10T20:00:00'), project_name: 'LMS' },
        ];
        act(() => { ref.current.setState({ records: rows, new_punch: rows }); });
        act(() => { ref.current.minusRecordHandler(punchValues({ new_punch: rows })); });

        expect(ref.current.state.new_punch).toHaveLength(2);
        expect(ref.current.state.new_punch.map((r) => r.project_name)).toEqual(['EVOX', 'ODOO']);
    });

    test('the per-row X button removes exactly that row and closes the gap', () => {
        const { ref } = renderPunch({ params: { id: '88' } });
        const rows = [
            { start_time: new Date('2026-07-10T08:00:00'), end_time: new Date('2026-07-10T12:00:00'), project_name: 'EVOX' },
            { start_time: new Date('2026-07-10T13:00:00'), end_time: new Date('2026-07-10T17:00:00'), project_name: 'ODOO' },
            { start_time: new Date('2026-07-10T18:00:00'), end_time: new Date('2026-07-10T20:00:00'), project_name: 'LMS' },
        ];
        act(() => { ref.current.setState({ records: rows, new_punch: rows }); });
        act(() => { ref.current.minusSelectedHandler(punchValues({ new_punch: rows }), 1); });

        expect(ref.current.state.new_punch.map((r) => r.project_name)).toEqual(['EVOX', 'LMS']);
        expect(ref.current.state.records).toHaveLength(2);
    });

    test('removing a row index that does not exist leaves every row in place', () => {
        const { ref } = renderPunch({ params: { id: '88' } });
        const rows = [{ project_name: 'EVOX' }, { project_name: 'ODOO' }];
        act(() => { ref.current.setState({ records: rows, new_punch: rows }); });
        act(() => { ref.current.minusSelectedHandler(punchValues({ new_punch: rows }), 9); });
        expect(ref.current.state.new_punch.map((r) => r.project_name)).toEqual(['EVOX', 'ODOO']);
    });

    // FINDING ALP-DESYNC-1
    // addRecordHandler pushes the literal placeholder {count:"sample"} into state.records
    // (records is only ever used for .length and .map index), but minusRecordHandler /
    // minusSelectedHandler overwrite state.records with the REAL punch objects. So the same
    // state key holds two incompatible shapes depending on which button was pressed last.
    test('records holds placeholder objects after add but real punch objects after remove _FINDING_ALP-DESYNC-1', () => {
        const { ref } = renderPunch({ params: { id: '88' } });
        act(() => { ref.current.addRecordHandler(punchValues()); });
        act(() => { ref.current.addRecordHandler(punchValues({ new_punch: ref.current.state.new_punch })); });
        expect(ref.current.state.records).toEqual([{ count: 'sample' }, { count: 'sample' }]);

        act(() => { ref.current.minusRecordHandler(punchValues({ new_punch: ref.current.state.new_punch })); });
        expect(ref.current.state.records[0]).toHaveProperty('start_time');
        expect(ref.current.state.records[0]).not.toHaveProperty('count');
    });

    // FINDING ALP-USER-IGN-1
    // showOriginalHandler(user, date) declares a `user` parameter and never reads it -
    // getRecentPunches2 is always called with this.props.user.id. On the approval variant of
    // this screen that means the APPROVER's punches would be fetched, not the employee's.
    // The call site in render() already hard-codes the literal 1 as that ignored argument.
    test('picking a date fetches punches for the logged-in user and ignores the user argument _FINDING_ALP-USER-IGN-1', () => {
        const { ref, props } = renderPunch({ params: { id: '88' } });
        act(() => { ref.current.showOriginalHandler(4242, new Date('2026-07-10T00:00:00')); });

        expect(props.getRecentPunches2).toHaveBeenCalledWith(77, '2026-07-10', '2026-07-10');
        expect(ref.current.state.date).toBeInstanceOf(Date);
    });

    test('the same single day is used as both the from and the to bound of the punch query', () => {
        const { ref, props } = renderPunch({ params: { id: '88' } });
        act(() => { ref.current.showOriginalHandler(1, new Date('2026-02-28T23:30:00')); });
        const [, from, to] = props.getRecentPunches2.mock.calls[0];
        expect(from).toBe('2026-02-28');
        expect(to).toBe(from);
    });
});

/* ================================================================== *
 * AlterLogPunch - PHASE 2 incoming props -> state                     *
 * ================================================================== */

describe('AlterLogPunch | mapping incoming data into editable rows', () => {

    test('a loaded alter_log_punch request is copied into the editable rows as real Dates', () => {
        const props = punchProps({ params: { id: '88' } });
        const ref = React.createRef();
        const { rerender } = render(<AlterLogPunch {...props} ref={ref} />);

        const instance = {
            id: 88, request_type: 'alter_log_punch', status: 'pending', date: '2026-07-10',
            old_punch: [], user_id: 77,
            new_punch: [{
                start_time: '2026-07-10 08:00:00', end_time: '2026-07-10 12:00:00',
                project_name: 'EVOX', remarks: 'am shift',
            }],
        };
        rerender(<AlterLogPunch {...{ ...props, isInstanceLoaded: true, instance }} ref={ref} />);

        expect(ref.current.state.new_punch).toHaveLength(1);
        expect(ref.current.state.new_punch[0].start_time).toBeInstanceOf(Date);
        expect(ref.current.state.new_punch[0].project_name).toBe('EVOX');
        expect(ref.current.state.new_punch[0].remarks).toBe('am shift');
        expect(ref.current.state.records).toBe(instance.new_punch);
    });

    test('a loaded request of a different request type is ignored and leaves the rows empty', () => {
        const props = punchProps({ params: { id: '88' } });
        const ref = React.createRef();
        const { rerender } = render(<AlterLogPunch {...props} ref={ref} />);

        const instance = {
            id: 88, request_type: 'alter_log', status: 'pending', date: '2026-07-10',
            old_punch: [], new_punch: [{ start_time: '2026-07-10 08:00:00' }],
        };
        rerender(<AlterLogPunch {...{ ...props, isInstanceLoaded: true, instance }} ref={ref} />);

        expect(ref.current.state.new_punch).toEqual([]);
        expect(ref.current.state.records).toEqual([]);
    });

    test('recent punches arriving for a brand new request become pre-filled editable rows', () => {
        const props = punchProps();
        const ref = React.createRef();
        const { rerender } = render(<AlterLogPunch {...props} ref={ref} />);

        const dtr = {
            isSingleListPunchLoaded: true,
            single_punch_list: [{
                date: '2026-07-10', date_time_in: '2026-07-10 08:00:00', date_time_out: '2026-07-10 12:00:00',
                time_in: '08:00', time_out: '12:00', hours: '4.00',
                project_name: 'ODOO', remarks: 'morning', log_in_type: 'Log_in', log_out_type: 'Log_out',
            }],
        };
        rerender(<AlterLogPunch {...{ ...props, dtr }} ref={ref} />);

        expect(ref.current.state.new_punch).toHaveLength(1);
        expect(ref.current.state.new_punch[0].start_time.getTime())
            .toBe(new Date('2026-07-10 08:00:00').getTime());
        expect(ref.current.state.new_punch[0].project_name).toBe('ODOO');
        expect(ref.current.state.records).toBe(dtr.single_punch_list);
    });

    test('an empty recent-punch response wipes any rows that were already on screen', () => {
        const props = punchProps();
        const ref = React.createRef();
        const { rerender } = render(<AlterLogPunch {...props} ref={ref} />);
        act(() => { ref.current.setState({ records: [{ count: 'sample' }], new_punch: [{ project_name: 'X' }] }); });

        rerender(<AlterLogPunch {...{ ...props, dtr: { single_punch_list: [], isSingleListPunchLoaded: true } }} ref={ref} />);

        expect(ref.current.state.records).toEqual([]);
        expect(ref.current.state.new_punch).toEqual([]);
    });

    test('a not-yet-loaded but non-empty instance takes neither mapping branch', () => {
        const props = punchProps();
        const ref = React.createRef();
        const { rerender } = render(<AlterLogPunch {...props} ref={ref} />);
        act(() => { ref.current.setState({ records: [{ count: 'sample' }], new_punch: [{ project_name: 'KEEP' }] }); });

        rerender(<AlterLogPunch {...{
            ...props,
            instance: { id: 88, status: 'pending' },
            dtr: { single_punch_list: [], isSingleListPunchLoaded: true },
        }} ref={ref} />);

        expect(ref.current.state.new_punch).toEqual([{ project_name: 'KEEP' }]);
    });
});

/* ================================================================== *
 * AlterLogPunch - PHASE 2b render gates                               *
 * ================================================================== */

describe('AlterLogPunch | what the punch table and edit panel render', () => {

    test('a day with no punches shows the empty-state message instead of the table', () => {
        const { getByText, container } = renderPunch();
        expect(getByText(/^No\s+Punch logs on Date$/)).toBeInTheDocument();
        expect(container.querySelector('table')).not.toBeInTheDocument();
    });

    test('a day with punches renders one table row per punch with its times, hours and project', () => {
        const dtr = {
            isSingleListPunchLoaded: true,
            single_punch_list: [
                { date: '2026-07-10', time_in: '08:00', time_out: '12:00', hours: '4.00',
                  project_name: 'EVOX', log_in_type: 'Log_in', log_out_type: 'Log_out' },
                { date: '2026-07-10', time_in: '13:00', time_out: '17:00', hours: '4.00',
                  project_name: 'ODOO', log_in_type: 'Continue', log_out_type: 'Log_out' },
            ],
        };
        const { container, getByText } = renderPunch({ dtr });
        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(getByText('EVOX')).toBeInTheDocument();
        expect(getByText('ODOO')).toBeInTheDocument();
        expect(container.querySelectorAll('tbody tr')[0].textContent).toContain('08:00');
    });

    test('each punch pair is labelled Logout, Pause or Rest Day Work from its log types', () => {
        const dtr = {
            isSingleListPunchLoaded: true,
            single_punch_list: [
                { date: '2026-07-10', log_in_type: 'Log_in', log_out_type: 'Log_out' },
                { date: '2026-07-10', log_in_type: 'Log_in', log_out_type: 'Pause' },
                { date: '2026-07-10', log_in_type: 'rest_day_work', log_out_type: 'Continue' },
            ],
        };
        const { container } = renderPunch({ dtr });
        const rows = container.querySelectorAll('tbody tr');
        expect(rows[0].textContent).toContain('Logout');
        expect(rows[1].textContent).toContain('Pause');
        expect(rows[2].textContent).toContain('Rest Day Work');
    });

    test('with no date chosen the edit panel refuses to offer any row controls', () => {
        const props = punchProps();
        const ref = React.createRef();
        const { getByText, container } = render(<AlterLogPunch {...props} ref={ref} />);
        expect(getByText('No Date Selected')).toBeInTheDocument();
        expect(buttonLabels(container)).not.toEqual(expect.arrayContaining(['Submit']));
    });

    test('a date carried in from the DTR row opens the edit panel but keeps Submit hidden until a row exists', () => {
        const { queryByText, container } = renderPunch({ location: { date: '2026-07-10' } });
        expect(queryByText('No Date Selected')).not.toBeInTheDocument();
        expect(buttonLabels(container)).not.toEqual(expect.arrayContaining(['Submit']));
    });

    test('clicking plus renders an on-duty/off-duty pair, a project dropdown and reveals Submit', () => {
        const { container, getByText } = renderPunch({ location: { date: '2026-07-10' } });

        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });

        expect(getByText('On Duty 1:')).toBeInTheDocument();
        expect(container.querySelector('[name="new_punch.0.project_name"]')).toBeInTheDocument();
        expect(container.querySelector('[name="new_punch.0.remarks"]')).toBeInTheDocument();
        expect(buttonLabels(container)).toEqual(expect.arrayContaining(['Submit']));
    });

    test('the minus button is disabled while there are no rows and enabled once one exists', () => {
        const { container } = renderPunch({ location: { date: '2026-07-10' } });
        const [plus, minus] = Array.from(container.querySelectorAll('.btn-primary-2'));
        expect(minus).toBeDisabled();

        act(() => { fireEvent.click(plus); });

        const minusAfter = Array.from(container.querySelectorAll('.btn-primary-2'))[1];
        expect(minusAfter).not.toBeDisabled();
    });

    test('only the second and later rows may run past midnight into the next day', () => {
        const { container, getByTestId } = renderPunch({ location: { date: '2026-07-10' } });
        const plus = container.querySelector('.btn-primary-2');
        act(() => { fireEvent.click(plus); });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });

        const row0Start = new Date(getByTestId('dtx-0-start_time').getAttribute('data-maxdate')).getTime();
        const row1Start = new Date(getByTestId('dtx-1-start_time').getAttribute('data-maxdate')).getTime();
        const row0End   = new Date(getByTestId('dtx-0-end_time').getAttribute('data-maxdate')).getTime();

        expect(row1Start - row0Start).toBe(24 * 60 * 60 * 1000);
        expect(row0End - row0Start).toBe(24 * 60 * 60 * 1000);
    });

    test('an approver opening a loaded request sees the original punches read-only and gets approval buttons with zero editable rows', () => {
        const instance = {
            id: 88, request_type: 'alter_log_punch', status: 'pending', date: '2026-07-10',
            is_under_supervisee: true, user_id: 5, user: { full_name: 'Ben Reyes', department: 'Ops' },
            new_punch: [], old_punch: [{ date: '2026-07-10', time_in: '08:00', time_out: '12:00', hours: '4.00', project_name: 'EVOX' }],
        };
        const { container, getByTestId } = renderPunch({
            params: { id: '88' }, isInstanceLoaded: true, instance,
        });

        expect(getByTestId('punch-date')).toHaveAttribute('data-readonly', 'true');
        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(buttonLabels(container)).toEqual(expect.arrayContaining(['Approve', 'Decline']));
    });

    // FINDING ALP-OLDPUNCH-1
    // In approval/update mode the table source is switched to this.props.instance.old_punch
    // with no fallback, and .length is read straight away. A loaded request that carries no
    // old_punch key (an alter_log request opened on this route, or a trimmed API payload)
    // takes down the whole screen with a TypeError instead of showing an empty table.
    test('a loaded request with no old_punch collection crashes the screen during render _FINDING_ALP-OLDPUNCH-1', () => {
        const err = jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderPunch({
            params: { id: '88' }, isInstanceLoaded: true,
            instance: { id: 88, request_type: 'alter_log_punch', status: 'pending', date: '2026-07-10', new_punch: [] },
        })).toThrow(TypeError);
        err.mockRestore();
    });
});

/* ================================================================== *
 * AlterLogPunch - PHASE 5 submit                                      *
 * ================================================================== */

describe('AlterLogPunch | submitting a punch-list correction', () => {

    test('a stored request serialises every row into the new_punch JSON payload', async () => {
        const { ref, props } = renderPunch({ params: { id: '88' } });
        const values = punchValues({
            new_punch: [
                { start_time: new Date('2026-07-10T08:00:00'), end_time: new Date('2026-07-10T12:00:00'),
                  project_name: 'EVOX', remarks: 'am' },
                { start_time: new Date('2026-07-10T13:00:00'), end_time: new Date('2026-07-10T17:00:00'),
                  project_name: 'ODOO', remarks: 'pm' },
            ],
        });

        await act(async () => { await ref.current.onSubmitHandler(values); });

        expect(props.addAlterLogPunch).toHaveBeenCalledTimes(1);
        const fd = props.addAlterLogPunch.mock.calls[0][0];
        expect(fd.get('date')).toBe('2026-07-10');
        expect(fd.get('user_id')).toBe('77');
        expect(fd.get('employee_note')).toBe('forgot to punch out');
        expect(JSON.parse(fd.get('new_punch'))).toEqual([
            { start_time: '2026-07-10 08:00:00', end_time: '2026-07-10 12:00:00', project_name: 'EVOX', remarks: 'am' },
            { start_time: '2026-07-10 13:00:00', end_time: '2026-07-10 17:00:00', project_name: 'ODOO', remarks: 'pm' },
        ]);
    });

    test('submitting with no rows still posts an explicit empty new_punch array', async () => {
        const { ref, props } = renderPunch({ params: { id: '88' } });
        await act(async () => { await ref.current.onSubmitHandler(punchValues()); });
        expect(props.addAlterLogPunch.mock.calls[0][0].get('new_punch')).toBe('[]');
    });

    test('declining the confirm prompt posts nothing', async () => {
        confirmSpy.mockReturnValue(false);
        const { ref, props } = renderPunch({ params: { id: '88' } });
        await act(async () => { await ref.current.onSubmitHandler(punchValues()); });
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit/update this request?');
        expect(props.addAlterLogPunch).not.toHaveBeenCalled();
    });

    // FINDING ALP-UPD-NOOP-1
    // The "update" arm of the store/update switch has every line commented out in the source.
    // The employee is asked to confirm, accepts, and absolutely nothing happens: no update
    // call, no create call, no notification refresh, no error. The edit is silently lost.
    test('updating an existing punch request confirms and then dispatches nothing at all _FINDING_ALP-UPD-NOOP-1', async () => {
        const { ref, props } = renderPunch({ params: { id: '88' } });
        await act(async () => {
            await ref.current.onSubmitHandler(punchValues({ method: 'update', id: 88 }));
        });
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit/update this request?');
        expect(props.updateAlterLogPunch).not.toHaveBeenCalled();
        expect(props.addAlterLogPunch).not.toHaveBeenCalled();
        expect(props.getMyDtrNotifications).not.toHaveBeenCalled();
    });

    test('approving forwards the id, action, approver id and both payroll cut-off dates', async () => {
        const { ref, props } = renderPunch({ params: { id: '88' } });
        await act(async () => {
            await ref.current.onSubmitHandler(punchValues({ action: 'approve', method: 'approval', id: 88 }));
        });

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to approve this request?');
        const args = props.updateAlterLogPunchStatus.mock.calls[0];
        expect(args[0]).toBe(88);
        expect(args[1].get('_method')).toBe('PUT');
        expect(args[2]).toBe('approve');
        expect(args[3]).toBe(77);
        expect(args[4]).toBe('2026-07-01');
        expect(args[5]).toBe('2026-07-15');
        expect(props.getMyDtrNotifications).toHaveBeenCalledWith(77);
    });

    test('cancelling reuses the status endpoint with the cancel action', async () => {
        const { ref, props } = renderPunch({ params: { id: '88' } });
        await act(async () => {
            await ref.current.onSubmitHandler(punchValues({ action: 'cancel', method: 'update', id: 88 }));
        });
        expect(props.updateAlterLogPunchStatus.mock.calls[0][2]).toBe('cancel');
    });

    test('an unknown action neither prompts nor dispatches', async () => {
        const { ref, props } = renderPunch({ params: { id: '88' } });
        await act(async () => {
            await ref.current.onSubmitHandler(punchValues({ action: 'archive' }));
        });
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(props.addAlterLogPunch).not.toHaveBeenCalled();
        expect(props.updateAlterLogPunchStatus).not.toHaveBeenCalled();
    });
});

/* ================================================================== *
 * AlterLogPunch - PHASE 4 validation, both arms                       *
 * ================================================================== */

describe('AlterLogPunch | punch-row validation on the form', () => {

    const fillRow = (container, index, project, remarks) => {
        fireEvent.change(container.querySelector(`[name="new_punch.${index}.project_name"]`),
            { target: { value: project, name: `new_punch.${index}.project_name` } });
        fireEvent.change(container.querySelector(`[name="new_punch.${index}.remarks"]`),
            { target: { value: remarks, name: `new_punch.${index}.remarks` } });
    };

    test('a row with a project and remarks passes validation and is posted', async () => {
        const { container, props } = renderPunch({ location: { date: '2026-07-10' } });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });
        fillRow(container, 0, 'EVOX', 'scanner offline');

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(props.addAlterLogPunch).toHaveBeenCalled();
        const posted = JSON.parse(props.addAlterLogPunch.mock.calls[0][0].get('new_punch'));
        expect(posted).toHaveLength(1);
        expect(posted[0].project_name).toBe('EVOX');
        expect(posted[0].remarks).toBe('scanner offline');
    });

    test('a row left without a project name is rejected and never posted', async () => {
        const { container, props } = renderPunch({ location: { date: '2026-07-10' } });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });
        fillRow(container, 0, '', 'scanner offline');

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(props.addAlterLogPunch).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
    });

    test('a row left without remarks is rejected and never posted', async () => {
        const { container, props } = renderPunch({ location: { date: '2026-07-10' } });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });
        fillRow(container, 0, 'LMS', '');

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(props.addAlterLogPunch).not.toHaveBeenCalled();
    });

    test('a second row that starts before the first one ends is rejected as an overlap', async () => {
        const { container, getByTestId, props } = renderPunch({ location: { date: '2026-07-10' } });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });

        fireEvent.change(getByTestId('dtx-0-start_time'), { target: { value: '2026-07-10T08:00:00' } });
        fireEvent.change(getByTestId('dtx-0-end_time'),   { target: { value: '2026-07-10T17:00:00' } });
        fireEvent.change(getByTestId('dtx-1-start_time'), { target: { value: '2026-07-10T12:00:00' } });
        fireEvent.change(getByTestId('dtx-1-end_time'),   { target: { value: '2026-07-10T20:00:00' } });
        fillRow(container, 0, 'EVOX', 'am');
        fillRow(container, 1, 'ODOO', 'pm');

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(props.addAlterLogPunch).not.toHaveBeenCalled();
    });

    test('two rows that do not overlap are accepted and both are posted in order', async () => {
        const { container, getByTestId, props } = renderPunch({ location: { date: '2026-07-10' } });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });

        fireEvent.change(getByTestId('dtx-0-start_time'), { target: { value: '2026-07-10T08:00:00' } });
        fireEvent.change(getByTestId('dtx-0-end_time'),   { target: { value: '2026-07-10T12:00:00' } });
        fireEvent.change(getByTestId('dtx-1-start_time'), { target: { value: '2026-07-10T13:00:00' } });
        fireEvent.change(getByTestId('dtx-1-end_time'),   { target: { value: '2026-07-10T17:00:00' } });
        fillRow(container, 0, 'EVOX', 'am');
        fillRow(container, 1, 'ODOO', 'pm');

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(props.addAlterLogPunch).toHaveBeenCalled();
        const posted = JSON.parse(props.addAlterLogPunch.mock.calls[0][0].get('new_punch'));
        expect(posted.map((p) => p.start_time)).toEqual(['2026-07-10 08:00:00', '2026-07-10 13:00:00']);
    });

    test('a row whose off-duty falls before its on-duty is rejected', async () => {
        const { container, getByTestId, props } = renderPunch({ location: { date: '2026-07-10' } });
        act(() => { fireEvent.click(container.querySelector('.btn-primary-2')); });

        fireEvent.change(getByTestId('dtx-0-start_time'), { target: { value: '2026-07-10T18:00:00' } });
        fireEvent.change(getByTestId('dtx-0-end_time'),   { target: { value: '2026-07-10T09:00:00' } });
        fillRow(container, 0, 'EVOX', 'inverted');

        await act(async () => { fireEvent.click(submitButton(container, 'Submit')); });

        expect(props.addAlterLogPunch).not.toHaveBeenCalled();
    });
});
