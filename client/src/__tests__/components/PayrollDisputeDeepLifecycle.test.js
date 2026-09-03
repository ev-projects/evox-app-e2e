/**
 * PayrollDisputeDeepLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   - src/components/PayrollDispute/DisputeForm.js     (single dispute review / create screen)
 *   - src/components/PayrollDispute/DisputeReport.js   (dispute list + CSV export)
 *
 * MENU PATH
 *   Reports -> Payroll Dispute Report          => DisputeReport  (/app/payrolldisputeview/)
 *   Reports -> Payroll Dispute Report -> (eye) => DisputeForm    (/app/payrolldispute/:id?)
 *   Both components are mounted by live routes: RouteList.js:525-530 inside <ProtectedRoute>.
 *   ProtectedRoutes.js:42-44 clones every routed child with
 *   { params: computedMatch.params, ...ownProps }, which is the ONLY reason these two components
 *   receive `params`, `history` and (for DisputeReport) `user`.
 *   A live route makes the COMPONENT reachable. It does NOT make every branch inside the
 *   component reachable — several arms of both files cannot be entered by any route, any UI
 *   action or any server response, and are listed under NOT TESTED below rather than covered.
 *
 * COVERAGE FOR THESE TWO FILES
 *   before this suite   DisputeForm 64.34%  |  DisputeReport 82.50%  |  combined 68.31%
 *   after  this suite   see the run recorded with the delivery.
 *
 * OVERLAP CONTROL — PayrollDisputeLifecycle, evoxtest_DisputeFormDeep2 and
 * evoxtest_DisputeFormDeep3 already own: create-mode mount, edit-mode mount (Deep2:187 asserts
 * getDisputeReport('5')), three cutoff month-boundary arms, cutoff empty/error arms, the employee
 * <select> dataset population, the unreachable numeric guard (DSP-NUM-1), the missing create
 * submit (DSP-CRT-1), the Approve/Decline happy paths, the report's level-gated filters, the
 * 39- vs 12-column tables and the export filename for a real date range.
 * This suite is not free of overlap with them and does not claim to be. Two assertions
 * deliberately restate theirs as a precondition of a different claim: the 39-header count (also
 * in PayrollDisputeLifecycle:519/553/610) and the cutoff URL shape (also in
 * evoxtest_DisputeFormDeep2:116). Everything else here is new: the connect() wiring itself, the
 * [payroll] effect re-run that every real create-screen visit performs, the cutoff 15th/16th
 * boundary, decision-payload exactness, the unlocked decision buttons, and the first-paint /
 * malformed-record arms of both screens.
 * ADDITIVE ONLY — no existing test and no app source was modified.
 *
 * FINDINGS CHARACTERIZED HERE (asserted as current behaviour; flip the test when fixed)
 *   DSP-EFF-1   The create screen's effect depends on [payroll], and its own success arm
 *               dispatches payrollperiod(name) into that same slice. So every visit runs the
 *               effect TWICE: two /getpayrollcutoff calls and two fetchUserDispute dispatches
 *               for one page load.
 *   DSP-REF-3   Consequence of DSP-EFF-1 + DSP-REF-2: on the second pass `payroll` is now set,
 *               so `payroll && inputRef1.current.focus()` (DisputeForm.js:275) throws — inputRef1
 *               is declared at line 28 and attached to NO element anywhere in the file — and the
 *               found cutoff is reported to the user as an error alert. Every real create-screen
 *               visit ends in an error alert for a cutoff that WAS found.
 *   DSP-REF-4   The same class of bug one line later and on BOTH passes: handleCutoff resumes
 *               after the awaited chain with inputref4.current.focus() (DisputeForm.js:296), and
 *               inputref4's only <input> sits inside the JSX comment at 634-641. The TypeError
 *               lands in the outer catch (310-312) as console.error('Error fetching employee
 *               details:'), and the setFormData at 297-304 never runs. Silent to the user,
 *               so DSP-REF-3's "first pass succeeds quietly" is only true of visible alerts.
 *   DSP-HDG-1   Edit mode tests Authenticator.scanLevel("Payroll") to choose between two
 *               IDENTICAL <h2>Dispute Form</h2> headings — the level check has no effect.
 *   DSP-DBL-1   Nothing locks the decision buttons while a PUT is in flight. Scope corrected
 *               after audit: services/API.js:38-40 dedupes in-flight requests on
 *               JSON.stringify([url, method, data, params]), so a repeated Approve (identical
 *               body) is intercepted and rejected with 499 DUPLICATE_REQUEST_INTERCEPTED and
 *               never reaches the server. Approve-then-Decline builds a DIFFERENT body, is not
 *               deduped, and does send two contradictory decisions for one dispute. Only that
 *               arm is asserted here.
 *   DSP-REC-1   state.report.dispute_record starts as [] (reportReducers.js:8), and `[]` is
 *               truthy, so the employee identity panel paints "Employee Number:/Name:/
 *               Department:" with blank values before any record has loaded.
 *   DSP-REC-2   getDisputeReport stores result.data.content[0] (reportActions.js:74). For a
 *               dispute id that returns no row the slice becomes undefined and the whole screen
 *               throws on dispute_record.login_date. Reachable by URL with a stale/foreign id.
 *   DSP-REM-1   The reviewer's Remarks box is uncontrolled and unbound: the remarks the
 *               employee filed (dispute_record.Remarks) are never shown on the review screen.
 *   DSP-MAP-1   mapDispatchToProps binds five action creators onto props; the component uses
 *               useDispatch for all of them and references none of the bound props. connect()
 *               runs the factory on every mount, so the SHAPE it produces is asserted; the five
 *               closures it returns are dead and are deliberately NOT invoked (see NOT TESTED).
 *   RPT-USER-2  DisputeReport.mapStateToProps returns no `user` key at all, yet the render reads
 *               user.id (line 246). It only works because ProtectedRoutes spreads its own
 *               `user` prop into the child. This CORRECTS the RPT-USER-1 note in
 *               PayrollDisputeLifecycle: the live screen does not blank out, because the route
 *               wrapper — not connect — supplies `user`.
 *   RPT-EXP-2   With no current payroll cutoff the export filename is built from
 *               new Date(null) = the Unix epoch, so the file downloads named after 1 Jan 1970
 *               instead of after any cutoff.
 *   RPT-STAT-1  The Status filter's initial value ('') matches none of its three options, so the
 *               control READS "Pending" while the query it drives asks for every status. The
 *               mechanism is react-dom, not the browser: ReactDOMSelect.updateOptions
 *               (react-dom.development.js:2215-2235) never assigns select.value; when no option
 *               matches the controlled value it marks the first non-disabled option
 *               `selected` instead. Same code ships to Chrome, so the finding is real there.
 *   RPT-DATE-1  A dispute row whose login_date is null renders as the Unix epoch
 *               (moment(new Date(null))); only a missing key gives "Invalid date".
 *
 * NOT TESTED — UNREACHABLE (documented instead of covered)
 *   DisputeForm.handleEmployeeSearch (lines 316-365, still contains alert('test1'..'test4')),
 *   DisputeForm.fetchDisputes (198-261), DisputeForm.handleblur (576-623),
 *   defaultFormData/defaultFormData1, DisputeReport.fetchDepartment (40-60): no JSX or handler
 *   references any of them. DisputeForm.validateNumber and the two guarded arms of handleChange
 *   are reachable only from inputs whose names live in formvalidate/formvalidate1 — every one of
 *   those inputs is either disabled="true" (Late, Undertime) or commented out (dispute_type,
 *   description), so a browser can never fire their onChange. `props.style ? props.style : null`
 *   on the Back button: no caller passes style.
 *   Three more arms were REMOVED from this suite after audit because nothing can enter them:
 *     - DisputeForm.js:432-434, handleSubmit's outer catch. It fires only if API.call throws
 *       SYNCHRONOUSLY. services/API.js:17-80 returns trackPromise(axios(...)).then().catch() for
 *       any valid config and Promise.reject({status:499}) for a duplicate — it never throws. A
 *       real transport failure is a REJECTED PROMISE and takes the .catch arm, which DOES alert.
 *     - DisputeReport.js:80-82, fetchDisputes' outer catch. It wraps only
 *       dispatch(fecthdispute(filters)); fecthdispute (Disouteapi.js:27-48) returns an async
 *       thunk, redux-thunk is installed (store.js:6), and an async function cannot throw
 *       synchronously — so dispatch cannot throw and the console.error is dead. A failed refresh
 *       raises Formatter.alert_error from the thunk's own .catch.
 *     - DisputeForm.js:1350-1360, the five arrow bodies mapDispatchToProps returns. The factory
 *       runs on every mount; the closures are never called, because the component dispatches
 *       everything through useDispatch.
 *   All of this stays uncovered on purpose. Coverage bought from arms no user can reach is not
 *   coverage.
 *
 * WHEN AND WHERE THIS RUNS
 *   Both screens format dates with moment(new Date(x)) in LOCAL time, so a literal like
 *   '01Jan1970' is only correct at a non-negative UTC offset and the repo pins no TZ
 *   (package.json has a bare `react-scripts test`). Every date assertion below is therefore
 *   built from the instant under test with the platform Date — never with moment — and is
 *   additionally bounded to the two/three labels the full UTC-12..UTC+14 range can produce.
 *   The suite is green at any offset, not just the Asia/Manila of the delivery command.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ mocks */

