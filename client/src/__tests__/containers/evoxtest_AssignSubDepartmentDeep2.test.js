/**
 * evoxtest_AssignSubDepartmentDeep2.test.js
 * Wave-5 coverage for container/Admin/AssignSubDepartment/AssignSubDepartment.js
 * (fresh: 47 unc / 36.5%). Sibling of AssignEmployeeSupervisors with sub-department
 * mechanics. Arms: mount fetch trio, submit id-mapping + sp_action toggle + declined
 * confirm, supervisor select (handled-list fetch + valid/empty arms), sub-department
 * select's enable/disable derivation from sub_departments_handled, cWRP valid/invalid
 * arms, setSelectedValues. Driven via instance ref. ADDITIVE ONLY.
 * Menu: Admin → Assign Sub-Department (route: assign_sub_department).
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
jest.mock('../../store/actions/lookup/lookupListActions.js', () => ({
    fetchUserList: jest.fn(), fetchDepartmentList: jest.fn(), fetchAllSubDepartment: jest.fn(),
    fetchSubDepartmentHandledList: jest.fn(), assignSubDepartment: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/admin/assignEmployeeSupervisorsActions.js', () => ({
    assignEmployeeSupervisorsActions: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const AssignSubDepartment =
    require('../../container/Admin/AssignSubDepartment/AssignSubDepartment').default;

function makeActions() {
    return {
        fetchUserList: jest.fn(() => Promise.resolve()),
        fetchDepartmentList: jest.fn(() => Promise.resolve()),
        fetchAllSubDepartment: jest.fn(() => Promise.resolve()),
        fetchSubDepartmentHandledList: jest.fn(() => Promise.resolve()),
        assignSubDepartment: jest.fn(() => Promise.resolve()),
        setRedirect: jest.fn(),
    };
}

const baseProps = {
    user: { id: 1 },
    supervisor: [{ id: 7, full_name: 'Gary', supervisee: [], departments_handled: [] }],
    department: [{ id: 5, department_name: 'Eng' }],
    department_users: [],
    all_sub_department: [{ Id: 403, Name: 'Eng-A' }],
    sub_departments_handled: [{ id: 403 }],
    sub_departments_list: [{ Id: 403, Name: 'Eng-A' }], // rendered once a supervisor is chosen
};

function renderASD(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AssignSubDepartment ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderASD(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <AssignSubDepartment ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

describe('AssignSubDepartment', () => {
    test('mount fetches supervisors, departments and all sub-departments', async () => {
        const { actions } = renderASD();
        expect(actions.fetchUserList).toHaveBeenCalledWith('supervisor', { page: 'all' });
        await flush();
        expect(actions.fetchDepartmentList).toHaveBeenCalled();
        expect(actions.fetchAllSubDepartment).toHaveBeenCalled();
    });

    test('submit maps ids, assigns to the supervisor and toggles sp_action; decline skips', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm');
        const { ref, actions } = renderASD();
        ref.current.setState({ sp_action: 'enable' });

        confirmSpy.mockReturnValueOnce(true);
        await ref.current.onSubmitHandler({
            supervisor_id: '7', department_id: 403,
            user_id: [{ label: 'A', value: 21 }],
        });
        const [supId, fd] = actions.assignSubDepartment.mock.calls[0];
        expect(supId).toBe('7');
        expect(fd.user_id).toEqual([21]);
        expect(ref.current.state.sp_action).toBe('disable'); // toggled

        confirmSpy.mockReturnValueOnce(false);
        await ref.current.onSubmitHandler({ supervisor_id: '7', user_id: [] });
        expect(actions.assignSubDepartment).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    test('supervisor select fetches their handled list; valid/empty arms toggle the department list', () => {
        const { ref, actions } = renderASD();
        const optionEl = { getAttribute: () => JSON.stringify([{ id: 5 }]) };

        ref.current.handleSelectSupervisor({ target: { value: '7', selectedIndex: 0, options: [optionEl] } });
        expect(actions.fetchSubDepartmentHandledList).toHaveBeenCalledWith('7');
        expect(ref.current.state.showDepartmentList).toBe(true);
        expect(ref.current.state.sp_action).toBe('');

        ref.current.handleSelectSupervisor({ target: { value: '', selectedIndex: 0, options: [optionEl] } });
        expect(ref.current.state.showDepartmentList).toBe(false);
    });

    test('sub-department select derives disable for already-handled, enable otherwise', async () => {
        const { ref } = renderASD();

        await ref.current.handleSelectDepartment({ target: { value: 403 } }); // in handled list
        expect(ref.current.state.sp_action).toBe('disable');

        await ref.current.handleSelectDepartment({ target: { value: 999 } }); // not handled
        expect(ref.current.state.sp_action).toBe('enable');
        expect(ref.current.state.selectedSubDepartment).toBe(999);
    });

    test('department_users change resets values; keeps sub-department when one is selected', async () => {
        const utils = renderASD();
        utils.ref.current.setState({ selectedSubDepartment: 403, selectedValues: [{ value: 1 }] });
        rerenderASD(utils, { department_users: [{ id: 21, full_name: 'X' }] });
        await flush();
        expect(utils.ref.current.state.selectedValues).toEqual([]);
        expect(utils.ref.current.state.selectedSubDepartment).toBe(403);

        utils.ref.current.setState({ selectedSubDepartment: '' });
        rerenderASD(utils, { department_users: [{ id: 22, full_name: 'Y' }] });
        await flush();
        expect(utils.ref.current.state.selectedSubDepartment).toBe('');

        utils.ref.current.setSelectedValues([{ label: 'A', value: 21 }]);
        expect(utils.ref.current.state.selectedValues).toEqual([{ label: 'A', value: 21 }]);
    });
});
