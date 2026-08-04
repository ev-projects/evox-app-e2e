/**
 * AdminAssignLifecycle.test.js
 *
 * SOURCES UNDER TEST
 *   1. container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors.js
 *      Menu: Admin -> Assign Employee Supervisors   (Content title "Assign Employee Supervisors")
 *   2. container/Admin/AssignSubDepartment/AssignSubDepartment.js
 *      Menu: Admin -> Team Head Allocation          (Content title "Team Head Allocation")
 *
 * 29-JUL COVERAGE BASELINE
 *   AssignEmployeeSupervisors  54 uncovered stmts / ~26% covered
 *   AssignSubDepartment        47 uncovered stmts / ~36.5% covered
 *   = the 101 uncovered lines of this packet. The two existing Deep2 suites
 *   (__tests__/containers/evoxtest_Assign*Deep2.test.js) drive the instance methods with
 *   hand-made event objects; everything below drives the REAL <select>/<button> DOM so the
 *   render arms (option generation, departments_handled JSON attribute round-trip, the
 *   showDepartmentList / showEmployeeList / cond branches, the submit button wiring) are
 *   exercised the way a user exercises them. ADDITIVE ONLY - no source or existing test touched.
 *
 * FINDINGS CHARACTERISED HERE (asserted as current behaviour, NOT fixed)
 *   _FINDING_AES_NULLDEPTLIST - AssignEmployeeSupervisors.handleSelectSupervisor does
 *       JSON.parse(option.getAttribute('departments_handled')). The blank first <option> has no
 *       such attribute, getAttribute returns null, JSON.parse(null) returns null (it does not
 *       throw), so state.departmentList becomes null instead of []. Only the showDepartmentList
 *       guard being false at the same moment stops `this.state.departmentList.length` from
 *       throwing - any future reorder of those two setState calls is a crash.
 *   _FINDING_AES_ZEROID - Validator.isValid() returns false for numeric zero, so a supervisor
 *       whose primary key is 0 can be picked in the dropdown but the department step never opens.
 *   _FINDING_AES_STALESUP - componentWillReceiveProps cross-matches existing supervisees against
 *       this.props.supervisor (the OLD props) while iterating nextProps.department_users, so a
 *       supervisor list refreshed in the same dispatch is ignored for one cycle.
 *   _FINDING_ASD_BLANKFETCH - AssignSubDepartment.handleSelectSupervisor calls
 *       fetchSubDepartmentHandledList(value) before the Validator guard, so clearing the
 *       supervisor dropdown fires a lookup request with an empty id.
 *   _FINDING_ASD_STRICTID - both the sp_action derivation in handleSelectDepartment
 *       (`item_array.id === value`) and the `cond` flag in render (`e.id === selectedSubDepartment`)
 *       compare a NUMERIC lookup id against the STRING the DOM <select> yields. With the numeric
 *       ids the API returns the comparison is always false: an already-handled sub-department is
 *       reported as "Supervisor does Not Have the Selected Sub Department".
 *   _FINDING_ASD_ALWAYSENABLE - consequence of the above: sp_action submitted from the real DOM
 *       is always "enable", so the "Remove Sub Department" / disable path is unreachable.
 *   _FINDING_ASD_HANDLEDUNDEF - handleSelectDepartment calls
 *       this.props.sub_departments_handled.some(...) with no undefined guard, so picking a
 *       sub-department before the handled-list lookup resolves throws a TypeError.
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
    Content:          ({ children, title }) => <div><h1>{title}</h1>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

// MultiSelect stub that exposes its options / current value and lets a test drive onChange.
jest.mock('react-multi-select-component', () => ({
    __esModule: true,
    default: ({ options, value, onChange, labelledBy }) => (
        <div data-testid="employee-multiselect" aria-label={labelledBy}>
            <span data-testid="ms-options">{(options || []).map((o) => o.label).join('|')}</span>
            <span data-testid="ms-selected">{(value || []).map((o) => o.label).join('|')}</span>
            <button type="button" data-testid="ms-select-all" onClick={() => onChange(options)}>all</button>
            <button type="button" data-testid="ms-clear" onClick={() => onChange([])}>clear</button>
        </div>
    ),
}));

jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(),
    fetchDepartmentList: jest.fn(),
    fetchDepartmentUsersList: jest.fn(),
    fetchAllSubDepartment: jest.fn(),
    fetchSubDepartmentHandledList: jest.fn(),
    assignSubDepartment: jest.fn(),
}));
jest.mock('../../store/actions/admin/assignEmployeeSupervisorsActions', () => ({
    assignEmployeeSupervisorsActions: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const AssignEmployeeSupervisors =
    require('../../container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors').default;
const AssignSubDepartment =
    require('../../container/Admin/AssignSubDepartment/AssignSubDepartment').default;

const flush = () => act(() => Promise.resolve());

/* ------------------------------------------------------------------ AES helpers */

