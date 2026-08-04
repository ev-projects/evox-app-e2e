/**
 * evoxtest_RegisterUserDeep3.test.js
 * Wave-3 coverage for container/Admin/RegisterUser/RegisterUser.js (29 Jul: 59 unc stmts,
 * NO test existed). Menu: Admin → Register User.
 *
 * Arms: componentWillMount lookups; componentWillReceiveProps department->departmentList map
 * (+ undefined arm) and roles->roleList map; role-gated form sections (employee/supervisor ->
 * department select, supervisor/client -> departments-handled multiselect); handleChange;
 * onSubmitHandler formData flattening with confirm accepted vs cancelled.
 *
 * QUIRK (documented): the roles->roleList mapper keeps ONLY roles named 'client' — employee/
 * supervisor/admin roles can never appear in the Select Role(s) dropdown. If that's not intended,
 * it's a bug; the test asserts current behavior.
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
jest.mock('react-multi-select-component', () => () => <div data-testid="multi-select" />);
jest.mock('react-datepicker', () => () => <div data-testid="datepicker" />);
jest.mock('react-bootstrap', () => {
    const Passthrough = ({ children }) => <div>{children}</div>;
    const Form = Passthrough;
    Form.Control = Passthrough;
    Form.Control.Feedback = ({ children }) => <div>{children}</div>;
    return {
        Container: Passthrough, Row: Passthrough, Col: Passthrough, Table: Passthrough,
        Image: Passthrough, Spinner: Passthrough,
        Button: ({ children, type }) => <button type={type}>{children}</button>,
        Form,
    };
});
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchDepartmentList: jest.fn(),
    fetchRoleList: jest.fn(),
}));
jest.mock('../../store/actions/admin/registerUserActions', () => ({
    registerUser: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const RegisterUser = require('../../container/Admin/RegisterUser/RegisterUser').default;

const flush = () => act(() => Promise.resolve());

const baseProps = () => ({
    department: undefined,
    roles: undefined,
    isSuccessful: false,
    fetchDepartmentList: jest.fn(() => Promise.resolve()),
    fetchRoleList: jest.fn(() => Promise.resolve()),
    registerUser: jest.fn(() => Promise.resolve()),
});

describe('RegisterUser (Deep3)', () => {
    afterEach(() => jest.clearAllMocks());

    test('mount fetches departments and roles', async () => {
        const props = baseProps();
        render(<RegisterUser {...props} />);
        await flush();

        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(1);
        expect(props.fetchRoleList).toHaveBeenCalledTimes(1);
    });

    test('department prop change maps the department list; roles keep only client entries', async () => {
        const props = baseProps();
        const ref = React.createRef();
        const { rerender } = render(<RegisterUser {...props} ref={ref} />);
        await flush();

        rerender(<RegisterUser {...props} ref={ref}
            department={[{ id: 1, department_name: 'IT' }, { id: 2, department_name: 'HR' }]}
            roles={[{ name: 'client' }, { name: 'admin' }, { name: 'supervisor' }]} />);
        await flush();

        expect(ref.current.state.departmentList).toEqual([
            { label: 'IT', value: 1 }, { label: 'HR', value: 2 },
        ]);
        // QUIRK arm: only 'client' survives the role filter
        expect(ref.current.state.roleList).toEqual([{ label: 'Client', value: 'client' }]);
    });

    test('selecting roles reveals the form; employee/supervisor gate the department controls', async () => {
        const props = baseProps();
        props.department = [{ id: 1, department_name: 'IT' }];
        const ref = React.createRef();
        const { queryByText, getByText } = render(<RegisterUser {...props} ref={ref} />);
        await flush();

        expect(queryByText('First Name:')).toBeNull();               // roles empty -> form hidden

        act(() => { ref.current.handleSelectRoles([{ label: 'Client', value: 'client' }]); });
        expect(getByText('First Name:')).toBeInTheDocument();
        expect(queryByText('Departments:')).toBeNull();              // client -> no department select
        expect(getByText('Departments to handle:')).toBeInTheDocument();

        act(() => { ref.current.handleSelectRoles([{ label: 'Employee', value: 'employee' }]); });
        expect(getByText('Departments:')).toBeInTheDocument();       // employee -> department select
        expect(queryByText('Departments to handle:')).toBeNull();

        act(() => { ref.current.handleSelectRoles([{ label: 'Supervisor', value: 'supervisor' }]); });
        expect(getByText('Departments:')).toBeInTheDocument();       // supervisor -> both
        expect(getByText('Departments to handle:')).toBeInTheDocument();
    });

    test('handleChange writes named state and department options render', async () => {
        const props = baseProps();
        props.department = [{ id: 1, department_name: 'IT' }];
        const ref = React.createRef();
        const { container, getByText } = render(<RegisterUser {...props} ref={ref} />);
        await flush();
        act(() => { ref.current.handleSelectRoles([{ label: 'Employee', value: 'employee' }]); });

        const firstName = container.querySelector('input[name="first_name"]');
        fireEvent.change(firstName, { target: { name: 'first_name', value: 'Vish' } });
        expect(ref.current.state.first_name).toBe('Vish');

        expect(getByText('IT')).toBeInTheDocument();                 // department option arm

        act(() => { ref.current.handleSelectedDepartmentsHandled([{ label: 'IT', value: 1 }]); });
        expect(ref.current.state.departments_handled).toEqual([{ label: 'IT', value: 1 }]);
    });

    test('submit flattens roles + departments_handled and honors confirm', async () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<RegisterUser {...props} ref={ref} />);
        await flush();

        window.confirm = jest.fn(() => true);
        await act(async () => {
            await ref.current.onSubmitHandler({
                roles: [{ label: 'Client', value: 'client' }],
                departments_handled: [{ label: 'IT', value: 1 }, { label: 'HR', value: 2 }],
                first_name: 'Vish', last_name: 'Prakash', email: 'v@e.test',
                departmentList: [], roleList: [],
            });
        });
        expect(props.registerUser).toHaveBeenCalledWith(expect.objectContaining({
            roles: ['client'],
            departments_handled: [1, 2],
            first_name: 'Vish', email: 'v@e.test',
        }));

        window.confirm = jest.fn(() => false);
        await act(async () => {
            await ref.current.onSubmitHandler({ roles: [], departments_handled: [] });
        });
        expect(props.registerUser).toHaveBeenCalledTimes(1);         // cancel arm
    });
});
