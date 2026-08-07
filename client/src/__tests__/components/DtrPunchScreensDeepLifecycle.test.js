/**
 * DtrPunchScreensDeepLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   container/DtrPunch/DtrPunch.js
 *       Menu: Sidebar -> Multi Clock-in      route  global.links.dtr_punch_history  ("/app/punch_history/")
 *       Gated by feature "multi_login" (RouteList.js:159-163, Sidebar.js:100-110)
 *   container/DailyTimeRecord/DailyTimeRecord.js
 *       Menu: Sidebar -> Daily Time Record   route  global.links.dtr + ":id"        ("/app/dtr/{id}/")
 *       Shown to every non-India/Morocco employee (Sidebar.js:79)
 *   components/Template/NavQuickPunch/NavQuickPunch.js
 *       Menu: top navigation bar - always mounted on every authenticated page (Header.js:27)
 *
 * COVERAGE BEFORE (whole existing suite, --collectCoverageFrom limited to these three files)
 *   DtrPunch.js          stmts 13/32  40.63%   branch  2/8   25.00%   funcs  3/12  25.00%
 *   DailyTimeRecord.js   stmts 69/87  79.31%   branch 61/94  64.89%   funcs 17/24  70.83%
 *   NavQuickPunch.js     stmts 25/39  64.10%   branch 18/22  81.82%   funcs  4/12  33.33%
 *   packet total         stmts 107/158 67.72%  branch 81/124 65.32%   funcs 24/48  50.00%
 *   (51 uncovered statements - the number this packet was raised against)
 *
 * COVERAGE AFTER - 60 tests, THIS FILE ALONE (--coverage --collectCoverageFrom limited to the
 * three files above; the BEFORE figures were the whole existing suite, so these are not a
 * like-for-like delta, they are what this one file is worth on its own).
 *   DtrPunch.js          stmts  50.00%   branch  50.00%   funcs  41.67%   lines  53.33%
 *   DailyTimeRecord.js   stmts 100.00%   branch  94.68%   funcs 100.00%   lines 100.00%
 *   NavQuickPunch.js     stmts  74.36%   branch  81.82%   funcs  58.33%   lines  73.68%
 *   packet total         stmts  83.54%   branch  89.52%   funcs  75.00%   lines  84.31%
 *
 *   It is deliberately NOT 100%. Every remaining uncovered line is listed in the DEAD CODE block
 *   near the bottom of this header, and each was checked against the routes, the JSX and the API
 *   response shape before being left alone:
 *     NavQuickPunch.js  41,43,45,46,48,49,53  onSubmitHandler body      (no form, no caller)
 *                       156,158,159           biometrixLog / clearRecentDtrInstance /
 *                                             getIncompleteDtr dispatchers (no live call site)
 *                       74 (branch)           the second showErr arm of a value nothing reads
 *     DtrPunch.js       94,96,97,105,107,109,110  month + cut-off option loops (Selects commented out)
 *                       158-164               all six mapDispatchToProps thunks (nothing calls them)
 *                       79,92,105 (branch)    method=='store' and the selectedYear/Month gates
 *     DailyTimeRecord.js 51,60,68 (branch)    the onChange(null) arms - Selects are not isClearable
 *                        72      (branch)     handleSelectPayrollCutoff's year/month guard, which
 *                                             cannot be false because the cut-off Select only
 *                                             renders once both are valid
 *   An earlier revision of this file reported 100% stmts / 100% branch / 100% funcs across all
 *   three files. It reached those numbers by driving exactly the code listed above through
 *   ref.current.* and __mapDispatch(). Twelve such tests were deleted. Coverage bought from
 *   unreachable code protects nobody and misreports the packet.
 *
 * WHAT THIS SUITE PINS DOWN
 *   DailyTimeRecord is a cascade: filters -> year -> month -> cut-off -> table. Every gate is
 *   driven on both arms, every dispatch payload is asserted, and the per-row rules (future
 *   dates, holidays, rest days, approved-leave undertime suppression, the alter-log button
 *   matrix, the approver-only Toggle Outlook / Update Schedule controls) are asserted one rule
 *   per test. The default cut-off handshake in componentWillReceiveProps is exercised on all
 *   four of its arms.
 *   DtrPunch is what is left of that screen after the filter UI was commented out: this suite
 *   asserts what it actually does today - it paints no dropdown whatever the store holds, and it
 *   dispatches nothing at all.
 *   NavQuickPunch is the nav-bar shell around the punch button. Its own REACHABLE rules are the
 *   once-only DTR fetch, the two-hour-shifted yesterday->today window and the incomplete-timelog
 *   counter; those three are asserted here. Its biometrix form payload is NOT asserted - see the
 *   dead-code block below for why.
 *
 * WHERE THE PUNCH ENABLED/DISABLED MATRIX ACTUALLY LIVES
 *   NavQuickPunch.js renders <NavPuncher/> and nothing else punch-related - the Clock In /
 *   Clock Out / Rest Day / Day Completed / Loading state machine is entirely inside
 *   components/Template/NavPuncher/NavPuncher.js, which is NOT in this packet and is already
 *   driven state-by-state by NavPuncherLifecycle.test.js and evoxtest_NavPuncherDeep2.test.js.
 *   Duplicating that matrix here would raise no number in this packet, so NavPuncher is stubbed
 *   and NavQuickPunch's own rules are asserted instead.
 *
 * FINDINGS (characterised - these tests assert what the code does TODAY. Nothing is fixed.)
 *   DTRPUNCH_NOROUTEPARAM  the Multi Clock-in route is exact "/app/punch_history/" with no ":id",
 *                          so ProtectedRoute hands the screen params = {}. params.id is therefore
 *                          always undefined, `user.id == params.id` is always false, and the page
 *                          permanently renders in "approval" mode - printing the name and
 *                          department of whichever employee was last loaded into dtr.employeeInfo
 *                          at the top of the CURRENT user's own punch screen.
 *   DTRPUNCH_NOFETCH       componentWillMount's getFilterForDtr call is commented out and all six
 *                          mapDispatchToProps thunks are unreachable from the component, so opening
 *                          Multi Clock-in dispatches nothing; dtr.filter is whatever a previously
 *                          visited screen happened to leave in the store.
 *   DTRPUNCH_DEADFILTER    render still builds yearOptions on every pass, and still carries the
 *                          monthOptions/payrollCutoffOptions loops behind it, but the three
 *                          <Select>s that consumed them were commented out of the JSX. The arrays
 *                          are discarded and the screen renders no dropdown at all - so its output
 *                          is completely invariant under dtr.filter, which is what the test asserts.
 *                          (The month and cut-off loops are doubly dead: they are gated on
 *                          state.selectedYear, whose only writers were those same deleted Selects.)
 *   DTR_MONTHSORT          month keys are ordered with Object.keys().sort() - a lexicographic sort -
 *                          so the month dropdown lists October before July and August.
 *   NAVQP_RENDERFETCH      the once-only DTR fetch is fired from inside render() and the guard flag is
 *                          written with a direct `this.state.NavHasLoaded = true` assignment rather
 *                          than setState - a side effect and a state mutation during render.
 *   NAVQP_DEADERR          `showErr` is computed on every render (with bitwise `&` where `&&` was
 *                          meant) and then never read - no error is ever surfaced to the wearer.
 *   NAVQP_DEADINCOMPLETE   `incompletedtr` is mapped from state and `getIncompleteDtr` is mapped to
 *                          dispatch, but the call site is commented out and neither is ever read.
 *
 * DETERMINISM - CLOCK AND TIMEZONE
 *   moment's clock is pinned (moment.now) for every test and restored afterwards, so the
 *   "future DTR rows are hidden" rule and the nav's date window are fixed values, never today's.
 *   The pinned instant is built with `new Date(2026, 6, 20, 18, 0, 0)` - the Date constructor's
 *   multi-argument form is interpreted in the HOST zone by definition - rather than with
 *   Date.UTC(). The component formats with moment().format(), which is also host-zone. Pinning a
 *   local wall-clock time therefore makes every assertion below independent of the machine's UTC
 *   offset. Verified: 60 passed / 60 total, identical, under each of TZ=Asia/Manila,
 *   TZ=Asia/Kolkata, TZ=UTC, TZ=Pacific/Auckland (UTC+12) and TZ=America/Los_Angeles (UTC-7).
 *   It does NOT require any TZ to be exported, which matters because a `TZ=... npx ...` prefix
 *   typed into Git Bash on Windows never reaches node - MSYS drops it and process.env.TZ comes
 *   back undefined, so a suite that needed TZ would silently run in the machine zone.
 *   (A previous revision pinned Date.UTC(2026,6,20,10,0,0) and asserted literal date strings; that
 *   made "the window is shifted two hours forward" pass only at UTC+08 and fail at UTC+05:30.)
 *
 * DEAD CODE THIS SUITE DELIBERATELY DOES NOT COVER
 *   NavQuickPunch.onSubmitHandler (NavQuickPunch.js:40) - render() contains no form, no onSubmit
 *     and no Formik element, and its three children are rendered with no props at all, so nothing
 *     can invoke it. The Formik/Yup imports, `initialValue` and `validationSchema` are likewise
 *     unreferenced. Covering it needs a direct ref.current.onSubmitHandler() call, which no user
 *     action reproduces. Same for the biometrixLog dispatcher, whose only caller is that handler.
 *   NavQuickPunch clearRecentDtrInstance / getIncompleteDtr dispatchers - imported and mapped;
 *     clearRecentDtrInstance has no call site and getIncompleteDtr's (NavQuickPunch.js:84) is
 *     commented out. The characterisation that nothing calls them IS asserted; executing them is not.
 *   DtrPunch's six mapDispatchToProps thunks - DTRPUNCH_NOFETCH above records that nothing in the
 *     component calls any of them. Driving them by hand would move DtrPunch function coverage from
 *     25% to 100% while protecting nothing.
 *   DtrPunch's month / payroll-cutoff option loops (DtrPunch.js:92-117) - gated on state.selectedYear
 *     having a value, and the <Select>s that were the only writers of that state are commented out of
 *     the JSX. Reachable only via ref.current.setState(). DTRPUNCH_DEADFILTER is characterised
 *     instead by the reachable, stronger fact that the screen's output does not vary with the filter.
 *   DtrPunch's method=='store' arm (DtrPunch.js:79) - see DTRPUNCH_NOROUTEPARAM; params is always {}.
 *   DailyTimeRecord's onChange(null) arms (the `: null` in handleSelectYear/Month/PayrollCutoff) -
 *     react-select 3.1.0 renders no clear indicator and gates backspace- and escape-clearing behind
 *     `isClearable` (Select-062d63ee.cjs.dev.js:1587, :1634, :2450, and isClearable() at :2192
 *     defaults to isMulti === false). DailyTimeRecord.js:220/231/245 pass neither prop, so real
 *     react-select never emits null. The local <select> mock below is therefore written so it CANNOT
 *     emit null either - otherwise the mock, not the app, would be creating the branch.
 *
 * ADDITIVE ONLY - no existing test file is modified and no application source is changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import moment from 'moment';

/* ---------------------------------------------------------------- plumbing */