const AES_SUPERVISORS = [
    {
        id: 7,
        full_name: 'Gary Aure',
        supervisee: [{ id: 21 }],
        departments_handled: [{ id: 5, department_name: 'Engineering' }, { id: 6, department_name: 'Support' }],
    },
    { id: 8, full_name: 'Glenn Macasarte', supervisee: [], departments_handled: [] },
];

const aesActions = () => ({
    fetchUserList: jest.fn(() => Promise.resolve()),
    fetchDepartmentList: jest.fn(() => Promise.resolve()),
    fetchDepartmentUsersList: jest.fn(() => Promise.resolve()),
    assignEmployeeSupervisorsActions: jest.fn(() => Promise.resolve()),
});

function aesProps(over = {}) {
    return {
        supervisor: AES_SUPERVISORS,
        department: [{ id: 5, department_name: 'Engineering' }],
        department_users: [],
        ...aesActions(),
        ...over,
    };
}

function renderAES(over = {}) {
    const props = aesProps(over);
    const ref = React.createRef();
    const utils = render(<AssignEmployeeSupervisors {...props} ref={ref} />);
    const rerenderWith = (next) =>
        utils.rerender(<AssignEmployeeSupervisors {...props} {...next} ref={ref} />);
    return { ...utils, ref, props, rerenderWith };
}

const supSelect = (c) => c.querySelector('select[name="supervisor_id"]');
const deptSelect = (c) => c.querySelector('select[name="department_id"]');

async function pickSupervisor(container, value) {
    await act(async () => { fireEvent.change(supSelect(container), { target: { value } }); });
}
async function pickDepartment(container, value) {
    await act(async () => { fireEvent.change(deptSelect(container), { target: { value } }); });
}

/* ------------------------------------------------------------------ ASD helpers */

const ASD_SUPERVISORS = [
    { id: 7, full_name: 'Gary Aure', supervisee: [], departments_handled: [{ id: 5, department_name: 'Engineering' }] },
];

const asdActions = () => ({
    fetchUserList: jest.fn(() => Promise.resolve()),
    fetchDepartmentList: jest.fn(() => Promise.resolve()),
    fetchAllSubDepartment: jest.fn(() => Promise.resolve()),
    fetchSubDepartmentHandledList: jest.fn(() => Promise.resolve()),
    assignSubDepartment: jest.fn(() => Promise.resolve()),
});

function asdProps(over = {}) {
    return {
        supervisor: ASD_SUPERVISORS,
        department: [{ id: 5, department_name: 'Engineering' }],
        department_users: [],
        myTeamList: {},
        sub_departments_handled: [{ id: 403, Name: 'Eng - Platform' }],
        sub_departments_list: [{ id: 403, Name: 'Eng - Platform' }, { id: 404, Name: 'Eng - Mobile' }],
        ...asdActions(),
        ...over,
    };
}

function renderASD(over = {}) {
    const props = asdProps(over);
    const ref = React.createRef();
    const utils = render(<AssignSubDepartment {...props} ref={ref} />);
    const rerenderWith = (next) =>
        utils.rerender(<AssignSubDepartment {...props} {...next} ref={ref} />);
    return { ...utils, ref, props, rerenderWith };
}

let confirmSpy;
beforeEach(() => {
    jest.clearAllMocks();
    confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
});
afterEach(() => { confirmSpy.mockRestore(); });

/* ================================================================== AES: load + gate */

describe('Assign Employee Supervisors - page load', () => {
    test('the form is withheld behind PageLoading until the supervisor lookup has arrived', () => {
        const { container, getByTestId } = renderAES({ supervisor: undefined });

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(supSelect(container)).toBeNull();
    });

    test('an empty supervisor lookup still renders the form, with only the blank option', async () => {
        const { container } = renderAES({ supervisor: [] });
        await flush();

        expect(supSelect(container)).not.toBeNull();
        expect(supSelect(container).querySelectorAll('option')).toHaveLength(1);
    });

    test('mounting requests the supervisor-role user list for every page and the department list', async () => {
        const { props } = renderAES();
        await flush();

        expect(props.fetchUserList).toHaveBeenCalledWith('supervisor', { page: 'all' });
        expect(props.fetchUserList).toHaveBeenCalledTimes(1);
        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(1);
        expect(props.fetchDepartmentUsersList).not.toHaveBeenCalled();
    });

    test('every supervisor becomes one option, preceded by the blank de-select option', async () => {
        const { container } = renderAES();
        await flush();

        const options = Array.from(supSelect(container).querySelectorAll('option'));
        expect(options.map((o) => o.value)).toEqual(['', '7', '8']);
        expect(options.map((o) => o.textContent)).toEqual(['', 'Gary Aure', 'Glenn Macasarte']);
    });

    test('each supervisor option carries its departments as a stringified JSON attribute', async () => {
        const { container } = renderAES();
        await flush();

        const opt = supSelect(container).querySelector('option[value="7"]');
        expect(JSON.parse(opt.getAttribute('departments_handled'))).toEqual([
            { department_name: 'Engineering', id: 5 },
            { department_name: 'Support', id: 6 },
        ]);
    });

    test('a supervisor whose departments_handled is missing serialises to an empty array, not null', async () => {
        const { container } = renderAES({
            supervisor: [{ id: 9, full_name: 'No Dept Person', supervisee: [] }],
        });
        await flush();

        const opt = supSelect(container).querySelector('option[value="9"]');
        expect(opt.getAttribute('departments_handled')).toBe('[]');
    });
});