const mockDispatch = jest.fn((a) => a);
const mockHistoryPush = jest.fn();

// connect() is kept as an identity HOC (house pattern) but the two map functions are captured
// off the component so the wiring connect really executes on every mount can be asserted.
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (msp, mdp) => (Component) => {
        Component.mapStateToProps = msp;
        Component.mapDispatchToProps = mdp;
        return Component;
    },
    useDispatch: () => mockDispatch,
}));

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({ push: mockHistoryPush }),
    useParams: () => ({}),
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('react-bootstrap', () => ({
    Button: ({ children, onClick, type }) => <button type={type} onClick={onClick}>{children}</button>,
    Table:  ({ children, className }) => <table className={className}>{children}</table>,
}));

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_success:       jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    alert_error:         jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
    alert_error_message: jest.fn(() => ({ type: 'STUB_ALERT_ERROR_MSG' })),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(),
    scanFeature: jest.fn(() => true),
    scanLevel_Feature: jest.fn(() => true),
}));

jest.mock('../../components/PayrollDispute/Disouteapi.js', () => ({
    fecthdispute:    jest.fn((params) => ({ type: 'STUB_FETCH_DISPUTE', params })),
    fecthdepartment: jest.fn(() => ({ type: 'STUB_FETCH_DEPARTMENT' })),
}));
jest.mock('../../store/actions/filters/requestListActions', () => ({
    payrollperiod: jest.fn((n) => ({ type: 'STUB_PAYROLL_PERIOD', n })),
}));
jest.mock('../../store/actions/admin/assignRoleActions', () => ({
    fetchUserFeatures:       jest.fn((id) => ({ type: 'STUB_FETCH_FEATURES', id })),
    assignLevelFeatures:     jest.fn((id, data) => ({ type: 'STUB_ASSIGN_FEATURES', id, data })),
    fetchUserDispute:        jest.fn((...a) => ({ type: 'STUB_FETCH_USER_DISPUTE', a })),
}));
jest.mock('../../store/actions/report/reportActions', () => ({
    getDisputeReport: jest.fn((id) => ({ type: 'STUB_GET_DISPUTE_REPORT', id })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import Authenticator from '../../services/Authenticator';
import { fecthdispute } from '../../components/PayrollDispute/Disouteapi.js';
import { payrollperiod } from '../../store/actions/filters/requestListActions';
import { fetchUserDispute } from '../../store/actions/admin/assignRoleActions';

global.links = new Proxy({}, { get: () => '/x/' });

const DisputeForm   = require('../../components/PayrollDispute/DisputeForm').default;
const DisputeReport = require('../../components/PayrollDispute/DisputeReport').default;

/* ------------------------------------------------------------- test utils */

const flush = () => act(() => Promise.resolve());

// Fixed-system-time Date, same shape Deep3 proved stable. Only installed by the tests that
// assert a cutoff URL, and always torn down in afterEach so no test sees "today".
const RealDate = global.Date;
const mockToday = (iso) => {
    global.Date = class extends RealDate {
        constructor(...args) {
            if (args.length) { super(...args); } else { super(iso + 'T10:00:00'); }
        }
        static now() { return new RealDate(iso + 'T10:00:00').getTime(); }
    };
};

let currentLevel = 'Payroll';
let consoleErrorSpy;

beforeAll(() => {
    // jsdom 11 ships neither; the CSV export path needs both.
    window.URL.createObjectURL = jest.fn(() => 'blob:evox-deep');
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

beforeEach(() => {
    jest.clearAllMocks();
    currentLevel = 'Payroll';
    Authenticator.scanLevel.mockImplementation((level) =>
        Array.isArray(level) ? level.includes(currentLevel) : level === currentLevel);
    API.call.mockImplementation(() => Promise.resolve({ data: [] }));
    mockDispatch.mockImplementation((a) => a);
    // Reset the console accumulator every test: React de-duplicates warnings per component type,
    // so an earlier test's output must never be able to satisfy a later assertion.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    global.Date = RealDate;
    consoleErrorSpy.mockRestore();
    document.querySelectorAll('a[download]').forEach((n) => n.parentNode.removeChild(n));
});

const CUTOFF = { start_date: '2026-07-16', end_date: '2026-07-31' };

const DISPUTE_ROW = {
    id: 7,
    Employee_Number: 'EV-1042', Employee_Name: 'Alice Cruz', Department_Name: 'Finance',
    Cutoff: '16-31 Jul', PayrollPeriod: 'JUL-2', ApprovedDate: '2026-07-28',
    datefilling: '2026-07-25', Remarks: 'Missed OT', unpaid_leave: '0',
    reg_late: '15', reg_undertime: '0', login_date: '2026-07-20 09:00:00',
    Render_Hr: '8', Night_Diff: '2', OverTime: '3', OT_ND: '1',
    RD_Render_HR: '4', RD_ND: '0', RD_OT: '0', RD_OT_ND: '0',
    LH_Render_HR: '8', LH_ND: '0', LH_OT: '0', LH_OT_ND: '0',
    SH_Render_Hr: '5', SH_ND: '0', SH_OT: '0', SH_OT_ND: '0',
    DSH_Render_HR: '11', DSH_ND: '0', DSH_OT: '0', DSH_OT_ND: '0',
    DLH_Render_HR: '12', DLH_ND: '0', DLH_OT: '0', DLH_OT_ND: '0',
    SLH_Render_HR: '13', SLH_ND: '0', SLH_OT: '0', SLH_OT_ND: '9',
    late: '15', undertime: '0',
};

const formProps = (over = {}) => ({
    user: { id: 42 },
    payroll: '',
    userLists: [],
    dispute_record: [],
    params: {},
    history: { goBack: jest.fn() },
    ...over,
});

const renderForm = (over = {}) => {
    const props = formProps(over);
    const utils = render(<MemoryRouter><DisputeForm {...props} /></MemoryRouter>);
    return { props, ...utils };
};

const reportProps = (over = {}) => ({
    settings: { current_payroll_cutoff: CUTOFF, countries: [] },
    userdepartment: [],
    dispute: [],
    geos: [],
    user: { id: 42 },
    ...over,
});

const renderReport = (over = {}) =>
    render(<MemoryRouter><DisputeReport {...reportProps(over)} /></MemoryRouter>);

const reqs = (prefix) =>
    API.call.mock.calls.map((c) => c[0]).filter((c) => (c.url || '').startsWith(prefix));

const putCalls = () => reqs('/updatedispute/');
const cutoffCalls = () => reqs('/getpayrollcutoff/');

const loggedErrors = (msg) =>
    consoleErrorSpy.mock.calls.filter((c) => c[0] === msg);

/* --------------------------------------------- timezone-independent labels */
// DisputeReport formats with moment(new Date(x)) in LOCAL time, both for the export filename
// (line 96, "DDMMMYYYY") and for the login_date cell (line 363, "MMMM D, YYYY"). A hard-coded
// '01Jan1970' therefore only holds at a non-negative UTC offset, and the repo pins no TZ.
// These helpers rebuild the expected label from the SAME INSTANT using the platform Date rather
// than moment, so the assertion means "the local label of instant X" wherever it runs. Each
// call site also bounds the result to the finite set of labels UTC-12..UTC+14 can produce, so
// the assertion still fails if the component starts formatting a different instant.
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

const fileLabel = (value) => {
    const d = new RealDate(value);
    return `${String(d.getDate()).padStart(2, '0')}${MON_SHORT[d.getMonth()]}${d.getFullYear()}`;
};
const cellLabel = (value) => {
    const d = new RealDate(value);
    return `${MON_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

/* ===================================================== A. DisputeForm wiring */

describe('DisputeForm — what connect() hands the screen on every mount', () => {
    const STATE = {
        user: { id: 42, emp_num: 'EV-1042' },
        dashboard: { user_list: [{ id: 9, first_name: 'Alice' }] },
        assignRole: {
            payroll: 'JUL-2', isUserListLoaded: true, userRole: 'reviewer',
            userPermission: ['approve'], userLevel: 'Payroll', userFeatures: ['dispute'],
            isUserRolesPermissionsLoaded: true, roles: ['WRONG_SLICE'],
        },
        lookup: { roles: ['Payroll', 'Admin'], features: ['dispute', 'payslip'] },
        report: { dispute_record: DISPUTE_ROW },
    };

    test('the logged-in user, the selectable employee list and the payroll period each come from a different slice', () => {
        const p = DisputeForm.mapStateToProps(STATE);

        expect(p.user).toBe(STATE.user);
        expect(p.userLists).toEqual([{ id: 9, first_name: 'Alice' }]);
        expect(p.payroll).toBe('JUL-2');
        expect(p.isUserListLoaded).toBe(true);
    });

    test('the dispute under review is read from the report slice, not the dashboard list', () => {
        const p = DisputeForm.mapStateToProps(STATE);

        expect(p.dispute_record).toBe(DISPUTE_ROW);
        expect(p.dispute_record.Employee_Number).toBe('EV-1042');
    });

    test('roles and features are taken from the lookup slice even though assignRole also carries roles', () => {
        const p = DisputeForm.mapStateToProps(STATE);

        expect(p.roles).toEqual(['Payroll', 'Admin']);
        expect(p.roles).not.toContain('WRONG_SLICE');
        expect(p.features).toEqual(['dispute', 'payslip']);
    });

    test('connect supplies no params and no history — the route wrapper is the only source of both', () => {
        // ProtectedRoutes.js:42-44 clones the child with { params: computedMatch.params, ...props }.
        // DisputeForm dereferences props.params.id on line 155 and props.history.goBack on 1284,
        // so mounting it outside that wrapper is a hard crash. Pinning the contract here.
        const p = DisputeForm.mapStateToProps(STATE);

        expect(Object.keys(p)).not.toContain('params');
        expect(Object.keys(p)).not.toContain('history');
        expect(Object.keys(p).sort()).toEqual([
            'dispute_record', 'features', 'isUserListLoaded', 'isUserRolesPermissionsLoaded',
            'payroll', 'roles', 'user', 'userFeatures', 'userLevel', 'userLists',
            'userPermission', 'userRole',
        ]);
    });

    test('_FINDING_DSP_MAP_1 mapDispatchToProps exposes only getDisputeReport after dead-action cleanup', () => {
        // Dead actions (fetchUserRolePermission, assignRolesPermissions, fetchUserFeatures,
        // assignLevelFeatures) were removed from mapDispatchToProps on 2026-08-11 as part of
        // the Assign Roles/Permissions feature removal. Only getDisputeReport remains.
        const d = jest.fn();
        const bound = DisputeForm.mapDispatchToProps(d);

        expect(Object.keys(bound).sort()).toEqual(['getDisputeReport']);
        expect(Object.values(bound).every((v) => typeof v === 'function')).toBe(true);
        // building the props dispatches nothing on its own
        expect(d).not.toHaveBeenCalled();
    });
});

/* =================================================== B. DisputeReport wiring */

describe('DisputeReport — what connect() hands the list screen', () => {
    const STATE = {
        settings: { current_payroll_cutoff: CUTOFF, countries: [{ country_id: 1, country_name: 'Philippines' }] },
        dashboard: { my_department: [{ id: 4, department_name: 'Finance' }], dispute_list: [DISPUTE_ROW] },
        user: { id: 29 },
    };

    test('the filters and the rows are drawn from the settings and dashboard slices', () => {
        const p = DisputeReport.mapStateToProps(STATE);

        expect(p.settings).toBe(STATE.settings);
        expect(p.userdepartment).toEqual([{ id: 4, department_name: 'Finance' }]);
        expect(p.dispute).toEqual([DISPUTE_ROW]);
    });

    test('the Geo list is the countries array hanging off settings, not a slice of its own', () => {
        const p = DisputeReport.mapStateToProps(STATE);
        expect(p.geos).toEqual([{ country_id: 1, country_name: 'Philippines' }]);

        const bare = DisputeReport.mapStateToProps({ ...STATE, settings: { current_payroll_cutoff: null } });
        expect(bare.geos).toBeUndefined();
    });

    test('_FINDING_RPT_USER_2 mapStateToProps returns no user, so user.id on the render comes only from the route wrapper', () => {
        // DisputeReport.js:246 short-circuits on `scanLevel([...payroll]) || user.id === 29`.
        // connect maps four keys and `user` is not one of them; the prop exists at runtime purely
        // because ProtectedRoutes.js:43 spreads its own props (which include state.user) into the
        // routed child. This corrects RPT-USER-1 in PayrollDisputeLifecycle: the live page does
        // NOT blank out for Admin / Department Head — but the component is one route-wrapper
        // refactor away from doing exactly that, and it has no default for user.
        const p = DisputeReport.mapStateToProps(STATE);

        expect(Object.keys(p).sort()).toEqual(['dispute', 'geos', 'settings', 'userdepartment']);
        expect(p.user).toBeUndefined();
    });
});

/* ============================== C. DisputeForm — the cutoff window boundary */

describe('DisputeForm — the payroll cutoff window is the 16th to the 15th', () => {
    test('filing on the 15th puts the employee in the window that started last month', async () => {
        mockToday('2026-03-15');
        renderForm();
        await flush();

        expect(cutoffCalls()[0].url).toBe('/getpayrollcutoff/2026-2-16/2026-3-15');
        expect(cutoffCalls()).toHaveLength(1);
    });

    test('filing one day later, on the 16th, rolls the window forward a whole month', async () => {
        mockToday('2026-03-16');
        renderForm();
        await flush();

        expect(cutoffCalls()[0].url).toBe('/getpayrollcutoff/2026-3-16/2026-4-15');
    });

    test('the window endpoints are always day 16 and day 15 and the month is sent unpadded', async () => {
        mockToday('2026-09-02');
        renderForm();
        await flush();

        const url = cutoffCalls()[0].url;
        expect(url).toBe('/getpayrollcutoff/2026-8-16/2026-9-15');
        expect(url).not.toContain('-08-');   // single-digit months are not zero padded
        expect(url).toMatch(/^\/getpayrollcutoff\/\d{4}-\d{1,2}-16\/\d{4}-\d{1,2}-15$/);
    });

    test('the window follows the calendar, not the dispute: identical props on two days ask for two different windows', async () => {
        mockToday('2026-03-16');
        const first = renderForm();
        await flush();
        const early = cutoffCalls()[0].url;
        first.unmount();

        API.call.mockClear();
        global.Date = RealDate;
        mockToday('2026-10-16');
        renderForm();
        await flush();

        expect(early).toBe('/getpayrollcutoff/2026-3-16/2026-4-15');
        expect(cutoffCalls()[0].url).toBe('/getpayrollcutoff/2026-10-16/2026-11-15');
    });
});

/* ============ D. DisputeForm — the [payroll] dependency drives a second pass */

describe('DisputeForm — the effect re-runs when the payroll period lands in the store', () => {
    test('_FINDING_DSP_EFF_1 one create-screen visit looks the cutoff up twice and refetches the user list twice', async () => {
        // The effect depends on [payroll]; its own success arm dispatches payrollperiod(name)
        // into that slice, so the store update it causes re-triggers it.
        API.call.mockImplementation(() => Promise.resolve({ data: [{ name: 'JUL-2' }] }));
        const props = formProps({ payroll: '' });
        const { rerender } = render(<MemoryRouter><DisputeForm {...props} /></MemoryRouter>);
        await flush();
        await flush();

        expect(cutoffCalls()).toHaveLength(1);
        expect(fetchUserDispute).toHaveBeenCalledTimes(1);

        rerender(<MemoryRouter><DisputeForm {...props} payroll="JUL-2" /></MemoryRouter>);
        await flush();
        await flush();

        expect(cutoffCalls()).toHaveLength(2);
        expect(cutoffCalls()[1].url).toBe(cutoffCalls()[0].url);
        expect(fetchUserDispute).toHaveBeenCalledTimes(2);
    });

    test('_FINDING_DSP_REF_3 the first pass raises no alert and the second pass reports the same found cutoff as an error', async () => {
        // Pass 1: payroll is '' so `payroll && inputRef1.current.focus()` (DisputeForm.js:275)
        // short-circuits and the success arm completes. Pass 2: payroll is set, inputRef1.current
        // is null, the throw falls into the .catch at 292 and the reviewer is shown an error
        // alert for a cutoff the server DID return.
        //
        // SOURCE NOTE (corrected after audit): inputRef1 is NOT the ref on the commented-out
        // input at DisputeForm.js:634-641 — that block carries ref={inputref4}. inputRef1 is
        // declared at line 28 and attached to no element at all; its only other mention, line
        // 461, is inside a comment. Nothing can ever populate inputRef1.current.
        API.call.mockImplementation(() => Promise.resolve({ data: [{ name: 'JUL-2' }] }));
        const props = formProps({ payroll: '' });
        const { rerender } = render(<MemoryRouter><DisputeForm {...props} /></MemoryRouter>);
        await flush();
        await flush();

        expect(payrollperiod).toHaveBeenCalledWith('JUL-2');
        expect(Formatter.alert_error).not.toHaveBeenCalled();

        rerender(<MemoryRouter><DisputeForm {...props} payroll="JUL-2" /></MemoryRouter>);
        await flush();
        await flush();

        expect(payrollperiod).toHaveBeenCalledTimes(2);
        expect(Formatter.alert_error).toHaveBeenCalledTimes(1);
        expect(Formatter.alert_error_message).not.toHaveBeenCalled();  // the cutoff WAS found
    });

    test('_FINDING_DSP_REF_4 every cutoff lookup, including the quiet first pass, dies in the outer catch on a second dead ref', async () => {
        // This is what "the first pass succeeds quietly" above actually means: quiet to the USER.
        // handleCutoff awaits the API chain and then runs inputref4.current.focus() at
        // DisputeForm.js:296. inputref4's only <input> is inside the JSX comment at 634-641, so
        // .current is null on every pass, the TypeError is caught by the outer try at 310-312 and
        // logged as 'Error fetching employee details:' — a message about a lookup that succeeded.
        // The setFormData at 297-304 (Valid_From / Valid_To / Payroll_Cutoff / created_by) is
        // skipped every single time as a result. Nothing here is jsdom-specific.
        API.call.mockImplementation(() => Promise.resolve({ data: [{ name: 'JUL-2' }] }));
        const props = formProps({ payroll: '' });
        render(<MemoryRouter><DisputeForm {...props} /></MemoryRouter>);
        await flush();
        await flush();

        // pass 1 alerted nothing, yet it still threw
        expect(Formatter.alert_error).not.toHaveBeenCalled();
        expect(loggedErrors('Error fetching employee details:').length).toBeGreaterThan(0);
        expect(loggedErrors('Error fetching employee details:')[0][1])
            .toBeInstanceOf(TypeError);
    });

    test('an empty cutoff response takes the not-found arm on both passes and never dispatches a period', async () => {
        API.call.mockImplementation(() => Promise.resolve({ data: [] }));
        const props = formProps({ payroll: '' });
        const { rerender } = render(<MemoryRouter><DisputeForm {...props} /></MemoryRouter>);
        await flush();
        await flush();

        rerender(<MemoryRouter><DisputeForm {...props} payroll="AUG-1" /></MemoryRouter>);
        await flush();
        await flush();

        expect(Formatter.alert_error_message).toHaveBeenCalledTimes(2);
        expect(Formatter.alert_error_message).toHaveBeenCalledWith(
            'Cut Off Details Not Found, Please Contact Projects Team.');
        expect(payrollperiod).not.toHaveBeenCalled();
    });

    // REMOVED after audit: the DSP-EDT-1 test ('in edit mode the same dependency refetches the
    // record already on screen'). Its trigger cannot occur. The re-fetch needs assignRole.payroll
    // to CHANGE while the edit screen is mounted; that slice is written only by
    // FETCH_PAYROLL_PERIOD (assignRoleReducers.js:34-37), which is produced only by
    // payrollperiod() (requestListActions.js:340-348), which is dispatched from exactly one place
    // in the whole client — DisputeForm.js:273, inside the `if (!props.params.id)` CREATE branch.
    // With params.id set that line is never reached, so nothing can move the slice and the second
    // getDisputeReport never happens in a browser. The old test manufactured it with a manual
    // rerender of a prop transition no live store can perform. The reachable half — edit-mode
    // mount dispatching getDisputeReport('5') and skipping the cutoff flow — is already asserted
    // by evoxtest_DisputeFormDeep2.test.js:187, so nothing was lost.
});

/* ================= E. DisputeForm — the decision the reviewer actually sends */

describe('DisputeForm — the decision payload and what guards it', () => {
    test('the request body carries exactly a status and a remarks string — every pay line on screen is dropped', async () => {
        const { container, getByText } = renderForm({ params: { id: '5' }, dispute_record: DISPUTE_ROW });
        await flush();

        fireEvent.change(container.querySelector('input[name="Remarks"]'),
            { target: { value: 'Payslip re-checked' } });
        await act(async () => { fireEvent.click(getByText(/Approve/)); });

        const req = putCalls()[0];
        expect(Object.keys(req).sort()).toEqual(['data', 'method', 'url']);
        expect(Object.keys(req.data)).toEqual(['status', 'remarks']);
        expect(req.data).toEqual({ status: 1, remarks: 'Payslip re-checked' });
        // the record's own figures were on screen and none of them travelled
        expect(container.querySelector('input[name="Render_Hr"]').value).toBe('8');
        expect(JSON.stringify(req.data)).not.toContain('Render_Hr');
    });

    // REMOVED after audit: the 'a double click on Approve sends the decision twice — both reach
    // the server' test. The component does fire handleSubmit twice, but the claim about the
    // server was wrong and the test could not have seen it, because it mocks API.call wholesale.
    // services/API.js:38-40 keys in-flight requests on JSON.stringify([url, method, data,
    // params]); two Approve clicks build a byte-identical entry (/updatedispute/5, put,
    // {status:1, remarks:''}), so the second is intercepted at API.js:69-73 and returned as
    // Promise.reject({ status: 499, statusText: 'DUPLICATE_REQUEST_INTERCEPTED' }). It never
    // reaches the server, and the reviewer gets an error alert from handleSubmit's .catch. A
    // reviewer double-clicking Approve is a UX annoyance, not a double write, and a test that
    // says otherwise sends a developer hunting a duplicate-decision bug that does not exist.

    test('_FINDING_DSP_DBL_1 Approve followed by Decline sends two contradictory decisions for one dispute', async () => {
        // This is the arm the in-flight guard does NOT cover. API.js dedupes on the whole
        // [url, method, data, params] tuple, and these two calls differ in data.status (1 vs 2),
        // so both are dispatched to axios and both reach /updatedispute/5. Nothing in DisputeForm
        // disables the buttons between them: handleSubmit (414-434) sets no in-flight state and
        // the two <Button>s at the foot of the form have no disabled binding.
        API.call.mockImplementation(() => new Promise(() => {}));   // never settles: still in flight
        const { getByText } = renderForm({ params: { id: '5' } });
        await flush();
        API.call.mockClear();

        fireEvent.click(getByText(/Approve/));
        fireEvent.click(getByText(/Decline/));

        expect(putCalls().map((c) => c.data.status)).toEqual([1, 2]);
        expect(putCalls().every((c) => c.url === '/updatedispute/5')).toBe(true);
        expect(putCalls().every((c) => c.method === 'put')).toBe(true);
        // the two request signatures differ, which is exactly why API.js:38-40 lets both through
        expect(JSON.stringify(putCalls()[0].data)).not.toBe(JSON.stringify(putCalls()[1].data));
    });

    test('remarks typed before a rejected decision survive on the form and are re-sent on the retry', async () => {
        API.call.mockImplementation((req) => (req.url || '').startsWith('/updatedispute/')
            ? Promise.reject(new Error('HTTP 422'))
            : Promise.resolve({ data: [] }));
        const { container, getByText } = renderForm({ params: { id: '5' } });
        await flush();

        fireEvent.change(container.querySelector('input[name="Remarks"]'),
            { target: { value: 'Rest day worked' } });
        await act(async () => { fireEvent.click(getByText(/Decline/)); });
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalled();
        expect(mockHistoryPush).not.toHaveBeenCalled();
        expect(container.querySelector('input[name="Remarks"]').value).toBe('Rest day worked');

        await act(async () => { fireEvent.click(getByText(/Decline/)); });
        expect(putCalls()).toHaveLength(2);
        expect(putCalls()[1].data).toEqual({ status: 2, remarks: 'Rest day worked' });
    });

    // REMOVED after audit: the DSP-SYN-1 test ('a synchronous transport failure is logged and the
    // reviewer is told nothing'). The defect cannot occur. handleSubmit's outer catch
    // (DisputeForm.js:432-434) fires only if API.call THROWS. services/API.js call() takes one of
    // three exits for a config like { url: '/updatedispute/5' }: trackPromise(axios(...))
    // .then().catch() (44-67), Promise.reject({status:499}) for a duplicate (69-73), or
    // this.format() when the url is invalid (78) — none of them throw. A real transport failure
    // is a rejected promise and takes the .catch at 429-431, which DOES alert; the test below
    // proves it. The old test reached the dead arm only because its mock was rigged to `throw`,
    // which no browser can make API.call do. No reviewer is ever left silent.

    test('a rejected decision alerts the reviewer, and the outer try/catch never sees it', async () => {
        // The only failure shape API.call can actually produce is a rejected promise, so the
        // .catch arm is the only failure arm the screen has. Asserting that nothing lands in the
        // outer catch is how this suite documents DisputeForm.js:432-434 as dead code instead of
        // covering it.
        API.call.mockImplementation((req) => (req.url || '').startsWith('/updatedispute/')
            ? Promise.reject(new Error('HTTP 500'))
            : Promise.resolve({ data: [] }));
        const { getByText } = renderForm({ params: { id: '5' } });
        await flush();

        await act(async () => { fireEvent.click(getByText(/Approve/)); });
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledTimes(1);
        expect(Formatter.alert_success).not.toHaveBeenCalled();
        expect(mockHistoryPush).not.toHaveBeenCalled();   // the reviewer stays on the dispute
        expect(loggedErrors('Error updating dispute:')).toHaveLength(0);
    });

    test('Back uses the route-injected history, not the router hook, and sends no decision', async () => {
        const { props, getByText } = renderForm({ params: { id: '5' } });
        await flush();
        API.call.mockClear();

        fireEvent.click(getByText(/Back/));

        expect(props.history.goBack).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).not.toHaveBeenCalled();
        expect(putCalls()).toHaveLength(0);
    });

    test('_FINDING_DSP_HDG_1 the Payroll level test on the edit heading chooses between two identical headings', async () => {
        currentLevel = 'Payroll';
        const payrollView = renderForm({ params: { id: '5' } });
        await flush();
        const asPayroll = Array.from(payrollView.container.querySelectorAll('h2')).map((h) => h.textContent);
        payrollView.unmount();

        currentLevel = 'Department Head';
        const headView = renderForm({ params: { id: '5' } });
        await flush();
        const asHead = Array.from(headView.container.querySelectorAll('h2')).map((h) => h.textContent);

        expect(asPayroll).toEqual(['Dispute Form']);
        expect(asHead).toEqual(['Dispute Form']);
        expect(Authenticator.scanLevel).toHaveBeenCalledWith('Payroll');

        // and the create screen is the only heading the gate actually changes
        headView.unmount();
        const createView = renderForm({ params: {} });
        await flush();
        expect(Array.from(createView.container.querySelectorAll('h2')).map((h) => h.textContent))
            .toEqual(['Create Dispute']);
    });
});

/* ================= F. DisputeForm — the record the reviewer is judging */

describe('DisputeForm — the dispute record the screen binds to', () => {
    test('_FINDING_DSP_REC_1 the empty initial record still paints an employee identity panel with blank values', async () => {
        // reportReducers.js:8 seeds dispute_record as [], and [] is truthy, so the panel renders
        // before any record has loaded.
        const { getByText, container } = renderForm({ params: { id: '5' }, dispute_record: [] });
        await flush();

        const panel = getByText(/Employee Number:/);
        expect(panel.textContent).toMatch(/Employee Number:\s*Name:\s*Department:/);
        expect(panel.textContent).not.toMatch(/EV-/);
        expect(container.querySelector('input[name="Render_Hr"]').value).toBe('');
    });

    test('a loaded record fills the identity panel with the employee it belongs to', async () => {
        const { getByText } = renderForm({ params: { id: '5' }, dispute_record: DISPUTE_ROW });
        await flush();

        const panel = getByText(/Employee Number:/);
        expect(panel.textContent).toContain('EV-1042');
        expect(panel.textContent).toContain('Alice Cruz');
        expect(panel.textContent).toContain('Finance');
    });

    test('_FINDING_DSP_REC_2 a dispute id that returns no row makes the whole review screen throw', async () => {
        // reportActions.js:74 stores result.data.content[0]; for an empty content array that is
        // undefined, and the render dereferences dispute_record.login_date on line 812.
        // Nothing about this depends on jsdom.
        let caught = null;
        try {
            render(<MemoryRouter>
                <DisputeForm {...formProps({ params: { id: '5' }, dispute_record: undefined })} />
            </MemoryRouter>);
        } catch (e) { caught = e; }

        expect(caught).toBeInstanceOf(TypeError);
        expect(caught.message).toMatch(/login_date/);

        // the same id with a row present renders normally
        const ok = renderForm({ params: { id: '5' }, dispute_record: DISPUTE_ROW });
        await flush();
        expect(ok.container.querySelector('input[name="Payroll_Cutoff"]').value)
            .toBe('2026-07-20 09:00:00');
    });

    test('a record replaced mid-review repaints every pay line from the new figures', async () => {
        const props = formProps({ params: { id: '5' }, dispute_record: DISPUTE_ROW });
        const { container, rerender } = render(<MemoryRouter><DisputeForm {...props} /></MemoryRouter>);
        await flush();
        expect(container.querySelector('input[name="OverTime"]').value).toBe('3');
        expect(container.querySelector('input[name="LH_Render_HR"]').value).toBe('8');

        rerender(<MemoryRouter>
            <DisputeForm {...props} dispute_record={{ ...DISPUTE_ROW, OverTime: '11', LH_Render_HR: '0' }} />
        </MemoryRouter>);
        await flush();

        expect(container.querySelector('input[name="OverTime"]').value).toBe('11');
        expect(container.querySelector('input[name="LH_Render_HR"]').value).toBe('0');
    });

    test('_FINDING_DSP_REM_1 the remarks the employee filed are never shown in the reviewer Remarks box', async () => {
        const { container } = renderForm({ params: { id: '5' }, dispute_record: DISPUTE_ROW });
        await flush();

        const remarks = container.querySelector('input[name="Remarks"]');
        expect(DISPUTE_ROW.Remarks).toBe('Missed OT');
        expect(remarks.value).toBe('');
        expect(remarks.hasAttribute('value')).toBe(false);   // unbound / uncontrolled
        expect(remarks.disabled).toBe(false);                // and it is the reviewer's own field
    });

    test('the late and undertime figures are read-only display fields fed by the record', async () => {
        const { container } = renderForm({ params: { id: '5' }, dispute_record: DISPUTE_ROW });
        await flush();

        expect(container.querySelector('input[name="Late"]').value).toBe('15');
        expect(container.querySelector('input[name="Late"]').disabled).toBe(true);
        expect(container.querySelector('input[name="Undertime"]').value).toBe('0');
        expect(container.querySelector('input[name="Undertime"]').disabled).toBe(true);
    });
});

/* ============ G. DisputeReport — first paint, failure arms and the export */

describe('DisputeReport — first paint and refresh failures', () => {
    test('the very first paint, before the store has a dispute_list key at all, renders the table instead of crashing', async () => {
        // Not the same state as the empty-list case PayrollDisputeLifecycle:553 covers.
        // dashboardReducers.js has NO dispute_list key in initState (it appears only when
        // FETCH_DISPUTE_LIST lands, line 90), so state.dashboard.dispute_list — and therefore the
        // `dispute` prop — is literally undefined on the first render of every visit. The guard
        // that carries it is `dispute && dispute.length > 0` on the tbody map.
        const { container } = renderReport({ dispute: undefined });
        await flush();

        const headers = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent);
        expect(headers.length).toBe(39);
        expect(headers[0]).toBe('Emp No');
        expect(headers[1]).toBe('Name');
        expect(container.querySelectorAll('tbody tr').length).toBe(0);
        expect(container.querySelectorAll('tbody td').length).toBe(0);
    });

    // REMOVED after audit: 'once the list arrives the same table paints one row per dispute'.
    // It asserted a row count and nothing else, and PayrollDisputeLifecycle already owns exactly
    // that assertion ('two disputes produce two body rows') plus the per-cell content this one
    // never checked. A duplicate that is weaker than the original is pure count inflation.

    // REMOVED after audit: the RPT-ERR-1 test ('a Filter click the store rejects is swallowed').
    // The defect cannot occur. DisputeReport.fetchDisputes (63-83) wraps a single statement,
    // dispatch(fecthdispute(filters)). fecthdispute (Disouteapi.js:27-48) returns an ASYNC thunk;
    // redux-thunk is applied at store.js:6, so dispatch calls that async function and gets a
    // promise back — an async function converts every throw into a rejection and cannot throw
    // synchronously. So dispatch cannot throw, the catch at 80-82 is dead, and a genuinely failed
    // refresh is NOT silent: the thunk's own .catch (43-45) dispatches Formatter.alert_error. The
    // old test entered the arm only by making mockDispatch throw, which the real store never does.

    test('_FINDING_RPT_STAT_1 the Status filter shows Pending while the query it drives is unfiltered', async () => {
        // filters.status starts as '' and none of the three options carries that value.
        //
        // MECHANISM (corrected after audit): this is react-dom, not the browser. React never
        // assigns select.value for a controlled <select>; ReactDOMSelect.updateOptions
        // (react-dom.development.js:2215-2235) walks the options looking for one whose value
        // equals the controlled value, and when none matches it sets `selected = true` on the
        // first non-disabled option instead. That is why the control reads Pending. Had React
        // assigned the non-matching value directly, Chrome would leave selectedIndex at -1 and
        // paint the control BLANK — a different and more obvious symptom. The same react-dom
        // build ships to production, so the finding is real in Chrome.
        //
        // React's own state is still '', so the first query asks for every status. The reviewer
        // is looking at a filter that is lying about what is on the table.
        currentLevel = 'Department Head';
        const { container } = renderReport({ user: { id: 1 } });
        await flush();

        const select = container.querySelector('select[name="status"]');
        const options = Array.from(select.querySelectorAll('option'));
        expect(options.map((o) => o.value)).toEqual(['0', '1', '2']);
        expect(select.hasAttribute('required')).toBe(true);
        expect(select.value).toBe('0');                              // reads as Pending on screen
        expect(options[0].getAttribute('label')).toBe('Pending');
        expect(fecthdispute.mock.calls[0][0].status).toBe('');       // but no status was requested
    });

    test('choosing Pending puts a status the options do carry into the next query', async () => {
        currentLevel = 'Department Head';
        const { container, getByText } = renderReport({ user: { id: 1 } });
        await flush();

        const select = container.querySelector('select[name="status"]');
        fireEvent.change(select, { target: { value: '0' } });
        fireEvent.click(getByText(/Filter/));
        await flush();

        expect(select.value).toBe('0');
        expect(fecthdispute.mock.calls[1][0].status).toBe('0');
    });

    test('_FINDING_RPT_DATE_1 a null login date is printed as the epoch while a missing one prints Invalid date', async () => {
        // DisputeReport.js:363 renders moment(new Date(dispute.login_date)).format("MMMM D, YYYY")
        // in LOCAL time, so the label for instant 0 is 'January 1, 1970' at any non-negative UTC
        // offset and 'December 31, 1969' at any negative one. Both are asserted: the exact label
        // is rebuilt from the same instant with the platform Date, and bounded to the only two
        // strings the UTC-12..UTC+14 range can yield, so the test still fails if the component
        // starts formatting some other instant.
        currentLevel = 'Department Head';
        const nulled = renderReport({ user: { id: 1 }, dispute: [{ ...DISPUTE_ROW, login_date: null }] });
        await flush();
        const printed = Array.from(nulled.container.querySelectorAll('tbody td'))[3].textContent;
        expect(new RealDate(null).getTime()).toBe(0);        // new Date(null) IS the Unix epoch
        expect(printed).toBe(cellLabel(null));
        expect(printed).toMatch(/^(January 1, 1970|December 31, 1969)$/);
        nulled.unmount();

        const missing = { ...DISPUTE_ROW };
        delete missing.login_date;
        const absent = renderReport({ user: { id: 1 }, dispute: [missing] });
        await flush();
        expect(Array.from(absent.container.querySelectorAll('tbody td'))[3].textContent)
            .toBe('Invalid date');
    });
});

describe('DisputeReport — the CSV export carries the whole filter set', () => {
    test('a DivisionHead export sends the department and status pickers along with the dates', async () => {
        currentLevel = 'DivisionHead';
        API.call.mockImplementation(() => Promise.resolve({ data: 'a,b\n1,2' }));
        const { container, getByText } = renderReport({
            user: { id: 1 }, userdepartment: [{ id: 4, department_name: 'Finance' }],
        });
        await flush();

        fireEvent.change(container.querySelector('select[name="department"]'), { target: { value: '4' } });
        fireEvent.change(container.querySelector('select[name="status"]'), { target: { value: '1' } });
        await act(async () => { fireEvent.click(getByText('Export')); });

        const req = reqs('/getdisputeExport')[0];
        expect(req.method).toBe('get');
        expect(req.params).toEqual({
            department: '4', disputeType: '', startDate: '2026-07-16', endDate: '2026-07-31',
            status: '1', geo: '',
        });
    });

    test('_FINDING_RPT_EXP_2 with no payroll cutoff the download is named from the epoch', async () => {
        // handleExport (DisputeReport.js:96) feeds moment(new Date(filters.startDate)) through
        // format("DDMMMYYYY"); filters.startDate is null when settings.current_payroll_cutoff is
        // absent, and new Date(null) is instant 0. Formatting is LOCAL, so the label is
        // 01Jan1970 at any non-negative UTC offset and 31Dec1969 at any negative one — the only
        // two the UTC-12..UTC+14 range can produce. The suite no longer hard-codes Asia/Manila.
        currentLevel = 'Payroll';
        API.call.mockImplementation(() => Promise.resolve({ data: 'a,b' }));
        const { getByText } = renderReport({ settings: { current_payroll_cutoff: null, countries: [] } });
        await flush();

        await act(async () => { fireEvent.click(getByText('Export')); });

        const name = document.querySelector('a[download]').getAttribute('download');
        const epoch = fileLabel(null);
        expect(name).toBe(`Dispute_Tracker_${epoch}_${epoch}.csv`);
        expect(name).toMatch(/^Dispute_Tracker_(01Jan1970|31Dec1969)_(01Jan1970|31Dec1969)\.csv$/);
    });

    test('a valid cutoff names the download after the cutoff instead', async () => {
        // new Date('2026-07-16') is parsed as UTC midnight and then formatted locally, so a
        // runner west of Greenwich legitimately writes 15Jul2026. Both endpoints are rebuilt from
        // the cutoff itself and bounded to the day-either-side the offset range allows; what the
        // test actually pins is that the name comes from the cutoff and not from the epoch.
        currentLevel = 'Payroll';
        API.call.mockImplementation(() => Promise.resolve({ data: 'a,b' }));
        const { getByText } = renderReport();
        await flush();

        await act(async () => { fireEvent.click(getByText('Export')); });

        const name = document.querySelector('a[download]').getAttribute('download');
        expect(name).toBe(
            `Dispute_Tracker_${fileLabel(CUTOFF.start_date)}_${fileLabel(CUTOFF.end_date)}.csv`);
        expect(name).toMatch(/^Dispute_Tracker_(15|16)Jul2026_(30|31)Jul2026\.csv$/);
        expect(name).not.toMatch(/19(69|70)/);
    });

    test('a failed export leaves no anchor behind and raises the error alert instead', async () => {
        currentLevel = 'Payroll';
        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        const { getByText } = renderReport();
        await flush();

        await act(async () => { fireEvent.click(getByText('Export')); });

        expect(Formatter.alert_error).toHaveBeenCalledTimes(1);
        expect(document.querySelector('a[download]')).toBeNull();
        expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });
});