// connect() is neutralised so the containers can be driven as plain components, but the two
// map functions it was handed are parked on the component so the redux wiring itself can be
// asserted (it is otherwise unreachable - that is 12 of DtrPunch's 12 functions).
jest.mock('react-redux', () => {
    const actual = jest.requireActual('react-redux');
    return {
        ...actual,
        connect: (mapState, mapDispatch) => (Component) => {
            Component.__mapState = mapState;
            Component.__mapDispatch = mapDispatch;
            return Component;
        },
    };
});

jest.mock('jquery', () => jest.fn(() => ({ on: jest.fn() })));
jest.mock('../../services/API', () => ({ call: jest.fn() }));

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanFeature: jest.fn(() => true),
        scanLevel: jest.fn(() => true),
        scanLevel_Feature: jest.fn(() => true),
        check: jest.fn(() => true),
    },
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const R = require('react');
    return {
        ContainerHeader: ({ children }) => R.createElement('div', null, children),
        ContainerWrapper: ({ children }) => R.createElement('div', null, children),
        ContainerBody: ({ children, className }) => R.createElement('div', { className }, children),
        Content: ({ children, title, subtitle }) => R.createElement('div', null,
            R.createElement('h3', { 'data-testid': 'content-title' }, title),
            R.createElement('div', { 'data-testid': 'content-subtitle' }, subtitle),
            children),
        Row: ({ children }) => R.createElement('div', null, children),
        Col: ({ children }) => R.createElement('div', null, children),
    };
});

jest.mock('../../components/Template/Wrapper', () => {
    const R = require('react');
    return ({ children }) => R.createElement('div', null, children);
});
jest.mock('../../components/Template/BackButton', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'back-button' });
});

// DtrPunch's two payload children - both are separately covered elsewhere.
jest.mock('../../components/Dashboard/PunchComponents/MultiQuickpunch', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'multi-quickpunch' });
});
jest.mock('../../components/Dashboard/PunchComponents/RecentPunch', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'recent-punch' });
});

// NavQuickPunch's three children. NavPuncher owns the punch-button state machine and has its
// own dedicated suites; the panels behind the dropdown have theirs.
jest.mock('../../components/Template/NavPuncher/NavPuncher', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'nav-puncher' });
});
jest.mock('../../components/Dashboard/DtrNotifications', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'dtr-notifications' });
});
jest.mock('../../components/Dashboard/RecentDtrNav', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'recent-dtr-nav' });
});

// react-select is republished as a real <select> so the option list each container built can be
// read straight off the DOM and the onChange contract driven for real.
//
// The placeholder <option value=""> exists only so the DOM has something to show for the "nothing
// chosen yet" value that react-select renders as placeholder text; selecting it is deliberately a
// NO-OP. Real react-select 3.1.0 mounted without `isClearable` (which is how DailyTimeRecord.js
// mounts all three of its Selects, lines 220/231/245) exposes no clear indicator and ignores
// backspace and escape, so it never calls onChange(null). A mock that synthesised null would
// manufacture a branch the application cannot take.
jest.mock('react-select', () => {
    const R = require('react');
    return (props) => {
        const opts = props.options || [];
        const current = props.value && props.value.value !== undefined
            ? String(props.value.value) : '';
        return R.createElement('select', {
            'data-testid': 'select-' + props.name,
            name: props.name,
            className: props.className,
            value: current,
            onChange: (e) => {
                const chosen = opts.find((o) => String(o.value) === e.target.value);
                if (chosen !== undefined) props.onChange(chosen);
            },
        }, [R.createElement('option', { key: '__ph', value: '' }, props.placeholder)]
            .concat(opts.map((o) => R.createElement(
                'option', { key: String(o.value), value: String(o.value) }, o.label))));
    };
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const div = ({ children }) => R.createElement('div', null, children);
    const divc = ({ children, className }) => R.createElement('div', { className }, children);

    const Toast = ({ children }) => R.createElement('div', { className: 'toast' }, children);
    Toast.Header = ({ children }) => R.createElement('div', { className: 'toast-header' }, children);
    Toast.Body = ({ children }) => R.createElement('div', { className: 'toast-body' }, children);

    const Dropdown = divc;
    Dropdown.Toggle = div;
    Dropdown.Menu = ({ children }) => R.createElement('div', { 'data-testid': 'dropdown-menu' }, children);
    Dropdown.Item = div;

    const Form = ({ children }) => R.createElement('form', null, children);
    Form.Group = div; Form.Label = div; Form.Control = (p) => R.createElement('input', p);

    const Tabs = ({ children }) => R.createElement('div', { 'data-testid': 'tabs' }, children);
    const Tab = ({ children, title, eventKey, disabled, id }) => R.createElement('div',
        { id, 'data-testid': eventKey ? 'tab-' + eventKey : 'tab', 'data-disabled': disabled ? 'true' : 'false' },
        R.createElement('span', { className: 'tab-title' }, title), children);

    return {
        Container: divc, Row: divc, Col: divc, Card: divc,
        Table: ({ children, className }) => R.createElement('table', { className }, children),
        Image: () => R.createElement('img', { alt: '' }),
        Spinner: () => R.createElement('div', { 'data-testid': 'spinner' }),
        Badge: ({ children }) => R.createElement('span', null, children),
        Button: ({ children, onClick, type, disabled, className }) => R.createElement('button',
            { onClick, type: type || 'button', disabled: !!disabled, className }, children),
        InputGroup: div,
        FormControl: (p) => R.createElement('input', p),
        Form, Toast, Dropdown, Tab, Tabs,
    };
});

