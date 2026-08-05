/**
 * AdminAccessControlLifecycle.test.js
 *
 * SOURCES UNDER TEST
 *   1. container/Admin/PayrollCutoff/PayrollCutoff.js
 *      Menu: Admin -> Payroll Cut-Off            (Content title "Payroll Cut-Off List")
 *   2. container/Admin/AssignFeature/AssignFeature.js
 *      Menu: Admin -> Assign Feature             (Content title "Manage Features of a User")
 *   3. container/Admin/AssignRolesPermissions/AssignRolesPermissions.js
 *      Menu: Admin -> Assign Roles/Permissions   (Content title "Assign Roles/Permissions to a User")
 *
 * 29-JUL COVERAGE BASELINE (the 66 uncovered statements this packet targets)
 *   PayrollCutoff.js            35.90% covered
 *   AssignFeature.js            47.50% covered
 *   AssignRolesPermissions.js   45.95% covered
 *
 *   These three screens decide who can do what. Everything below drives the REAL DOM -
 *   the search box, the user <select>, the role/permission/feature checkboxes, the Assign
 *   button, the grid's row action cell - so the exact payload handed to
 *   assignRolesPermissions / assignLevelFeatures / deletePayrollCutoff is pinned, not the
 *   shape of a hand-made event object. ADDITIVE ONLY: no source file and no existing test
 *   is touched.
 *
 * JSDOM CONFORMANCE SHIM (not a workaround for a bug - see below)
 *   Both Assign screens render their search box as <input type="textfield">. `type` is an
 *   enumerated attribute whose invalid-value default is "text", so every real browser
 *   reports .type === "text" and the field is a perfectly ordinary text input. jsdom 11
 *   skips that coercion and reports "textfield", which makes React's ChangeEventPlugin stop
 *   tracking the element and swallow onChange. The shim below restores the spec behaviour so
 *   the >2-character search threshold can be tested the way Chrome executes it. The screen is
 *   NOT broken; do not read this shim as a finding.
 *
 * FINDINGS CHARACTERISED HERE (asserted as CURRENT behaviour, not fixed)
 *   _FINDING_ARP_BLANKUSER    AssignRolesPermissions gates its grant panel on
 *       `this.state.selectedUser != null`. Re-selecting the blank "Select Name" option stores
 *       the empty string, and '' != null is TRUE, so the panel stays open and Assign posts
 *       assignRolesPermissions('', {roles, permissions}) - a role/permission grant with no
 *       user id. Selecting blank also fires fetchUserRolePermission('').
 *   _FINDING_AF_BLANKUSER     Identical hole in AssignFeature: blank user -> the panel stays
 *       open and Assign posts assignLevelFeatures('', {features}).
 *   _FINDING_ARP_STALEROLES   The checkboxes are seeded from state.userRole/userPermission,
 *       which are only refreshed when isUserRolesPermissionsLoaded is true. Between picking a
 *       new user and that lookup resolving, the previous user's ticks are still on screen, and
 *       clicking Assign in that window grants the PREVIOUS user's roles to the NEW user.
 *   _FINDING_AF_STALEFEATURES Same race on AssignFeature: the new user is shown the previous
 *       user's "Current Level" and feature ticks, and Assign writes them to the new user.
 *   _FINDING_ACL_RENDERSTATEWRITE  Both Assign screens write to this.state during render
 *       (`this.state.roles = ...`, `this.state.userLists = ...`) and only copy userLists across
 *       when isUserListLoaded is true. Once that flag flips back to false for a refetch, state
 *       permanently diverges from props: the dropdown keeps offering users from the superseded
 *       search and Assign will grant against one of them.
 *   _FINDING_ACL_CONSOLELEAK  Both submit handlers console.log the full grant payload, and
 *       AssignRolesPermissions' render also console.logs every role object on every pass, so the
 *       complete role/permission matrix is dumped to the browser console of any admin machine.
 *   _FINDING_AF_DEADROLELOOKUP  AssignFeature dispatches fetchRoleList() on every mount and
 *       copies props.roles into state on every render, but the entire role/permission markup is
 *       commented out - the lookup result is never rendered. A wasted request per page visit.
 *   _FINDING_PC_STRINGPROPS   PayrollCutoff passes DataTable's boolean props as strings.
 *       noHeader="false" is a truthy string, and the library renders the header with
 *       `!noHeader && <TableHeader/>`, so the header is SUPPRESSED - the exact opposite of what
 *       the source literal reads. defaultSortAsc/fixedHeader/pagination are only accidentally
 *       right, and loading="true" is not a DataTable prop at all.
 *   _FINDING_PC_UNMOUNTREFRESH  deleteItem schedules the list refresh on a bare 100 ms
 *       setTimeout that is never cleared, so navigating away inside that window still fires
 *       fetchPayrollCutoffList() against an unmounted page.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    // `subtitle` is where PayrollCutoff hangs its Add button, so the stub must render it.
    Content:          ({ children, title, subtitle }) => (
        <div><h1>{title}</h1><div data-testid="content-subtitle">{subtitle}</div>{children}</div>
    ),
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

// PayrollCutoffForm stub: counts mounts (so a forced remount is observable) and exposes the
// hideForm callback the real form receives.
jest.mock('../../container/Admin/PayrollCutoff/PayrollCutoffForm', () => {
    const R = require('react');
    return (props) => {
        R.useEffect(() => { global.__formMounts = (global.__formMounts || 0) + 1; }, []);
        return R.createElement(
            'button',
            { type: 'button', 'data-testid': 'cutoff-form-close', onClick: props.hideForm },
            'close form',
        );
    };
});

// DataTable stub: records the props the page hands the grid so the column definitions,
// the row action cell and the pending/loaded arms can all be asserted.
jest.mock('react-data-table-component', () => ({
    __esModule: true,
    default: (props) => { global.__dtProps = props; return <div data-testid="cutoff-grid" />; },
}));

jest.mock('../../store/actions/admin/assignRoleActions', () => ({
    fetchUser: jest.fn(),
    fetchUserRolePermission: jest.fn(),
    fetchUserFeatures: jest.fn(),
    assignRolesPermissions: jest.fn(),
    assignLevelFeatures: jest.fn(),
}));
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchRoleList: jest.fn(),
    fetchFeaturesList: jest.fn(),
}));
jest.mock('../../store/actions/admin/payrollCutoffActions', () => ({
    addPayrollCutoff: jest.fn(),
    updatePayrollCutoff: jest.fn(),
    deletePayrollCutoff: jest.fn(),
    fetchPayrollCutoff: jest.fn(),
    fetchPayrollCutoffList: jest.fn(),
    clearPayrollCutoffInstance: jest.fn(),
    clearPayrollCutoffListInstance: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

global.links = new Proxy({}, { get: () => '/x/' });

/* --------------------------------------------------------------- jsdom conformance shim */
const HTML_INPUT_TYPES = new Set([
    'button', 'checkbox', 'color', 'date', 'datetime-local', 'email', 'file', 'hidden', 'image',
    'month', 'number', 'password', 'radio', 'range', 'reset', 'search', 'submit', 'tel', 'text',
    'time', 'url', 'week',
]);
const nativeTypeDescriptor =
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'type');
Object.defineProperty(window.HTMLInputElement.prototype, 'type', {
    configurable: true,
    get() {
        const raw = nativeTypeDescriptor.get.call(this);
        return HTML_INPUT_TYPES.has(raw) ? raw : 'text';   // invalid-value default, per HTML spec
    },
    set(value) { nativeTypeDescriptor.set.call(this, value); },
});

