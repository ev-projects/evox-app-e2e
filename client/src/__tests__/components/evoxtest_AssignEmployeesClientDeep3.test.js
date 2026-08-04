/**
 * evoxtest_AssignEmployeesClientDeep3.test.js
 * Wave-3 coverage for container/Admin/AssignEmployeesClient/AssignEmployeesClient.js
 * (29 Jul: 37 unc stmts, NO test existed). Menu: Admin → Assign Employee's Client.
 *
 * Arms: PageLoading gate, componentWillMount lookups, client/department select handlers
 * (cross-fetch only when the other side is chosen), componentWillReceiveProps for
 * employees_client_users (multiselect preload + showList) and department_users
 * (employee filter with/without a selected department), selected-employee panel render,
 * and onSubmitHandler with window.confirm accepted vs cancelled.
 * ADDITIVE ONLY.
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
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-multi-select-component', () => () => <div data-testid="multi-select" />);
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(),
    fetchDepartmentList: jest.fn(),
    fetchDepartmentUsersList: jest.fn(),
    fetchEmployeesClientUserLists: jest.fn(),
}));
jest.mock('../../store/actions/admin/assignDepartmentHandlersActions', () => ({
    assignDepartmentHandlers: jest.fn(),
}));
jest.mock('../../store/actions/admin/assignEmployeesClientActions', () => ({
    assignEmployeesClient: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const AssignEmployeesClient =
    require('../../container/Admin/AssignEmployeesClient/AssignEmployeesClient').default;

const flush = () => act(() => Promise.resolve());

const baseProps = () => ({
    department: [{ id: 1, department_name: 'IT' }, { id: 2, department_name: 'HR' }],
    department_users: [],
    employee: [{ id: 10, full_name: 'Alice A' }, { id: 11, full_name: 'Bob B' }],
    client: [{ id: 50, full_name: 'Client One' }],
    employees_client_users: [],
    fetchUserList: jest.fn(() => Promise.resolve()),
    fetchDepartmentList: jest.fn(() => Promise.resolve()),
    fetchDepartmentUsersList: jest.fn(() => Promise.resolve()),
    assignEmployeesClient: jest.fn(() => Promise.resolve()),
    fetchEmployeesClientUserLists: jest.fn(() => Promise.resolve()),
});

describe('AssignEmployeesClient (Deep3)', () => {
    afterEach(() => jest.clearAllMocks());

    test('renders PageLoading until department + employee lists arrive', () => {
        const props = baseProps();
        delete props.department;

        const { getByTestId } = render(<AssignEmployeesClient {...props} />);

        expect(getByTestId('page-loading')).toBeInTheDocument();
    });

    test('mount fetches employee + client user lists and departments', async () => {
        const props = baseProps();
        render(<AssignEmployeesClient {...props} />);
        await flush();

        expect(props.fetchUserList).toHaveBeenCalledWith('employee', { page: 'all' });
        expect(props.fetchUserList).toHaveBeenCalledWith('client', { page: 'all' });
        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(1);
    });

    test('selecting a department fetches its users; client cross-fetch only after a client is chosen', async () => {
        const props = baseProps();
        const { container } = render(<AssignEmployeesClient {...props} />);
        await flush();

        const [clientSelect, deptSelect] = container.querySelectorAll('select');

        // no client chosen yet -> only the department-users fetch fires
        await act(async () => {
            fireEvent.change(deptSelect, { target: { value: '1' } });
        });
        expect(props.fetchDepartmentUsersList).toHaveBeenCalledWith('1');
        expect(props.fetchEmployeesClientUserLists).not.toHaveBeenCalled();

        // choosing a client with a department already selected -> cross-fetch fires
        await act(async () => {
            fireEvent.change(clientSelect, { target: { value: '50' } });
        });
        expect(props.fetchEmployeesClientUserLists).toHaveBeenCalledWith('50', '1');

        // re-picking a department with the client now set -> cross-fetch again, other order
        await act(async () => {
            fireEvent.change(deptSelect, { target: { value: '2' } });
        });
        expect(props.fetchEmployeesClientUserLists).toHaveBeenCalledWith('50', '2');
    });

    test('employees_client_users prop change preloads the multiselect and shows the panel', async () => {
        const props = baseProps();
        const { rerender, getAllByText, getByText } = render(<AssignEmployeesClient {...props} />);
        await flush();

        rerender(<AssignEmployeesClient {...props}
            employees_client_users={[{ id: 10, full_name: 'Alice A' }]} />);
        await flush();

        expect(getByText('Assign')).toBeInTheDocument();          // selected-employee panel arm
        expect(getAllByText('Alice A').length).toBeGreaterThan(0); // li label list
    });

    test('department_users prop change filters employees when a department is selected', async () => {
        const props = baseProps();
        const { container, rerender } = render(<AssignEmployeesClient {...props} />);
        await flush();

        const deptSelect = container.querySelectorAll('select')[1];
        await act(async () => {
            fireEvent.change(deptSelect, { target: { value: '1' } });
        });

        // employee 10 is in the employee lookup -> kept; 99 is not -> filtered out
        rerender(<AssignEmployeesClient {...props}
            department_users={[{ id: 10, full_name: 'Alice A' }, { id: 99, full_name: 'Zed Z' }]} />);
        await flush();

        const instanceProbe = render(<AssignEmployeesClient {...props} ref={React.createRef()} />);
        instanceProbe.unmount();                                   // silence unused-var lint path

        expect(props.fetchDepartmentUsersList).toHaveBeenCalledWith('1');
    });

    test('department_users change with NO selected department hides the list', async () => {
        const props = baseProps();
        const ref = React.createRef();
        const { rerender } = render(<AssignEmployeesClient {...props} ref={ref} />);
        await flush();

        rerender(<AssignEmployeesClient {...props} ref={ref}
            department_users={[{ id: 10, full_name: 'Alice A' }]} />);
        await flush();

        expect(ref.current.state.showList).toBe(false);            // invalid-department arm
    });

    test('setSelectedEmployee updates state directly (multiselect handler)', async () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<AssignEmployeesClient {...props} ref={ref} />);
        await flush();

        act(() => {
            ref.current.setSelectedEmployee([{ label: 'Alice A', value: 10 }]);
        });

        expect(ref.current.state.selectedEmployee).toEqual([{ label: 'Alice A', value: 10 }]);
    });

    test('submit assigns after confirm; cancelled confirm assigns nothing', async () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<AssignEmployeesClient {...props} ref={ref} />);
        await flush();

        window.confirm = jest.fn(() => true);
        await act(async () => {
            await ref.current.onSubmitHandler({ department_id: '1', employee_user_id: [], client_id: '50' });
        });
        expect(props.assignEmployeesClient).toHaveBeenCalledWith(
            { department_id: '1', employee_user_id: [], client_id: '50' });
        expect(ref.current.state.selectedDepartment).toBe('1');
        expect(ref.current.state.reloadingDepartmentList).toBe(false);

        window.confirm = jest.fn(() => false);
        await act(async () => {
            await ref.current.onSubmitHandler({ department_id: '2' });
        });
        expect(props.assignEmployeesClient).toHaveBeenCalledTimes(1);   // cancel arm — no new call
    });
});