jest.mock('../../store/actions/dtr/dtrActions', () => ({
    viewEmployeeDtr: jest.fn((...a) => ({ type: 'VIEW_EMPLOYEE_DTR', a })),
    getFilterForDtr: jest.fn((...a) => ({ type: 'GET_FILTER_FOR_DTR', a })),
    setSelectedPayrollCutoff: jest.fn((...a) => ({ type: 'SET_SELECTED_CUTOFF', a })),
    getUserDtrSummary: jest.fn((...a) => ({ type: 'GET_USER_DTR_SUMMARY', a })),
    getIncompleteDtr: jest.fn((...a) => ({ type: 'GET_INCOMPLETE_DTR', a })),
}));
jest.mock('../../store/actions/userActions', () => ({
    fetchUser: jest.fn((...a) => ({ type: 'FETCH_USER', a })),
    logOut: jest.fn((...a) => ({ type: 'LOG_OUT', a })),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn((...a) => ({ type: 'SET_REDIRECT', a })),
}));
jest.mock('../../store/actions/dtr/quickpunchActions', () => ({
    biometrixLog: jest.fn((...a) => ({ type: 'BIOMETRIX_LOG', a })),
}));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getRecentDtr: jest.fn((...a) => ({ type: 'GET_RECENT_DTR', a })),
    getMyDtrNotifications: jest.fn((...a) => ({ type: 'GET_MY_DTR_NOTIFICATIONS', a })),
    clearRecentDtrInstance: jest.fn((...a) => ({ type: 'CLEAR_RECENT_DTR', a })),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const DtrPunch = require('../../container/DtrPunch/DtrPunch').default;
const DailyTimeRecord = require('../../container/DailyTimeRecord/DailyTimeRecord').default;
const NavQuickPunch = require('../../components/Template/NavQuickPunch/NavQuickPunch').default;
const Authenticator = require('../../services/Authenticator').default;

/* ----------------------------------------------------------------- fixtures */

// Mon 20 Jul 2026, 18:00 LOCAL WALL CLOCK, whatever zone this box is in. The multi-argument Date
// constructor is host-zone by definition, and the components format with moment().format(), which
// is host-zone too - so every date assertion below holds at any UTC offset. Do not replace this
// with Date.UTC(): that pins an instant, not a wall clock, and the assertions then only hold at
// one particular offset.
const PINNED_NOW = new Date(2026, 6, 20, 18, 0, 0).getTime();
const realMomentNow = moment.now;

// Same idea, for the one test that needs a late-evening wall clock: local 22:30 on 20 Jul 2026.
// now + 2h crosses local midnight into 21 Jul in EVERY zone, which is exactly the rule under test.
const PINNED_LATE_EVENING = new Date(2026, 6, 20, 22, 30, 0).getTime();

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

const JUL_B = {
    id: 11, name: 'JUL 01 - JUL 15', year: 2026, month: '7', month_label: 'July',
    start_date: '2026-07-01', end_date: '2026-07-15',
};
const JUL_A = {
    id: 9, name: 'JUL 16 - AUG 15', year: 2026, month: '7', month_label: 'July',
    start_date: '2026-07-16', end_date: '2026-08-15',
};
const DEC = {
    id: 3, name: 'DEC 16 - JAN 15', year: 2025, month: '12', month_label: 'December',
    start_date: '2025-12-16', end_date: '2026-01-15',
};

const FILTER = {
    2025: { 12: { label: 'December', data: { 3: DEC } } },
    2026: {
        10: { label: 'October', data: { 21: { id: 21, name: 'OCT 16 - NOV 15', start_date: '2026-10-16', end_date: '2026-11-15' } } },
        7: { label: 'July', data: { 9: JUL_A, 11: JUL_B } },
        8: { label: 'August', data: { 13: { id: 13, name: 'AUG 16 - SEP 15', start_date: '2026-08-16', end_date: '2026-09-15' } } },
    },
};

const SUMMARY = {
    data: {
        reg: { late: '00:10:00', undertime: '00:05:00', night_diff: '01:00:00', overtime: '02:00:00', overtime_night_diff: '00:30:00', ul: '1' },
        rd: { rendered_hours: '4.00', night_diff: '0.25', overtime: '1.00', overtime_night_diff: '0.50' },
    },
    column: { rd: 1 },
    column_names: { rd: 'Rest Day' },
};

const status = (slug, name) => ({ slug, name });

function dtrRow(over = {}) {
    return {
        date: '2026-07-16',
        attendance_status: status('present', 'Present'),
        holidays: [],
        leaves: [],
        requests: [],
        is_rest_day: 0,
        start_datetime: '2026-07-16 08:00:00',
        end_datetime: '2026-07-16 17:00:00',
        start_flexy_datetime: null,
        end_flexy_datetime: null,
        time_in: '2026-07-16 08:01:00',
        time_out: '2026-07-16 17:02:00',
        owner_POV: {
            start_datetime: '2026-07-16 02:00:00',
            end_datetime: '2026-07-16 11:00:00',
            start_flexy_datetime: null,
            end_flexy_datetime: null,
            time_in: '2026-07-16 02:01:00',
            time_out: '2026-07-16 11:02:00',
        },
        payroll_items: {
            late: '00:01:00', undertime: '00:02:00', night_diff: '00:03:00',
            overtime: '00:04:00', overtime_night_diff: '00:05:00',
        },
        ...over,
    };
}

function dtrActions() {
    return {
        getFilterForDtr: jest.fn(),
        viewEmployeeDtr: jest.fn(() => Promise.resolve()),
        getUserDtrSummary: jest.fn(() => Promise.resolve()),
        setSelectedPayrollCutoff: jest.fn(() => Promise.resolve()),
        setRedirect: jest.fn(),
        fetchUser: jest.fn(),
    };
}

function dtrState(over = {}) {
    return {
        filter: FILTER,
        selectedPayrollCutoff: {},
        list: [],
        isFilterLoaded: true,
        isDtrLoaded: true,
        isDtrSummaryLoaded: true,
        dtrSummary: SUMMARY,
        employeeInfo: { full_name: 'Ana Cruz', department: 'Engineering', timezone: 'Asia/Manila' },
        ...over,
    };
}

const SETTINGS_PH = { current_payroll_cutoff_ph: JUL_A };

function dtrProps(over = {}) {
    const { dtr: dtrOver, ...rest } = over;
    return {
        user: { id: 42 },
        params: { id: '42' },
        location: { pathname: '/x/42/' },
        settings: SETTINGS_PH,
        ...rest,
        dtr: dtrState(dtrOver || {}),
    };
}

function renderDtr(over = {}, actions = dtrActions()) {
    const props = dtrProps(over);
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><DailyTimeRecord ref={ref} {...props} {...actions} /></MemoryRouter>
    );
    const rerenderWith = async (nextOver) => {
        const next = dtrProps(nextOver === undefined ? over : nextOver);
        await act(async () => {
            utils.rerender(
                <MemoryRouter><DailyTimeRecord ref={ref} {...next} {...actions} /></MemoryRouter>
            );
        });
        await flush();
        await flush();
    };
    return { ...utils, ref, actions, props, rerenderWith };
}

const sel = (c, name) => c.querySelector('[data-testid="select-' + name + '"]');
const optionsOf = (el) => Array.from(el.querySelectorAll('option')).slice(1)
    .map((o) => ({ value: o.value, label: o.textContent }));

async function pick(container, name, value) {
    await act(async () => {
        fireEvent.change(sel(container, name), { target: { value } });
    });
    await flush();
}

async function chooseCutoff(container, { year = '2026', month = '7', cutoff = '9' } = {}) {
    await pick(container, 'year', year);
    await pick(container, 'month', month);
    await pick(container, 'payroll_cutoff', cutoff);
}

beforeEach(() => {
    moment.now = () => PINNED_NOW;
    Authenticator.scanFeature.mockImplementation(() => true);
    Authenticator.scanLevel.mockImplementation(() => true);
});