const PayrollCutoff =
    require('../../container/Admin/PayrollCutoff/PayrollCutoff').default;
const AssignFeature =
    require('../../container/Admin/AssignFeature/AssignFeature').default;
const AssignRolesPermissions =
    require('../../container/Admin/AssignRolesPermissions/AssignRolesPermissions').default;

const flush = () => act(() => Promise.resolve());

/* ---------------------------------------------------------------------- shared fixtures */

const USERS = [
    { id: 5, emp_num: 'EV-0005', first_name: 'Gary',  last_name: 'Aure' },
    { id: 6, emp_num: 'EV-0006', first_name: 'Glenn', last_name: 'Macasarte' },
];

const ROLE_CATALOGUE = [
    {
        name: 'hr_admin',
        permissions: [
            { name: 'approve_leave', label: 'Approve Leave' },
            { name: 'edit_payroll',  label: 'Edit Payroll' },
        ],
    },
    { name: 'employee', permissions: [] },
];

const FEATURE_CATALOGUE = [
    { feature_name: 'payroll_cutoff', feature_label: 'Payroll Cutoff' },
    { feature_name: 'job_referral',   feature_label: 'Job Referral' },
];

const nameBox   = (c) => c.querySelector('input[name="nameFilter"]');
const userPick  = (c) => c.querySelector('select[name="selectedUser"]');
const assignBtn = (c) => c.querySelector('button[type="submit"]');
const boxes     = (c, name) => Array.from(c.querySelectorAll(`input[name="${name}"]`));
const labelText = (c) => Array.from(c.querySelectorAll('label'))
    .map((l) => l.textContent.replace(/\s+/g, ' ').trim());

const type = async (c, value) => {
    await act(async () => { fireEvent.change(nameBox(c), { target: { value } }); });
};
const chooseUser = async (c, value) => {
    await act(async () => { fireEvent.change(userPick(c), { target: { value } }); });
};
const clickAssign = async (c) => {
    await act(async () => { fireEvent.click(assignBtn(c)); });
    await flush();
    await flush();
};

/* ------------------------------------------------------------------- AssignRoles harness */

function arpProps(over = {}) {
    return {
        userLists: USERS,
        isUserListLoaded: true,
        roles: ROLE_CATALOGUE,
        userRole: [],
        userPermission: [],
        isUserRolesPermissionsLoaded: true,
        fetchUser: jest.fn(),
        fetchRoleList: jest.fn(),
        fetchUserRolePermission: jest.fn(),
        assignRolesPermissions: jest.fn(),
        ...over,
    };
}
function renderARP(over = {}) {
    const props = arpProps(over);
    const ref = React.createRef();
    const utils = render(<AssignRolesPermissions {...props} ref={ref} />);
    const rerenderWith = (next) =>
        utils.rerender(<AssignRolesPermissions {...props} {...next} ref={ref} />);
    return { ...utils, ref, props, rerenderWith };
}

/* ----------------------------------------------------------------- AssignFeature harness */

function afProps(over = {}) {
    return {
        userLists: USERS,
        isUserListLoaded: true,
        roles: ROLE_CATALOGUE,
        features: FEATURE_CATALOGUE,
        userLevel: { level_type: 'Level 3' },
        userFeatures: [],
        userRole: [],
        userPermission: [],
        isUserRolesPermissionsLoaded: true,
        fetchUser: jest.fn(),
        fetchRoleList: jest.fn(),
        fetchFeaturesList: jest.fn(),
        fetchUserRolePermission: jest.fn(),
        fetchUserFeatures: jest.fn(),
        assignRolesPermissions: jest.fn(),
        assignLevelFeatures: jest.fn(),
        ...over,
    };
}
function renderAF(over = {}) {
    const props = afProps(over);
    const ref = React.createRef();
    const utils = render(<AssignFeature {...props} ref={ref} />);
    const rerenderWith = (next) =>
        utils.rerender(<AssignFeature {...props} {...next} ref={ref} />);
    return { ...utils, ref, props, rerenderWith };
}