/* ================================================================== AES: supervisor arm */

describe('Assign Employee Supervisors - choosing a supervisor', () => {
    test('choosing a supervisor opens a departments-handled dropdown built from the option attribute', async () => {
        const { container, ref } = renderAES();
        await flush();
        await pickSupervisor(container, '7');

        expect(ref.current.state.selectedSupervisor).toBe('7');
        expect(ref.current.state.showDepartmentList).toBe(true);
        expect(ref.current.state.departmentList).toEqual([
            { department_name: 'Engineering', id: 5 },
            { department_name: 'Support', id: 6 },
        ]);
        expect(Array.from(deptSelect(container).querySelectorAll('option')).map((o) => o.textContent))
            .toEqual(['', 'Engineering', 'Support']);
    });

    test('a supervisor handling no departments shows the empty-state label instead of a dropdown', async () => {
        const { container, getByText } = renderAES();
        await flush();
        await pickSupervisor(container, '8');

        expect(getByText('No Departments handled.')).toBeInTheDocument();
        expect(deptSelect(container)).toBeNull();
    });

    test('switching to another supervisor clears the previously chosen employees and the department step', async () => {
        const { container, ref } = renderAES();
        await flush();
        await pickSupervisor(container, '7');
        await pickDepartment(container, '5');
        act(() => { ref.current.setSelectedValues([{ label: 'Alice', value: 21 }]); });
        expect(ref.current.state.selectedValues).toHaveLength(1);

        await pickSupervisor(container, '8');

        expect(ref.current.state.selectedValues).toEqual([]);
        expect(ref.current.state.selectedDepartment).toBe('');
        expect(ref.current.state.showEmployeeList).toBe(false);
        expect(ref.current.state.employeeList).toEqual([]);
    });

    // FINDING _FINDING_AES_NULLDEPTLIST - the blank option has no departments_handled attribute,
    // getAttribute yields null and JSON.parse(null) yields null (no throw), so departmentList is
    // set to null rather than []. It is only safe because showDepartmentList is false in the same
    // update; the render arm would call null.length otherwise.
    test('de-selecting the supervisor hides the department step _FINDING_AES_NULLDEPTLIST', async () => {
        const { container, ref } = renderAES();
        await flush();
        await pickSupervisor(container, '7');
        expect(ref.current.state.departmentList).toHaveLength(2);

        await pickSupervisor(container, '');

        expect(ref.current.state.showDepartmentList).toBe(false);
        expect(ref.current.state.selectedDepartment).toBe('');
        expect(ref.current.state.departmentList).toBeNull();   // characterised defect, not []
        expect(deptSelect(container)).toBeNull();
    });

    // FINDING _FINDING_AES_ZEROID - Validator.isValid() treats numeric zero as invalid, so a
    // supervisor row with primary key 0 is selectable but permanently dead-ends.
    test('a supervisor whose id is 0 is treated as no selection at all _FINDING_AES_ZEROID', async () => {
        const { container, ref } = renderAES({
            supervisor: [{ id: 0, full_name: 'Zero Id', supervisee: [], departments_handled: [{ id: 5, department_name: 'Engineering' }] }],
        });
        await flush();
        await pickSupervisor(container, '0');

        expect(ref.current.state.selectedSupervisor).toBe('0');
        expect(ref.current.state.showDepartmentList).toBe(false);
        expect(deptSelect(container)).toBeNull();
    });
});

/* ================================================================== AES: department + employees */