afterEach(() => {
    moment.now = realMomentNow;
    jest.clearAllMocks();
});

/* ============================================================================
 *  SCREEN 1 - Sidebar -> Daily Time Record   (container/DailyTimeRecord)
 * ========================================================================== */

describe('Daily Time Record - opening the screen and walking the cut-off cascade', () => {
    test('opening the screen asks only for the cut-off filters of the employee named in the route', () => {
        const { actions } = renderDtr({ params: { id: '77' } });

        expect(actions.getFilterForDtr).toHaveBeenCalledTimes(1);
        expect(actions.getFilterForDtr).toHaveBeenCalledWith('77');
        expect(actions.viewEmployeeDtr).not.toHaveBeenCalled();
        expect(actions.setSelectedPayrollCutoff).not.toHaveBeenCalled();
    });

    test('while the filters are still loading the screen offers no dropdown and no table', () => {
        const { container } = renderDtr({ dtr: { isFilterLoaded: false } });

        expect(sel(container, 'year')).toBeNull();
        expect(container.querySelector('table.dtr-table')).toBeNull();
        expect(container.querySelector('[data-testid="content-title"]').textContent)
            .toBe('Daily Time Record');
        expect(container.querySelector('[data-testid="back-button"]')).not.toBeNull();
    });

    test('once the filters arrive only the year dropdown is offered, listing every year in the filter', () => {
        const { container } = renderDtr();

        expect(optionsOf(sel(container, 'year'))).toEqual([
            { value: '2025', label: '2025' },
            { value: '2026', label: '2026' },
        ]);
        expect(sel(container, 'month')).toBeNull();
        expect(sel(container, 'payroll_cutoff')).toBeNull();
    });

    // Reachable: getFilterForDtr returns an empty object for an employee with no payroll cut-offs
    // yet (a new hire). isFilterLoaded is still true, so the year Select renders - with nothing in it.
    test('an employee with no cut-offs at all still gets the year dropdown, empty, and no table', () => {
        const { container } = renderDtr({ dtr: { filter: {} } });

        expect(sel(container, 'year')).not.toBeNull();
        expect(optionsOf(sel(container, 'year'))).toEqual([]);
        expect(sel(container, 'month')).toBeNull();
        expect(container.querySelector('table.dtr-table')).toBeNull();
    });

    test('choosing a year reveals the month dropdown for that year and still hides the cut-off dropdown', async () => {
        const { container } = renderDtr();
        await pick(container, 'year', '2025');

        expect(optionsOf(sel(container, 'month'))).toEqual([{ value: '12', label: 'December' }]);
        expect(sel(container, 'payroll_cutoff')).toBeNull();
    });

    test('choosing a month reveals the cut-off dropdown listing that month cut-offs by their id', async () => {
        const { container } = renderDtr();
        await pick(container, 'year', '2026');
        await pick(container, 'month', '7');

        expect(optionsOf(sel(container, 'payroll_cutoff'))).toEqual([
            { value: '11', label: 'JUL 01 - JUL 15' },
            { value: '9', label: 'JUL 16 - AUG 15' },
        ]);
    });

    // FINDING DTR_MONTHSORT - Object.keys().sort() is a string sort, so "10" sorts before "7".
    test('_FINDING_DTR_MONTHSORT_ the month dropdown is sorted as text so October is listed before July and August', async () => {
        const { container } = renderDtr();
        await pick(container, 'year', '2026');

        expect(optionsOf(sel(container, 'month')).map((o) => o.label))
            .toEqual(['October', 'July', 'August']);
    });

    test('choosing a cut-off fetches that employee DTR for the cut-off date range and remembers the cut-off', async () => {
        const { container, actions } = renderDtr({ params: { id: '77' } });
        await chooseCutoff(container, { cutoff: '9' });

        expect(actions.viewEmployeeDtr).toHaveBeenCalledTimes(1);
        expect(actions.viewEmployeeDtr).toHaveBeenCalledWith('77', '2026-07-16', '2026-08-15');
        expect(actions.setSelectedPayrollCutoff).toHaveBeenCalledWith(JUL_A);
        expect(container.querySelector('.cutoff-text-border').textContent)
            .toContain('2026-07-16');
        expect(container.querySelector('.cutoff-text-border').textContent)
            .toContain('2026-08-15');
    });

    test('re-picking the year clears the month and the cut-off already chosen', async () => {
        const { container, actions } = renderDtr();
        await chooseCutoff(container);
        expect(actions.viewEmployeeDtr).toHaveBeenCalledTimes(1);

        await pick(container, 'year', '2025');

        expect(sel(container, 'month').value).toBe('');
        expect(sel(container, 'payroll_cutoff')).toBeNull();
        expect(container.querySelector('table.dtr-table')).toBeNull();
        expect(actions.viewEmployeeDtr).toHaveBeenCalledTimes(1);
    });

    test('re-picking the month clears the cut-off but keeps the year', async () => {
        const { container } = renderDtr();
        await chooseCutoff(container);

        await pick(container, 'month', '8');

        expect(sel(container, 'year').value).toBe('2026');
        expect(sel(container, 'payroll_cutoff').value).toBe('');
        expect(optionsOf(sel(container, 'payroll_cutoff')))
            .toEqual([{ value: '13', label: 'AUG 16 - SEP 15' }]);
    });

    // The `: null` arms of handleSelectYear / handleSelectMonth / handleSelectPayrollCutoff are
    // NOT tested here. They run only on onChange(null), which react-select 3.1.0 emits only when
    // mounted with isClearable; DailyTimeRecord mounts none of its three Selects that way. See the
    // dead-code block in the file header.
});

describe('Daily Time Record - the default cut-off handshake when settings arrive', () => {
    test('with nothing remembered in the store the screen falls back to the PH current cut-off', async () => {
        const { rerenderWith, actions, container } = renderDtr();
        await rerenderWith();

        expect(actions.viewEmployeeDtr).toHaveBeenCalledWith('42', '2026-07-16', '2026-08-15');
        expect(actions.setSelectedPayrollCutoff).toHaveBeenCalledWith(JUL_A);
        expect(sel(container, 'year').value).toBe('2026');
        expect(sel(container, 'month').value).toBe('7');
        expect(sel(container, 'payroll_cutoff').value).toBe('9');
    });

    test('a cut-off already remembered in the store wins over the PH default', async () => {
        const { rerenderWith, actions, container } = renderDtr({
            dtr: { selectedPayrollCutoff: DEC },
        });
        await rerenderWith({ dtr: { selectedPayrollCutoff: DEC } });

        expect(actions.setSelectedPayrollCutoff).toHaveBeenCalledWith(DEC);
        expect(actions.viewEmployeeDtr).toHaveBeenCalledWith('42', '2025-12-16', '2026-01-15');
        expect(sel(container, 'year').value).toBe('2025');
        expect(sel(container, 'payroll_cutoff').value).toBe('3');
    });

    test('arriving with location.resetInitialState forces the PH default even when a cut-off is remembered', async () => {
        const base = { dtr: { selectedPayrollCutoff: DEC } };
        const { rerenderWith, actions } = renderDtr(base);
        await rerenderWith({
            ...base,
            location: { pathname: '/x/42/', resetInitialState: true },
        });

        expect(actions.setSelectedPayrollCutoff).toHaveBeenCalledWith(JUL_A);
        expect(actions.setSelectedPayrollCutoff).not.toHaveBeenCalledWith(DEC);
    });

    test('once a cut-off has loaded a further props change with the same settings object does not reload it', async () => {
        const { rerenderWith, actions } = renderDtr();
        await rerenderWith();
        expect(actions.viewEmployeeDtr).toHaveBeenCalledTimes(1);

        await rerenderWith();
        await rerenderWith();

        expect(actions.viewEmployeeDtr).toHaveBeenCalledTimes(1);
        expect(actions.setSelectedPayrollCutoff).toHaveBeenCalledTimes(1);
    });

    test('a brand new settings object reloads the default cut-off even after one is already loaded', async () => {
        const { rerenderWith, actions } = renderDtr();
        await rerenderWith();
        expect(actions.viewEmployeeDtr).toHaveBeenCalledTimes(1);

        await rerenderWith({ settings: { current_payroll_cutoff_ph: DEC } });

        expect(actions.viewEmployeeDtr).toHaveBeenCalledTimes(2);
        expect(actions.viewEmployeeDtr).toHaveBeenLastCalledWith('42', '2025-12-16', '2026-01-15');
    });

    // A test asserting that a settings payload carrying ONLY `current_payroll_cutoff` (without
    // `current_payroll_cutoff_ph`) breaks this screen was removed: the API cannot emit that shape.
    // AuthController.php:364-368 builds settings with all three keys on every response, and
    // `current_payroll_cutoff` is nothing but an alias selected by country_id
    // (`country_id === 1 || country_id === 4 ? _in_mar : _ph`). Reading `_ph` here is the
    // per-region design, matching DailyTimeRecordIndiaMorocco.js:144 (`_in_mar`) and
    // DailyTimeRecordPuncher.js:145 (the alias). There is no defect to characterise.
});

