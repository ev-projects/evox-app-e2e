/**
 * UserReducerAndNavigatorLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/store/reducers/user/userReducers.js                                  (56.25% stmt / 66.67% br / 20% fn)
 *   src/components/Template/ReportNavigatorShort/ReportNavigatorShort.js     (75.41% stmt / 76% br / 100% fn)
 *
 * MENU PATH
 *   ReportNavigatorShort  ->  Reports -> Team Attendance Summary   (default_view_type="day")
 *                             Reports -> HR Team Attendance Summary (default_view_type="custom")
 *   userReducers          ->  every page (root store slice `user`); written by Login, Logout,
 *                             Admin -> Assign Role / Assign Level & Features, and My Profile asset/EVA/COC tabs.
 *
 * FINDINGS CHARACTERIZED BY A TEST (tests suffixed _FINDING_<CODE>; app source untouched)
 *   FINDING_UR1  userReducers.js:13,84-92 — when UPDATE_USER targets somebody other than the logged-in
 *                user the guard fails, `break` falls out to `return result`, and `result` was pre-seeded
 *                with `{...state}` at line 13. A no-op action therefore returns a NEW object reference,
 *                while a genuinely unknown action (the `default` arm at line 231, which reassigns
 *                `result = state`) is reference-stable.
 *                MECHANISM: react-redux `connect` compares the OUTPUT of mapStateToProps, not the identity
 *                of the slice, so the new reference only forces a re-render where mapStateToProps hands
 *                `state.user` (or something held by reference off it) straight through. That is the
 *                prevailing shape in this codebase — `user: state.user` appears in 70 containers — so the
 *                re-render does follow in practice, but it follows from those selectors, not from the store
 *                writing a new reference on its own. Admins assign roles to other people constantly, so
 *                this fires on the common path.
 *   FINDING_UR2  userReducers.js:94-117 — `case "UPDATE_USER"` is declared TWICE, and the first case's
 *                `break` at line 92 means the second block is unreachable in every scenario. That dead body
 *                consumes `action.department`, which is the payload of UPDATE_USER_DEPARTMENT_HANDLED
 *                (assignDepartmentHandlersActions.js:23, assignEmployeesClientActions.js:23) — a clear
 *                copy/pasted case label. No case matches that type, so it lands in `default` and the
 *                departments_handled sync never runs: assigning or unassigning a department handler does
 *                not update the current user's own handled-departments list until a full page reload.
 *   FINDING_UR4  userReducers.js:38-46 — LOGIN_SUCCESS writes four localStorage keys but LOGOUT_SUCCESS
 *                removes only three, and one of those three ("browser_timestamp_mils") is never written
 *                here. `user_local_offset_mils` and `user_local_timestamp_mils` survive logout, and
 *                NavPuncher.js:112-113 reads both, so the next user on a shared browser inherits the
 *                previous user's clock offset.
 *   FINDING_RNS1 ReportNavigatorShort.js:169 — both call sites pass `hide_filter_button={true}`
 *                (TeamAttendanceSummary.js:168, HRTeamAttendanceSummary.js:168), but the string
 *                "hide_filter_button" does not occur anywhere in ReportNavigatorShort.js; the custom-range
 *                filter button renders regardless, and it is live, not decorative.
 *   FINDING_RNS2 ReportNavigatorShort.js:133-135 — `defaultActiveKey` is supplied twice on <Tabs>; the
 *                literal "home" is silently discarded by the later `{viewType}`. Asserted on the value the
 *                component actually hands <Tabs>, so it also proves deleting line 133 changes nothing.
 *
 * FINDING DOCUMENTED BY INSPECTION, DELIBERATELY NOT ASSERTED
 *   FINDING_UR3  userReducers.js:150 & 159 — `case "FETCH_ALL_ASSETS"` is duplicated and the second body is
 *                unreachable. The two bodies are character-for-character identical, so no input can produce
 *                a different result depending on which one runs: there is no behaviour for a test to pin.
 *                It is dead weight to be deleted during the Laravel/React upgrade, not a runtime defect.
 *
 * DELIBERATELY NOT TESTED (unreachable — raising a number without protecting anyone)
 *   - The `?? "month"` fallback of `useState(props?.default_view_type ?? "month")` at line 16: both and
 *     only call sites always pass the prop (day / custom), so the fallback never runs in the app. The month
 *     arithmetic behind it is reached instead through the Monthly tab, which the tests below do click.
 *   - The "week" arms (lines 42-44, 79-81, 103-105): the Weekly <Tab> is commented out at line 140 and
 *     neither parent passes default_view_type="week", so viewType can never hold "week" in the app.
 *   - The `default` arm of switch(type) at line 29: onSelect only ever emits custom/day/month.
 *   - The `: null` arm of the label at line 180: Validator.isValid is always true for a moment instance and
 *     both parents always pass moments.
 *   - The equal-dates arm of the label at line 180: in day view the range is a rolling 7 days and in month
 *     view it spans a whole month, and in custom view the label is not rendered at all.
 *   - userReducers' 21 `break;` statements that follow a `return`, the whole second `case "UPDATE_USER"`
 *     body (lines 95-117, 9 statements and 4 callbacks) and the second `case "FETCH_ALL_ASSETS"` body
 *     (line 160) — all syntactically unreachable. Together they are the bulk of this file's uncovered
 *     statements and no test can ever retire them; only deleting the duplicate labels can.
 *
 * REACHABILITY — what the tests below can and cannot claim. Both parents are live ProtectedRoutes
 * (config/RouteList.js:370-379: team_attendance_summary, hr_team_attendance_summary) and userReducers is
 * the root `user` slice, so the component and the reducer are both reachable. That is NOT the same as
 * every branch inside them being reachable: the arms listed under DELIBERATELY NOT TESTED are entered by
 * no route, no click and no server response, and are left uncovered on purpose. Every test below is driven
 * from a prop value or an action type some real call site actually produces — the two `default_view_type`
 * values the parents pass, and action types dispatched by store/actions/**.
 *
 * DETERMINISM: `Date` is pinned to 2026-05-20T12:00:00Z for the whole file, so both `moment()` inside the
 * reducer/navigator and `new Date()` inside the navigator's useState initialisers resolve to a fixed
 * instant. No assertion references the real today.
 *
 * TIMEZONE: the instant above is noon UTC, so the local calendar date is Wednesday 2026-05-20 in every
 * offset from UTC-12 to UTC+11 — including the CI runner's TZ=Asia/Manila (20:00 local). Date assertions
 * are therefore stable across the zones anyone runs this in, and the one wall-clock assertion (TICK_DPA)
 * round-trips the stamp back to the pinned instant instead of hard-coding one zone's digits.
 *
 * ADDITIVE ONLY — no existing test or app source modified.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true),
    scanFeature: jest.fn(() => true),
    scanLevel_Feature: jest.fn(() => true),
}));

// Faithful Tabs stub: it exposes exactly the <Tab> children the component actually declares, so a tab the
// source has commented out cannot be clicked from a test either.
jest.mock('react-bootstrap', () => {
    const R = require('react');
    const pass = ({ children }) => R.createElement('div', null, children);
    return {
        Container: pass, Row: pass, Col: pass,
        Table: ({ children }) => R.createElement('table', null, children),
        Image: () => R.createElement('img', { alt: '' }),
        Spinner: () => R.createElement('div', null),
        Form: pass, InputGroup: pass,
        FormControl: (p) => R.createElement('input', p),
        Button: ({ children, onClick, className }) =>
            R.createElement('button', { 'data-testid': 'custom-filter', className, onClick }, children),
        Tabs: ({ children, onSelect, defaultActiveKey }) =>
            R.createElement(
                'div',
                // surfaced so a test can read the key the component actually handed <Tabs> (FINDING_RNS2)
                { 'data-testid': 'tabs', 'data-active-key': String(defaultActiveKey) },
                R.Children.toArray(children).map((child, i) =>
                    R.createElement(
                        'button',
                        {
                            key: i,
                            'data-testid': 'tab-' + child.props.eventKey,
                            onClick: () => onSelect(child.props.eventKey),
                        },
                        child.props.title
                    )
                )
            ),
        Tab: () => null,
    };
});

jest.mock('react-datepicker', () => (props) => {
    const R = require('react');
    const mmt = require('moment');
    return R.createElement(
        'span',
        { 'data-testid': 'datepicker' },
        R.createElement(
            'span',
            { 'data-testid': 'dpval-' + props.placeholder },
            props.selected ? mmt(props.selected).format('YYYY-MM-DD') : ''
        ),
        R.createElement('input', {
            'data-testid': 'dp-' + props.placeholder,
            onChange: (e) => {
                const [y, m, d] = e.target.value.split('-').map(Number);
                props.onChange(new Date(y, m - 1, d));
            },
        })
    );
});

const userReducer = require('../../store/reducers/user/userReducers').default;
const ReportNavigatorShort =
    require('../../components/Template/ReportNavigatorShort/ReportNavigatorShort').default;
const Authenticator = require('../../services/Authenticator');

// Noon UTC on Wednesday 2026-05-20 — mid-month, in a 31-day month. Noon is chosen so the local calendar
// date is still 2026-05-20 anywhere from UTC-12 to UTC+11 (Asia/Manila, the CI zone, sees 20:00).
const FIXED_MS = Date.UTC(2026, 4, 20, 12, 0, 0);
const RealDate = Date;
let logSpy;

beforeEach(() => {
    // eslint-disable-next-line no-global-assign
    global.Date = class extends RealDate {
        constructor(...args) {
            super(...(args.length === 0 ? [FIXED_MS] : args));
        }
        static now() {
            return FIXED_MS;
        }
    };
    localStorage.clear();
    jest.clearAllMocks();
    Authenticator.scanLevel_Feature.mockReturnValue(true);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    // eslint-disable-next-line no-global-assign
    global.Date = RealDate;
    logSpy.mockRestore();
});

/* ============================================================================
 * store/reducers/user/userReducers.js
 * ==========================================================================*/