describe('Assign Employee Supervisors - department and employee list', () => {
    test('choosing a department fetches that department members list and records the selection', async () => {
        const { container, ref, props } = renderAES();
        await flush();
        await pickSupervisor(container, '7');
        await pickDepartment(container, '5');

        expect(props.fetchDepartmentUsersList).toHaveBeenCalledWith('5');
        expect(props.fetchDepartmentUsersList).toHaveBeenCalledTimes(1);
        expect(ref.current.state.selectedDepartment).toBe('5');
    });

    test('arriving department members become the multiselect options and reveal it', async () => {
        const { container, rerenderWith, getByTestId } = renderAES();
        await flush();
        await pickSupervisor(container, '7');
        await pickDepartment(container, '5');

        await act(async () => {
            rerenderWith({ department_users: [{ id: 21, full_name: 'Alice A' }, { id: 22, full_name: 'Bob B' }] });
        });
        await flush();

        expect(getByTestId('employee-multiselect')).toBeInTheDocument();
        expect(getByTestId('ms-options')).toHaveTextContent('Alice A|Bob B');
    });

    test('members already supervised by the chosen supervisor arrive pre-selected, others do not', async () => {
        const { container, rerenderWith, ref, getByTestId } = renderAES();
        await flush();
        await pickSupervisor(container, '7');           // supervisee: [{id: 21}]
        await pickDepartment(container, '5');

        await act(async () => {
            rerenderWith({ department_users: [{ id: 21, full_name: 'Alice A' }, { id: 22, full_name: 'Bob B' }] });
        });
        await flush();

        expect(ref.current.state.selectedValues).toEqual([{ label: 'Alice A', value: 21 }]);
        expect(getByTestId('ms-selected')).toHaveTextContent('Alice A');
        expect(getByTestId('ms-selected')).not.toHaveTextContent('Bob B');
    });

    test('a department with no members yields an empty multiselect and no pre-selection', async () => {
        const { container, rerenderWith, ref, getByTestId } = renderAES();
        await flush();
        await pickSupervisor(container, '7');
        await pickDepartment(container, '5');

        await act(async () => { rerenderWith({ department_users: [] }); });
        await flush();

        expect(ref.current.state.showEmployeeList).toBe(true);
        expect(ref.current.state.employeeList).toEqual([]);
        expect(getByTestId('ms-options')).toHaveTextContent('');
        expect(ref.current.state.selectedValues).toEqual([]);
    });

    test('department members that arrive while no department is chosen keep the employee step hidden', async () => {
        const { rerenderWith, ref, queryByTestId } = renderAES();
        await flush();

        await act(async () => { rerenderWith({ department_users: [{ id: 21, full_name: 'Alice A' }] }); });
        await flush();

        expect(ref.current.state.showEmployeeList).toBe(false);
        expect(ref.current.state.employeeList).toEqual([]);
        expect(queryByTestId('employee-multiselect')).toBeNull();
    });

    // FINDING _FINDING_AES_STALESUP - componentWillReceiveProps iterates nextProps.department_users
    // but cross-matches against this.props.supervisor, i.e. the PREVIOUS props. A supervisee list
    // refreshed in the same dispatch as the member list is therefore ignored for one cycle: the
    // employee is offered as unassigned even though the store already says they are supervised.
    test('supervisee data refreshed in the same update as the members is ignored _FINDING_AES_STALESUP', async () => {
        const stale = [{ id: 7, full_name: 'Gary Aure', supervisee: [], departments_handled: [{ id: 5, department_name: 'Engineering' }] }];
        const fresh = [{ id: 7, full_name: 'Gary Aure', supervisee: [{ id: 21 }], departments_handled: [{ id: 5, department_name: 'Engineering' }] }];

        const { container, rerenderWith, ref, getByTestId } = renderAES({ supervisor: stale });
        await flush();
        await pickSupervisor(container, '7');
        await pickDepartment(container, '5');

        // the refreshed lookup now says 21 IS supervised, and it lands together with the members
        await act(async () => {
            rerenderWith({ supervisor: fresh, department_users: [{ id: 21, full_name: 'Alice A' }] });
        });
        await flush();

        expect(ref.current.state.employeeList).toEqual([{ label: 'Alice A', value: 21 }]);
        expect(ref.current.state.selectedValues).toEqual([]);   // read off the stale supervisor props
        expect(getByTestId('ms-selected')).toHaveTextContent('');
    });

    test('the multiselect onChange feeds the selected-employees panel, and clearing empties it', async () => {
        const { container, rerenderWith, ref, getByTestId, queryByText } = renderAES();
        await flush();
        await pickSupervisor(container, '7');
        await pickDepartment(container, '5');
        await act(async () => {
            rerenderWith({ department_users: [{ id: 21, full_name: 'Alice A' }, { id: 22, full_name: 'Bob B' }] });
        });
        await flush();

        await act(async () => { fireEvent.click(getByTestId('ms-select-all')); });
        expect(ref.current.state.selectedValues).toEqual([
            { label: 'Alice A', value: 21 }, { label: 'Bob B', value: 22 },
        ]);
        expect(queryByText('Selected Employees(s):')).toBeInTheDocument();
        expect(Array.from(container.querySelectorAll('li')).map((li) => li.textContent))
            .toEqual(['Alice A', 'Bob B']);

        await act(async () => { fireEvent.click(getByTestId('ms-clear')); });
        expect(ref.current.state.selectedValues).toEqual([]);
        expect(queryByText('Selected Employees(s):')).toBeNull();   // empty array is "not valid"
    });

    test('the Assign button appears only once a department is selected', async () => {
        const { container } = renderAES();
        await flush();
        expect(container.querySelector('button[type="submit"]')).toBeNull();

        await pickSupervisor(container, '7');
        expect(container.querySelector('button[type="submit"]')).toBeNull();

        await pickDepartment(container, '5');
        expect(container.querySelector('button[type="submit"]')).not.toBeNull();

        await pickDepartment(container, '');            // back to the blank department option
        expect(container.querySelector('button[type="submit"]')).toBeNull();
    });
});

