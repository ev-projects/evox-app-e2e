/**
 * evoxtest_AssignEmployeeSupervisorsDeep2.test.js
 * Wave-5 coverage for container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors.js
 * (fresh: 54 unc / 26%). Arms: mount fetches (supervisor list + departments),
 * onSubmitHandler multiselect→id mapping + confirm accept/decline + reload flags,
 * supervisor select valid/empty arms (departments_handled JSON attr parse),
 * department select fetch, componentWillReceiveProps cross-match of existing
 * supervisees vs department users (valid + invalid-department arms), setSelectedValues.
 * Driven via instance ref. ADDITIVE ONLY.
 * Menu: Admin → Assign Employee Supervisors (route: assign_employee_supervisors).
 */

import React from 'react';
import { render } from '@testing-library/react';
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
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(), fetchDepartmentList: jest.fn(), fetchDepartmentUsersList: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/admin/assignRoleActions', () => ({
    assignEmployeeSupervisorsActions: jest.fn(), fetchUserRolePermission: jest.fn(),
    assignRolesPermissions: jest.fn(), fetchUserFeatures: jest.fn(), assignLevelFeatures: jest.fn(),
    fetchUserDispute: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const AssignEmployeeSupervisors =
    require('../../container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors').default;

function makeActions() {
    return {
        fetchUserList: jest.fn(() => Promise.resolve()),
        fetchDepartmentList: jest.fn(() => Promise.resolve()),
        fetchDepartmentUsersList: jest.fn(() => Promise.resolve()),
        assignEmployeeSupervisorsActions: jest.fn(() => Promise.resolve()),
        setRedirect: jest.fn(),
    };
}

const supervisors = [
    { id: 7, full_name: 'Gary Aure', supervisee: [{ id: 21 }], departments_handled: [{ id: 5, department_name: 'Eng' }] },
];

const baseProps = {
    user: { id: 1 },
    supervisor: supervisors,
    department: [{ id: 5, department_name: 'Eng' }],
    department_users: [],
};

function renderAES(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AssignEmployeeSupervisors ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderAES(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <AssignEmployeeSupervisors ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

describe('AssignEmployeeSupervisors', () => {
    test('mount fetches the supervisor list and departments', async () => {
        const { actions } = renderAES();
        expect(actions.fetchUserList).toHaveBeenCalledWith('supervisor', { page: 'all' });
        await flush();
        expect(actions.fetchDepartmentList).toHaveBeenCalled();
    });

    test('submit maps the multiselect to ids, assigns and toggles the reload flag; decline does nothing', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm');
        const { ref, actions } = renderAES();

        confirmSpy.mockReturnValueOnce(true);
        await ref.current.onSubmitHandler({
            supervisor_id: '7', department_id: '5',
            user_id: [{ label: 'A', value: 21 }, { label: 'B', value: 22 }],
        });
        const [supId, fd] = actions.assignEmployeeSupervisorsActions.mock.calls[0];
        expect(supId).toBe('7');
        expect(fd.user_id).toEqual([21, 22]);
        expect(ref.current.state.reloadingSupervisorList).toBe(false); // toggled back
        expect(ref.current.state.selectedSupervisor).toBe('7');

        confirmSpy.mockReturnValueOnce(false);
        await ref.current.onSubmitHandler({ supervisor_id: '7', user_id: [] });
        expect(actions.assignEmployeeSupervisorsActions).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    test('supervisor select parses departments_handled and resets downstream; empty hides the list', () => {
        const { ref } = renderAES();
        const optionEl = { getAttribute: () => JSON.stringify([{ id: 5, department_name: 'Eng' }]) };

        ref.current.handleSelectSupervisor({ target: { value: '7', selectedIndex: 0, options: [optionEl] } });
        expect(ref.current.state.selectedSupervisor).toBe('7');
        expect(ref.current.state.departmentList).toEqual([{ id: 5, department_name: 'Eng' }]);
        expect(ref.current.state.showDepartmentList).toBe(true);
        expect(ref.current.state.selectedValues).toEqual([]);

        ref.current.handleSelectSupervisor({ target: { value: '', selectedIndex: 0, options: [optionEl] } });
        expect(ref.current.state.showDepartmentList).toBe(false);
    });

    test('department select fetches its users and stores the selection', async () => {
        const { ref, actions } = renderAES();
        await ref.current.handleSelectDepartment({ target: { value: '5' } });
        expect(actions.fetchDepartmentUsersList).toHaveBeenCalledWith('5');
        expect(ref.current.state.selectedDepartment).toBe('5');
    });

    test('department_users arrival cross-matches existing supervisees into selectedValues', async () => {
        const utils = renderAES();
        utils.ref.current.setState({ selectedSupervisor: '7', selectedDepartment: '5' });

        rerenderAES(utils, {
            department_users: [
                { id: 21, full_name: 'Existing Supervisee' },
                { id: 22, full_name: 'New Person' },
            ],
        });
        await flush();

        const s = utils.ref.current.state;
        expect(s.showEmployeeList).toBe(true);
        expect(s.employeeList).toEqual([
            { label: 'Existing Supervisee', value: 21 },
            { label: 'New Person', value: 22 },
        ]);
        expect(s.selectedValues).toEqual([{ label: 'Existing Supervisee', value: 21 }]); // cross-matched
    });

    test('department_users arrival without a selected department resets the employee list', async () => {
        const utils = renderAES();
        utils.ref.current.setState({ selectedDepartment: '' });
        rerenderAES(utils, { department_users: [{ id: 30, full_name: 'X' }] });
        await flush();
        expect(utils.ref.current.state.showEmployeeList).toBe(false);
        expect(utils.ref.current.state.employeeList).toEqual([]);
    });

    test('setSelectedValues stores the multiselect values', () => {
        const { ref } = renderAES();
        ref.current.setSelectedValues([{ label: 'A', value: 21 }]);
        expect(ref.current.state.selectedValues).toEqual([{ label: 'A', value: 21 }]);
    });
});