describe('Daily Time Record - what gates the table and the summary block', () => {
    test('a chosen cut-off is not enough - the table stays hidden until the DTR itself has loaded', async () => {
        const { container } = renderDtr({ dtr: { isDtrLoaded: false, list: [dtrRow()] } });
        await chooseCutoff(container);

        expect(container.querySelector('table.dtr-table')).toBeNull();
        expect(container.querySelector('.SummaryBlock')).toBeNull();
    });

    test('with the DTR loaded and a cut-off chosen the table and its twelve column headers appear', async () => {
        const { container } = renderDtr({ dtr: { list: [dtrRow()] } });
        await chooseCutoff(container);

        const headers = Array.from(container.querySelectorAll('table.dtr-table thead th'));
        expect(headers.map((h) => h.textContent.trim())).toEqual([
            'Date', 'Status', 'Schedule', 'Clock In', 'Clock Out',
            'Late', 'Undertime', 'NSD', 'OT', 'OTND', 'Requests STATUS', '',
        ]);
        expect(container.querySelectorAll('table.dtr-table tbody tr')).toHaveLength(1);
    });

    test('the summary block totals the cut-off and is suppressed while the summary is still loading', async () => {
        const loaded = renderDtr({ dtr: { list: [dtrRow()] } });
        await chooseCutoff(loaded.container);
        const bodies = Array.from(loaded.container.querySelectorAll('.SummaryBlock .toast-body'))
            .map((b) => b.textContent.trim());
        expect(bodies.slice(0, 6)).toEqual(['00:10:00', '00:05:00', '01:00:00', '02:00:00', '00:30:00', '1']);

        const pending = renderDtr({ dtr: { list: [dtrRow()], isDtrSummaryLoaded: false } });
        await chooseCutoff(pending.container);
        expect(pending.container.querySelector('.SummaryBlock')).toBeNull();
        expect(pending.container.querySelector('table.dtr-table')).not.toBeNull();
    });

    test('every key in the summary column map becomes its own holiday panel with day, ND, OT and OTND', async () => {
        const { container } = renderDtr({ dtr: { list: [dtrRow()] } });
        await chooseCutoff(container);

        const holiday = container.querySelector('.SummaryBlock .holidays');
        expect(holiday.querySelector('h5').textContent).toContain('Rest Day');
        expect(Array.from(holiday.querySelectorAll('.toast-body')).map((b) => b.textContent.trim()))
            .toEqual(['4.00', '0.25', '1.00', '0.50']);
    });

    test('a holiday column with no matching data block falls back to zeroes rather than blanks', async () => {
        const { container } = renderDtr({
            dtr: {
                list: [dtrRow()],
                dtrSummary: { data: { reg: SUMMARY.data.reg }, column: { rd: 1 }, column_names: { rd: 'Rest Day' } },
            },
        });
        await chooseCutoff(container);

        expect(Array.from(container.querySelectorAll('.SummaryBlock .holidays .toast-body'))
            .map((b) => b.textContent.trim())).toEqual(['0', '0', '0', '0']);
    });
});

describe('Daily Time Record - the per-row rules', () => {
    test('a row dated after today is dropped from the table entirely', async () => {
        const { container } = renderDtr({
            dtr: {
                list: [
                    dtrRow({ date: '2026-07-16' }),
                    dtrRow({ date: '2026-07-25' }),
                ],
            },
        });
        await chooseCutoff(container);

        const rows = container.querySelectorAll('table.dtr-table tbody tr');
        expect(rows).toHaveLength(1);
        expect(rows[0].querySelector('.dtr-date').textContent).toContain('16');
    });

    test('a row dated today is still shown - only strictly future dates are dropped', async () => {
        const { container } = renderDtr({ dtr: { list: [dtrRow({ date: '2026-07-20' })] } });
        await chooseCutoff(container);

        expect(container.querySelectorAll('table.dtr-table tbody tr')).toHaveLength(1);
        expect(container.querySelector('tbody .dtr-date').textContent).toContain('20');
    });

    test('an absent day that falls on a holiday is painted as the holiday and drops the absent label', async () => {
        const { container } = renderDtr({
            dtr: {
                list: [dtrRow({
                    attendance_status: status('absent', 'Absent'),
                    holidays: [{ type: 'regular_holiday', name: 'Independence Day' }],
                })],
            },
        });
        await chooseCutoff(container);

        const row = container.querySelector('table.dtr-table tbody tr');
        expect(row.className).toBe('center regular_holiday-bg-color');
        expect(row.querySelector('.dtr-status').textContent).toBe('Independence Day');
        expect(row.querySelector('.dtr-status').textContent).not.toContain('Absent');
    });

    test('a rest day with no holiday is painted as a rest day and keeps its attendance label', async () => {
        const { container } = renderDtr({
            dtr: {
                list: [dtrRow({
                    is_rest_day: 1,
                    attendance_status: status('rest_day_status', 'Rest Day'),
                })],
            },
        });
        await chooseCutoff(container);

        const row = container.querySelector('table.dtr-table tbody tr');
        expect(row.className).toBe('center rest_day-bg-color');
        expect(row.querySelector('.dtr-status').textContent).toContain('Rest Day');
    });

    test('an ordinary present day keeps the attendance status slug as its row colour', async () => {
        const { container } = renderDtr({ dtr: { list: [dtrRow()] } });
        await chooseCutoff(container);

        const row = container.querySelector('table.dtr-table tbody tr');
        expect(row.className).toBe('center present-bg-color');
        expect(row.querySelector('.dtr-status').textContent).toContain('Present');
    });

    test('an approved leave with an amount blanks the undertime for that day', async () => {
        const { container } = renderDtr({
            dtr: { list: [dtrRow({ leaves: [{ amount: 0.5, status: 'approved' }] })] },
        });
        await chooseCutoff(container);

        const cells = container.querySelectorAll('table.dtr-table tbody tr .dtr-item');
        expect(cells[0].textContent).toBe('00:01:00');
        expect(cells[1].textContent).toBe('');
    });

    test('a leave that is not approved, or approved with no amount, leaves the undertime standing', async () => {
        const pending = renderDtr({
            dtr: { list: [dtrRow({ leaves: [{ amount: 1, status: 'pending' }] })] },
        });
        await chooseCutoff(pending.container);
        expect(pending.container.querySelectorAll('tbody .dtr-item')[1].textContent).toBe('00:02:00');

        const zero = renderDtr({
            dtr: { list: [dtrRow({ leaves: [{ amount: 0, status: 'approved' }] })] },
        });
        await chooseCutoff(zero.container);
        expect(zero.container.querySelectorAll('tbody .dtr-item')[1].textContent).toBe('00:02:00');
    });

    test('every request on a day is listed as a title-cased type and status pair', async () => {
        const { container } = renderDtr({
            dtr: {
                list: [dtrRow({
                    requests: [
                        { id: 5, request_type: 'alter_log', status: 'pending' },
                        { id: 6, request_type: 'overtime', status: 'approved' },
                    ],
                })],
            },
        });
        await chooseCutoff(container);

        const items = Array.from(container.querySelectorAll('.requests-list li'));
        expect(items.map((li) => li.textContent)).toEqual([
            'Alter Log - Pending', 'Overtime - Approved',
        ]);
        expect(items.map((li) => li.className)).toEqual(['Pending', 'Approved']);
    });
});