/* ================================================================== AES: submit */

describe('Assign Employee Supervisors - submitting the assignment', () => {
    test('the assignment is confirmed with the user before anything is posted', async () => {
        const { ref, props } = renderAES();
        await flush();

        await act(async () => { await ref.current.onSubmitHandler({ supervisor_id: '7', user_id: [] }); });

        expect(confirmSpy).toHaveBeenCalledWith(
            'Are you sure you want to assign these Employees on the selected Supervisor?');
        expect(props.assignEmployeeSupervisorsActions).toHaveBeenCalledTimes(1);
    });

    test('declining the confirmation posts nothing and leaves the selection untouched', async () => {
        confirmSpy.mockReturnValue(false);
        const { container, ref, props } = renderAES();
        await flush();
        await pickSupervisor(container, '7');
        await pickDepartment(container, '5');

        await act(async () => {
            await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: '5', user_id: [] });
        });

        expect(props.assignEmployeeSupervisorsActions).not.toHaveBeenCalled();
        expect(ref.current.state.reloadingSupervisorList).toBe(false);
        expect(ref.current.state.selectedSupervisor).toBe('7');
    });

    test('the multiselect objects are flattened to bare employee ids in the payload', async () => {
        const { ref, props } = renderAES();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                supervisor_id: '7',
                department_id: '5',
                user_id: [{ label: 'Alice A', value: 21 }, { label: 'Bob B', value: 22 }],
            });
        });

        expect(props.assignEmployeeSupervisorsActions).toHaveBeenCalledWith(
            '7', { supervisor_id: '7', department_id: '5', user_id: [21, 22] });
    });

    test('an empty employee selection posts an empty id list rather than being dropped', async () => {
        const { ref, props } = renderAES();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: '5', user_id: [] });
        });

        expect(props.assignEmployeeSupervisorsActions.mock.calls[0][1]).toEqual(
            { supervisor_id: '7', department_id: '5', user_id: [] });
    });

    test('null form fields are stripped from the payload entirely', async () => {
        const { ref, props } = renderAES();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: null, user_id: null });
        });

        const payload = props.assignEmployeeSupervisorsActions.mock.calls[0][1];
        expect(payload).toEqual({ supervisor_id: '7' });
        expect('department_id' in payload).toBe(false);
        expect('user_id' in payload).toBe(false);
    });

    test('a successful assign clears the reloading flag and keeps the supervisor selected', async () => {
        const { ref, props } = renderAES();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: '5', user_id: [] });
        });

        expect(ref.current.state.reloadingSupervisorList).toBe(false);
        expect(ref.current.state.selectedSupervisor).toBe('7');
        expect(props.assignEmployeeSupervisorsActions).toHaveBeenCalledTimes(1);
    });

    test('a rejected assign leaves the reloading flag stuck true and the supervisor unchanged', async () => {
        const { ref } = renderAES({
            assignEmployeeSupervisorsActions: jest.fn(() => Promise.reject(new Error('500'))),
        });
        await flush();

        let caught = null;
        await act(async () => {
            try {
                await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: '5', user_id: [] });
            } catch (e) { caught = e; }
        });

        expect(caught).toBeInstanceOf(Error);
        expect(ref.current.state.reloadingSupervisorList).toBe(true);   // never reset on failure
        expect(ref.current.state.selectedSupervisor).toBeNull();
    });

    test('clicking Assign in the rendered form posts the current supervisor/department pair', async () => {
        const { container, props } = renderAES();
        await flush();
        await pickSupervisor(container, '7');
        await pickDepartment(container, '5');

        await act(async () => { fireEvent.click(container.querySelector('button[type="submit"]')); });
        await flush();
        await flush();

        expect(props.assignEmployeeSupervisorsActions).toHaveBeenCalledTimes(1);
        const [supervisorId, payload] = props.assignEmployeeSupervisorsActions.mock.calls[0];
        expect(supervisorId).toBe('7');
        expect(payload.supervisor_id).toBe('7');
        expect(payload.department_id).toBe('5');
        expect(payload.user_id).toEqual([]);
    });

    test('while reloading the supervisor list the dropdown collapses to the blank option only', async () => {
        const { container, ref } = renderAES();
        await flush();

        act(() => { ref.current.setState({ reloadingSupervisorList: true }); });

        expect(supSelect(container).querySelectorAll('option')).toHaveLength(1);
    });
});