/* ----------------------------------------------------------------- PayrollCutoff harness */

const CUTOFFS = [
    { id: 3, name: 'August 1st Cut-Off',  start_date: '2026-08-01', end_date: '2026-08-15' },
    { id: 4, name: 'August 2nd Cut-Off',  start_date: '2026-08-16', end_date: '2026-08-31' },
];

function pcProps(over = {}) {
    return {
        user: {},
        constant: {},
        isInstanceLoaded: false,
        isListInstanceLoaded: true,
        instance: null,
        listInstance: CUTOFFS,
        fetchPayrollCutoff: jest.fn(),
        fetchPayrollCutoffList: jest.fn(),
        deletePayrollCutoff: jest.fn(() => Promise.resolve()),
        clearPayrollCutoffInstance: jest.fn(),
        clearPayrollCutoffListInstance: jest.fn(),
        setRedirect: jest.fn(),
        ...over,
    };
}
function renderPC(over = {}) {
    const props = pcProps(over);
    const ref = React.createRef();
    const utils = render(<PayrollCutoff {...props} ref={ref} />);
    return { ...utils, ref, props, grid: () => global.__dtProps };
}
const actionCell = (row) => global.__dtProps.columns[4].cell(row);

/* ------------------------------------------------------------------------------- set-up */

let confirmSpy;
let logSpy;
beforeEach(() => {
    jest.clearAllMocks();
    global.__formMounts = 0;
    global.__dtProps = null;
    confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
    confirmSpy.mockRestore();
    logSpy.mockRestore();
    jest.useRealTimers();
});

/* ====================================================== PAYROLL CUT-OFF: list + grid wiring */

describe('Admin -> Payroll Cut-Off : loading the cut-off list', () => {
    test('mounting discards the cached list before asking the API for a fresh one', async () => {
        const { props } = renderPC();
        await flush();

        expect(props.clearPayrollCutoffListInstance).toHaveBeenCalledTimes(1);
        expect(props.fetchPayrollCutoffList).toHaveBeenCalledTimes(1);
        expect(props.fetchPayrollCutoffList).toHaveBeenCalledWith();
        expect(props.clearPayrollCutoffListInstance.mock.invocationCallOrder[0])
            .toBeLessThan(props.fetchPayrollCutoffList.mock.invocationCallOrder[0]);
        expect(props.fetchPayrollCutoff).not.toHaveBeenCalled();
    });

    test('an unresolved list puts the grid in pending mode with a null dataset', async () => {
        const { grid } = renderPC({ listInstance: null });
        await flush();

        expect(grid().progressPending).toBe(true);
        expect(grid().data).toBeNull();
    });

    test('an arrived list is handed straight to the grid and clears pending mode', async () => {
        const { grid } = renderPC();
        await flush();

        expect(grid().progressPending).toBe(false);
        expect(grid().data).toEqual(CUTOFFS);
    });

    test('an empty list counts as loaded, not as still-pending', async () => {
        const { grid } = renderPC({ listInstance: [] });
        await flush();

        expect(grid().progressPending).toBe(false);
        expect(grid().data).toEqual([]);
    });

    test('the grid declares id, name, start date, end date and an action column with fixed widths', async () => {
        const { grid } = renderPC();
        await flush();

        expect(grid().columns.map((c) => c.name))
            .toEqual(['ID', 'Name', 'Start Date', 'End Date', undefined]);
        expect(grid().columns.map((c) => c.selector))
            .toEqual(['id', 'name', 'start_date', 'end_date', undefined]);
        expect(grid().columns.map((c) => c.width))
            .toEqual(['5%', '20%', '25%', '25%', '25%']);
        expect(grid().defaultSortField).toBe('start_date');
    });

    test('only the two date columns are sortable, and they render as long-form dates', async () => {
        const { grid } = renderPC();
        await flush();

        expect(grid().columns.map((c) => c.sortable))
            .toEqual([undefined, undefined, true, true, undefined]);
        expect(grid().columns[2].format({ start_date: '2026-08-01' })).toBe('August 1, 2026');
        expect(grid().columns[3].format({ end_date: '2026-08-15' })).toBe('August 15, 2026');
        expect(grid().columns[2].format({ start_date: '2025-12-31' })).toBe('December 31, 2025');
    });

    // FINDING _FINDING_PC_STRINGPROPS - every boolean grid prop is written as a string literal.
    // react-data-table-component renders its header with `!noHeader && <TableHeader/>`, and the
    // string 'false' is truthy, so noHeader="false" hides the header instead of showing it.
    // The other three are only accidentally correct because 'true' is also truthy, and
    // loading="true" is not a prop the library reads at all.
    test('the grid is configured with string literals, so noHeader="false" hides the header _FINDING_PC_STRINGPROPS', async () => {
        const { grid } = renderPC();
        await flush();

        expect(grid().noHeader).toBe('false');
        expect(Boolean(grid().noHeader)).toBe(true);        // therefore behaves as noHeader={true}
        expect(grid().defaultSortAsc).toBe('true');
        expect(grid().fixedHeader).toBe('true');
        expect(grid().pagination).toBe('true');
        expect(grid().loading).toBe('true');                // not a DataTable prop
    });
});

/* ================================================== PAYROLL CUT-OFF: opening/closing the form */