describe('Daily Time Record - who may raise an alter-log request', () => {
    const withRequests = (requests, extra = {}) => ({
        dtr: { list: [dtrRow({ requests, ...extra })] },
    });

    test('on my own DTR a day with no alter log offers the alter-log button with an empty id', async () => {
        const { container } = renderDtr(withRequests([]));
        await chooseCutoff(container);

        const link = container.querySelector('td.dtr-actions a');
        expect(link).not.toBeNull();
        expect(link.getAttribute('href')).toBe('/x/request/AlterLog/');
        expect(link.getAttribute('title')).toBe('Alter Log');
    });

    test('on my own DTR a day with a pending alter log links straight to that request id', async () => {
        const { container } = renderDtr(
            withRequests([{ id: 5, request_type: 'alter_log', status: 'pending' }])
        );
        await chooseCutoff(container);

        expect(container.querySelector('td.dtr-actions a').getAttribute('href'))
            .toBe('/x/request/AlterLog/5');
    });

    test('an already approved alter log withdraws the button for that day', async () => {
        const { container } = renderDtr(
            withRequests([{ id: 5, request_type: 'alter_log', status: 'approved' }])
        );
        await chooseCutoff(container);

        expect(container.querySelector('td.dtr-actions a')).toBeNull();
    });

    test('a rest day never offers the alter-log button even on my own DTR', async () => {
        const { container } = renderDtr(withRequests([], { is_rest_day: 1 }));
        await chooseCutoff(container);

        expect(container.querySelector('td.dtr-actions a')).toBeNull();
    });

    test('an approver looking at someone else DTR gets no alter-log button at all', async () => {
        const { container } = renderDtr({
            params: { id: '77' },
            dtr: { list: [dtrRow()] },
        });
        await chooseCutoff(container);

        expect(container.querySelector('td.dtr-actions a')).toBeNull();
    });
});

describe('Daily Time Record - the approver-only controls', () => {
    test('the Update Schedule link needs both the change_employee_schedule feature and someone else DTR', () => {
        const other = renderDtr({ params: { id: '77' } });
        const link = other.container.querySelector('.btn-update-sched a');
        expect(link).not.toBeNull();
        expect(link.getAttribute('href')).toBe('/x/77');
        expect(Authenticator.scanFeature).toHaveBeenCalledWith('change_employee_schedule');

        const own = renderDtr();
        expect(own.container.querySelector('.btn-update-sched')).toBeNull();

        Authenticator.scanFeature.mockImplementation(() => false);
        const denied = renderDtr({ params: { id: '77' } });
        expect(denied.container.querySelector('.btn-update-sched')).toBeNull();
    });

    test('the header shows the employee name and department only when looking at someone else DTR', () => {
        const other = renderDtr({ params: { id: '77' } });
        const subtitle = other.container.querySelector('[data-testid="content-subtitle"]');
        expect(subtitle.textContent).toContain('Ana Cruz');
        expect(subtitle.textContent).toContain('Engineering');

        const own = renderDtr();
        expect(own.container.querySelector('[data-testid="content-subtitle"]').textContent).toBe('');
    });

    test('Toggle Outlook is offered only on someone else DTR and swaps the schedule and logs to the owner timezone', async () => {
        const own = renderDtr({ dtr: { list: [dtrRow()] } });
        await chooseCutoff(own.container);
        expect(own.container.querySelector('.toggle-outlook-dtr')).toBeNull();

        const { container } = renderDtr({ params: { id: '77' }, dtr: { list: [dtrRow()] } });
        await chooseCutoff(container);

        expect(container.querySelector('tbody .dtr-schedule').textContent).toContain('8:00:00');
        expect(container.querySelectorAll('tbody .dtr-log')[0].textContent).toContain('8:01:00');
        expect(container.querySelector('.dtr-schedule-toggle-on').textContent.trim()).toBe('');

        await act(async () => { fireEvent.click(container.querySelector('.toggle-outlook-dtr')); });

        expect(container.querySelector('.dtr-schedule-toggle-on').textContent.trim())
            .toBe('( Asia/Manila )');
        const bodyRow = container.querySelector('table.dtr-table tbody tr');
        expect(bodyRow.querySelector('.dtr-schedule').textContent).toContain('2:00:00');
        expect(bodyRow.querySelectorAll('.dtr-log')[0].textContent).toContain('2:01:00');
        expect(bodyRow.querySelectorAll('.dtr-log')[1].textContent).toContain('11:02:00');
    });

    test('toggling Outlook twice returns the table to the viewer own timezone', async () => {
        const { container, ref } = renderDtr({ params: { id: '77' }, dtr: { list: [dtrRow()] } });
        await chooseCutoff(container);

        await act(async () => { fireEvent.click(container.querySelector('.toggle-outlook-dtr')); });
        expect(ref.current.state.toggle_pov).toBe(true);
        await act(async () => { fireEvent.click(container.querySelector('.toggle-outlook-dtr')); });

        expect(ref.current.state.toggle_pov).toBe(false);
        expect(container.querySelector('.dtr-schedule-toggle-on').textContent.trim()).toBe('');
        expect(container.querySelector('table.dtr-table tbody .dtr-schedule').textContent)
            .toContain('8:00:00');
    });
});

describe('Daily Time Record - redux wiring', () => {
    test('the screen subscribes to the dtr and settings slices and to nothing else', () => {
        const mapped = DailyTimeRecord.__mapState({
            dtr: { list: [] }, settings: SETTINGS_PH, user: { id: 1 }, page: {},
        });

        expect(Object.keys(mapped).sort()).toEqual(['dtr', 'settings']);
        expect(mapped.dtr).toEqual({ list: [] });
        expect(mapped.settings).toBe(SETTINGS_PH);
    });

    test('every dispatcher the screen maps forwards its own argument list', () => {
        const dispatch = jest.fn();
        const props = DailyTimeRecord.__mapDispatch(dispatch);

        props.getFilterForDtr(77);
        props.viewEmployeeDtr(77, '2026-07-16', '2026-08-15');
        props.setSelectedPayrollCutoff(JUL_A);
        props.setRedirect('/x/');
        props.fetchUser();

        expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
            { type: 'GET_FILTER_FOR_DTR', a: [77] },
            { type: 'VIEW_EMPLOYEE_DTR', a: [77, '2026-07-16', '2026-08-15'] },
            { type: 'SET_SELECTED_CUTOFF', a: [JUL_A] },
            { type: 'SET_REDIRECT', a: ['/x/'] },
            { type: 'FETCH_USER', a: [] },
        ]);
    });
});

/* ============================================================================
 *  SCREEN 2 - Sidebar -> Multi Clock-in   (container/DtrPunch)
 * ========================================================================== */

function renderPunchScreen(over = {}, actions = dtrActions()) {
    const { dtr: dtrOver, ...rest } = over;
    const props = {
        user: { id: 42 },
        params: {},
        location: { pathname: '/x/' },
        settings: SETTINGS_PH,
        ...rest,
        dtr: dtrState(dtrOver || {}),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><DtrPunch ref={ref} {...props} {...actions} /></MemoryRouter>
    );
    const rerenderWith = async (nextOver = over) => {
        const { dtr: o, ...r } = nextOver;
        await act(async () => {
            utils.rerender(
                <MemoryRouter>
                    <DtrPunch
                        ref={ref}
                        user={{ id: 42 }}
                        params={{}}
                        location={{ pathname: '/x/' }}
                        settings={SETTINGS_PH}
                        {...r}
                        dtr={dtrState(o || {})}
                        {...actions}
                    />
                </MemoryRouter>
            );
        });
        await flush();
    };
    return { ...utils, ref, actions, rerenderWith };
}