/* ================================================================== ASD: load + render */

describe('Team Head Allocation - page load', () => {
    test('the form is withheld behind PageLoading until the supervisor lookup has arrived', () => {
        const { container, getByTestId } = renderASD({ supervisor: undefined });

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(container.querySelector('select')).toBeNull();
    });

    test('mounting fetches supervisors, departments and the full sub-department catalogue', async () => {
        const { props, getByText } = renderASD();
        await flush();

        expect(props.fetchUserList).toHaveBeenCalledWith('supervisor', { page: 'all' });
        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(1);
        expect(props.fetchAllSubDepartment).toHaveBeenCalledTimes(1);
        expect(props.fetchSubDepartmentHandledList).not.toHaveBeenCalled();
        expect(getByText('Team Head Allocation')).toBeInTheDocument();
    });

    test('nothing below the supervisor dropdown renders until a supervisor is picked', async () => {
        const { container, queryByText } = renderASD();
        await flush();

        expect(container.querySelectorAll('select')).toHaveLength(1);
        expect(queryByText('Sub Departments Handled:')).toBeNull();
        expect(queryByText('Sub Department:')).toBeNull();
    });
});

/* ================================================================== ASD: supervisor arm */

describe('Team Head Allocation - choosing a supervisor', () => {
    test('picking a supervisor requests that supervisors handled sub-departments and opens the panel', async () => {
        const { container, ref, props, getByText } = renderASD();
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });

        expect(props.fetchSubDepartmentHandledList).toHaveBeenCalledWith('7');
        expect(ref.current.state.showDepartmentList).toBe(true);
        expect(ref.current.state.sp_action).toBe('');
        expect(getByText('Sub Departments Handled:')).toBeInTheDocument();
        expect(getByText('Sub Department:')).toBeInTheDocument();
    });

    // FINDING _FINDING_ASD_BLANKFETCH - the lookup call happens before the Validator guard, so
    // clearing the dropdown still issues a request with an empty supervisor id.
    test('clearing the supervisor closes the panel but still fires a lookup with an empty id _FINDING_ASD_BLANKFETCH', async () => {
        const { container, ref, props, queryByText } = renderASD();
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '' } }); });

        expect(props.fetchSubDepartmentHandledList).toHaveBeenNthCalledWith(2, '');
        expect(ref.current.state.showDepartmentList).toBe(false);
        expect(ref.current.state.selectedSubDepartment).toBe('');
        expect(queryByText('Sub Departments Handled:')).toBeNull();
    });

    test('the sub-departments the supervisor already handles are listed by name', async () => {
        const { container } = renderASD({
            sub_departments_handled: [{ id: 403, Name: 'Eng - Platform' }, { id: 405, Name: 'Eng - QA' }],
        });
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });

        expect(Array.from(container.querySelectorAll('li')).map((li) => li.textContent))
            .toEqual(['Eng - Platform', 'Eng - QA']);
    });

    test('a supervisor handling no sub-departments shows the empty-state label', async () => {
        const { container, getByText } = renderASD({ sub_departments_handled: [] });
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });

        expect(getByText('No Departments handled.')).toBeInTheDocument();
        expect(container.querySelectorAll('li')).toHaveLength(0);
    });

    test('an unresolved handled-list lookup also shows the empty-state label', async () => {
        const { container, getByText } = renderASD({ sub_departments_handled: undefined });
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });

        expect(getByText('No Departments handled.')).toBeInTheDocument();
    });

    test('the sub-department dropdown offers every catalogue entry plus the blank option', async () => {
        const { container } = renderASD();
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });

        const options = Array.from(deptSelect(container).querySelectorAll('option'));
        expect(options.map((o) => o.value)).toEqual(['', '403', '404']);
        expect(options.map((o) => o.textContent)).toEqual(['', 'Eng - Platform', 'Eng - Mobile']);
    });

    test('an empty sub-department catalogue leaves the dropdown with only the blank option', async () => {
        const { container } = renderASD({ sub_departments_list: [], sub_departments_handled: [] });
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });

        expect(deptSelect(container).querySelectorAll('option')).toHaveLength(1);
    });
});