describe('userReducer — session actions', () => {
    const loginUser = {
        id: 7,
        emp_num: 'EV-007',
        name: 'Ana Reyes',
        user_server_timestamp: '2026-05-20 11:00:00',
        user_server_timestamp_mils: 1779000000000,
        user_offset_seconds: 28800,
    };

    test('an unrecognised action returns the very same state object, not a copy', () => {
        const state = { error_message: '', id: 7 };
        const next = userReducer(state, { type: 'SOMETHING_ELSE_ENTIRELY' });

        expect(next).toBe(state);
        expect(next).toEqual({ error_message: '', id: 7 });
    });

    test('with no prior state an unrecognised action yields the empty-error initial state', () => {
        expect(userReducer(undefined, { type: '@@INIT' })).toEqual({ error_message: '' });
    });

    test('LOGIN_SUCCESS replaces the whole slice with the user rather than merging into it', () => {
        const prev = { error_message: 'Bad credentials', leftover_flag: true };
        const next = userReducer(prev, { type: 'LOGIN_SUCCESS', user: loginUser, payload: { token: 'abc' } });

        expect(next).not.toBe(prev);
        expect(next.id).toBe(7);
        expect(next.name).toBe('Ana Reyes');
        expect(next.payload).toEqual({ token: 'abc' });
        // the previous slice is discarded wholesale — no stale error text survives a fresh login
        expect(next.error_message).toBeUndefined();
        expect(next.leftover_flag).toBeUndefined();
    });

    test('LOGIN_SUCCESS caches the server clock and the offset converted from seconds to milliseconds', () => {
        userReducer({}, { type: 'LOGIN_SUCCESS', user: loginUser, payload: null });

        expect(localStorage.getItem('user_server_timestamp')).toBe('2026-05-20 11:00:00');
        expect(localStorage.getItem('user_server_timestamp_mils')).toBe('1779000000000');
        expect(localStorage.getItem('user_local_offset_mils')).toBe('28800000');
        expect(localStorage.getItem('user_local_timestamp_mils')).toBe('1779000000000');
    });

    test('LOGOUT_SUCCESS resets to the initial state and raises the clear-login-parameters flag', () => {
        const prev = { id: 7, name: 'Ana Reyes', permissions: ['full_access'] };
        const next = userReducer(prev, { type: 'LOGOUT_SUCCESS' });

        expect(next).not.toBe(prev);
        expect(next).toEqual({ error_message: '', clearLoginParameters: true });
        expect(next.permissions).toBeUndefined();
    });

    test('LOGOUT_SUCCESS leaves the local clock offset behind for the next user _FINDING_UR4', () => {
        // LOGIN_SUCCESS writes four keys; LOGOUT_SUCCESS removes three, one of which was never written.
        userReducer({}, { type: 'LOGIN_SUCCESS', user: loginUser, payload: null });
        userReducer({ id: 7 }, { type: 'LOGOUT_SUCCESS' });

        expect(localStorage.getItem('user_server_timestamp')).toBeNull();
        expect(localStorage.getItem('user_server_timestamp_mils')).toBeNull();
        // characterised, not endorsed: these two outlive the session
        expect(localStorage.getItem('user_local_offset_mils')).toBe('28800000');
        expect(localStorage.getItem('user_local_timestamp_mils')).toBe('1779000000000');
    });

    test('LOGOUT_FAILED throws the session away and keeps only the error payload', () => {
        const prev = { id: 7, name: 'Ana Reyes' };
        const next = userReducer(prev, { type: 'LOGOUT_FAILED', error: { error_message: 'Network down' } });

        expect(next).not.toBe(prev);
        expect(next).toEqual({ error_message: 'Network down' });
        expect(next.id).toBeUndefined();
    });

    test('FETCH_USER_SUCCESS refreshes the slice and re-caches the server clock', () => {
        const prev = { id: 7, stale: true };
        const refreshed = { ...loginUser, name: 'Ana R. Reyes', user_offset_seconds: 0 };
        const next = userReducer(prev, { type: 'FETCH_USER_SUCCESS', user: refreshed, payload: { r: 1 } });

        expect(next).not.toBe(prev);
        expect(next.name).toBe('Ana R. Reyes');
        expect(next.payload).toEqual({ r: 1 });
        expect(next.stale).toBeUndefined();
        expect(localStorage.getItem('user_local_offset_mils')).toBe('0');
    });

    test('FETCH_USER_FAILED replaces the slice with the error and touches no localStorage', () => {
        const next = userReducer({ id: 7 }, { type: 'FETCH_USER_FAILED', error: { error_message: 'HTTP 500' } });

        expect(next).toEqual({ error_message: 'HTTP 500' });
        expect(localStorage.getItem('user_server_timestamp')).toBeNull();
    });
});