describe('Multi Clock-in - the punch-correction screen', () => {
    test('the screen is the Multi Clock in header wrapping the punch pad and the recent-punch panel', () => {
        const { container } = renderPunchScreen();

        expect(container.querySelector('[data-testid="content-title"]').textContent)
            .toBe('Multi Clock in');
        expect(container.querySelector('[data-testid="multi-quickpunch"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="recent-punch"]')).not.toBeNull();
        expect(container.querySelector('.dtr-wrapper')).not.toBeNull();
    });

    // FINDING DTRPUNCH_NOFETCH - componentWillMount's getFilterForDtr call is commented out.
    test('_FINDING_DTRPUNCH_NOFETCH_ opening Multi Clock-in dispatches nothing, so its filter data is whatever another screen left behind', () => {
        const { actions } = renderPunchScreen();

        expect(actions.getFilterForDtr).not.toHaveBeenCalled();
        expect(actions.viewEmployeeDtr).not.toHaveBeenCalled();
        expect(actions.getUserDtrSummary).not.toHaveBeenCalled();
        expect(actions.setSelectedPayrollCutoff).not.toHaveBeenCalled();
        expect(actions.fetchUser).not.toHaveBeenCalled();
        expect(actions.setRedirect).not.toHaveBeenCalled();
    });

    // FINDING DTRPUNCH_NOROUTEPARAM - the route is exact "/app/punch_history/" with no ":id",
    // so ProtectedRoute passes params = {}. In a real browser this is identical: React Router's
    // computedMatch.params for a path with no parameter segment is an empty object.
    test('_FINDING_DTRPUNCH_NOROUTEPARAM_ the route carries no employee id, so my own punch screen always renders in approval mode', () => {
        const { container } = renderPunchScreen();

        const subtitle = container.querySelector('[data-testid="content-subtitle"]');
        expect(subtitle.textContent).toContain('Ana Cruz');
        expect(subtitle.textContent).toContain('Engineering');
    });

    // The complementary case - a route that DID carry a matching :id, switching method to 'store' -
    // is not tested, because it cannot happen. DtrPunch has exactly one mount site
    // (RouteList.js:159-163) and its path literal is GlobalVariables.js:24 "/app/punch_history/",
    // registered `exact` with no parameter segment. params.id is therefore permanently undefined
    // and method is permanently 'approval'.

    test('in approval mode with no employee loaded yet the header prints nothing rather than crashing', () => {
        // employeeInfo: null is the real initial shape - dtrReducers.js:11 - not undefined.
        const { container } = renderPunchScreen({ dtr: { employeeInfo: null } });

        expect(container.querySelector('[data-testid="content-subtitle"]').textContent).toBe('');
        expect(container.querySelector('[data-testid="multi-quickpunch"]')).not.toBeNull();
    });

    // FINDING DTRPUNCH_DEADFILTER - render() still builds yearOptions on every pass (and would build
    // monthOptions/payrollCutoffOptions if any UI could set selectedYear), but the <Select>s that
    // consumed them are commented out of the JSX. The reachable, falsifiable form of that claim is
    // that the screen's ENTIRE output is invariant under the filter slice: a store holding three
    // years of cut-offs and an empty store paint byte-identical markup. This fails the moment
    // anybody re-enables a dropdown, which is the point.
    test('_FINDING_DTRPUNCH_DEADFILTER_ the screen paints identical markup with a full cut-off filter and with none', () => {
        const full = renderPunchScreen();
        const empty = renderPunchScreen({ dtr: { filter: {} } });

        expect(full.container.querySelectorAll('select')).toHaveLength(0);
        expect(empty.container.querySelectorAll('select')).toHaveLength(0);
        expect(full.container.querySelector('.dtr-filter')).toBeNull();
        expect(full.container.innerHTML).toBe(empty.container.innerHTML);
        // and the discarded arrays are genuinely built from a non-empty filter, not an empty one
        expect(Object.keys(FILTER)).toEqual(['2025', '2026']);
    });

    test('new props reach the screen without triggering any fetch - its componentWillReceiveProps body is empty', async () => {
        const { rerenderWith, actions } = renderPunchScreen();

        await rerenderWith({ settings: { current_payroll_cutoff_ph: DEC } });
        await rerenderWith({ dtr: { selectedPayrollCutoff: JUL_A } });

        expect(actions.viewEmployeeDtr).not.toHaveBeenCalled();
        expect(actions.setSelectedPayrollCutoff).not.toHaveBeenCalled();
        expect(actions.getFilterForDtr).not.toHaveBeenCalled();
    });

    // Plain redux-wiring assertion. This deliberately carries NO _FINDING_ label: an earlier
    // revision labelled it DTRPUNCH_NOUSER and claimed the screen is broken because render() reads
    // this.props.user.id while mapStateToProps maps only {dtr, settings}. That is not a defect.
    // ProtectedRoutes.js maps `user` from state itself (line 85-89) and hands it down with
    // React.cloneElement(child, { params: ..., ...props }) at line 43, so `user` is always present
    // on the only mount path the screen has. mapStateToProps runs on every store update, so this is
    // live code, not dead - but the shape it produces is correct, not a bug.
    test('the punch screen subscribes to the dtr and settings slices and to nothing else', () => {
        const mapped = DtrPunch.__mapState({
            dtr: { filter: {} }, settings: SETTINGS_PH, user: { id: 42 },
        });

        expect(Object.keys(mapped).sort()).toEqual(['dtr', 'settings']);
        expect(mapped.dtr).toEqual({ filter: {} });
        expect(mapped.settings).toBe(SETTINGS_PH);
    });

    // DtrPunch's six mapDispatchToProps thunks are NOT driven here. DTRPUNCH_NOFETCH above records
    // that no code path in the component calls any of them; invoking them through __mapDispatch
    // would take DtrPunch from 25% to 100% function coverage without protecting one line a user
    // can reach. If the filter UI is ever restored, add the tests then.
});

/* ============================================================================
 *  SCREEN 3 - top navigation bar   (components/Template/NavQuickPunch)
 * ========================================================================== */

function navActions() {
    return {
        getRecentDtr: jest.fn(),
        getMyDtrNotifications: jest.fn(),
        biometrixLog: jest.fn(),
        clearRecentDtrInstance: jest.fn(),
        getIncompleteDtr: jest.fn(),
    };
}

function renderNav(over = {}, actions = navActions()) {
    const props = {
        user: { id: 42 },
        settings: {},
        dashboard: { recent_dtr: [], my_dtr_notifications: [] },
        incompletedtr: {},
        ...over,
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><NavQuickPunch ref={ref} {...props} {...actions} /></MemoryRouter>
    );
    const rerenderWith = (nextOver = over) => {
        act(() => {
            utils.rerender(
                <MemoryRouter>
                    <NavQuickPunch
                        ref={ref}
                        user={{ id: 42 }}
                        settings={{}}
                        dashboard={{ recent_dtr: [], my_dtr_notifications: [] }}
                        incompletedtr={{}}
                        {...nextOver}
                        {...actions}
                    />
                </MemoryRouter>
            );
        });
    };
    return { ...utils, ref, actions, rerenderWith };
}

const navRow = (over = {}) => ({
    id: 1, start_datetime: '2026-07-20 08:00:00', time_in: '2026-07-20 08:01:00',
    time_out: '2026-07-20 17:00:00', is_rest_day: 0, ...over,
});