describe('Admin -> Payroll Cut-Off : opening the cut-off form', () => {
    test('the page opens with no form and no method chosen', async () => {
        const { ref, queryByTestId } = renderPC();
        await flush();

        expect(ref.current.state).toEqual({ method: null, showForm: false });
        expect(queryByTestId('cutoff-form-close')).toBeNull();
    });

    test('Add opens the form in store mode and loads no existing cut-off', async () => {
        const { container, ref, props, getByTestId } = renderPC();
        await flush();

        const addButton = getByTestId('content-subtitle').querySelector('button');
        expect(addButton.textContent).toContain('Add');

        await act(async () => { fireEvent.click(addButton); });
        await flush();

        expect(ref.current.state).toEqual({ method: 'store', showForm: true });
        expect(props.fetchPayrollCutoff).not.toHaveBeenCalled();
        expect(props.clearPayrollCutoffInstance).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[data-testid="cutoff-form-close"]')).not.toBeNull();
    });

    test('the row Edit button opens the form in update mode and loads that cut-off', async () => {
        const { container, ref, props } = renderPC();
        await flush();

        const { container: cell } = render(<div>{actionCell({ id: 4 })}</div>);
        await act(async () => { fireEvent.click(cell.querySelectorAll('button')[0]); });
        await flush();

        expect(ref.current.state).toEqual({ method: 'update', showForm: true });
        expect(props.fetchPayrollCutoff).toHaveBeenCalledWith(4);
        expect(props.fetchPayrollCutoff).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[data-testid="cutoff-form-close"]')).not.toBeNull();
    });

    test('the row action cell offers exactly an Edit and a Delete button', async () => {
        renderPC();
        await flush();

        const { container: cell } = render(<div>{actionCell({ id: 3 })}</div>);
        const buttons = Array.from(cell.querySelectorAll('button'));
        expect(buttons.map((b) => b.textContent)).toEqual(['Edit', 'Delete']);
        expect(buttons[0].className).toContain('btn-primary');
        expect(buttons[1].className).toContain('btn-danger');
        expect(global.__dtProps.columns[4].button).toBe(true);
        expect(global.__dtProps.columns[4].ignoreRowClick).toBe(true);
    });

    test('editing a second row tears the open form down and rebuilds it so no stale record is shown', async () => {
        const { ref, props } = renderPC();
        await flush();

        await act(async () => { await ref.current.showForm(3); });
        expect(global.__formMounts).toBe(1);

        await act(async () => { await ref.current.showForm(4); });

        expect(global.__formMounts).toBe(2);                     // remounted, not reused
        expect(props.clearPayrollCutoffInstance).toHaveBeenCalledTimes(2);
        expect(props.fetchPayrollCutoff.mock.calls).toEqual([[3], [4]]);
        expect(ref.current.state).toEqual({ method: 'update', showForm: true });
    });

    test('the form closing itself returns the page to its untouched initial state', async () => {
        const { container, ref } = renderPC();
        await flush();
        await act(async () => { await ref.current.showForm(3); });

        await act(async () => {
            fireEvent.click(container.querySelector('[data-testid="cutoff-form-close"]'));
        });

        expect(ref.current.state).toEqual({ method: null, showForm: false });
        expect(container.querySelector('[data-testid="cutoff-form-close"]')).toBeNull();
    });

    test('a cut-off whose primary key is zero is opened as a new record instead of an edit', async () => {
        // `id = id || null` collapses the falsy 0 to null, so the update arm is unreachable
        // for such a row: no instance is loaded and the form is put in create mode.
        const { ref, props } = renderPC();
        await flush();

        await act(async () => { await ref.current.showForm(0); });

        expect(ref.current.state.method).toBe('store');
        expect(props.fetchPayrollCutoff).not.toHaveBeenCalled();
    });
});

/* ============================================================ PAYROLL CUT-OFF: deleting a row */