describe('userReducer — password prompt and DPA acknowledgement', () => {
    test('TOGGLE_FORCE_CHANGE_PASSWORD lowers the flag when it is raised', () => {
        const prev = { id: 7, force_change_password: true };
        const next = userReducer(prev, { type: 'TOGGLE_FORCE_CHANGE_PASSWORD' });

        expect(next).not.toBe(prev);
        expect(next.force_change_password).toBe(false);
        expect(next.id).toBe(7);
    });

    test('TOGGLE_FORCE_CHANGE_PASSWORD keeps the flag down when it is already down', () => {
        const next = userReducer({ id: 7, force_change_password: false }, { type: 'TOGGLE_FORCE_CHANGE_PASSWORD' });
        expect(next.force_change_password).toBe(false);
    });

    // The stamp is the browser's LOCAL wall clock with no timezone suffix, so it is asserted by
    // round-tripping back to the pinned instant rather than by hard-coding one zone's digits.
    const PINNED_STAMP = 'YYYY-MM-DD HH:mm:ss';

    test('TICK_DPA stamps the acknowledgement with the current local time to the second', () => {
        const prev = { id: 7 };
        const next = userReducer(prev, { type: 'TICK_DPA' });

        expect(next).not.toBe(prev);
        expect(next.dpa_ticked_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        expect(moment(next.dpa_ticked_at, PINNED_STAMP).valueOf()).toBe(FIXED_MS);
        expect(prev.dpa_ticked_at).toBeUndefined();
    });

    test('TICK_DPA overwrites an earlier acknowledgement stamp', () => {
        const next = userReducer({ id: 7, dpa_ticked_at: '2020-01-01 00:00:00' }, { type: 'TICK_DPA' });

        expect(next.dpa_ticked_at).not.toBe('2020-01-01 00:00:00');
        expect(moment(next.dpa_ticked_at, PINNED_STAMP).valueOf()).toBe(FIXED_MS);
    });
});

describe('userReducer — UPDATE_USER and the duplicated case label', () => {
    test('UPDATE_USER merges the payload when the edited user is the logged-in user', () => {
        const prev = { id: 7, name: 'Ana Reyes', roles: ['user'], emp_num: 'EV-007' };
        const next = userReducer(prev, { type: 'UPDATE_USER', user: { id: 7, roles: ['user', 'admin'] } });

        expect(next).not.toBe(prev);
        expect(next.roles).toEqual(['user', 'admin']);
        expect(next.name).toBe('Ana Reyes'); // untouched fields survive the merge
        expect(prev.roles).toEqual(['user']); // the previous state was not mutated
    });

    test('UPDATE_USER matches on loose equality, so a numeric id and its string form are the same user', () => {
        const next = userReducer({ id: 7, name: 'Ana' }, { type: 'UPDATE_USER', user: { id: '7', level: { Name: 'HR' } } });
        expect(next.level).toEqual({ Name: 'HR' });
        expect(next.name).toBe('Ana');
    });

    test('assigning a role to a DIFFERENT user leaves this session untouched', () => {
        // assignRoleActions.js dispatches UPDATE_USER for whichever user the admin edited, so the reducer
        // has to ignore everyone who is not the logged-in user.
        const prev = { id: 7, name: 'Ana Reyes', roles: ['user'] };
        const next = userReducer(prev, { type: 'UPDATE_USER', user: { id: 99, roles: ['admin'] } });

        expect(next).toEqual(prev);
        expect(next.roles).toEqual(['user']);
        expect(next.name).toBe('Ana Reyes');
    });

    test('an UPDATE_USER for somebody else still hands Redux a brand-new object _FINDING_UR1', () => {
        // The `break` at line 92 falls out to `return result`, and `result` was pre-seeded with {...state}
        // at line 13, so a no-op action returns a fresh reference — whereas a genuinely unknown action
        // (the `default` arm, which reassigns `result = state`) returns the identical object.
        // What that costs is a property of the SELECTORS, not of connect: react-redux diffs the output of
        // mapStateToProps, so the wasted render lands only where mapStateToProps forwards `state.user` by
        // reference. In this codebase that is 70 containers, so the cost is real — but the fix is the
        // reducer's pre-seeded `result`, not memoising the components.
        const prev = { id: 7, roles: ['user'] };
        const noop = userReducer(prev, { type: 'UPDATE_USER', user: { id: 99, roles: ['admin'] } });
        const unknown = userReducer(prev, { type: 'NOT_A_REAL_ACTION' });

        expect(noop).not.toBe(prev); // new reference for a change that changed nothing
        expect(unknown).toBe(prev); // …but the default arm is reference-stable
        expect(noop.roles).toBe(prev.roles); // only a shallow copy — nested values are shared
    });

    test('UPDATE_USER with no user payload is ignored once the session has an id', () => {
        const prev = { id: 7, name: 'Ana Reyes' };
        const next = userReducer(prev, { type: 'UPDATE_USER' });

        expect(next).toEqual(prev);
        expect(next).not.toBe(prev);
    });

    test('before login the id-less state matches an id-less payload and merges it', () => {
        // initState has no `id`, so `undefined == undefined` is true and the guard lets the payload through
        const prev = { error_message: '' };
        const next = userReducer(prev, { type: 'UPDATE_USER', user: { name: 'Ghost' } });

        expect(next).toEqual({ error_message: '', name: 'Ghost' });
    });

    test('UPDATE_USER_DEPARTMENT_HANDLED never syncs departments_handled _FINDING_UR2', () => {
        // The second `case "UPDATE_USER"` body was written for this payload but carries a copy/pasted label,
        // and the first case's `break` at line 92 guarantees control never reaches it. The action therefore
        // lands in `default` and the freshly assigned department is silently dropped.
        const prev = {
            id: 7,
            emp_num: 'EV-007',
            departments_handled: [{ id: 3, department_name: 'Finance' }],
        };
        const next = userReducer(prev, {
            type: 'UPDATE_USER_DEPARTMENT_HANDLED',
            department: { id: 9, department_name: 'Aviation', department_handlers: [{ emp_num: 'EV-007' }] },
        });

        expect(next).toBe(prev); // default arm — identical reference
        expect(next.departments_handled).toEqual([{ id: 3, department_name: 'Finance' }]);
        expect(next.departments_handled.map((d) => d.id)).not.toContain(9);
    });

    test('removing the user as a department handler is dropped just as silently _FINDING_UR2', () => {
        const prev = {
            id: 7,
            emp_num: 'EV-007',
            departments_handled: [{ id: 9, department_name: 'Aviation' }],
        };
        const next = userReducer(prev, {
            type: 'UPDATE_USER_DEPARTMENT_HANDLED',
            department: { id: 9, department_name: 'Aviation', department_handlers: [{ emp_num: 'EV-999' }] },
        });

        expect(next).toBe(prev);
        expect(next.departments_handled).toHaveLength(1);
    });
});

describe('userReducer — asset slices', () => {
    test('FETCH_USER_ASSET stores one asset and raises the loaded flag without dropping the session', () => {
        const prev = { id: 7, name: 'Ana' };
        const next = userReducer(prev, {
            type: 'FETCH_USER_ASSET',
            data: { id: 55, tag: 'LAPTOP-1' },
            is_asset_loaded: true,
        });

        expect(next).not.toBe(prev);
        expect(next.user_asset).toEqual({ id: 55, tag: 'LAPTOP-1' });
        expect(next.is_asset_loaded).toBe(true);
        expect(next.name).toBe('Ana');
    });

    test('FETCH_USER_ASSETS stores an empty list and still marks the fetch complete', () => {
        const next = userReducer({ id: 7 }, { type: 'FETCH_USER_ASSETS', data: [], is_asset_loaded: true });

        expect(next.user_assets).toEqual([]);
        expect(next.is_asset_loaded).toBe(true);
    });

    test('FETCH_USER_ASSETS stores the rows verbatim under its own key and keeps the session', () => {
        const prev = { id: 7, name: 'Ana', user_asset: { id: 55 } };
        const rows = [{ id: 1, tag: 'LAPTOP-1' }, { id: 2, tag: 'PHONE-2' }];
        const next = userReducer(prev, { type: 'FETCH_USER_ASSETS', data: rows, is_asset_loaded: true });

        expect(next).not.toBe(prev);
        expect(next.user_assets).toEqual(rows);
        expect(next.is_asset_loaded).toBe(true);
        expect(next.name).toBe('Ana'); // the rest of the session survives
        expect(next.user_asset).toEqual({ id: 55 }); // the single-asset slot is a separate key, untouched
    });

    test('CLEAR_USER_ASSET_LOAD lowers the loaded flag but keeps the cached asset data', () => {
        const prev = { id: 7, user_asset: { id: 55 }, user_assets: [{ id: 1 }], is_asset_loaded: true };
        const next = userReducer(prev, { type: 'CLEAR_USER_ASSET_LOAD', is_asset_loaded: false });

        expect(next).not.toBe(prev);
        expect(next.is_asset_loaded).toBe(false);
        expect(next.user_asset).toEqual({ id: 55 });
        expect(next.user_assets).toEqual([{ id: 1 }]);
    });

    test('FETCH_ALL_ASSETS stores the rows, the loaded flag and the filters that produced them', () => {
        const prev = { id: 7 };
        const next = userReducer(prev, {
            type: 'FETCH_ALL_ASSETS',
            data: [{ id: 1 }],
            is_all_asset_loaded: true,
            filters: { status: 'assigned' },
        });

        expect(next).not.toBe(prev);
        expect(next.all_assets).toEqual([{ id: 1 }]);
        expect(next.is_all_asset_loaded).toBe(true);
        expect(next.asset_reports_filter).toEqual({ status: 'assigned' });
    });

    test('FETCH_ALL_ASSETS with no rows clears the table and records the empty filter set', () => {
        const next = userReducer(
            { id: 7, all_assets: [{ id: 1 }] },
            { type: 'FETCH_ALL_ASSETS', data: [], is_all_asset_loaded: false, filters: {} }
        );

        expect(next.all_assets).toEqual([]);
        expect(next.is_all_asset_loaded).toBe(false);
        expect(next.asset_reports_filter).toEqual({});
    });
});

describe('userReducer — self-service document slices', () => {
    const FETCHES = [
        ['FETCH_USER_EVA', 'user_eva', 'is_eva_loaded'],
        ['FETCH_USER_COC', 'user_coc', 'is_coc_loaded'],
        ['FETCH_USER_EVA_REG', 'user_eva_reg', 'is_eva_reg_loaded'],
        ['FETCH_USER_HAPPINESS_SURVEY', 'user_happiness_survey', 'is_happiness_survey_loaded'],
    ];
    const CLEARS = [
        ['CLEAR_USER_EVA', 'user_eva', 'is_eva_loaded'],
        ['CLEAR_USER_COC', 'user_coc', 'is_coc_loaded'],
        ['CLEAR_USER_EVA_REG', 'user_eva_reg', 'is_eva_reg_loaded'],
        ['CLEAR_USER_HAPPINESS_SURVEY', 'user_happiness_survey', 'is_happiness_survey_loaded'],
    ];

    test.each(FETCHES)(
        '%s stores the document under %s and raises %s, whether the result is populated or empty',
        (fetchType, dataKey, flagKey) => {
            const prev = { id: 7, name: 'Ana' };
            const populated = userReducer(prev, { type: fetchType, data: [{ id: 1 }], [flagKey]: true });

            expect(populated).not.toBe(prev);
            expect(populated[dataKey]).toEqual([{ id: 1 }]);
            expect(populated[flagKey]).toBe(true);
            expect(populated.name).toBe('Ana'); // the rest of the session survives

            const empty = userReducer(prev, { type: fetchType, data: [], [flagKey]: true });
            expect(empty[dataKey]).toEqual([]);
            expect(empty[flagKey]).toBe(true); // an empty document is still a completed fetch
        }
    );

    test.each(CLEARS)('%s keeps %s cached and only lowers %s', (clearType, dataKey, flagKey) => {
        const prev = { id: 7, [dataKey]: [{ id: 1 }], [flagKey]: true };
        const next = userReducer(prev, { type: clearType, [flagKey]: false });

        expect(next).not.toBe(prev);
        expect(next[flagKey]).toBe(false);
        expect(next[dataKey]).toEqual([{ id: 1 }]);
    });
});

/* ============================================================================
 * components/Template/ReportNavigatorShort/ReportNavigatorShort.js
 * ==========================================================================*/
describe('ReportNavigatorShort — Reports -> Team Attendance Summary', () => {
    function renderNav(extraProps = {}) {
        const handleChangeDate = jest.fn();
        // the range both parents seed their state with
        const start_date = moment('2026-05-14').startOf('day');
        const end_date = moment('2026-05-20').endOf('day');
        const utils = render(
            <ReportNavigatorShort
                start_date={start_date}
                end_date={end_date}
                handleChangeDate={handleChangeDate}
                hide_filter_button={true}
                {...extraProps}
            />
        );
        const arrows = () => utils.container.querySelectorAll('.view-navigate');
        return {
            ...utils,
            handleChangeDate,
            start_date,
            end_date,
            prev: () => fireEvent.click(arrows()[0]),
            next: () => fireEvent.click(arrows()[1]),
            tab: (k) => fireEvent.click(utils.getByTestId('tab-' + k)),
            label: () => utils.container.querySelector('.dates-label').textContent,
            s: () => start_date.format('YYYY-MM-DD'),
            e: () => end_date.format('YYYY-MM-DD'),
        };
    }

    describe('initial scope', () => {
        test('default_view_type="day" opens on the navigator arrows and the range label', () => {
            const nav = renderNav({ default_view_type: 'day' });

            expect(nav.container.querySelectorAll('.view-navigate')).toHaveLength(2);
            expect(nav.queryAllByTestId('datepicker')).toHaveLength(0);
            expect(nav.label()).toBe('May 14, 2026 - May 20, 2026');
            expect(nav.handleChangeDate).not.toHaveBeenCalled();
        });

        test('default_view_type="custom" opens on two date pickers with no navigator arrows', () => {
            const nav = renderNav({ default_view_type: 'custom' });

            expect(nav.getAllByTestId('datepicker')).toHaveLength(2);
            expect(nav.container.querySelectorAll('.view-navigate')).toHaveLength(0);
            expect(nav.container.querySelector('.dates-label')).toBeNull();
            // both pickers are seeded with the current date
            expect(nav.getByTestId('dpval-Start Date')).toHaveTextContent('2026-05-20');
            expect(nav.getByTestId('dpval-End Date')).toHaveTextContent('2026-05-20');
        });

        test('the duplicated defaultActiveKey silently discards the literal "home" _FINDING_RNS2', () => {
            // ReportNavigatorShort.js:133 sets defaultActiveKey="home" and :135 sets it again to {viewType}.
            // JSX keeps the LAST of two identical attributes, so "home" never reaches <Tabs> — which is just
            // as well, there is no "home" tab to open. Asserted on what the component hands <Tabs>, so this
            // also shows that deleting line 133 changes nothing.
            // <Tabs> is uncontrolled here, so only the value present at mount decides the opening tab.
            const day = renderNav({ default_view_type: 'day' });
            expect(day.getByTestId('tabs')).toHaveAttribute('data-active-key', 'day');
            day.unmount();

            const custom = renderNav({ default_view_type: 'custom' });
            expect(custom.getByTestId('tabs')).toHaveAttribute('data-active-key', 'custom');
        });
    });

    describe('who may pick a custom range', () => {
        test('an HR user with view_attendance_report is offered the Custom tab', () => {
            Authenticator.scanLevel_Feature.mockReturnValue(true);
            const nav = renderNav({ default_view_type: 'day' });

            expect(nav.queryByTestId('tab-custom')).not.toBeNull();
            expect(Authenticator.scanLevel_Feature).toHaveBeenCalledWith('HR', 'view_attendance_report');
        });

        test('a non-HR supervisor gets only Today and Monthly, never Custom', () => {
            Authenticator.scanLevel_Feature.mockReturnValue(false);
            const nav = renderNav({ default_view_type: 'day' });

            expect(nav.queryByTestId('tab-custom')).toBeNull();
            expect(nav.queryByTestId('tab-day')).not.toBeNull();
            expect(nav.queryByTestId('tab-month')).not.toBeNull();
        });
    });

    describe('switching scope', () => {
        test('Today gives the rolling seven-day window ending tonight, not just today', () => {
            // reached the way the app reaches it: the page opens on Today, the user goes Monthly and back
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('month');
            nav.handleChangeDate.mockClear();
            nav.tab('day');

            expect(nav.s()).toBe('2026-05-14');
            expect(nav.e()).toBe('2026-05-20');
            expect(nav.start_date.format('HH:mm:ss')).toBe('00:00:00');
            expect(nav.end_date.format('HH:mm:ss')).toBe('23:59:59');
            expect(nav.handleChangeDate).toHaveBeenCalledTimes(1);
            expect(nav.handleChangeDate).toHaveBeenLastCalledWith(nav.start_date, nav.end_date, 'day');
        });

        test('Monthly snaps the range to the first and last day of the current month', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('month');

            expect(nav.s()).toBe('2026-05-01');
            expect(nav.e()).toBe('2026-05-31');
            expect(nav.handleChangeDate).toHaveBeenLastCalledWith(nav.start_date, nav.end_date, 'month');
            expect(nav.label()).toBe('May 1, 2026 - May 31, 2026');
        });

        test('the navigator hands the parent back the very moment objects it was given', () => {
            // the parents put these straight into setState, so identity is the contract
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('month');

            const [passedStart, passedEnd] = nav.handleChangeDate.mock.calls[0];
            expect(passedStart).toBe(nav.start_date);
            expect(passedEnd).toBe(nav.end_date);
        });

        test('picking Custom swaps the arrows for date pickers and filters immediately', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('custom');

            expect(nav.getAllByTestId('datepicker')).toHaveLength(2);
            expect(nav.container.querySelectorAll('.view-navigate')).toHaveLength(0);
            // selecting the tab runs the filter straight away using the pre-seeded dates
            expect(nav.handleChangeDate).toHaveBeenCalledTimes(1);
            expect(nav.handleChangeDate).toHaveBeenLastCalledWith(nav.start_date, nav.end_date, 'custom');
            expect(nav.s()).toBe('2026-05-20');
            expect(nav.e()).toBe('2026-05-20');
        });

        test('leaving Custom for Today restores the arrows and recomputes the seven-day window', () => {
            const nav = renderNav({ default_view_type: 'custom' });
            nav.tab('day');

            expect(nav.queryAllByTestId('datepicker')).toHaveLength(0);
            expect(nav.container.querySelectorAll('.view-navigate')).toHaveLength(2);
            expect(nav.s()).toBe('2026-05-14');
            expect(nav.e()).toBe('2026-05-20');
        });
    });

    describe('navigating within a scope', () => {
        test('next in monthly view advances a whole calendar month and lands on its last day', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('month'); // May 2026
            nav.next();

            expect(nav.s()).toBe('2026-06-01');
            expect(nav.e()).toBe('2026-06-30'); // June is 30 days — the end is recomputed, not shifted
            expect(nav.handleChangeDate).toHaveBeenLastCalledWith(nav.start_date, nav.end_date, 'month');
        });

        test('prev in monthly view rewinds a whole calendar month and lands on its last day', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('month'); // May 2026
            nav.prev();

            expect(nav.s()).toBe('2026-04-01');
            expect(nav.e()).toBe('2026-04-30');
            expect(nav.label()).toBe('April 1, 2026 - April 30, 2026');
        });

        test('stepping monthly forward then back returns to the month it started on', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('month');
            nav.next();
            nav.next();
            expect(nav.s()).toBe('2026-07-01');
            nav.prev();
            nav.prev();

            expect(nav.s()).toBe('2026-05-01');
            expect(nav.e()).toBe('2026-05-31');
            expect(nav.handleChangeDate).toHaveBeenCalledTimes(5); // tab + 4 arrows
        });

        test('monthly navigation crosses the year boundary into December of the previous year', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('month'); // May 2026
            for (let i = 0; i < 5; i++) nav.prev();

            expect(nav.s()).toBe('2025-12-01');
            expect(nav.e()).toBe('2025-12-31');
        });

        test('next in day view slides the seven-day window forward by exactly one week', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('day'); // 14 May .. 20 May
            nav.next();

            expect(nav.s()).toBe('2026-05-21');
            expect(nav.e()).toBe('2026-05-27');
            expect(nav.end_date.diff(nav.start_date, 'days')).toBe(6);
        });

        test('prev in day view slides the seven-day window back by exactly one week', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('day');
            nav.prev();

            expect(nav.s()).toBe('2026-05-07');
            expect(nav.e()).toBe('2026-05-13');
            expect(nav.end_date.diff(nav.start_date, 'days')).toBe(6);
        });

        test('switching from monthly to Today re-bases navigation on weeks instead of months', () => {
            const nav = renderNav({ default_view_type: 'day' });
            nav.tab('month');
            nav.next(); // June 2026
            nav.tab('day'); // back to the rolling window around the fixed today
            nav.next();

            expect(nav.s()).toBe('2026-05-21'); // seven days on, not a month on
            expect(nav.e()).toBe('2026-05-27');
        });
    });

    describe('the custom range', () => {
        test('choosing both ends and filtering reports exactly that range', () => {
            const nav = renderNav({ default_view_type: 'custom' });
            fireEvent.change(nav.getByTestId('dp-Start Date'), { target: { value: '2026-02-03' } });
            fireEvent.change(nav.getByTestId('dp-End Date'), { target: { value: '2026-02-27' } });
            nav.handleChangeDate.mockClear();
            fireEvent.click(nav.getByTestId('custom-filter'));

            expect(nav.handleChangeDate).toHaveBeenCalledTimes(1);
            expect(nav.handleChangeDate).toHaveBeenLastCalledWith(nav.start_date, nav.end_date, 'custom');
            expect(nav.s()).toBe('2026-02-03');
            expect(nav.e()).toBe('2026-02-27');
            expect(nav.getByTestId('dpval-Start Date')).toHaveTextContent('2026-02-03');
        });

        test('picking a date rewrites the bound straight away but does not re-run the report', () => {
            const nav = renderNav({ default_view_type: 'custom' });
            nav.handleChangeDate.mockClear();
            fireEvent.change(nav.getByTestId('dp-Start Date'), { target: { value: '2026-01-09' } });

            expect(nav.s()).toBe('2026-01-09'); // the prop moment is mutated on change
            expect(nav.handleChangeDate).not.toHaveBeenCalled(); // the parent only refetches on filter
        });

        test('a single-day custom range is accepted with both ends on the same date', () => {
            const nav = renderNav({ default_view_type: 'custom' });
            fireEvent.change(nav.getByTestId('dp-Start Date'), { target: { value: '2026-03-16' } });
            fireEvent.change(nav.getByTestId('dp-End Date'), { target: { value: '2026-03-16' } });
            nav.handleChangeDate.mockClear();
            fireEvent.click(nav.getByTestId('custom-filter'));

            // the report does run — a zero-width range is not swallowed by a guard
            expect(nav.handleChangeDate).toHaveBeenCalledTimes(1);
            expect(nav.handleChangeDate).toHaveBeenLastCalledWith(nav.start_date, nav.end_date, 'custom');
            expect(nav.s()).toBe('2026-03-16');
            expect(nav.e()).toBe('2026-03-16');
            expect(nav.end_date.isSame(nav.start_date, 'day')).toBe(true);
        });

        test('an end date before the start date is passed through unvalidated', () => {
            const nav = renderNav({ default_view_type: 'custom' });
            fireEvent.change(nav.getByTestId('dp-Start Date'), { target: { value: '2026-04-20' } });
            fireEvent.change(nav.getByTestId('dp-End Date'), { target: { value: '2026-04-01' } });
            nav.handleChangeDate.mockClear();
            fireEvent.click(nav.getByTestId('custom-filter'));

            expect(nav.handleChangeDate).toHaveBeenCalledTimes(1);
            expect(nav.end_date.isBefore(nav.start_date)).toBe(true);
        });

        test('the filter button renders and still fires even though the parents hide it _FINDING_RNS1', () => {
            // Both call sites pass hide_filter_button={true}, but "hide_filter_button" appears nowhere in
            // ReportNavigatorShort.js. Asked to hide and asked to show produce byte-identical markup — the
            // prop is inert — and the button that should not be there runs the report when clicked.
            // (Queried through the container rather than the screen: two renders share document.body.)
            const hidden = renderNav({ default_view_type: 'custom', hide_filter_button: true });
            const shown = renderNav({ default_view_type: 'custom', hide_filter_button: false });
            expect(hidden.container.innerHTML).toBe(shown.container.innerHTML);

            const button = hidden.container.querySelector('[data-testid="custom-filter"]');
            expect(button).not.toBeNull();

            hidden.handleChangeDate.mockClear();
            fireEvent.click(button);
            expect(hidden.handleChangeDate).toHaveBeenCalledTimes(1);
            expect(hidden.handleChangeDate).toHaveBeenLastCalledWith(
                hidden.start_date,
                hidden.end_date,
                'custom'
            );
        });
    });
});