/* ================================================================== ASD: sub-department guard */

describe('Team Head Allocation - handled/not-handled guard', () => {
    test('a sub-department the supervisor does not handle offers the Assign action', async () => {
        const { container, ref, getByText } = renderASD();
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        await act(async () => { fireEvent.change(deptSelect(container), { target: { value: '404' } }); });

        expect(ref.current.state.selectedSubDepartment).toBe('404');
        expect(ref.current.state.sp_action).toBe('enable');
        expect(getByText('Supervisor does Not Have the Selected Sub Department')).toBeInTheDocument();
        expect(container.querySelector('button[type="submit"]').textContent)
            .toContain('Assign Sub Department');
    });

    // FINDING _FINDING_ASD_STRICTID - sub-department 403 IS in sub_departments_handled, but the
    // guard compares the numeric lookup id with the string the <select> emits using ===, so the
    // screen tells the admin the supervisor does NOT handle it and offers Assign, never Remove.
    test('a sub-department the supervisor DOES handle is still reported as unhandled _FINDING_ASD_STRICTID', async () => {
        const { container, ref, getByText, queryByText } = renderASD();
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        await act(async () => { fireEvent.change(deptSelect(container), { target: { value: '403' } }); });

        expect(ref.current.props.sub_departments_handled[0].id).toBe(403);   // it is handled
        expect(ref.current.state.selectedSubDepartment).toBe('403');         // but as a string
        expect(ref.current.state.sp_action).toBe('enable');                  // should be 'disable'
        expect(getByText('Supervisor does Not Have the Selected Sub Department')).toBeInTheDocument();
        expect(queryByText('Supervisor Handles Selected Sub Department.')).toBeNull();
    });

    test('with string ids in the lookup the same guard correctly offers Remove', async () => {
        const { container, ref, getByText } = renderASD({
            sub_departments_handled: [{ id: '403', Name: 'Eng - Platform' }],
            sub_departments_list: [{ id: '403', Name: 'Eng - Platform' }, { id: '404', Name: 'Eng - Mobile' }],
        });
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        await act(async () => { fireEvent.change(deptSelect(container), { target: { value: '403' } }); });

        expect(ref.current.state.sp_action).toBe('disable');
        expect(getByText('Supervisor Handles Selected Sub Department.')).toBeInTheDocument();
        expect(container.querySelector('button[type="submit"]').textContent)
            .toContain('Remove Sub Department');
    });

    test('the selected sub-department is emphasised inside the handled list', async () => {
        const { container } = renderASD({
            sub_departments_handled: [{ id: '403', Name: 'Eng - Platform' }, { id: '405', Name: 'Eng - QA' }],
            sub_departments_list: [{ id: '403', Name: 'Eng - Platform' }],
        });
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        await act(async () => { fireEvent.change(deptSelect(container), { target: { value: '403' } }); });

        const bold = container.querySelectorAll('li b');
        expect(bold).toHaveLength(1);
        expect(bold[0].textContent).toBe('Eng - Platform');
    });

    test('re-selecting the blank sub-department hides the action row again', async () => {
        const { container, ref, queryByText } = renderASD({
            sub_departments_handled: [{ id: '403', Name: 'Eng - Platform' }],
        });
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        await act(async () => { fireEvent.change(deptSelect(container), { target: { value: '403' } }); });
        expect(container.querySelector('button[type="submit"]')).not.toBeNull();

        await act(async () => { fireEvent.change(deptSelect(container), { target: { value: '' } }); });

        expect(ref.current.state.selectedSubDepartment).toBe('');
        expect(container.querySelector('button[type="submit"]')).toBeNull();
        expect(queryByText('Supervisor Handles Selected Sub Department.')).toBeNull();
        expect(queryByText('Supervisor does Not Have the Selected Sub Department')).toBeNull();
    });

    // FINDING _FINDING_ASD_HANDLEDUNDEF - render() gates its `cond` calculation on
    // `this.props.sub_departments_list !== undefined` but then dereferences a DIFFERENT prop,
    // this.props.sub_departments_handled.filter(...). handleSelectDepartment has the same hole
    // (`this.props.sub_departments_handled.some(...)`, no guard). So choosing a sub-department
    // before fetchSubDepartmentHandledList has resolved throws inside render, and with no error
    // boundary above it React unmounts the whole page - the admin gets a blank screen.
    test('picking a sub-department before the handled list resolves tears the page down _FINDING_ASD_HANDLEDUNDEF', async () => {
        const { ref } = renderASD({ sub_departments_handled: undefined });
        await flush();

        let err = null;
        try { await ref.current.handleSelectDepartment({ target: { value: '403' } }); }
        catch (e) { err = e; }

        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toMatch(/filter|some/);
        expect(ref.current).toBeNull();   // tree unmounted by the render-time throw
    });
});

