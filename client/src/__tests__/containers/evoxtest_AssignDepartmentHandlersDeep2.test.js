/**
 * evoxtest_AssignDepartmentHandlersDeep2.test.js
 * Wave-5 coverage for container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers.js
 * (fresh: 38 unc / 34.5%). Arms: mount fetch trio (supervisor + client user lists,
 * departments), submit merging supervisor_user_id + client_user_id into one user_id
 * array + reload flags + declined confirm, department select fetch, both multiselect
 * setters, cWRP splitting department_handlers back into supervisors/clients (valid +
 * no-department arms). Driven via instance ref. ADDITIVE ONLY.
 * Menu: Admin → Assign Department Handlers (route: assign_department_handlers).
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
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(), fetchDepartmentList: jest.fn(), fetchDepartmentHandlersList: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/admin/assignDepartmentHandlersActions', () => ({
    assignDepartmentHandlers: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const AssignDepartmentHandlers =
    require('../../container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers').default;

function makeActions() {
    return {
        fetchUserList: jest.fn(() => Promise.resolve()),
        fetchDepartmentList: jest.fn(() => Promise.resolve()),
        fetchDepartmentHandlersList: jest.fn(() => Promise.resolve()),
        assignDepartmentHandlers: jest.fn(() => Promise.resolve()),
        setRedirect: jest.fn(),
    };
}

const baseProps = {
    user: { id: 1 },
    supervisor: [{ id: 7, full_name: 'Gary Supervisor' }],
    client: [{ id: 9, full_name: 'Cli Ent' }],
    department: [{ id: 5, department_name: 'Eng' }],
    department_handlers: [],
};

function renderADH(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AssignDepartmentHandlers ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderADH(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <AssignDepartmentHandlers ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

describe('AssignDepartmentHandlers', () => {
    test('mount fetches supervisor + client user lists and the departments', async () => {
        const { actions } = renderADH();
        expect(actions.fetchUserList).toHaveBeenCalledWith('supervisor', { page: 'all' });
        await flush();
        expect(actions.fetchUserList).toHaveBeenCalledWith('client', { page: 'all' });
        expect(actions.fetchDepartmentList).toHaveBeenCalled();
    });

    test('submit merges supervisors + clients into one user_id array; decline skips', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm');
        const { ref, actions } = renderADH();

        confirmSpy.mockReturnValueOnce(true);
        await ref.current.onSubmitHandler({
            department_id: '5',
            supervisor_user_id: [{ label: 'Gary', value: 7 }],
            client_user_id: [{ label: 'Cli', value: 9 }],
        });
        const [deptId, fd] = actions.assignDepartmentHandlers.mock.calls[0];
        expect(deptId).toBe('5');
        expect(fd.user_id).toEqual([7, 9]); // merged from both multiselects
        expect(ref.current.state.reloadingDepartmentList).toBe(false);
        expect(ref.current.state.selectedDepartment).toBe('5');

        confirmSpy.mockReturnValueOnce(false);
        await ref.current.onSubmitHandler({ department_id: '5', supervisor_user_id: [], client_user_id: [] });
        expect(actions.assignDepartmentHandlers).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    test('department select fetches its handlers; setters store both multiselects', async () => {
        const { ref, actions } = renderADH();
        await ref.current.handleSelectDepartment({ target: { value: '5' } });
        expect(actions.fetchDepartmentHandlersList).toHaveBeenCalledWith('5');
        expect(ref.current.state.selectedDepartment).toBe('5');

        ref.current.setSelectedSupervisors([{ label: 'Gary', value: 7 }]);
        ref.current.setSelectedClients([{ label: 'Cli', value: 9 }]);
        expect(ref.current.state.selectedSupervisors).toEqual([{ label: 'Gary', value: 7 }]);
        expect(ref.current.state.selectedClients).toEqual([{ label: 'Cli', value: 9 }]);
    });

    test('department_handlers arrival splits into supervisors and clients when a department is selected', async () => {
        const utils = renderADH();
        utils.ref.current.setState({ selectedDepartment: '5' });

        rerenderADH(utils, {
            department_handlers: [
                { id: 7, full_name: 'Gary Supervisor' }, // matches supervisor list
                { id: 9, full_name: 'Cli Ent' },         // matches client list
                { id: 99, full_name: 'Nobody' },         // in neither list → dropped
            ],
        });
        await flush();

        const s = utils.ref.current.state;
        expect(s.showList).toBe(true);
        expect(s.selectedSupervisors).toEqual([{ label: 'Gary Supervisor', value: 7 }]);
        expect(s.selectedClients).toEqual([{ label: 'Cli Ent', value: 9 }]);
    });

    test('department_handlers arrival without a selected department hides the list', async () => {
        const utils = renderADH();
        rerenderADH(utils, { department_handlers: [{ id: 7, full_name: 'Gary Supervisor' }] });
        await flush();
        expect(utils.ref.current.state.showList).toBe(false);
    });
});
