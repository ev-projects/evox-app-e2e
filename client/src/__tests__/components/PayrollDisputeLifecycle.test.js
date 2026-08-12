/**
 * PayrollDisputeLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   - src/components/PayrollDispute/DisputeReport.js   (report / list screen)
 *   - src/components/PayrollDispute/DisputeForm.js     (single dispute review screen)
 *
 * MENU PATH
 *   Reports -> Payroll Dispute Report          => DisputeReport   (/app/payrolldisputeview/)
 *   Reports -> Payroll Dispute Report -> (eye) => DisputeForm     (/app/payrolldispute/:id?)
 *   Sidebar gate: Authenticator.scanLevel(["Admin","SubDepartment Head","Department Head",
 *   "Payroll","DivisionHead"]) — Sidebar.js:741.
 *
 * CURRENT MEASURED COVERAGE (29 Jul master run)
 *   DisputeForm.js   60.14%   |   DisputeReport.js   45.00%   |   79 uncovered statements total.
 *
 * OVERLAP CONTROL — evoxtest_DisputeFormDeep2 and evoxtest_DisputeFormDeep3 already own:
 *   create-mode mount, the three cutoff month-boundary arms, cutoff empty/error arms, the
 *   employee <select> dataset population, the numeric-guard unreachability (DSP-NUM-1) and the
 *   missing create-submit (DSP-CRT-1). NOTHING here repeats those. DisputeReport.js had no suite
 *   at all, so it is the bulk of this file. ADDITIVE ONLY — no existing test or app source touched.
 *
 * FINDINGS CHARACTERIZED HERE (each asserted as current behaviour; flip when fixed)
 *   RPT-USER-1  DisputeReport reads props.user.id but connect()'s mapStateToProps never maps
 *               `user`, and RouteList renders <DisputeReport/> with no props. For every level
 *               that is NOT Payroll/IND_Payroll/BGR_Payroll/MAR_Payroll the short-circuit
 *               `scanLevel([...]) || user.id === 29` dereferences undefined and the whole page
 *               throws — i.e. Admin / Department Head / SubDepartment Head / DivisionHead, all of
 *               whom the sidebar invites in, get a blank screen. Browser-independent.
 *   RPT-U29-1   The same expression hard-codes employee id 29 as a personal back door into the
 *               39-column payroll-only view. User 29 sees every other employee's pay lines.
 *   RPT-STALE-1 The mount effect calls setFilters(cutoff dates) and then dispatches
 *               fecthdispute(filters) with the SAME pre-update closure, so the first load always
 *               queries with a blank date range while the date boxes visibly show the cutoff.
 *   RPT-EXP-1   Export is not gated on a date range: with no current_payroll_cutoff the request
 *               goes out with startDate:null / endDate:null (unbounded extract of payroll data).
 *   DSP-REF-1   handleCutoff calls inputref4.current.focus() but that ref's <input> is commented
 *               out, so .current is null on every create-mode mount: the focus throws, the
 *               trailing setFormData (Valid_From / Valid_To / Payroll_Cutoff / created_by) never
 *               runs, and the failure is swallowed into console.error.
 *   DSP-REF-2   Same defect inside the cutoff SUCCESS arm: `payroll && inputRef1.current.focus()`
 *               (inputRef1 is also attached to nothing). When a payroll period IS already in the
 *               store the found-cutoff branch aborts mid-way — setValidbtn(false) and the form
 *               state never apply and the user is shown an error alert for a cutoff that WAS found.
 *   DSP-UPD-1   handleUpdate is wired as the edit-mode form onSubmit but no control can reach it
 *               (both submit buttons preventDefault, and implicit Enter submission clicks the
 *               default button = Approve). If it ever were reached it would PUT status:"pending"
 *               plus blank Payroll_Remarks/Payout_Inclusion over the record.
 *
 * DEAD CODE (documented, not asserted): DisputeForm.handleEmployeeSearch (~50 lines, still
 * contains alert('test1'..'test4')), DisputeForm.fetchDisputes, DisputeForm.handleblur,
 * defaultFormData/defaultFormData1, and DisputeReport.fetchDepartment (line 40) — none are
 * referenced by any rendered element.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ mocks */

