/**
 * evoxtest_AdminAssignScreensResidueWave19.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/container/Admin/AssignSubDepartment/AssignSubDepartment.js
 *   src/container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers.js
 *   src/container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors.js
 *
 * MENU PATHS
 *   Admin -> Assign Sub-Department        (Team Head Allocation)
 *   Admin -> Assign Department Handlers
 *   Admin -> Assign Employee Supervisors
 *
 * CURRENT MEASURED COVERAGE (full-suite run, 18 Aug, before this file)
 *   AssignSubDepartment       100% stmts / 90.00% branch / 100% fn
 *   AssignDepartmentHandlers  100% stmts / 96.xx% branch / 100% fn
 *   AssignEmployeeSupervisors 100% stmts / 92.50% branch / 100% fn
 *   The wave-2 suites took every reachable statement and function; what was left is a
 *   handful of in-component branch arms. This file closes the reachable ones and proves
 *   the rest cannot be produced by the screen.
 *
 * ARMS CLOSED HERE
 *   AssignSubDepartment      161 (cWRP no-op), 257 (supervisor with no departments_handled),
 *                            372 ("not Exist" when the sub-department list empties)
 *   AssignEmployeeSupervisors 147 (cWRP no-op)
 *
 * ARMS DECLARED UNREACHABLE (proven by invariant, not forced by setState)
 *   AssignSubDepartment 208/209, AssignEmployeeSupervisors 232/233,
 *   AssignDepartmentHandlers 169/170 - the `!= undefined` guards on state fields the
 *   constructor seeds with "" or [] and that nothing ever writes null/undefined into.
 *   AssignSubDepartment 252 - `reloadingSupervisorList` is declared in the constructor
 *   and never assigned again (see FINDING ASD-DEADFLAG below).
 *
 * FINDINGS
 *   ASD-DEADFLAG  AssignSubDepartment.js:32,252 - reloadingSupervisorList is initialised
 *                 to false and has NO writer anywhere in the file. Its sibling screen
 *                 AssignDepartmentHandlers sets the same-shaped flag around its submit
 *                 (lines 73-82) so the dropdown blanks while the save is in flight. Here
 *                 the guard at line 252 is permanently true, so the supervisor <option>
 *                 list is never suppressed. Characterised below; not a crash, but the
 *                 blanking the author intended never happens.
 *   Existing register entries ASD_BLANKFETCH / ASD_STRICTID / ASD_ALWAYSENABLE /
 *   ASD_HANDLEDUNDEF / AES_STALESUP / AES_RELOADSTUCK already cover this cluster and are
 *   NOT re-asserted here.
 *
 * ADDITIVE ONLY - no existing test file and no application source was modified.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
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
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-multi-select-component', () => () => <div data-testid="multiselect" />);
jest.mock('../../services/DateFormatter', () => ({ convert_date: jest.fn((d) => d) }));
// One registration per real module, and deliberately NOT { virtual: true }: jest keys the
// mock registry by RESOLVED path, so these cover both the '.js' and the extensionless
// import spellings the three containers use. See TESTINFRA-VIRTUALMOCK in the report -
// virtual-mocking a module that really exists is what makes the DTR punch wiring suites
// order-sensitive, and this file does not repeat that.
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(), fetchDepartmentList: jest.fn(), fetchAllSubDepartment: jest.fn(),
    fetchSubDepartmentHandledList: jest.fn(), assignSubDepartment: jest.fn(),
    fetchDepartmentUsersList: jest.fn(), fetchDepartmentHandlersList: jest.fn(),
}));
jest.mock('../../store/actions/admin/assignEmployeeSupervisorsActions', () => ({
    assignEmployeeSupervisorsActions: jest.fn(),
}));
jest.mock('../../store/actions/admin/assignDepartmentHandlersActions', () => ({
    assignDepartmentHandlers: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const AssignSubDepartment =
    require('../../container/Admin/AssignSubDepartment/AssignSubDepartment').default;
const AssignDepartmentHandlers =
    require('../../container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers').default;
const AssignEmployeeSupervisors =
    require('../../container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors').default;

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

/* =============================================== Admin -> Assign Sub-Department */

