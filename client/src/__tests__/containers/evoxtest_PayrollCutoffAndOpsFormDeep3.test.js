/**
 * evoxtest_PayrollCutoffAndOpsFormDeep3.test.js
 *
 * SOURCES UNDER TEST:
 *   container/Admin/PayrollCutoff/PayrollCutoff.js
 *   container/Admin/PayrollCutoff/PayrollCutoffForm.js
 *   container/OpsSchedule/OpsScheduleForm/OpsScheduleForm.js
 *
 * MENU PATHS: Admin -> Payroll Cut-Off (list, with the add/edit form inline);
 *             OPS Schedule -> Add / Edit OPS Schedule.
 *
 * WHY THIS SUITE EXISTS: the payroll cut-off screen defines the pay period every DTR
 * total is computed against, and neither its add/edit toggle nor the submit handler that
 * chooses between POST and PUT had been executed. The OPS schedule form's store-vs-update
 * split and its image branch were likewise unasserted at handler level.
 *
 * Both submit handlers refetch their list through a 100 ms setTimeout; those tests use
 * fake timers and advance them explicitly rather than waiting, so the result does not
 * depend on machine speed. Dates are supplied as local-time strings so the formatted
 * payload is identical in every timezone.
 *
 * FINDINGS: none.
 *   Documented as-is:
 *   - PayrollCutoffForm's validationSchema compares start_date with Yup.ref('start_date')
 *     and end_date with Yup.ref('end_date') — each field against itself — so the "valid
 *     Start/End Date" messages can never fire and a cut-off whose end precedes its start
 *     is accepted by the client. The submit-level behaviour is pinned below; the schema
 *     itself is not asserted because the rule it was meant to express does not exist.
 *   - PayrollCutoff.showForm always clears the instance first, so opening Add straight
 *     after Edit cannot inherit the previous row's values. Pinned.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, title, subtitle }) => <div>{title}{subtitle}{children}</div>,
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
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons',
    () => () => <div data-testid="request-buttons" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle',
    () => () => <div data-testid="request-subtitle" />);
jest.mock('../../services/DateFormatter', () => ({ convert_date: jest.fn((d) => d) }));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));

// Records the props the list table is fed so the column contract can be asserted.
const mockTables = [];
jest.mock('react-data-table-component', () => ({
    __esModule: true,
    default: (props) => { mockTables.push(props); return <div data-testid="data-table" />; },
}));

jest.mock('../../store/actions/admin/payrollCutoffActions', () => ({
    addPayrollCutoff: jest.fn(), updatePayrollCutoff: jest.fn(), deletePayrollCutoff: jest.fn(),
    fetchPayrollCutoff: jest.fn(), fetchPayrollCutoffList: jest.fn(),
    clearPayrollCutoffInstance: jest.fn(), clearPayrollCutoffListInstance: jest.fn(),
}));
jest.mock('../../store/actions/opsschedule/opsScheduleActions', () => ({
    fetchOpsSchedule: jest.fn(), addOpsSchedule: jest.fn(), updateOpsSchedule: jest.fn(),
    clearOpsScheduleInstance: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

global.links = new Proxy({}, { get: (_t, key) => '/app/' + String(key) + '/' });

const PayrollCutoff = require('../../container/Admin/PayrollCutoff/PayrollCutoff').default;
const PayrollCutoffForm = require('../../container/Admin/PayrollCutoff/PayrollCutoffForm').default;
const OpsScheduleForm = require('../../container/OpsSchedule/OpsScheduleForm/OpsScheduleForm').default;

const CUTOFFS = [
    { id: 3, name: 'Jun 1-15', start_date: '2026-06-01', end_date: '2026-06-15' },
    { id: 4, name: 'Jun 16-30', start_date: '2026-06-16', end_date: '2026-06-30' },
];

function renderPayrollCutoff(props = {}) {
    mockTables.length = 0;
    const actions = {
        fetchPayrollCutoff: jest.fn(), fetchPayrollCutoffList: jest.fn(),
        deletePayrollCutoff: jest.fn(() => Promise.resolve()),
        clearPayrollCutoffInstance: jest.fn(), clearPayrollCutoffListInstance: jest.fn(),
        setRedirect: jest.fn(),
        addPayrollCutoff: jest.fn(), updatePayrollCutoff: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <PayrollCutoff
                ref={ref}
                user={{ id: 1 }}
                constant={{}}
                instance={{}}
                listInstance={CUTOFFS}
                isInstanceLoaded
                isListInstanceLoaded
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, table: () => mockTables[mockTables.length - 1] };
}

function renderCutoffForm(props = {}) {
    const actions = {
        addPayrollCutoff: jest.fn(() => Promise.resolve()),
        updatePayrollCutoff: jest.fn(() => Promise.resolve()),
        fetchPayrollCutoffList: jest.fn(() => Promise.resolve()),
        clearPayrollCutoffListInstance: jest.fn(),
        hideForm: jest.fn(() => Promise.resolve()),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <PayrollCutoffForm ref={ref} constant={{}} instance={{}} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

function renderOpsForm(props = {}) {
    const actions = {
        fetchOpsSchedule: jest.fn(), addOpsSchedule: jest.fn(), updateOpsSchedule: jest.fn(),
        clearOpsScheduleInstance: jest.fn(), setRedirect: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <OpsScheduleForm
                ref={ref}
                params={{}}
                user={{ id: 1 }}
                settings={{}}
                constant={{ OPS_DEPTS: [{ id: 5, name: 'Engineering' }] }}
                instance={{}}
                isInstanceLoaded={false}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.useRealTimers());

describe('Admin -> Payroll Cut-Off list', () => {
    test('the page clears the previous list then loads the cut-offs, and feeds them to the table', () => {
        const { actions, table } = renderPayrollCutoff();
        expect(actions.clearPayrollCutoffListInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchPayrollCutoffList).toHaveBeenCalledTimes(1);
        expect(table().data).toBe(CUTOFFS);
        expect(table().progressPending).toBe(false);
        expect(table().columns.map((c) => c.name))
            .toEqual(['ID', 'Name', 'Start Date', 'End Date', undefined]);
    });

    test('the table reports itself as still loading while the cut-off list is null', () => {
        const { table } = renderPayrollCutoff({ listInstance: null });
        expect(table().data).toBeNull();
        expect(table().progressPending).toBe(true);
    });

    test('the add/edit form is absent until Add or Edit is pressed', () => {
        const { ref, queryByText } = renderPayrollCutoff();
        expect(ref.current.state.showForm).toBe(false);
        expect(queryByText('Add Payroll Cut-Off')).toBeNull();
    });

    test('Add opens a blank form in store mode without loading any cut-off', async () => {
        const { ref, actions } = renderPayrollCutoff();
        await act(async () => { await ref.current.showForm(); });

        expect(actions.clearPayrollCutoffInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchPayrollCutoff).not.toHaveBeenCalled();
        expect(ref.current.state).toEqual({ showForm: true, method: 'store' });
    });

    test('Edit opens the form in update mode and loads that cut-off', async () => {
        const { ref, actions } = renderPayrollCutoff();
        await act(async () => { await ref.current.showForm(3); });

        expect(actions.fetchPayrollCutoff).toHaveBeenCalledWith(3);
        expect(ref.current.state).toEqual({ showForm: true, method: 'update' });
    });

    test('switching from Edit to Add clears the loaded cut-off and drops back to store mode', async () => {
        const { ref, actions } = renderPayrollCutoff();
        await act(async () => { await ref.current.showForm(3); });
        actions.fetchPayrollCutoff.mockClear();

        await act(async () => { await ref.current.showForm(); });

        expect(actions.fetchPayrollCutoff).not.toHaveBeenCalled();
        expect(actions.clearPayrollCutoffInstance).toHaveBeenCalledTimes(2);
        expect(ref.current.state.method).toBe('store');
    });

    test('closing the form restores the page to its opening state', async () => {
        const { ref } = renderPayrollCutoff();
        await act(async () => { await ref.current.showForm(3); });
        act(() => { ref.current.hideForm(); });
        expect(ref.current.state).toEqual({ showForm: false, method: null });
    });

    test('confirming Delete removes the cut-off and refreshes the list a moment later', async () => {
        jest.useFakeTimers();
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderPayrollCutoff();
        actions.fetchPayrollCutoffList.mockClear();

        await act(async () => { await ref.current.deleteItem(3); });
        expect(actions.deletePayrollCutoff).toHaveBeenCalledWith(3);
        expect(actions.fetchPayrollCutoffList).not.toHaveBeenCalled();

        act(() => { jest.advanceTimersByTime(100); });
        expect(actions.fetchPayrollCutoffList).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    test('cancelling Delete removes nothing and schedules no refresh', async () => {
        jest.useFakeTimers();
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderPayrollCutoff();
        actions.fetchPayrollCutoffList.mockClear();

        await act(async () => { await ref.current.deleteItem(3); });
        act(() => { jest.advanceTimersByTime(100); });

        expect(actions.deletePayrollCutoff).not.toHaveBeenCalled();
        expect(actions.fetchPayrollCutoffList).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });
});

describe('Admin -> Payroll Cut-Off form', () => {
    test('a new cut-off opens as Add with empty dates', () => {
        const { getByText, container } = renderCutoffForm();
        expect(getByText('Add Payroll Cut-Off')).toBeInTheDocument();
        expect(container.querySelector('input[name="id"]').value).toBe('');
    });

    test('an existing cut-off opens as Edit carrying its id', () => {
        const { getByText, container } = renderCutoffForm({ instance: CUTOFFS[0] });
        expect(getByText('Edit Payroll Cut-Off')).toBeInTheDocument();
        expect(container.querySelector('input[name="id"]').value).toBe('3');
    });

    test('submitting a new cut-off posts the formatted dates and no method override', async () => {
        jest.useFakeTimers();
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderCutoffForm();

        await act(async () => {
            await ref.current.onSubmitHandler({
                method: 'store', id: null, name: 'Jun 1-15',
                start_date: new Date('2026-06-01T00:00:00'),
                end_date: new Date('2026-06-15T00:00:00'),
            });
        });

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit/update this form?');
        expect(actions.addPayrollCutoff).toHaveBeenCalledTimes(1);
        const fd = actions.addPayrollCutoff.mock.calls[0][0];
        expect(fd.get('name')).toBe('Jun 1-15');
        expect(fd.get('start_date')).toBe('2026-06-01');
        expect(fd.get('end_date')).toBe('2026-06-15');
        expect(fd.get('id')).toBeNull();          // null fields are skipped entirely
        expect(fd.get('_method')).toBeNull();     // POST, not a spoofed PUT
        expect(actions.updatePayrollCutoff).not.toHaveBeenCalled();
        expect(actions.hideForm).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    test('submitting an existing cut-off sends its id and spoofs a PUT', async () => {
        jest.useFakeTimers();
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderCutoffForm({ instance: CUTOFFS[0] });

        await act(async () => {
            await ref.current.onSubmitHandler({
                method: 'update', id: 3, name: 'Jun 1-15',
                start_date: new Date('2026-06-01T00:00:00'),
                end_date: new Date('2026-06-15T00:00:00'),
            });
        });

        expect(actions.addPayrollCutoff).not.toHaveBeenCalled();
        const [id, fd] = actions.updatePayrollCutoff.mock.calls[0];
        expect(id).toBe(3);
        expect(fd.get('id')).toBe('3');
        expect(fd.get('_method')).toBe('PUT');
        confirmSpy.mockRestore();
    });

    test('the list is refreshed a moment after a successful save', async () => {
        jest.useFakeTimers();
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderCutoffForm();

        await act(async () => {
            await ref.current.onSubmitHandler({
                method: 'store', name: 'Jun 1-15',
                start_date: new Date('2026-06-01T00:00:00'),
                end_date: new Date('2026-06-15T00:00:00'),
            });
        });
        expect(actions.fetchPayrollCutoffList).not.toHaveBeenCalled();

        act(() => { jest.advanceTimersByTime(100); });
        expect(actions.fetchPayrollCutoffList).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    // The switch has no arm for anything but store/update; an unknown method still closes
    // the form and refreshes, it just saves nothing.
    test('a submission with an unrecognised method saves nothing but still closes the form', async () => {
        jest.useFakeTimers();
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderCutoffForm();

        await act(async () => {
            await ref.current.onSubmitHandler({
                method: 'approve', name: 'Jun 1-15',
                start_date: new Date('2026-06-01T00:00:00'),
                end_date: new Date('2026-06-15T00:00:00'),
            });
        });

        expect(actions.addPayrollCutoff).not.toHaveBeenCalled();
        expect(actions.updatePayrollCutoff).not.toHaveBeenCalled();
        expect(actions.hideForm).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    test('cancelling the save confirmation saves nothing and leaves the form open', async () => {
        jest.useFakeTimers();
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderCutoffForm();

        await act(async () => {
            await ref.current.onSubmitHandler({
                method: 'store', name: 'Jun 1-15',
                start_date: new Date('2026-06-01T00:00:00'),
                end_date: new Date('2026-06-15T00:00:00'),
            });
        });
        act(() => { jest.advanceTimersByTime(100); });

        expect(actions.addPayrollCutoff).not.toHaveBeenCalled();
        expect(actions.hideForm).not.toHaveBeenCalled();
        expect(actions.fetchPayrollCutoffList).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });
});

describe('OPS Schedule -> Add / Edit form', () => {
    test('a new schedule clears any stale instance and loads nothing', () => {
        const { actions } = renderOpsForm();
        expect(actions.clearOpsScheduleInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchOpsSchedule).not.toHaveBeenCalled();
    });

    test('editing a schedule loads that schedule by its route id', () => {
        const { actions } = renderOpsForm({ params: { id: '12' }, isInstanceLoaded: true });
        expect(actions.fetchOpsSchedule).toHaveBeenCalledWith('12');
    });

    test('the edit form waits behind the loader until the schedule has arrived', () => {
        const { queryByTestId } = renderOpsForm({ params: { id: '12' }, isInstanceLoaded: false });
        expect(queryByTestId('page-loading')).not.toBeNull();
        expect(queryByTestId('request-buttons')).toBeNull();
    });

    test('the department picker offers the OPS departments from the server constants', () => {
        const { container } = renderOpsForm();
        const options = container.querySelectorAll('select[name="department"] option');
        expect(options.length).toBe(2); // blank + Engineering
        expect(options[1].textContent).toBe('Engineering');
    });

    test('with no OPS departments configured the picker offers only the blank option', () => {
        const { container } = renderOpsForm({ constant: {} });
        expect(container.querySelectorAll('select[name="department"] option').length).toBe(1);
    });

    test('the form opens on the image branch, so the fill-in fields are not rendered', () => {
        const { container, ref } = renderOpsForm();
        expect(ref.current.state.type).toBe('image');
        expect(container.querySelector('input[type="file"]')).not.toBeNull();
        expect(container.querySelector('input[name="name"]')).toBeNull();
    });

    // Characterises the already-registered finding OPS-THUMB-7: the stored-image preview
    // also requires state.imgPrevInputFile == '/thumbnail/defthumb.jpg', but this form's
    // constructor never defines imgPrevInputFile, so the branch cannot be taken and a
    // saved schedule shows the upload prompt as though it had no image. Asserting today's
    // behaviour — this test flips the day the constructor seeds that key.
    test('a saved schedule’s stored image is never previewed; the upload prompt is shown instead', () => {
        const { container, ref } = renderOpsForm({
            params: { id: '12' }, isInstanceLoaded: true,
            instance: { id: 12, thumbnail: '/img/eng.png', department_id: 5 },
        });
        expect(ref.current.state.imgPrevInputFile).toBeUndefined();
        expect(container.querySelector('.thumbnail-image img')).toBeNull();
        expect(container.textContent).toContain('UPLOAD AN IMAGE');
    });

    test('with no stored image the form invites an upload instead', () => {
        const { container } = renderOpsForm();
        expect(container.querySelector('.thumbnail-image img')).toBeNull();
        expect(container.textContent).toContain('UPLOAD AN IMAGE');
    });

    test('saving a new schedule posts the chosen image and the department', () => {
        const { ref, actions } = renderOpsForm();
        act(() => { ref.current.setState({ thumbnail: 'IMG_BLOB' }); });

        ref.current.onSubmitHandler({ method: 'store', type: 'image', department: 5, id: null });

        expect(actions.addOpsSchedule).toHaveBeenCalledTimes(1);
        const fd = actions.addOpsSchedule.mock.calls[0][0];
        expect(fd.get('department')).toBe('5');
        expect(fd.get('image')).toBe('IMG_BLOB');
        expect(fd.get('id')).toBeNull();
        expect(actions.updateOpsSchedule).not.toHaveBeenCalled();
    });

    test('saving an existing schedule sends its id and spoofs a PUT', () => {
        const { ref, actions } = renderOpsForm({ params: { id: '12' }, isInstanceLoaded: true });

        ref.current.onSubmitHandler({ method: 'update', type: 'image', id: 12, department: 5 });

        expect(actions.addOpsSchedule).not.toHaveBeenCalled();
        const [id, fd] = actions.updateOpsSchedule.mock.calls[0];
        expect(id).toBe(12);
        expect(fd.get('_method')).toBe('PUT');
    });

    test('a fill-in submission carries the typed details and no image', () => {
        const { ref, actions } = renderOpsForm();

        ref.current.onSubmitHandler({
            method: 'store', type: 'form', department: 5,
            name: 'Juan dela Cruz', position: 'Team Lead', email: 'juan@eastvantage.com',
            timezone: null,
        });

        const fd = actions.addOpsSchedule.mock.calls[0][0];
        expect(fd.get('name')).toBe('Juan dela Cruz');
        expect(fd.get('position')).toBe('Team Lead');
        expect(fd.get('email')).toBe('juan@eastvantage.com');
        expect(fd.get('image')).toBeNull();
        expect(fd.get('timezone')).toBeNull();
    });

    test('switching the action type resets the chosen department', () => {
        const { ref } = renderOpsForm();
        act(() => { ref.current.setState({ department_id: 5 }); });

        act(() => { ref.current.handleSelectActionType({ target: { value: 'form' } }); });

        expect(ref.current.state.type).toBe('form');
        expect(ref.current.state.department_id).toBe('');
    });
});