const mockDispatch = jest.fn((a) => a);
const mockHistoryPush = jest.fn();

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
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

// Faithful re-implementation of Authenticator.scanLevel: array => membership of the single
// level name on the logged-in user; string => equality. `currentLevel` is set per test.
let currentLevel = 'Payroll';
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
    fetchUserFeatures: jest.fn(), assignLevelFeatures: jest.fn(),
    fetchUserDispute: jest.fn((...a) => ({ type: 'STUB_FETCH_USER_DISPUTE', a })),
}));
jest.mock('../../store/actions/report/reportActions', () => ({
    getDisputeReport: jest.fn((id) => ({ type: 'STUB_GET_DISPUTE_REPORT', id })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import Authenticator from '../../services/Authenticator';
import { fecthdispute, fecthdepartment } from '../../components/PayrollDispute/Disouteapi.js';
import { payrollperiod } from '../../store/actions/filters/requestListActions';

global.links = new Proxy({}, { get: () => '/x/' });

const DisputeReport = require('../../components/PayrollDispute/DisputeReport').default;
const DisputeForm   = require('../../components/PayrollDispute/DisputeForm').default;

/* ------------------------------------------------------------- test utils */

const flush = () => act(() => Promise.resolve());

// DDMMMYYYY for the local calendar day of `iso`, built without moment so the export-filename
// assertion is an independent check rather than a restatement of the library under use.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ddmmm = (iso) => {
    const d = new Date(iso);
    return String(d.getDate()).padStart(2, '0') + MONTHS[d.getMonth()] + d.getFullYear();
};

let consoleErrorSpy;

const PAYROLL_LEVELS = ['Payroll', 'IND_Payroll', 'BGR_Payroll', 'MAR_Payroll'];

beforeAll(() => {
    // jsdom 11 has neither of these; the export path needs both.
    window.URL.createObjectURL = jest.fn(() => 'blob:evox-test');
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

beforeEach(() => {
    jest.clearAllMocks();
    currentLevel = 'Payroll';
    Authenticator.scanLevel.mockImplementation((level) =>
        Array.isArray(level) ? level.includes(currentLevel) : level === currentLevel);
    API.call.mockImplementation(() => Promise.resolve({ data: [] }));
    // Reset the accumulator every test so no earlier test's output can satisfy an assertion.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    consoleErrorSpy.mockRestore();
    document.querySelectorAll('a[download]').forEach((n) => n.parentNode.removeChild(n));
});

const CUTOFF = { start_date: '2026-07-16', end_date: '2026-07-31' };

const reportProps = (over = {}) => ({
    settings: { current_payroll_cutoff: CUTOFF, countries: [] },
    userdepartment: [],
    dispute: [],
    geos: [],
    ...over,
});

const renderReport = (over = {}) =>
    render(<MemoryRouter><DisputeReport {...reportProps(over)} /></MemoryRouter>);

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
    return { props, ...render(<MemoryRouter><DisputeForm {...props} /></MemoryRouter>) };
};

const putCalls = () =>
    API.call.mock.calls.map((c) => c[0]).filter((c) => (c.url || '').startsWith('/updatedispute/'));

/* ================================================================== TESTS */

describe('DisputeReport — first load queries the server and seeds the cutoff date boxes', () => {
    test('mount asks for the dispute list and the department list exactly once each', async () => {
        renderReport();
        await flush();

        expect(fecthdispute).toHaveBeenCalledTimes(1);
        expect(fecthdepartment).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_DEPARTMENT' });
    });

    test('a valid current payroll cutoff populates the request date range inputs', async () => {
        const { container } = renderReport();
        await flush();

        expect(container.querySelector('input[name="startDate"]').value).toBe('2026-07-16');
        expect(container.querySelector('input[name="endDate"]').value).toBe('2026-07-31');
    });

    test('a missing current payroll cutoff leaves both date range inputs empty', async () => {
        const { container } = renderReport({ settings: { current_payroll_cutoff: null, countries: [] } });
        await flush();

        expect(container.querySelector('input[name="startDate"]').value).toBe('');
        expect(container.querySelector('input[name="endDate"]').value).toBe('');
    });

    test('a zero cutoff is rejected by Validator.isValid and clears the range too', async () => {
        const { container } = renderReport({ settings: { current_payroll_cutoff: 0, countries: [] } });
        await flush();

        expect(container.querySelector('input[name="startDate"]').value).toBe('');
    });

    test('_FINDING_RPT_STALE_1 first load queries a blank date range although the boxes show the cutoff', async () => {
        // useEffect: setFilters({...filters, startDate, endDate}) is queued, then
        // dispatch(fecthdispute(filters)) fires with the SAME pre-update object. The user sees
        // 16-31 Jul in the inputs but the rows on screen are for an unbounded range.
        const { container } = renderReport();
        await flush();

        expect(fecthdispute).toHaveBeenCalledWith({
            department: '', disputeType: '', startDate: '', endDate: '', status: '', geo: '',
        });
        // proof the cutoff was known at that moment:
        expect(container.querySelector('input[name="startDate"]').value).toBe('2026-07-16');
    });
});

describe('DisputeReport — level decides which filters are offered', () => {
    test('a payroll level gets the Geo picker and the request date range, not Department or Status', async () => {
        currentLevel = 'IND_Payroll';
        const { container } = renderReport({ geos: [{ country_id: 3, country_name: 'India' }] });
        await flush();

        expect(container.querySelector('select[name="geo"]')).not.toBeNull();
        expect(container.querySelector('input[name="startDate"]')).not.toBeNull();
        expect(container.querySelector('select[name="department"]')).toBeNull();
        expect(container.querySelector('select[name="status"]')).toBeNull();
    });

    test('a non-payroll level gets the Department and Status pickers, not Geo or the date range', async () => {
        currentLevel = 'DivisionHead';
        const { container } = renderReport({
            user: { id: 1 }, // see RPT-USER-1: the real screen supplies no user at all
            userdepartment: [{ id: 4, department_name: 'Finance' }],
        });
        await flush();

        expect(container.querySelector('select[name="department"]')).not.toBeNull();
        expect(container.querySelector('select[name="status"]')).not.toBeNull();
        expect(container.querySelector('select[name="geo"]')).toBeNull();
        expect(container.querySelector('input[name="startDate"]')).toBeNull();
    });

    test('the Department picker lists one option per department the user owns plus the placeholder', async () => {
        currentLevel = 'Department Head';
        const { container } = renderReport({
            user: { id: 1 },
            userdepartment: [
                { id: 4, department_name: 'Finance' },
                { id: 9, department_name: 'Operations' },
            ],
        });
        await flush();

        const opts = container.querySelectorAll('select[name="department"] option');
        expect(opts.length).toBe(3);
        expect(opts[1].value).toBe('4');
        expect(opts[2].value).toBe('9');
    });

    test('an empty department list leaves the Department picker with only the placeholder', async () => {
        currentLevel = 'Department Head';
        const { container } = renderReport({ user: { id: 1 }, userdepartment: [] });
        await flush();

        expect(container.querySelectorAll('select[name="department"] option').length).toBe(1);
    });

    test('the Geo picker lists one option per country plus the placeholder', async () => {
        currentLevel = 'Payroll';
        const { container } = renderReport({
            geos: [{ country_id: 1, country_name: 'Philippines' }, { country_id: 2, country_name: 'Morocco' }],
        });
        await flush();

        const opts = container.querySelectorAll('select[name="geo"] option');
        expect(opts.length).toBe(3);
        expect(opts[2].value).toBe('2');
    });

    test('the Status picker offers exactly Pending=0, Approved=1 and Rejected=2', async () => {
        currentLevel = 'Department Head';
        const { container } = renderReport({ user: { id: 1 } });
        await flush();

        const opts = Array.from(container.querySelectorAll('select[name="status"] option'));
        expect(opts.map((o) => o.value)).toEqual(['0', '1', '2']);
        expect(opts.map((o) => o.label)).toEqual(['Pending', 'Approved', 'Rejected']);
    });

    test('Export is offered to payroll levels and to DivisionHead', async () => {
        currentLevel = 'DivisionHead';
        const a = renderReport({ user: { id: 1 } });
        await flush();
        expect(a.queryByText('Export')).not.toBeNull();
        a.unmount();

        currentLevel = 'MAR_Payroll';
        const b = renderReport();
        await flush();
        expect(b.queryByText('Export')).not.toBeNull();
    });

    test('Export is withheld from a Department Head while Filter stays available', async () => {
        currentLevel = 'Department Head';
        const { queryByText } = renderReport({ user: { id: 1 } });
        await flush();

        expect(queryByText('Export')).toBeNull();
        expect(queryByText(/Filter/)).not.toBeNull();
    });
});

describe('DisputeReport — filter changes are carried into the next query', () => {
    test('picking a department sends that department id on the next Filter click', async () => {
        currentLevel = 'Department Head';
        const { container, getByText } = renderReport({
            user: { id: 1 }, userdepartment: [{ id: 4, department_name: 'Finance' }],
        });
        await flush();
        fecthdispute.mockClear();

        fireEvent.change(container.querySelector('select[name="department"]'), { target: { value: '4' } });
        fireEvent.click(getByText(/Filter/));
        await flush();

        expect(fecthdispute).toHaveBeenCalledTimes(1);
        expect(fecthdispute.mock.calls[0][0].department).toBe('4');
    });

    test('picking a status sends that status code, and the untouched first load sent none', async () => {
        currentLevel = 'Department Head';
        const { container, getByText } = renderReport({ user: { id: 1 } });
        await flush();

        expect(fecthdispute.mock.calls[0][0].status).toBe('');

        fireEvent.change(container.querySelector('select[name="status"]'), { target: { value: '2' } });
        fireEvent.click(getByText(/Filter/));
        await flush();

        expect(fecthdispute.mock.calls[1][0].status).toBe('2');
    });

    test('picking a geo sends that country id on the next Filter click', async () => {
        currentLevel = 'Payroll';
        const { container, getByText } = renderReport({
            geos: [{ country_id: 2, country_name: 'Morocco' }],
        });
        await flush();
        fecthdispute.mockClear();

        fireEvent.change(container.querySelector('select[name="geo"]'), { target: { value: '2' } });
        fireEvent.click(getByText(/Filter/));
        await flush();

        expect(fecthdispute.mock.calls[0][0].geo).toBe('2');
    });

    test('an edited date range replaces the cutoff defaults in the query', async () => {
        currentLevel = 'Payroll';
        const { container, getByText } = renderReport();
        await flush();
        fecthdispute.mockClear();

        fireEvent.change(container.querySelector('input[name="startDate"]'), { target: { value: '2026-06-01' } });
        fireEvent.change(container.querySelector('input[name="endDate"]'), { target: { value: '2026-06-30' } });
        fireEvent.click(getByText(/Filter/));
        await flush();

        expect(fecthdispute).toHaveBeenCalledWith({
            department: '', disputeType: '', startDate: '2026-06-01', endDate: '2026-06-30',
            status: '', geo: '',
        });
    });

    test('Filter re-queries the disputes only — it never refetches the department list', async () => {
        currentLevel = 'Payroll';
        const { getByText } = renderReport();
        await flush();

        fireEvent.click(getByText(/Filter/));
        await flush();

        expect(fecthdispute).toHaveBeenCalledTimes(2);
        expect(fecthdepartment).toHaveBeenCalledTimes(1);
    });
});

describe('DisputeReport — CSV export', () => {
    test('Export requests /getdisputeExport with the filters currently on screen', async () => {
        currentLevel = 'Payroll';
        API.call.mockImplementation(() => Promise.resolve({ data: 'a,b\n1,2' }));
        const { container, getByText } = renderReport();
        await flush();

        fireEvent.change(container.querySelector('input[name="startDate"]'), { target: { value: '2026-06-01' } });
        fireEvent.change(container.querySelector('input[name="endDate"]'), { target: { value: '2026-06-30' } });
        await act(async () => { fireEvent.click(getByText('Export')); });

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/getdisputeExport',
            params: expect.objectContaining({ startDate: '2026-06-01', endDate: '2026-06-30' }),
        });
    });

    test('the downloaded file is named Dispute_Tracker_<start>_<end>.csv from the chosen range', async () => {
        currentLevel = 'Payroll';
        API.call.mockImplementation(() => Promise.resolve({ data: 'a,b\n1,2' }));
        const { container, getByText } = renderReport();
        await flush();

        fireEvent.change(container.querySelector('input[name="startDate"]'), { target: { value: '2026-06-01' } });
        fireEvent.change(container.querySelector('input[name="endDate"]'), { target: { value: '2026-06-30' } });
        await act(async () => { fireEvent.click(getByText('Export')); });

        // The expected token is re-derived here WITHOUT moment so the assertion checks the
        // component's format (DDMMMYYYY), its field order and its prefix rather than restating
        // moment's output. It is also timezone-stable: handleExport feeds new Date('YYYY-MM-DD'),
        // which the spec parses as UTC midnight, so the local calendar day of that instant is
        // whatever the runner's zone says — ddmmm() asks the same question the component does.
        // (Side effect worth a ticket, not asserted here: for any reviewer west of UTC the file
        // name is dated one day before the range they picked.)
        const link = document.querySelector('a[download]');
        expect(link.getAttribute('download'))
            .toBe(`Dispute_Tracker_${ddmmm('2026-06-01')}_${ddmmm('2026-06-30')}.csv`);
        expect(link.getAttribute('download')).toMatch(/^Dispute_Tracker_\d{2}[A-Z][a-z]{2}2026_\d{2}[A-Z][a-z]{2}2026\.csv$/);
        expect(link.href).toContain('blob:evox-test');
    });

    test('_FINDING_RPT_EXP_1 with no payroll cutoff the export goes out with a null date range', async () => {
        // handleExport has no guard: when settings.current_payroll_cutoff is absent the filters
        // hold null dates and the server is asked for an unbounded payroll extract.
        currentLevel = 'Payroll';
        API.call.mockImplementation(() => Promise.resolve({ data: 'a,b' }));
        const { getByText } = renderReport({ settings: { current_payroll_cutoff: null, countries: [] } });
        await flush();

        await act(async () => { fireEvent.click(getByText('Export')); });

        const req = API.call.mock.calls.map((c) => c[0]).find((c) => c.url === '/getdisputeExport');
        expect(req.params.startDate).toBeNull();
        expect(req.params.endDate).toBeNull();
    });

    test('a failed export raises the error alert and downloads nothing', async () => {
        currentLevel = 'Payroll';
        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        const { getByText } = renderReport();
        await flush();

        await act(async () => { fireEvent.click(getByText('Export')); });

        expect(Formatter.alert_error).toHaveBeenCalled();
        expect(document.querySelector('a[download]')).toBeNull();
    });
});

describe('DisputeReport — which table the reviewer sees', () => {
    test('a payroll level sees the full 39-column breakdown including the doubled-holiday columns', async () => {
        currentLevel = 'Payroll';
        const { container } = renderReport({ dispute: [DISPUTE_ROW] });
        await flush();

        expect(container.querySelectorAll('thead th').length).toBe(39);
        const cells = Array.from(container.querySelectorAll('tbody td')).map((td) => td.textContent);
        expect(cells[0]).toBe('EV-1042');
        expect(cells[7]).toBe('Missed OT');
        expect(cells[38]).toBe('9');           // SLH Overtime Night Differential
        expect(container.querySelector('a[href="/x/7"]')).toBeNull(); // no drill-in from this view
    });

    test('a non-payroll level sees the 12-column view whose last column drills into the dispute', async () => {
        currentLevel = 'Department Head';
        const { container } = renderReport({ user: { id: 1 }, dispute: [DISPUTE_ROW] });
        await flush();

        const heads = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent);
        expect(heads.length).toBe(12);
        expect(heads[11]).toBe('Action');
        expect(container.querySelector('tbody a').getAttribute('href')).toBe('/x/7');
    });

    test('the 12-column view renders the login date as a long-form date', async () => {
        currentLevel = 'Department Head';
        const { container } = renderReport({ user: { id: 1 }, dispute: [DISPUTE_ROW] });
        await flush();

        const cells = Array.from(container.querySelectorAll('tbody td')).map((td) => td.textContent);
        expect(cells[3]).toBe('July 20, 2026');
        expect(cells[6]).toBe('8');            // Rendered Hours
    });

    test('an empty dispute list renders the headers with no body rows', async () => {
        currentLevel = 'Payroll';
        const { container } = renderReport({ dispute: [] });
        await flush();

        expect(container.querySelectorAll('thead th').length).toBe(39);
        expect(container.querySelectorAll('tbody tr').length).toBe(0);
    });

    test('two disputes produce two body rows', async () => {
        currentLevel = 'Payroll';
        const { container } = renderReport({
            dispute: [DISPUTE_ROW, { ...DISPUTE_ROW, id: 8, Employee_Number: 'EV-2000' }],
        });
        await flush();

        expect(container.querySelectorAll('tbody tr').length).toBe(2);
        expect(container.querySelectorAll('tbody tr')[1].querySelector('td').textContent).toBe('EV-2000');
    });

    test('_FINDING_RPT_U29_1 employee id 29 is hard-coded into the payroll-only breakdown', async () => {
        // DisputeReport.js:246 — `scanLevel([...payroll]) || user.id === 29`. A single employee id
        // is baked into the source as a personal grant to every other employee's pay lines.
        currentLevel = 'Department Head';

        const backdoor = renderReport({ user: { id: 29 }, dispute: [DISPUTE_ROW] });
        await flush();
        expect(backdoor.container.querySelectorAll('thead th').length).toBe(39);
        backdoor.unmount();

        const neighbour = renderReport({ user: { id: 30 }, dispute: [DISPUTE_ROW] });
        await flush();
        expect(neighbour.container.querySelectorAll('thead th').length).toBe(12);
    });

    test('_FINDING_RPT_USER_1 the page throws for every non-payroll level because `user` is never mapped', async () => {
        // mapStateToProps (DisputeReport.js:398) maps settings/userdepartment/dispute/geos only,
        // and RouteList.js:536 renders <DisputeReport/> with no props, so props.user is undefined.
        // scanLevel([...payroll]) is false for Admin / Department Head / SubDepartment Head /
        // DivisionHead — all of whom the sidebar links in — so `user.id` dereferences undefined
        // and React unmounts the tree. Nothing about this depends on jsdom.
        currentLevel = 'DivisionHead';
        let caught = null;
        try {
            render(<MemoryRouter>
                <DisputeReport
                    settings={{ current_payroll_cutoff: CUTOFF, countries: [] }}
                    userdepartment={[]} dispute={[]} geos={[]} />
            </MemoryRouter>);
        } catch (e) { caught = e; }

        expect(caught).toBeInstanceOf(TypeError);
        expect(caught.message).toMatch(/id/);

        // and the same render is fine the moment a payroll level short-circuits it away
        currentLevel = 'Payroll';
        const ok = render(<MemoryRouter>
            <DisputeReport
                settings={{ current_payroll_cutoff: CUTOFF, countries: [] }}
                userdepartment={[]} dispute={[]} geos={[]} />
        </MemoryRouter>);
        await flush();
        expect(ok.container.querySelectorAll('thead th').length).toBe(39);
    });
});

/* ------------------------------------------------------------ DisputeForm */

describe('DisputeForm — the reviewer decision payload', () => {
    test('Approve PUTs status 1 with the remarks typed by the reviewer', async () => {
        const { container, getByText } = renderForm({ params: { id: '5' } });
        await flush();

        fireEvent.change(container.querySelector('input[name="Remarks"]'),
            { target: { value: 'Verified against payslip' } });
        await act(async () => { fireEvent.click(getByText(/Approve/)); });

        expect(putCalls()[0]).toEqual({
            method: 'put',
            url: '/updatedispute/5',
            data: { status: 1, remarks: 'Verified against payslip' },
        });
    });

    test('Decline PUTs status 2 with the same remarks field', async () => {
        const { container, getByText } = renderForm({ params: { id: '5' } });
        await flush();

        fireEvent.change(container.querySelector('input[name="Remarks"]'),
            { target: { value: 'Duplicate filing' } });
        await act(async () => { fireEvent.click(getByText(/Decline/)); });

        expect(putCalls()[0].data).toEqual({ status: 2, remarks: 'Duplicate filing' });
    });

    test('a decision taken without remarks still PUTs, sending an empty remarks string', async () => {
        const { getByText } = renderForm({ params: { id: '5' } });
        await flush();

        await act(async () => { fireEvent.click(getByText(/Approve/)); });

        expect(putCalls()[0].data).toEqual({ status: 1, remarks: '' });
    });

    test('a successful decision returns the reviewer to the dispute list', async () => {
        API.call.mockImplementation(() => Promise.resolve({ data: { message: 'ok' } }));
        const { getByText } = renderForm({ params: { id: '5' } });
        await flush();

        await act(async () => { fireEvent.click(getByText(/Approve/)); });
        await flush();

        expect(Formatter.alert_success).toHaveBeenCalledWith({ data: { message: 'ok' } }, 3000);
        expect(mockHistoryPush).toHaveBeenCalledWith('/x/');
    });

    test('a rejected decision keeps the reviewer on the form and raises the error alert', async () => {
        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 422')));
        const { getByText } = renderForm({ params: { id: '5' } });
        await flush();

        await act(async () => { fireEvent.click(getByText(/Decline/)); });
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalled();
        expect(mockHistoryPush).not.toHaveBeenCalled();
    });

    test('Back leaves the form through history.goBack without calling the API', async () => {
        const { props, getByText } = renderForm({ params: { id: '5' } });
        await flush();
        API.call.mockClear();

        fireEvent.click(getByText(/Back/));

        expect(props.history.goBack).toHaveBeenCalledTimes(1);
        expect(API.call).not.toHaveBeenCalled();
    });

    test('_FINDING_DSP_UPD_1 handleUpdate is wired to onSubmit but no control reaches it', async () => {
        // Both decision buttons are type="submit" yet call handleSubmit + preventDefault, and
        // implicit Enter submission clicks the default button (Approve) — so the edit-mode
        // onSubmit never runs. Were it reached it would blank the payroll fields and force the
        // record back to "pending".
        const { container, getByText } = renderForm({ params: { id: '5' } });
        await flush();

        await act(async () => { fireEvent.click(getByText(/Approve/)); });
        expect(putCalls().length).toBe(1);
        expect(putCalls()[0].data).not.toHaveProperty('Payroll_Remarks');   // handleSubmit ran
        API.call.mockClear();

        // drive the wired handler directly to show what it would have sent
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        expect(putCalls()[0].data).toEqual({
            Payroll_Remarks: '', Payout_Inclusion: '', status: 'pending',
        });
    });
});

describe('DisputeForm — the computed pay lines are read-only evidence', () => {
    test('Remarks is the only field the reviewer can edit; every pay line is disabled', async () => {
        const { container } = renderForm({ params: { id: '5' } });
        await flush();

        const inputs = Array.from(container.querySelectorAll('input'));
        const editable = inputs.filter((i) => !i.disabled);
        expect(editable.map((i) => i.getAttribute('name'))).toEqual(['Remarks']);
        expect(inputs.length).toBeGreaterThan(30);
    });

    test('a loaded dispute record fills the pay lines from the server values', async () => {
        const { container } = renderForm({ params: { id: '5' }, dispute_record: DISPUTE_ROW });
        await flush();

        expect(container.querySelector('input[name="Payroll_Cutoff"]').value).toBe('2026-07-20 09:00:00');
        expect(container.querySelector('input[name="Render_Hr"]').value).toBe('8');
        expect(container.querySelector('input[name="OT_ND"]').value).toBe('1');
        expect(container.querySelector('input[name="DSH_Render_HR"]').value).toBe('11');
        expect(container.querySelector('input[name="SLH_OT_ND"]').value).toBe('9');
    });

    test('the employee identity block only appears once the record carries one', async () => {
        const withRecord = renderForm({ params: { id: '5' }, dispute_record: DISPUTE_ROW });
        await flush();
        expect(withRecord.getByText(/Employee Number:/).textContent).toContain('EV-1042');
        expect(withRecord.getByText(/Employee Number:/).textContent).toContain('Alice Cruz');
        withRecord.unmount();

        const empty = renderForm({ params: { id: '5' }, dispute_record: [] });
        await flush();
        expect(empty.container.querySelector('input[name="Render_Hr"]').value).toBe('');
    });
});

describe('DisputeForm — the payroll cutoff lookup on the create screen', () => {
    test('_FINDING_DSP_REF_1 the create screen always throws on a ref to a removed input', async () => {
        // handleCutoff ends with inputref4.current.focus(); the <input ref={inputref4}> is
        // commented out (DisputeForm.js:634-641) so .current is null on every mount. The throw is
        // swallowed by the outer catch and the trailing setFormData — Valid_From, Valid_To,
        // Payroll_Cutoff and created_by — never runs. Refs to unrendered nodes are null in Chrome
        // too, so this is not a jsdom artefact.
        API.call.mockImplementation(() => Promise.resolve({ data: [{ name: 'JUL-2' }] }));
        renderForm({ params: {} });
        await flush();
        await flush();

        const call = consoleErrorSpy.mock.calls.find(
            (c) => c[0] === 'Error fetching employee details:');
        expect(call).toBeDefined();
        expect(call[1]).toBeInstanceOf(TypeError);
    });

    test('_FINDING_DSP_REF_2 a found cutoff is reported as an error when a payroll period is already set', async () => {
        // Success arm: dispatch(payrollperiod(name)) runs, then `payroll && inputRef1.current.focus()`
        // throws (inputRef1 is attached to nothing), so setFormData and setValidbtn(false) are
        // skipped and the promise falls into .catch -> alert_error. The cutoff WAS found.
        API.call.mockImplementation(() => Promise.resolve({ data: [{ name: 'JUL-2' }] }));
        renderForm({ params: {}, payroll: 'JUL-2' });
        await flush();
        await flush();

        expect(payrollperiod).toHaveBeenCalledWith('JUL-2');
        expect(Formatter.alert_error).toHaveBeenCalled();
    });

    test('with no payroll period in the store the same found cutoff raises no error alert', async () => {
        API.call.mockImplementation(() => Promise.resolve({ data: [{ name: 'JUL-2' }] }));
        renderForm({ params: {}, payroll: '' });
        await flush();
        await flush();

        expect(payrollperiod).toHaveBeenCalledWith('JUL-2');
        expect(Formatter.alert_error).not.toHaveBeenCalled();
    });

    test('the review screen for an existing dispute never performs the cutoff lookup', async () => {
        renderForm({ params: { id: '5' } });
        await flush();

        const cutoff = API.call.mock.calls
            .map((c) => c[0]).filter((c) => (c.url || '').startsWith('/getpayrollcutoff/'));
        expect(cutoff.length).toBe(0);
        expect(consoleErrorSpy.mock.calls.filter(
            (c) => c[0] === 'Error fetching employee details:').length).toBe(0);
    });
});