describe('Admin -> Assign Sub-Department', () => {

    // One shared reference per render so a rerender that does NOT touch department_users
    // leaves componentWillReceiveProps with nothing to do (the line 161 else arm).
    const DEPARTMENT_USERS = [{ id: 21, full_name: 'Ana Cruz' }];

    const asdActions = () => ({
        fetchUserList: jest.fn(() => Promise.resolve()),
        fetchDepartmentList: jest.fn(() => Promise.resolve()),
        fetchAllSubDepartment: jest.fn(() => Promise.resolve()),
        fetchSubDepartmentHandledList: jest.fn(() => Promise.resolve()),
        assignSubDepartment: jest.fn(() => Promise.resolve()),
    });

    const asdProps = (over = {}) => ({
        user: { id: 1 },
        supervisor: [{
            id: '7', full_name: 'Gary Supervisor',
            departments_handled: [{ id: 5, department_name: 'Engineering' }],
        }],
        department: [{ id: 5, department_name: 'Engineering' }],
        department_users: DEPARTMENT_USERS,
        sub_departments_handled: [{ id: '403', Name: 'Eng - Backend' }],
        sub_departments_list: [{ id: '403', Name: 'Eng - Backend' }],
        ...asdActions(),
        ...over,
    });

    const renderASD = (props) => {
        const ref = React.createRef();
        let current = props;
        const view = render(
            <MemoryRouter><AssignSubDepartment ref={ref} {...current} /></MemoryRouter>
        );
        return {
            ...view, ref,
            // Cumulative: a key left out of `next` keeps its previous VALUE and reference,
            // which is what makes the componentWillReceiveProps no-op arm reachable.
            rerenderWith: (next) => {
                current = { ...current, ...next };
                view.rerender(
                    <MemoryRouter><AssignSubDepartment ref={ref} {...current} /></MemoryRouter>
                );
            },
        };
    };

    // Reaches the supervisor dropdown the way the admin does, so the option's stringified
    // departments_handled attribute is parsed by the real handler.
    const pickSupervisor = (container, value) =>
        fireEvent.change(container.querySelector('select[name="supervisor_id"]'), { target: { value } });

    const pickSubDepartment = (container, value) =>
        fireEvent.change(container.querySelector('select[name="department_id"]'), { target: { value } });

    test('a props update that leaves the department members untouched does not reset the chosen sub-department', async () => {
        const props = asdProps();
        const { container, ref, rerenderWith } = renderASD(props);

        pickSupervisor(container, '7');
        pickSubDepartment(container, '403');
        expect(ref.current.state.selectedSubDepartment).toBe('403');
        expect(ref.current.state.sp_action).toBe('disable');

        // An unrelated slice lands (a supervisor was renamed); department_users is the
        // very same array, so componentWillReceiveProps must leave the selection alone.
        rerenderWith({
            supervisor: [{
                id: '7', full_name: 'Gary S. Supervisor',
                departments_handled: [{ id: 5, department_name: 'Engineering' }],
            }],
        });
        await flush();

        expect(ref.current.state.selectedSubDepartment).toBe('403');
        expect(ref.current.state.sp_action).toBe('disable');
        expect(ref.current.state.showDepartmentList).toBe(true);
    });

    test('a supervisor the API returned without a departments_handled list still renders as a pickable option', () => {
        const { container } = renderASD(asdProps({
            supervisor: [
                { id: '7', full_name: 'Gary Supervisor', departments_handled: [{ id: 5, department_name: 'Engineering' }] },
                { id: '8', full_name: 'New Joiner' },   // no departments_handled key at all
            ],
        }));

        const options = container.querySelectorAll('select[name="supervisor_id"] option');
        expect(options).toHaveLength(3);            // blank + two supervisors
        expect(options[1]).toHaveAttribute('departments_handled',
            JSON.stringify([{ department_name: 'Engineering', id: 5 }]));
        expect(options[2]).toHaveTextContent('New Joiner');
        expect(options[2]).toHaveAttribute('departments_handled', '[]');
    });

    test('choosing a supervisor with no departments handled selects them and reports an empty list rather than throwing', () => {
        const { container, ref, getByText } = renderASD(asdProps({
            supervisor: [{ id: '8', full_name: 'New Joiner' }],
            sub_departments_handled: [],
        }));

        pickSupervisor(container, '8');

        expect(ref.current.state.selectedSupervisor).toBe('8');
        expect(ref.current.state.departmentList).toEqual([]);
        getByText('No Departments handled.');
    });

    test('a chosen sub-department that disappears from the lookup reports "not Exist" instead of offering assign or remove', () => {
        const props = asdProps();
        const { container, ref, rerenderWith, getByText, queryByText } = renderASD(props);

        pickSupervisor(container, '7');
        pickSubDepartment(container, '403');
        // String ids on both sides, so the already-handled branch does resolve here.
        getByText('Supervisor Handles Selected Sub Department.');

        // The sub-department lookup comes back empty while the selection is still held.
        rerenderWith({ sub_departments_list: [] });

        expect(ref.current.state.selectedSubDepartment).toBe('403');
        getByText('not Exist');
        expect(queryByText('Supervisor Handles Selected Sub Department.')).toBeNull();
        expect(queryByText('Supervisor does Not Have the Selected Sub Department')).toBeNull();
        expect(container.querySelector('button[type="submit"]')).toBeNull();
    });

    // FINDING ASD-DEADFLAG: reloadingSupervisorList is seeded false at line 32 and never
    // written again anywhere in the file, so the `!this.state.reloadingSupervisorList`
    // guard at line 252 is permanently true and the supervisor list is never suppressed.
    // The sibling AssignDepartmentHandlers does flip its equivalent flag around the save
    // (73-82). Asserted as today's behaviour: when it is given a writer this fails.
    test('the supervisor dropdown is never blanked during a save because the reloading flag has no writer _FINDING_ASD-DEADFLAG', async () => {
        const props = asdProps();
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, ref } = renderASD(props);

        expect(ref.current.state.reloadingSupervisorList).toBe(false);

        await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: '403', sp_action: 'disable' });

        expect(props.assignSubDepartment).toHaveBeenCalledTimes(1);
        expect(ref.current.state.reloadingSupervisorList).toBe(false);
        expect(container.querySelectorAll('select[name="supervisor_id"] option')).toHaveLength(2);
        confirmSpy.mockRestore();
    });

    // UNREACHABLE 208 / 209: the false arms of `selectedSubDepartment != undefined` and
    // `sp_action != undefined` need one of those two state fields to hold null or
    // undefined. The constructor seeds both with the empty string and every writer in the
    // file (handleSelectSupervisor, handleSelectDepartment, componentWillReceiveProps,
    // onSubmitHandler) writes a string. This test walks all four writers and proves the
    // invariant rather than forcing an impossible state.
    test('the sub-department and action state fields are strings after every writer, so their undefined guards can never fail', async () => {
        const props = asdProps();
        const { container, ref, rerenderWith } = renderASD(props);
        const bothAreStrings = () => {
            expect(typeof ref.current.state.selectedSubDepartment).toBe('string');
            expect(typeof ref.current.state.sp_action).toBe('string');
        };

        bothAreStrings();                                   // constructor

        pickSupervisor(container, '7');                     // handleSelectSupervisor, valid arm
        bothAreStrings();
        expect(ref.current.state.selectedSubDepartment).toBe('');

        pickSubDepartment(container, '403');                // handleSelectDepartment
        bothAreStrings();

        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        await ref.current.onSubmitHandler({ supervisor_id: '7', department_id: '403' });
        bothAreStrings();                                   // onSubmitHandler toggle
        confirmSpy.mockRestore();

        rerenderWith({ department_users: [{ id: 22, full_name: 'Ben Reyes' }] });
        await flush();
        bothAreStrings();                                   // componentWillReceiveProps

        pickSupervisor(container, '');                      // handleSelectSupervisor, blank arm
        bothAreStrings();
        expect(ref.current.state.selectedSubDepartment).toBe('');
    });
});