describe('Nav quick punch - loading the wearer own DTR', () => {
    test('the nav asks for the signed-in user last two days and for their DTR notifications', () => {
        const { actions } = renderNav();

        expect(actions.getRecentDtr).toHaveBeenCalledTimes(1);
        expect(actions.getRecentDtr).toHaveBeenCalledWith(42, '2026-07-19', '2026-07-20');
        expect(actions.getMyDtrNotifications).toHaveBeenCalledTimes(1);
        expect(actions.getMyDtrNotifications).toHaveBeenCalledWith(42);
    });

    // NavQuickPunch.js:78-79 formats moment().add(2,'hours') with moment().format(), i.e. in the
    // host zone. Pinning a LOCAL 22:30 (not a UTC instant) means "now + 2h" lands at 00:30 on the
    // next local day in every zone on earth, so the assertion below is offset-independent while
    // still failing outright if the .add(2,'hours') is ever removed - without the shift `to` would
    // read 2026-07-20.
    test('the window is shifted two hours forward, so from 22:30 local the nav already asks for tomorrow', () => {
        moment.now = () => PINNED_LATE_EVENING;
        const { actions } = renderNav();

        expect(actions.getRecentDtr).toHaveBeenCalledWith(42, '2026-07-20', '2026-07-21');
    });

    // FINDING NAVQP_RENDERFETCH - the guard is a direct state mutation inside render().
    test('_FINDING_NAVQP_RENDERFETCH_ the fetch fires from render behind a directly mutated flag, so later renders never refetch', () => {
        const { actions, rerenderWith, ref } = renderNav();
        expect(ref.current.state.NavHasLoaded).toBe(true);

        rerenderWith({ dashboard: { recent_dtr: [navRow()], my_dtr_notifications: [] } });
        rerenderWith({ dashboard: { recent_dtr: [navRow(), navRow()], my_dtr_notifications: [] } });

        expect(actions.getRecentDtr).toHaveBeenCalledTimes(1);
        expect(actions.getMyDtrNotifications).toHaveBeenCalledTimes(1);
    });

    test('a user object with no id yet fetches nothing and leaves the flag down for a later render', () => {
        const { actions, ref, rerenderWith } = renderNav({ user: {} });

        expect(actions.getRecentDtr).not.toHaveBeenCalled();
        expect(actions.getMyDtrNotifications).not.toHaveBeenCalled();
        expect(ref.current.state.NavHasLoaded).toBe(false);

        rerenderWith({ user: { id: 42 } });
        expect(actions.getRecentDtr).toHaveBeenCalledTimes(1);
    });

    test('the nav paints its clock and exactly three tabs in order even before any DTR has arrived', () => {
        const { container } = renderNav();

        expect(container.querySelector('li.nav-item.nav-clock-dropdown')).not.toBeNull();
        expect(container.querySelector('[data-testid="nav-puncher"]')).not.toBeNull();

        // NavQuickPunch.js:113-126 - three <Tab>s, in this order, inside the dropdown menu.
        const tabs = Array.from(
            container.querySelectorAll('[data-testid="dropdown-menu"] [data-testid="tabs"] > div')
        );
        expect(tabs).toHaveLength(3);
        expect(tabs[0].querySelector('.tab-title').textContent).toBe('RECENT DTR');
        expect(tabs[0].querySelector('[data-testid="recent-dtr-nav"]')).not.toBeNull();
        expect(tabs[1].querySelector('.tab-title').textContent).toBe('DTR NOTIFICATIONS');
        expect(tabs[1].querySelector('[data-testid="dtr-notifications"]')).not.toBeNull();
        expect(tabs[2].id).toBe('incLogs');
    });
});

describe('Nav quick punch - the incomplete timelog counter', () => {
    const label = (c) => c.querySelector('#incLogs .tab-title').textContent;

    test('with every notified day complete the counter tab carries no label at all', () => {
        const { container } = renderNav({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [
                    { time_in: '08:00', time_out: '17:00' },
                    { time_in: '09:00', time_out: '18:00' },
                ],
            },
        });

        expect(label(container)).toBe('');
    });

    test('a day missing its clock out and a day missing its clock in are both counted', () => {
        const { container } = renderNav({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [
                    { time_in: '08:00', time_out: null },
                    { time_in: null, time_out: '17:00' },
                    { time_in: '09:00', time_out: '18:00' },
                ],
            },
        });

        expect(label(container)).toBe('Incomplete Timelogs: 2');
    });

    test('a day missing both punches counts once, not twice', () => {
        const { container } = renderNav({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [{ time_in: null, time_out: null }],
            },
        });

        expect(label(container)).toBe('Incomplete Timelogs: 1');
    });

    test('with no notifications at all the counter tab is present but empty', () => {
        const { container } = renderNav();

        expect(container.querySelector('#incLogs')).not.toBeNull();
        expect(label(container)).toBe('');
    });

    test('the counter tab is a read-only label - it is disabled whether or not it has a count', () => {
        const empty = renderNav();
        expect(empty.container.querySelector('#incLogs').getAttribute('data-disabled')).toBe('true');

        const counted = renderNav({
            dashboard: { recent_dtr: [], my_dtr_notifications: [{ time_in: null, time_out: null }] },
        });
        expect(counted.container.querySelector('#incLogs').getAttribute('data-disabled')).toBe('true');
        expect(counted.container.querySelector('[data-testid="tab-recent"]').getAttribute('data-disabled'))
            .toBe('false');
    });
});

// The biometrix submission payload (NavQuickPunch.onSubmitHandler, NavQuickPunch.js:40) had three
// tests here. They were removed: the handler is dead code. render() emits no <form>, no onSubmit
// and no Formik element, and its three children - <NavPuncher/>, <RecentDtrNav/>, <DtrNotifications/>
// - are each rendered with zero props, so the handler is not passed anywhere either. The only way to
// reach it was ref.current.onSubmitHandler(...) from the test itself. The Formik and Yup imports
// (lines 23-24), `initialValue` (line 66) and `validationSchema` (line 142) are unreferenced for the
// same reason. If a punch form is ever wired up, restore these tests against that form.

describe('Nav quick punch - what the nav does NOT do', () => {
    // FINDING NAVQP_DEADERR - NavQuickPunch.js:72-74 computes `showErr` on every render (with a
    // bitwise `&` where `&&` was meant) and then never reads it, so a day clocked in against no
    // schedule surfaces nothing. Asserting "no .alert exists" would be unfalsifiable over a tree
    // whose children are stubbed. This asserts the stronger, falsifiable form instead: the nav's
    // own markup is byte-identical between a store that makes showErr true and one that makes it
    // false. showErr cannot leak through a child either - all three children take no props.
    test('_FINDING_NAVQP_DEADERR_ a day clocked in against no schedule changes nothing the nav renders', () => {
        const errCase = renderNav({
            dashboard: {
                recent_dtr: [
                    navRow({ start_datetime: null, time_in: '2026-07-19 08:00:00', is_rest_day: 0 }),
                    navRow({ start_datetime: null, time_in: '2026-07-20 08:00:00', is_rest_day: 0 }),
                ],
                my_dtr_notifications: [],
            },
        });
        const okCase = renderNav({
            dashboard: {
                recent_dtr: [
                    navRow({ start_datetime: '2026-07-19 08:00:00', time_in: '2026-07-19 08:01:00' }),
                    navRow({ start_datetime: '2026-07-20 08:00:00', time_in: '2026-07-20 08:01:00' }),
                ],
                my_dtr_notifications: [],
            },
        });

        expect(errCase.container.innerHTML).toBe(okCase.container.innerHTML);
        expect(errCase.container.querySelector('.alert')).toBeNull();
        expect(errCase.container.textContent).not.toMatch(/error/i);
    });

    // FINDING NAVQP_DEADINCOMPLETE
    test('_FINDING_NAVQP_DEADINCOMPLETE_ incompleteDtr is mapped from the store and dispatchable, yet nothing reads it', () => {
        const mapped = NavQuickPunch.__mapState({
            user: { id: 42 }, settings: {}, dashboard: { recent_dtr: [] },
            dtr: { incompleteDtr: { 5: true } },
        });
        expect(mapped.incompletedtr).toEqual({ 5: true });

        const { container, actions } = renderNav({ incompletedtr: { 5: true } });
        expect(actions.getIncompleteDtr).not.toHaveBeenCalled();
        expect(container.textContent).not.toContain('5');
    });

    test('the nav subscribes to the user, settings, dashboard and incomplete-DTR slices', () => {
        const mapped = NavQuickPunch.__mapState({
            user: { id: 42 }, settings: { a: 1 }, dashboard: { recent_dtr: [] },
            dtr: { incompleteDtr: {} },
        });

        expect(Object.keys(mapped).sort())
            .toEqual(['dashboard', 'incompletedtr', 'settings', 'user']);
        expect(mapped.user).toEqual({ id: 42 });
    });

    // Only the two dispatchers the component actually calls (NavQuickPunch.js:82-83) are driven.
    // biometrixLog, clearRecentDtrInstance and getIncompleteDtr are mapped but have no live call
    // site - biometrixLog's only caller is the dead onSubmitHandler, clearRecentDtrInstance has
    // none at all, and getIncompleteDtr's is commented out at line 84.
    test('the notification dispatcher takes no argument, so the employee id the nav passes is dropped on purpose', () => {
        const dispatch = jest.fn();
        const props = NavQuickPunch.__mapDispatch(dispatch);

        props.getRecentDtr(42, '2026-07-19', '2026-07-20');
        props.getMyDtrNotifications(42);

        expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
            { type: 'GET_RECENT_DTR', a: [42, '2026-07-19', '2026-07-20'] },
            { type: 'GET_MY_DTR_NOTIFICATIONS', a: [] },
        ]);
    });
});
