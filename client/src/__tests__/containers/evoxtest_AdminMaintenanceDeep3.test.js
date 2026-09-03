/**
 * evoxtest_AdminMaintenanceDeep3.test.js
 *
 * SOURCES UNDER TEST:
 *   container/Admin/GenerateDate/GenerateDate.js
 *   container/Admin/DepartmentList/DepartmentList.js
 *   container/Admin/AssignFeature/AssignFeature.js
 *
 * MENU PATHS: Admin -> Generate DTR Date; Admin -> Department List; Admin -> Assign Feature.
 *
 * WHY THIS SUITE EXISTS: these three pages each carry a destructive or bulk action
 * (generating DTR rows for a set of employees, soft-deleting a department, flipping a
 * department's multi-login switch, granting feature access) whose handlers had never been
 * executed by a test — only their markup had. Every one of them is gated on a
 * window.confirm, and neither arm was covered. Both arms are asserted here.
 *
 * FINDINGS: none.
 *   Documented as-is:
 *   - GenerateDate's <Formik onSubmit={this.onSubmitHandler}> names a handler the class
 *     never defines. It is unreachable rather than broken: the schema requires a
 *     department_id field the page does not render, so validation always fails first and
 *     Formik never calls it. The Generate button does its work in its own onClick. Pinned
 *     below so that adding a department_id field would surface the gap as a failure.
 *   - DepartmentList.onSubmitHandler is an empty leftover from the modal delete flow and
 *     is wired to nothing; pinned as inert.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, title }) => <div>{title}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" data-testid={'date-' + name} />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));

// Records each multi-select's props so its onChange can be driven directly.
const mockMultiSelects = [];
jest.mock('react-multi-select-component', () => ({
    __esModule: true,
    default: (props) => {
        mockMultiSelects.push(props);
        return <div data-testid="multiselect" />;
    },
}));

jest.mock('../../store/actions/dtr/dtrLogsAction', () => ({
    fetchDtrLogs: jest.fn(), exportDtrLogs: jest.fn(),
}));
jest.mock('../../store/actions/admin/generateDtrDateActions', () => ({ generateDtrDate: jest.fn() }));
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(), fetchRoleList: jest.fn(), fetchFeaturesList: jest.fn(),
    fetchDepartmentList: jest.fn(),
}));
jest.mock('../../store/actions/admin/departmentListActions', () => ({
    fetchDepartmentList: jest.fn(), deleteDepartment: jest.fn(),
    updateDepartmentScheduleStatus: jest.fn(),
}));
jest.mock('../../store/actions/admin/assignRoleActions', () => ({
    fetchUser: jest.fn(), fetchUserFeatures: jest.fn(), assignLevelFeatures: jest.fn(),
}));

global.links = new Proxy({}, { get: (_t, key) => '/app/' + String(key) + '/' });

// Assign Feature's name box is declared <input type="textfield">. "textfield" is not a
// valid input type, and per the HTML spec an enumerated attribute with an invalid value
// falls back to its invalid-value default — "text" — which is what every real browser
// reports and why the box works in production. jsdom 11 returns the raw string instead,
// and React's change plugin keys off node.type to decide whether to track the input, so
// without this the change event a browser would deliver is silently dropped. Restoring
// the spec behaviour here keeps the test on the production code path rather than
// characterising a test-environment artefact.
const VALID_INPUT_TYPES = new Set([
    'button', 'checkbox', 'color', 'date', 'datetime-local', 'email', 'file', 'hidden',
    'image', 'month', 'number', 'password', 'radio', 'range', 'reset', 'search', 'submit',
    'tel', 'text', 'time', 'url', 'week',
]);
const nativeInputType = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'type');
beforeAll(() => {
    Object.defineProperty(window.HTMLInputElement.prototype, 'type', {
        configurable: true,
        get() {
            const raw = nativeInputType.get.call(this);
            return VALID_INPUT_TYPES.has(raw) ? raw : 'text';
        },
        set(value) { nativeInputType.set.call(this, value); },
    });
});
afterAll(() => {
    Object.defineProperty(window.HTMLInputElement.prototype, 'type', nativeInputType);
});

const GenerateDate = require('../../container/Admin/GenerateDate/GenerateDate').default;
const DepartmentList = require('../../container/Admin/DepartmentList/DepartmentList').default;
const AssignFeature = require('../../container/Admin/AssignFeature/AssignFeature').default;

const CUTOFF = {
    current_payroll_cutoff: { start_date: '2026-06-01T00:00:00', end_date: '2026-06-15T00:00:00' },
};

function renderGenerateDate(props = {}) {
    mockMultiSelects.length = 0;
    const actions = {
        fetchUserList: jest.fn(() => Promise.resolve()),
        generateDtrDate: jest.fn(() => Promise.resolve()),
        fetchDtrLogs: jest.fn(), exportDtrLogs: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <GenerateDate
                ref={ref}
                settings={CUTOFF}
                employee={[{ id: 21, full_name: 'Juan dela Cruz' }, { id: 22, full_name: 'Maria Santos' }]}
                dtrLogs={{}}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, employeePicker: () => mockMultiSelects[mockMultiSelects.length - 1] };
}

const DEPARTMENTS = [
    { id: 5, department_name: 'Engineering', schedule_active: true },
    { id: 6, department_name: 'Support', schedule_active: false },
];

function renderDepartmentList(props = {}) {
    const actions = {
        fetchDepartmentList: jest.fn(), deleteDepartment: jest.fn(),
        updateDepartmentScheduleStatus: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DepartmentList
                ref={ref}
                departmentList={{ isDepartmentListLoaded: true, Deplist: DEPARTMENTS.map((d) => ({ ...d })) }}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

function renderAssignFeature(props = {}) {
    const actions = {
        fetchUser: jest.fn(), fetchRoleList: jest.fn(), fetchFeaturesList: jest.fn(),
        fetchUserFeatures: jest.fn(), assignLevelFeatures: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AssignFeature ref={ref} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

const settle = async () => { await act(async () => { await Promise.resolve(); }); };

beforeEach(() => jest.clearAllMocks());

describe('Admin -> Generate DTR Date', () => {
    test('the page opens on the current payroll cutoff and loads every employee for the picker', () => {
        const { ref, actions, employeePicker } = renderGenerateDate();
        expect(actions.fetchUserList).toHaveBeenCalledWith('employee', { page: 'all' });
        expect(ref.current.state.initialState.start_date).toEqual(new Date('2026-06-01T00:00:00'));
        expect(ref.current.state.initialState.end_date).toEqual(new Date('2026-06-15T00:00:00'));
        expect(employeePicker().options).toEqual([
            { label: 'Juan dela Cruz', value: 21 },
            { label: 'Maria Santos', value: 22 },
        ]);
    });

    test('with no payroll cutoff configured the date range opens empty', () => {
        const { ref } = renderGenerateDate({ settings: {} });
        expect(ref.current.state.initialState.start_date).toBeNull();
        expect(ref.current.state.initialState.end_date).toBeNull();
    });

    test('selecting employees keeps them for the next generate run', async () => {
        const { ref, employeePicker } = renderGenerateDate();
        const chosen = [{ label: 'Juan dela Cruz', value: 21 }];
        await act(async () => { employeePicker().onChange(chosen); });
        expect(ref.current.state.selectedEmployees).toBe(chosen);
        expect(employeePicker().value).toBe(chosen);
    });

    test('confirming Generate sends the formatted range and the selected employee ids', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions, container, employeePicker } = renderGenerateDate();
        await act(async () => { employeePicker().onChange([{ label: 'Juan dela Cruz', value: 21 }]); });

        await act(async () => { fireEvent.click(container.querySelector('button[type="submit"]')); });
        await settle();

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to add dtr to this employee(s)?');
        expect(actions.generateDtrDate).toHaveBeenCalledTimes(1);
        expect(actions.generateDtrDate).toHaveBeenCalledWith({
            start_date: '2026-06-01',
            end_date: '2026-06-15',
            ids: [{ label: 'Juan dela Cruz', value: 21 }],
        });
        expect(ref.current).toBeTruthy();
        confirmSpy.mockRestore();
    });

    test('cancelling the Generate confirmation writes no DTR rows', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { actions, container } = renderGenerateDate();

        await act(async () => { fireEvent.click(container.querySelector('button[type="submit"]')); });
        await settle();

        expect(actions.generateDtrDate).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    // Pins the note in the header: the Generate click does the work itself; Formik's
    // onSubmit (which names a handler that does not exist) is never reached because the
    // schema requires a department_id the page never renders.
    test('pressing Generate does not fall through to Formik submit', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { actions, container } = renderGenerateDate();

        await act(async () => { fireEvent.click(container.querySelector('button[type="submit"]')); });
        await settle();

        expect(actions.generateDtrDate).toHaveBeenCalledTimes(1);
        expect(actions.fetchDtrLogs).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('generating with no employees selected still sends the range with an empty id list', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderGenerateDate();
        await act(async () => {
            await ref.current.generate({
                start_date: new Date('2026-07-01T00:00:00'),
                end_date: new Date('2026-07-15T00:00:00'),
            });
        });
        expect(actions.generateDtrDate).toHaveBeenCalledWith({
            start_date: '2026-07-01', end_date: '2026-07-15', ids: [],
        });
        confirmSpy.mockRestore();
    });
});

describe('Admin -> Department List', () => {
    test('the page loads the departments on mount and shows each one with its multi-login state', () => {
        const { actions, container } = renderDepartmentList();
        expect(actions.fetchDepartmentList).toHaveBeenCalledTimes(1);
        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('Engineering');
        expect(rows[0].textContent).toContain('Multi Login:ON');
        expect(rows[1].textContent).toContain('Multi Login:OFF');
    });

    test('the loader is shown until the department list has arrived', () => {
        const { queryByTestId, queryByText } = renderDepartmentList({
            departmentList: { isDepartmentListLoaded: false, Deplist: [] },
        });
        expect(queryByTestId('page-loading')).not.toBeNull();
        expect(queryByText('Engineering')).toBeNull();
    });

    test('confirming the multi-login switch sends the department id with its current state and refetches the list', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { actions, container } = renderDepartmentList();
        actions.fetchDepartmentList.mockClear();

        await act(async () => {
            fireEvent.click(container.querySelectorAll('input[type="checkbox"]')[0]);
        });

        expect(confirmSpy).toHaveBeenCalledWith('Update this Department Schedule Status for Multi Login?');
        const [id, formData] = actions.updateDepartmentScheduleStatus.mock.calls[0];
        expect(id).toBe(5);
        expect(formData.get('id')).toBe('5');
        expect(formData.get('current_status')).toBe('true');
        expect(actions.fetchDepartmentList).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    test('a department with multi-login off reports its current state as false', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { actions, container } = renderDepartmentList();

        await act(async () => {
            fireEvent.click(container.querySelectorAll('input[type="checkbox"]')[1]);
        });

        const [id, formData] = actions.updateDepartmentScheduleStatus.mock.calls[0];
        expect(id).toBe(6);
        expect(formData.get('current_status')).toBe('false');
        confirmSpy.mockRestore();
    });

    test('cancelling the multi-login confirmation changes nothing and does not refetch', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { actions, container } = renderDepartmentList();
        actions.fetchDepartmentList.mockClear();

        await act(async () => {
            fireEvent.click(container.querySelectorAll('input[type="checkbox"]')[0]);
        });

        expect(actions.updateDepartmentScheduleStatus).not.toHaveBeenCalled();
        expect(actions.fetchDepartmentList).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('confirming Soft Delete removes that department by id and drops its row', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { actions, ref } = renderDepartmentList();

        await act(async () => { ref.current.onDeleteHandler(DEPARTMENTS[1], 1); });

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to Remove this Department ?');
        expect(actions.deleteDepartment).toHaveBeenCalledWith(6);
        expect(ref.current.props.departmentList.Deplist.map((d) => d.id)).toEqual([5]);
        confirmSpy.mockRestore();
    });

    test('cancelling Soft Delete keeps the department', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { actions, ref } = renderDepartmentList();

        await act(async () => { ref.current.onDeleteHandler(DEPARTMENTS[1], 1); });

        expect(actions.deleteDepartment).not.toHaveBeenCalled();
        expect(ref.current.props.departmentList.Deplist.map((d) => d.id)).toEqual([5, 6]);
        confirmSpy.mockRestore();
    });

    // Inert leftover, kept so a future edit that gives it a body is noticed.
    test('the unused list submit handler touches neither state nor any action', () => {
        const { ref, actions } = renderDepartmentList();
        const before = { ...ref.current.state };
        ref.current.onSubmitHandler(DEPARTMENTS[0], 0);
        expect(ref.current.state).toEqual(before);
        expect(actions.deleteDepartment).not.toHaveBeenCalled();
        expect(actions.updateDepartmentScheduleStatus).not.toHaveBeenCalled();
    });
});

describe('Admin -> Assign Feature', () => {
    test('the page loads roles and features on mount and reports no match before a search', () => {
        const { actions, getByText } = renderAssignFeature();
        expect(actions.fetchRoleList).toHaveBeenCalledTimes(1);
        expect(actions.fetchFeaturesList).toHaveBeenCalledTimes(1);
        expect(getByText('Sorry, No Record Found')).toBeInTheDocument();
    });

    test('with no roles or features in the lookup the page falls back to empty lists', () => {
        const { ref } = renderAssignFeature();
        expect(ref.current.state.roles).toEqual([]);
        expect(ref.current.state.features).toEqual([]);
    });

    test('roles and features supplied by the lookup are held on state for the checkbox list', () => {
        const roles = [{ name: 'supervisor', permissions: [] }];
        const features = [{ feature_name: 'dtr', feature_label: 'Daily Time Record' }];
        const { ref } = renderAssignFeature({ roles, features });
        expect(ref.current.state.roles).toBe(roles);
        expect(ref.current.state.features).toBe(features);
    });

    test('a search of three or more characters queries users; shorter input does not', () => {
        const { actions, container } = renderAssignFeature();
        const search = container.querySelector('input[name="nameFilter"]');

        fireEvent.change(search, { target: { value: 'Ju', name: 'nameFilter' } });
        expect(actions.fetchUser).not.toHaveBeenCalled();

        fireEvent.change(search, { target: { value: 'Juan', name: 'nameFilter' } });
        expect(actions.fetchUser).toHaveBeenCalledWith('Juan');
    });

    test('a matched user list is offered by employee number and name, and choosing one loads that user’s features', () => {
        const { ref, actions, container } = renderAssignFeature({
            isUserListLoaded: true,
            userLists: [{ id: 21, emp_num: '20001', first_name: 'Juan', last_name: 'dela Cruz' }],
        });
        const select = container.querySelector('select[name="selectedUser"]');
        expect(select.querySelectorAll('option')[1].getAttribute('label')).toBe('20001 - Juan dela Cruz');

        fireEvent.change(select, { target: { value: '21', name: 'selectedUser' } });
        expect(actions.fetchUserFeatures).toHaveBeenCalledWith('21');
        expect(ref.current.state.selectedUser).toBe('21');
    });

    test('the feature checkboxes and Assign button appear only once a user is selected', () => {
        const loaded = {
            isUserListLoaded: true,
            userLists: [{ id: 21, emp_num: '20001', first_name: 'Juan', last_name: 'dela Cruz' }],
            isUserRolesPermissionsLoaded: true,
            userLevel: { level_type: 'Level 2' },
            userFeatures: ['dtr'],
            features: [{ feature_name: 'dtr', feature_label: 'Daily Time Record' }],
        };
        const before = renderAssignFeature(loaded);
        expect(before.queryByText(/Assign/)).toBeNull();

        const after = renderAssignFeature(loaded);
        fireEvent.change(after.container.querySelector('select[name="selectedUser"]'), {
            target: { value: '21', name: 'selectedUser' },
        });
        expect(after.getByText(/Current Level: Level 2/)).toBeInTheDocument();
        expect(after.getByText('Daily Time Record')).toBeInTheDocument();
    });

    test('assigning sends the selected user id and only the features list', () => {
        const { ref, actions } = renderAssignFeature();
        ref.current.onSubmitHandler({
            selectedUser: '21', Level: { level_type: 'Level 2' }, features: ['dtr', 'overtime'],
        });
        expect(actions.assignLevelFeatures).toHaveBeenCalledWith('21', { features: ['dtr', 'overtime'] });
    });
});