/* ========================================== Admin -> Assign Department Handlers */

describe('Admin -> Assign Department Handlers', () => {

    const adhProps = (over = {}) => ({
        user: { id: 1 },
        supervisor: [{ id: 7, full_name: 'Gary Supervisor' }],
        client: [{ id: 9, full_name: 'Cli Ent' }],
        department: [{ id: 5, department_name: 'Engineering' }],
        department_handlers: [],
        fetchUserList: jest.fn(() => Promise.resolve()),
        fetchDepartmentList: jest.fn(() => Promise.resolve()),
        fetchDepartmentHandlersList: jest.fn(() => Promise.resolve()),
        assignDepartmentHandlers: jest.fn(() => Promise.resolve()),
        ...over,
    });

    const renderADH = (props) => {
        const ref = React.createRef();
        let current = props;
        const view = render(
            <MemoryRouter><AssignDepartmentHandlers ref={ref} {...current} /></MemoryRouter>
        );
        return {
            ...view, ref,
            rerenderWith: (next) => {
                current = { ...current, ...next };
                view.rerender(
                    <MemoryRouter><AssignDepartmentHandlers ref={ref} {...current} /></MemoryRouter>
                );
            },
        };
    };

    // UNREACHABLE 169 / 170: the null arms of `selectedSupervisors != undefined` and
    // `selectedClients != undefined`. The constructor seeds both with [], the only other
    // writers are the two multiselect setters (which receive the picker's array) and
    // componentWillReceiveProps, which assigns Formatter.array_to_multiselect_array -
    // a function that returns [] for every input that is not an array. Proven here across
    // every writer including the degenerate handler payloads.
    test('the supervisor and client selections are always arrays, so their undefined guards can never fail', async () => {
        const props = adhProps();
        const { ref, rerenderWith } = renderADH(props);
        const bothAreArrays = () => {
            expect(Array.isArray(ref.current.state.selectedSupervisors)).toBe(true);
            expect(Array.isArray(ref.current.state.selectedClients)).toBe(true);
        };

        bothAreArrays();                                    // constructor

        await ref.current.handleSelectDepartment({ target: { value: '5' } });
        rerenderWith({ department_handlers: [{ id: 7, full_name: 'Gary Supervisor' }] });
        await flush();
        bothAreArrays();                                    // cWRP, matched arm
        expect(ref.current.state.selectedSupervisors).toEqual([{ label: 'Gary Supervisor', value: 7 }]);

        // A handler list the API returned as null still leaves both selections as arrays,
        // because the formatter rejects anything that is not an Array.
        rerenderWith({ department_handlers: [], supervisor: [], client: [] });
        await flush();
        bothAreArrays();
        expect(ref.current.state.selectedSupervisors).toEqual([]);

        ref.current.setSelectedSupervisors([]);
        ref.current.setSelectedClients([]);
        bothAreArrays();                                    // both multiselect setters
    });

    test('with no supervisor picked the assign button and the selected lists are withheld, and both appear once one is picked', () => {
        const { container, ref, queryByText, getByText } = renderADH(adhProps());

        expect(container.querySelector('button[type="submit"]')).toBeNull();
        expect(queryByText('Selected Supervisor(s):')).toBeNull();

        ref.current.setSelectedSupervisors([{ label: 'Gary Supervisor', value: 7 }]);

        expect(container.querySelector('button[type="submit"]')).not.toBeNull();
        getByText('Selected Supervisor(s):');
        expect(queryByText('Selected Client(s):')).toBeNull();   // clients still empty

        ref.current.setSelectedClients([{ label: 'Cli Ent', value: 9 }]);
        getByText('Selected Client(s):');
        expect(container.querySelectorAll('li')).toHaveLength(2);
    });
});