describe('Admin -> Payroll Cut-Off : deleting a cut-off', () => {
    test('Delete asks for confirmation and posts only the clicked row id', async () => {
        jest.useFakeTimers();
        const { props } = renderPC();
        await flush();

        const { container: cell } = render(<div>{actionCell({ id: 4 })}</div>);
        await act(async () => { fireEvent.click(cell.querySelectorAll('button')[1]); });
        await flush();

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this item?');
        expect(props.deletePayrollCutoff).toHaveBeenCalledWith(4);
        expect(props.deletePayrollCutoff).toHaveBeenCalledTimes(1);
    });

    test('declining the confirmation deletes nothing and never refreshes the list', async () => {
        jest.useFakeTimers();
        confirmSpy.mockReturnValue(false);
        const { ref, props } = renderPC();
        await flush();
        const listCallsAtMount = props.fetchPayrollCutoffList.mock.calls.length;

        await act(async () => { await ref.current.deleteItem(3); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(props.deletePayrollCutoff).not.toHaveBeenCalled();
        expect(props.fetchPayrollCutoffList).toHaveBeenCalledTimes(listCallsAtMount);
    });

    test('the list is not refreshed when the delete resolves, only after the fixed 100ms delay', async () => {
        jest.useFakeTimers();
        const { ref, props } = renderPC();
        await flush();
        const listCallsAtMount = props.fetchPayrollCutoffList.mock.calls.length;

        await act(async () => { await ref.current.deleteItem(3); });
        await flush();
        expect(props.fetchPayrollCutoffList).toHaveBeenCalledTimes(listCallsAtMount);

        act(() => { jest.advanceTimersByTime(99); });
        expect(props.fetchPayrollCutoffList).toHaveBeenCalledTimes(listCallsAtMount);

        act(() => { jest.advanceTimersByTime(1); });
        await flush();
        expect(props.fetchPayrollCutoffList).toHaveBeenCalledTimes(listCallsAtMount + 1);
    });

    // FINDING _FINDING_PC_UNMOUNTREFRESH - the refresh is scheduled on a bare setTimeout that is
    // never stored or cleared, so leaving the page within 100ms of a delete still dispatches the
    // list fetch against a component that no longer exists.
    test('the refresh timer keeps running after the page is left _FINDING_PC_UNMOUNTREFRESH', async () => {
        jest.useFakeTimers();
        const { ref, props, unmount } = renderPC();
        await flush();
        const listCallsAtMount = props.fetchPayrollCutoffList.mock.calls.length;

        await act(async () => { await ref.current.deleteItem(3); });
        await flush();
        unmount();

        act(() => { jest.advanceTimersByTime(100); });
        await flush();

        expect(props.fetchPayrollCutoffList).toHaveBeenCalledTimes(listCallsAtMount + 1);
    });
});

/* ============================================ ASSIGN ROLES/PERMISSIONS: search and user picking */

describe('Admin -> Assign Roles/Permissions : finding the user', () => {
    test('mounting loads the role catalogue and nothing else', async () => {
        const { props, getByText } = renderARP();
        await flush();

        expect(props.fetchRoleList).toHaveBeenCalledTimes(1);
        expect(props.fetchUser).not.toHaveBeenCalled();
        expect(props.fetchUserRolePermission).not.toHaveBeenCalled();
        expect(getByText('Assign Roles/Permissions to a User')).toBeInTheDocument();
    });

    test('with no search performed the page reports no records and offers no user dropdown', async () => {
        const { container, getByText } = renderARP({ userLists: null, isUserListLoaded: false });
        await flush();

        expect(getByText('Sorry, No Record Found')).toBeInTheDocument();
        expect(userPick(container)).toBeNull();
        expect(assignBtn(container)).toBeNull();
    });

    test('a search that matched nobody also reports no records', async () => {
        const { container, getByText } = renderARP({ userLists: [] });
        await flush();

        expect(getByText('Sorry, No Record Found')).toBeInTheDocument();
        expect(userPick(container)).toBeNull();
    });

    test('each matched user becomes one option labelled "emp num - first last", after a blank one', async () => {
        const { container } = renderARP();
        await flush();

        const options = Array.from(userPick(container).querySelectorAll('option'));
        expect(options.map((o) => o.value)).toEqual(['', '5', '6']);
        expect(options.map((o) => o.getAttribute('label')))
            .toEqual(['Select Name', 'EV-0005 - Gary Aure', 'EV-0006 - Glenn Macasarte']);
    });

    test('a search string of two characters is below the threshold and queries nobody', async () => {
        const { container, props } = renderARP();
        await flush();

        await type(container, 'ga');

        expect(props.fetchUser).not.toHaveBeenCalled();
    });

    test('the third character triggers the user lookup with the exact search string', async () => {
        const { container, props } = renderARP();
        await flush();

        await type(container, 'gar');

        expect(props.fetchUser).toHaveBeenCalledTimes(1);
        expect(props.fetchUser).toHaveBeenCalledWith('gar');

        await type(container, 'gary');
        expect(props.fetchUser).toHaveBeenNthCalledWith(2, 'gary');
    });

    test('the grant panel stays shut until a user is actually chosen', async () => {
        const { container, ref } = renderARP();
        await flush();

        expect(ref.current.state.selectedUser).toBeNull();
        expect(boxes(container, 'roles')).toHaveLength(0);
        expect(assignBtn(container)).toBeNull();
    });

    test('choosing a user records the id and loads that user existing roles and permissions', async () => {
        const { container, ref, props } = renderARP();
        await flush();

        await chooseUser(container, '5');

        expect(ref.current.state.selectedUser).toBe('5');
        expect(props.fetchUserRolePermission).toHaveBeenCalledTimes(1);
        expect(props.fetchUserRolePermission).toHaveBeenCalledWith('5');
        expect(assignBtn(container)).not.toBeNull();
    });
});

/* ================================================ ASSIGN ROLES/PERMISSIONS: the grant matrix */

describe('Admin -> Assign Roles/Permissions : the role and permission matrix', () => {
    test('every catalogue role gets a roles checkbox and every one of its permissions a permissions checkbox', async () => {
        const { container } = renderARP();
        await flush();
        await chooseUser(container, '5');

        expect(boxes(container, 'roles').map((b) => b.value)).toEqual(['hr_admin', 'employee']);
        expect(boxes(container, 'permissions').map((b) => b.value))
            .toEqual(['approve_leave', 'edit_payroll']);
    });

    test('role slugs are shown title-cased and permissions by their human label', async () => {
        const { container } = renderARP();
        await flush();
        await chooseUser(container, '5');

        const texts = labelText(container);
        expect(texts).toContain('Hr Admin');
        expect(texts).toContain('Employee');
        expect(texts).toContain('Approve Leave');
        expect(texts).toContain('Edit Payroll');
    });

    test('a role that carries no permissions renders no permission block at all', async () => {
        const { container } = renderARP({
            roles: [{ name: 'employee', permissions: [] }],
        });
        await flush();
        await chooseUser(container, '5');

        expect(boxes(container, 'roles')).toHaveLength(1);
        expect(boxes(container, 'permissions')).toHaveLength(0);
        expect(container.querySelectorAll('.role-permissions')).toHaveLength(0);
    });

    test('a role that carries permissions renders exactly one permission block', async () => {
        const { container } = renderARP({
            roles: [ROLE_CATALOGUE[0]],
        });
        await flush();
        await chooseUser(container, '5');

        expect(container.querySelectorAll('.role-permissions')).toHaveLength(1);
        expect(boxes(container, 'permissions')).toHaveLength(2);
    });

    test('the roles and permissions the user already holds arrive ticked, the rest do not', async () => {
        const { container } = renderARP({
            userRole: ['hr_admin'],
            userPermission: ['edit_payroll'],
        });
        await flush();
        await chooseUser(container, '5');

        expect(boxes(container, 'roles').map((b) => [b.value, b.checked]))
            .toEqual([['hr_admin', true], ['employee', false]]);
        expect(boxes(container, 'permissions').map((b) => [b.value, b.checked]))
            .toEqual([['approve_leave', false], ['edit_payroll', true]]);
    });

    test('a user holding nothing yet arrives with every box unticked', async () => {
        const { container } = renderARP();
        await flush();
        await chooseUser(container, '5');

        expect(boxes(container, 'roles').every((b) => b.checked === false)).toBe(true);
        expect(boxes(container, 'permissions').every((b) => b.checked === false)).toBe(true);
    });
});

/* ==================================================== ASSIGN ROLES/PERMISSIONS: the grant post */

describe('Admin -> Assign Roles/Permissions : submitting the grant', () => {
    test('Assign posts the ticked roles and permissions against the chosen user id', async () => {
        const { container, props } = renderARP({
            userRole: ['hr_admin'],
            userPermission: ['edit_payroll'],
        });
        await flush();
        await chooseUser(container, '5');
        await clickAssign(container);

        expect(props.assignRolesPermissions).toHaveBeenCalledTimes(1);
        expect(props.assignRolesPermissions).toHaveBeenCalledWith(
            '5', { roles: ['hr_admin'], permissions: ['edit_payroll'] });
    });

    test('the payload carries only roles and permissions - the search box value never leaks into it', async () => {
        const { container, props } = renderARP({ userRole: ['hr_admin'], userPermission: [] });
        await flush();
        await type(container, 'gary');
        await chooseUser(container, '5');
        await clickAssign(container);

        const payload = props.assignRolesPermissions.mock.calls[0][1];
        expect(Object.keys(payload).sort()).toEqual(['permissions', 'roles']);
        expect('nameFilter' in payload).toBe(false);
        expect('selectedUser' in payload).toBe(false);
    });

    test('ticking an extra permission adds it to the posted permission list', async () => {
        const { container, props } = renderARP({
            userRole: ['hr_admin'],
            userPermission: ['edit_payroll'],
        });
        await flush();
        await chooseUser(container, '5');

        await act(async () => { fireEvent.click(boxes(container, 'permissions')[0]); });
        expect(boxes(container, 'permissions')[0].checked).toBe(true);

        await clickAssign(container);

        expect(props.assignRolesPermissions.mock.calls[0][1].permissions)
            .toEqual(['edit_payroll', 'approve_leave']);
    });

    test('unticking a role removes it from the posted role list', async () => {
        const { container, props } = renderARP({
            userRole: ['hr_admin'],
            userPermission: [],
        });
        await flush();
        await chooseUser(container, '5');

        await act(async () => { fireEvent.click(boxes(container, 'roles')[0]); });
        expect(boxes(container, 'roles')[0].checked).toBe(false);

        await clickAssign(container);

        expect(props.assignRolesPermissions.mock.calls[0][1].roles).toEqual([]);
    });

    test('granting everything posts every role and every permission', async () => {
        const { container, props } = renderARP();
        await flush();
        await chooseUser(container, '5');

        for (const box of [...boxes(container, 'roles'), ...boxes(container, 'permissions')]) {
            // eslint-disable-next-line no-await-in-loop
            await act(async () => { fireEvent.click(box); });
        }
        await clickAssign(container);

        expect(props.assignRolesPermissions.mock.calls[0][1])
            .toEqual({ roles: ['hr_admin', 'employee'], permissions: ['approve_leave', 'edit_payroll'] });
    });

    // FINDING _FINDING_ARP_BLANKUSER - the gate is `this.state.selectedUser != null`, and the
    // blank "Select Name" option yields '' which is loosely non-null. The panel therefore stays
    // open with no user selected and Assign posts a grant with an empty user id.
    test('re-picking the blank option keeps the grant panel open and posts an empty user id _FINDING_ARP_BLANKUSER', async () => {
        const { container, ref, props } = renderARP({ userRole: ['hr_admin'], userPermission: [] });
        await flush();
        await chooseUser(container, '5');
        await chooseUser(container, '');

        expect(ref.current.state.selectedUser).toBe('');
        expect(props.fetchUserRolePermission).toHaveBeenNthCalledWith(2, '');
        expect(assignBtn(container)).not.toBeNull();          // panel should have closed

        await clickAssign(container);

        expect(props.assignRolesPermissions).toHaveBeenCalledWith(
            '', { roles: ['hr_admin'], permissions: [] });
    });

    // FINDING _FINDING_ARP_STALEROLES - the ticks come from state.userRole/userPermission, which
    // only refresh once isUserRolesPermissionsLoaded is true again. In the window between picking
    // a new user and their lookup landing, the previous user's grant is still on screen, and
    // Assign writes it to the new user.
    test('assigning before the new user lookup lands copies the previous user grant onto them _FINDING_ARP_STALEROLES', async () => {
        const { container, props } = renderARP({
            userRole: ['hr_admin'],
            userPermission: ['edit_payroll'],
        });
        await flush();
        await chooseUser(container, '5');            // Gary: hr_admin + edit_payroll
        expect(boxes(container, 'roles')[0].checked).toBe(true);

        await chooseUser(container, '6');            // Glenn - his lookup has not resolved yet
        expect(boxes(container, 'roles')[0].checked).toBe(true);        // still Gary's ticks

        await clickAssign(container);

        expect(props.assignRolesPermissions).toHaveBeenCalledWith(
            '6', { roles: ['hr_admin'], permissions: ['edit_payroll'] });
    });

    test('once the new user grant arrives the boxes are re-seeded from it', async () => {
        const { container, rerenderWith } = renderARP({
            userRole: ['hr_admin'],
            userPermission: ['edit_payroll'],
        });
        await flush();
        await chooseUser(container, '5');
        await chooseUser(container, '6');

        await act(async () => {
            rerenderWith({ userRole: ['employee'], userPermission: [] });
        });
        await flush();

        expect(boxes(container, 'roles').map((b) => b.checked)).toEqual([false, true]);
        expect(boxes(container, 'permissions').every((b) => b.checked === false)).toBe(true);
    });

    // FINDING _FINDING_ACL_RENDERSTATEWRITE - `this.state.userLists = this.props.userLists` runs
    // inside render and only when isUserListLoaded is true. When the flag flips back to false for
    // a refetch, state keeps the superseded result and the dropdown keeps offering it.
    test('a superseded search result stays selectable once the loaded flag flips back _FINDING_ACL_RENDERSTATEWRITE', async () => {
        const { container, ref, props, rerenderWith } = renderARP();
        await flush();
        await chooseUser(container, '5');

        await act(async () => { rerenderWith({ userLists: [], isUserListLoaded: false }); });
        await flush();

        expect(ref.current.props.userLists).toEqual([]);
        expect(ref.current.state.userLists).toEqual(USERS);      // written during render, never reset
        expect(Array.from(userPick(container).querySelectorAll('option')).map((o) => o.value))
            .toEqual(['', '5', '6']);

        await clickAssign(container);
        expect(props.assignRolesPermissions.mock.calls[0][0]).toBe('5');
    });

    // FINDING _FINDING_ACL_CONSOLELEAK - the whole grant payload is written to the browser console
    // on submit, and render logs every role object (with its permission list) on every pass.
    test('the grant payload and the whole role catalogue are dumped to the console _FINDING_ACL_CONSOLELEAK', async () => {
        const { container, props } = renderARP({ userRole: ['hr_admin'], userPermission: [] });
        await flush();
        await chooseUser(container, '5');

        expect(logSpy).toHaveBeenCalledWith(ROLE_CATALOGUE[0]);   // render-time role dump

        await clickAssign(container);

        expect(logSpy).toHaveBeenCalledWith({ roles: ['hr_admin'], permissions: [] });
        expect(props.assignRolesPermissions).toHaveBeenCalledTimes(1);
    });
});

/* ============================================================= ASSIGN FEATURE: load and search */

describe('Admin -> Assign Feature : finding the user', () => {
    test('mounting loads both the role catalogue and the feature catalogue', async () => {
        const { props, getByText } = renderAF();
        await flush();

        expect(props.fetchRoleList).toHaveBeenCalledTimes(1);
        expect(props.fetchFeaturesList).toHaveBeenCalledTimes(1);
        expect(props.fetchUserFeatures).not.toHaveBeenCalled();
        expect(getByText('Manage Features of a User')).toBeInTheDocument();
    });

    // FINDING _FINDING_AF_DEADROLELOOKUP - fetchRoleList is dispatched on every mount and its
    // result copied into state on every render, but the role/permission markup is entirely
    // commented out. The request is pure waste and no role can be granted from this screen.
    test('the role catalogue is fetched and stored but never rendered _FINDING_AF_DEADROLELOOKUP', async () => {
        const { container, ref, props } = renderAF();
        await flush();
        await chooseUser(container, '5');

        expect(props.fetchRoleList).toHaveBeenCalledTimes(1);
        expect(ref.current.state.roles).toEqual(ROLE_CATALOGUE);
        expect(boxes(container, 'roles')).toHaveLength(0);
        expect(boxes(container, 'permissions')).toHaveLength(0);
        expect(labelText(container)).not.toContain('Hr Admin');
    });

    test('with no search performed the page reports no records and offers no user dropdown', async () => {
        const { container, getByText } = renderAF({ userLists: null, isUserListLoaded: false });
        await flush();

        expect(getByText('Sorry, No Record Found')).toBeInTheDocument();
        expect(userPick(container)).toBeNull();
    });

    test('the third search character triggers the user lookup, two do not', async () => {
        const { container, props } = renderAF();
        await flush();

        await type(container, 'gl');
        expect(props.fetchUser).not.toHaveBeenCalled();

        await type(container, 'gle');
        expect(props.fetchUser).toHaveBeenCalledWith('gle');
        expect(props.fetchUser).toHaveBeenCalledTimes(1);
    });

    test('choosing a user loads their features, not their roles and permissions', async () => {
        const { container, ref, props } = renderAF();
        await flush();

        await chooseUser(container, '6');

        expect(ref.current.state.selectedUser).toBe('6');
        expect(props.fetchUserFeatures).toHaveBeenCalledWith('6');
        expect(props.fetchUserFeatures).toHaveBeenCalledTimes(1);
        expect(props.fetchUserRolePermission).not.toHaveBeenCalled();
    });
});

/* ================================================================= ASSIGN FEATURE: the matrix */

describe('Admin -> Assign Feature : the feature matrix', () => {
    test('the chosen user current level is displayed above the feature list', async () => {
        const { container } = renderAF({ userLevel: { level_type: 'Level 3' } });
        await flush();
        await chooseUser(container, '5');

        expect(labelText(container)).toContain('Current Level: Level 3');
    });

    test('a user with no level yet shows an empty level line rather than crashing', async () => {
        const { container } = renderAF({ userLevel: undefined, isUserRolesPermissionsLoaded: false });
        await flush();
        await chooseUser(container, '5');

        expect(labelText(container)).toContain('Current Level:');
        expect(assignBtn(container)).not.toBeNull();
    });

    test('every catalogue feature becomes a checkbox valued by feature_name and labelled by feature_label', async () => {
        const { container } = renderAF();
        await flush();
        await chooseUser(container, '5');

        expect(boxes(container, 'features').map((b) => b.value))
            .toEqual(['payroll_cutoff', 'job_referral']);
        expect(labelText(container)).toEqual(expect.arrayContaining(['Payroll Cutoff', 'Job Referral']));
    });

    test('an empty feature catalogue renders no checkboxes but still offers Assign', async () => {
        const { container } = renderAF({ features: [] });
        await flush();
        await chooseUser(container, '5');

        expect(boxes(container, 'features')).toHaveLength(0);
        expect(container.querySelectorAll('.role-permissions')).toHaveLength(0);
        expect(assignBtn(container)).not.toBeNull();
    });

    test('the features the user already has arrive ticked, the rest do not', async () => {
        const { container } = renderAF({ userFeatures: ['job_referral'] });
        await flush();
        await chooseUser(container, '5');

        expect(boxes(container, 'features').map((b) => [b.value, b.checked]))
            .toEqual([['payroll_cutoff', false], ['job_referral', true]]);
    });
});

/* ============================================================= ASSIGN FEATURE: the grant post */

describe('Admin -> Assign Feature : submitting the feature grant', () => {
    test('Assign posts only the features key against the chosen user id', async () => {
        const { container, props } = renderAF({ userFeatures: ['payroll_cutoff'] });
        await flush();
        await chooseUser(container, '5');
        await clickAssign(container);

        expect(props.assignLevelFeatures).toHaveBeenCalledTimes(1);
        expect(props.assignLevelFeatures).toHaveBeenCalledWith('5', { features: ['payroll_cutoff'] });
        const payload = props.assignLevelFeatures.mock.calls[0][1];
        expect(Object.keys(payload)).toEqual(['features']);
        expect('Level' in payload).toBe(false);
        expect('roles' in payload).toBe(false);
        expect(props.assignRolesPermissions).not.toHaveBeenCalled();
    });

    test('ticking a second feature adds its feature_name to the posted list', async () => {
        const { container, props } = renderAF({ userFeatures: ['payroll_cutoff'] });
        await flush();
        await chooseUser(container, '5');

        await act(async () => { fireEvent.click(boxes(container, 'features')[1]); });
        await clickAssign(container);

        expect(props.assignLevelFeatures.mock.calls[0][1].features)
            .toEqual(['payroll_cutoff', 'job_referral']);
    });

    test('unticking the only feature revokes it by posting an empty feature list', async () => {
        const { container, props } = renderAF({ userFeatures: ['payroll_cutoff'] });
        await flush();
        await chooseUser(container, '5');

        await act(async () => { fireEvent.click(boxes(container, 'features')[0]); });
        expect(boxes(container, 'features')[0].checked).toBe(false);

        await clickAssign(container);

        expect(props.assignLevelFeatures.mock.calls[0][1].features).toEqual([]);
    });

    test('a user with no feature record yet still posts the first feature ticked for them', async () => {
        const { container, props } = renderAF({
            userFeatures: undefined,
            isUserRolesPermissionsLoaded: false,
        });
        await flush();
        await chooseUser(container, '5');

        await act(async () => { fireEvent.click(boxes(container, 'features')[1]); });
        await clickAssign(container);

        expect(props.assignLevelFeatures).toHaveBeenCalledWith('5', { features: ['job_referral'] });
    });

    // FINDING _FINDING_AF_BLANKUSER - same loose-equality gate as the roles screen: '' != null is
    // true, so the blank option leaves the panel open and Assign writes features to no user.
    test('re-picking the blank option keeps the panel open and posts an empty user id _FINDING_AF_BLANKUSER', async () => {
        const { container, ref, props } = renderAF({ userFeatures: ['payroll_cutoff'] });
        await flush();
        await chooseUser(container, '5');
        await chooseUser(container, '');

        expect(ref.current.state.selectedUser).toBe('');
        expect(props.fetchUserFeatures).toHaveBeenNthCalledWith(2, '');
        expect(assignBtn(container)).not.toBeNull();

        await clickAssign(container);

        expect(props.assignLevelFeatures).toHaveBeenCalledWith('', { features: ['payroll_cutoff'] });
    });

    // FINDING _FINDING_AF_STALEFEATURES - the level line and the ticks belong to the previously
    // loaded user until isUserRolesPermissionsLoaded flips again, so assigning straight after
    // switching user copies the previous user's feature set (and shows their level).
    test('assigning before the new user lookup lands copies the previous user features onto them _FINDING_AF_STALEFEATURES', async () => {
        const { container, props } = renderAF({
            userFeatures: ['payroll_cutoff'],
            userLevel: { level_type: 'Level 3' },
        });
        await flush();
        await chooseUser(container, '5');
        expect(boxes(container, 'features')[0].checked).toBe(true);

        await chooseUser(container, '6');                       // Glenn, lookup still in flight
        expect(boxes(container, 'features')[0].checked).toBe(true);
        expect(labelText(container)).toContain('Current Level: Level 3');   // still Gary's level

        await clickAssign(container);

        expect(props.assignLevelFeatures).toHaveBeenCalledWith('6', { features: ['payroll_cutoff'] });
    });

    test('once the new user features arrive the boxes are re-seeded from them', async () => {
        const { container, rerenderWith } = renderAF({ userFeatures: ['payroll_cutoff'] });
        await flush();
        await chooseUser(container, '5');
        await chooseUser(container, '6');

        await act(async () => {
            rerenderWith({ userFeatures: ['job_referral'], userLevel: { level_type: 'Level 1' } });
        });
        await flush();

        expect(boxes(container, 'features').map((b) => b.checked)).toEqual([false, true]);
        expect(labelText(container)).toContain('Current Level: Level 1');
    });

    test('the feature payload is dumped to the console on submit _FINDING_ACL_CONSOLELEAK', async () => {
        const { container } = renderAF({ userFeatures: ['job_referral'] });
        await flush();
        await chooseUser(container, '5');
        await clickAssign(container);

        expect(logSpy).toHaveBeenCalledWith({ features: ['job_referral'] });
    });
});