/* ================================================================== ASD: submit + props */

describe('Team Head Allocation - submitting the allocation', () => {
    test('submitting posts the supervisor id alongside the sub-department and sp_action', async () => {
        const { ref, props } = renderASD();
        await flush();
        act(() => { ref.current.setState({ sp_action: 'enable' }); });

        await act(async () => {
            await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: '404', sp_action: 'enable' });
        });

        expect(props.assignSubDepartment).toHaveBeenCalledWith(
            '7', { supervisor_id: '7', department_id: '404', sp_action: 'enable' });
    });

    test('declining the confirmation posts nothing and does not toggle sp_action', async () => {
        confirmSpy.mockReturnValue(false);
        const { ref, props } = renderASD();
        await flush();
        act(() => { ref.current.setState({ sp_action: 'enable' }); });

        await act(async () => {
            await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: '404', sp_action: 'enable' });
        });

        expect(props.assignSubDepartment).not.toHaveBeenCalled();
        expect(ref.current.state.sp_action).toBe('enable');
    });

    test('a completed allocation flips sp_action to its opposite so the next click reverses it', async () => {
        const { ref } = renderASD();
        await flush();
        act(() => { ref.current.setState({ sp_action: 'enable' }); });

        await act(async () => { await ref.current.onSubmitHandler({ supervisor_id: '7' }); });
        expect(ref.current.state.sp_action).toBe('disable');

        await act(async () => { await ref.current.onSubmitHandler({ supervisor_id: '7' }); });
        expect(ref.current.state.sp_action).toBe('enable');
    });

    test('an untouched sp_action becomes enable after the first submit', async () => {
        const { ref } = renderASD();
        await flush();
        expect(ref.current.state.sp_action).toBe('');

        await act(async () => { await ref.current.onSubmitHandler({ supervisor_id: '7' }); });

        expect(ref.current.state.sp_action).toBe('enable');
    });

    // FINDING _FINDING_ASD_ALWAYSENABLE - driven from the real DOM, sub-department 403 is already
    // handled, yet the payload asks the backend to enable it again. The disable/removal branch is
    // unreachable through the UI while the lookup returns numeric ids.
    test('removing an already-handled sub-department still posts sp_action enable _FINDING_ASD_ALWAYSENABLE', async () => {
        const { container, props } = renderASD();
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        await act(async () => { fireEvent.change(deptSelect(container), { target: { value: '403' } }); });

        await act(async () => { fireEvent.click(container.querySelector('button[type="submit"]')); });
        await flush();
        await flush();

        expect(props.assignSubDepartment).toHaveBeenCalledTimes(1);
        const [supervisorId, payload] = props.assignSubDepartment.mock.calls[0];
        expect(supervisorId).toBe('7');
        expect(payload.department_id).toBe('403');
        expect(payload.sp_action).toBe('enable');   // 'disable' is what a removal needs
    });

    test('multiselect-shaped user_id values are still flattened to ids by the shared payload builder', async () => {
        const { ref, props } = renderASD();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                supervisor_id: '7',
                department_id: '404',
                user_id: [{ label: 'Alice A', value: 21 }, { label: 'Bob B', value: 22 }],
                sp_action: null,
            });
        });

        const payload = props.assignSubDepartment.mock.calls[0][1];
        expect(payload.user_id).toEqual([21, 22]);
        expect('sp_action' in payload).toBe(false);   // null stripped
    });

    test('department members arriving with a sub-department selected clear the chosen values but keep the sub-department', async () => {
        const { container, ref, rerenderWith } = renderASD();
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        await act(async () => { fireEvent.change(deptSelect(container), { target: { value: '404' } }); });
        act(() => { ref.current.setSelectedValues([{ label: 'Alice A', value: 21 }]); });

        await act(async () => { rerenderWith({ department_users: [{ id: 21, full_name: 'Alice A' }] }); });
        await flush();

        expect(ref.current.state.selectedValues).toEqual([]);
        expect(ref.current.state.selectedSubDepartment).toBe('404');
    });

    test('department members arriving with no sub-department selected reset the sub-department too', async () => {
        const { container, ref, rerenderWith } = renderASD();
        await flush();
        await act(async () => { fireEvent.change(supSelect(container), { target: { value: '7' } }); });
        act(() => { ref.current.setSelectedValues([{ label: 'Alice A', value: 21 }]); });

        await act(async () => { rerenderWith({ department_users: [{ id: 21, full_name: 'Alice A' }] }); });
        await flush();

        expect(ref.current.state.selectedSubDepartment).toBe('');
        expect(ref.current.state.selectedValues).toEqual([]);
    });
});