/* ======================================= Admin -> Assign Employee Supervisors */

describe('Admin -> Assign Employee Supervisors', () => {

    const DEPARTMENT_USERS = [{ id: 21, full_name: 'Ana Cruz' }];

    const aesProps = (over = {}) => ({
        user: { id: 1 },
        supervisor: [{
            id: '7', full_name: 'Gary Supervisor',
            supervisee: [{ id: 21 }],
            departments_handled: [{ id: 5, department_name: 'Engineering' }],
        }],
        department: [{ id: 5, department_name: 'Engineering' }],
        department_users: DEPARTMENT_USERS,
        fetchUserList: jest.fn(() => Promise.resolve()),
        fetchDepartmentList: jest.fn(() => Promise.resolve()),
        fetchDepartmentUsersList: jest.fn(() => Promise.resolve()),
        assignEmployeeSupervisorsActions: jest.fn(() => Promise.resolve()),
        ...over,
    });

    const renderAES = (props) => {
        const ref = React.createRef();
        let current = props;
        const view = render(
            <MemoryRouter><AssignEmployeeSupervisors ref={ref} {...current} /></MemoryRouter>
        );
        return {
            ...view, ref,
            rerenderWith: (next) => {
                current = { ...current, ...next };
                view.rerender(
                    <MemoryRouter><AssignEmployeeSupervisors ref={ref} {...current} /></MemoryRouter>
                );
            },
        };
    };

    test('a props update that leaves the department members untouched keeps the loaded employee list on screen', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const props = aesProps();
        const { container, ref, rerenderWith } = renderAES(props);

        fireEvent.change(container.querySelector('select[name="supervisor_id"]'), { target: { value: '7' } });
        await flush();
        await ref.current.handleSelectDepartment({ target: { value: '5' } });
        rerenderWith({ department_users: [{ id: 21, full_name: 'Ana Cruz' }, { id: 22, full_name: 'Ben Reyes' }] });
        await flush();
        expect(ref.current.state.employeeList).toHaveLength(2);
        expect(ref.current.state.showEmployeeList).toBe(true);

        // Only the department lookup changes; the members array is identical, so cWRP
        // must take its no-op arm and leave the built employee list alone.
        rerenderWith({ department: [{ id: 5, department_name: 'Engineering & Data' }] });
        await flush();

        expect(ref.current.state.employeeList).toHaveLength(2);
        expect(ref.current.state.showEmployeeList).toBe(true);
        expect(ref.current.state.selectedDepartment).toBe('5');
        logSpy.mockRestore();
    });

    // UNREACHABLE 232 / 233: the null arms of `selectedDepartment != undefined` and
    // `selectedValues != undefined`. The constructor seeds "" and [], the dropdown handler
    // writes the DOM value (always a string), componentWillReceiveProps writes "" or a
    // built array, and setSelectedValues receives the multiselect's array. Invariant
    // proven across all four writers.
    test('the department and employee selections keep their string and array types after every writer', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const props = aesProps();
        const { container, ref, rerenderWith } = renderAES(props);
        const typesHold = () => {
            expect(typeof ref.current.state.selectedDepartment).toBe('string');
            expect(Array.isArray(ref.current.state.selectedValues)).toBe(true);
        };

        typesHold();                                        // constructor

        fireEvent.change(container.querySelector('select[name="supervisor_id"]'), { target: { value: '7' } });
        typesHold();                                        // handleSelectSupervisor

        await ref.current.handleSelectDepartment({ target: { value: '5' } });
        typesHold();                                        // handleSelectDepartment

        rerenderWith({ department_users: [{ id: 22, full_name: 'Ben Reyes' }] });
        await flush();
        typesHold();                                        // cWRP, department chosen

        ref.current.setState({ selectedDepartment: '' });
        rerenderWith({ department_users: [] });
        await flush();
        typesHold();                                        // cWRP, no department chosen
        expect(ref.current.state.selectedValues).toEqual([]);

        ref.current.setSelectedValues([{ label: 'Ana Cruz', value: 21 }]);
        typesHold();                                        // setSelectedValues
        logSpy.mockRestore();
    });
});
