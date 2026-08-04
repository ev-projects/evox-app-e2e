/**
 * MyTeamRequestsLifecycle.test.js
 * Full page-lifecycle coverage for container/MyTeam/MyTeamRequests/MyTeamRequests.js
 * Menu: My Team -> My Team Requests  (the busiest supervisor screen).
 *
 * The screen is walked exactly the way a supervisor uses it, phase by phase:
 *
 *   PHASE 1  MOUNT/LOAD    constructor default filters + componentDidMount fetch
 *                          (loading page before data, payroll-cutoff dates, no-cutoff arm,
 *                           already-cached-list arm that must NOT refetch)
 *   PHASE 2  DATA ARRIVES  requestList prop lands -> componentDidUpdate stores the department
 *                          list -> table renders; empty result renders the "no record" arm
 *   PHASE 3  USER ACTIONS  request-type tabs, status filters, department + name filter,
 *                          Show All toggle, pagination, select-all, row detail links,
 *                          feature/level guards that hide tabs and Show All
 *   PHASE 4  SUBMIT        bulk Update happy path, bulk Update with nothing selected
 *                          (FINDING MTR-BULK-1), and the bulk API failure arm
 *
 * Characterisation tests (they assert TODAY's behaviour, they do not endorse it):
 *   MTR-BULK-1  Update fires the bulk API with an empty selection - the conditional Yup
 *               rules never arm because the click writes action="bulk_action" after the
 *               submit has already been validated.
 *   MTR-DEPT-1  the saved department filter is always thrown away on mount (a ternary
 *               swallows the ?? branch, both outcomes are null).
 *   MTR-DEPT-2  the department dropdown is empty on the first render - the list is copied
 *               into state in componentDidUpdate, which does not run on mount.
 *   MTR-NAME-1  the name search box is <input type="textfield">, an invalid HTML type.
 *
 * ADDITIVE ONLY - no existing test touched.
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
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    return {
        InputDate: ({ name }) => R.createElement('div', { 'data-testid': 'date-' + name }),
        InputTime: () => R.createElement('div', null),
    };
});

// Pagination stub that keeps the real flow: set the page field, then submit the form.
jest.mock('../../components/Template/Paginate', () => {
    const R = require('react');
    const { useFormikContext } = require('formik');
    return ({ pagination }) => {
        const form = useFormikContext();
        const pages = [];
        for (let n = 1; n <= (pagination?.last_page ?? 0); n++) { pages.push(n); }
        return R.createElement('div', { 'data-testid': 'paginate' },
            pages.map((n) => R.createElement('button', {
                key: n, type: 'submit', 'data-testid': 'page-' + n,
                onClick: () => { form.setFieldValue('page', n); },
            }, String(n))));
    };
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    return {
        Container:  ({ children }) => R.createElement('div', null, children),
        Row:        ({ children }) => R.createElement('div', null, children),
        Col:        ({ children }) => R.createElement('div', null, children),
        Table:      ({ children }) => R.createElement('table', null, children),
        Badge:      ({ children }) => R.createElement('span', null, children),
        FormControl: (p) => R.createElement('input', p),
        Pagination: ({ children }) => R.createElement('div', null, children),
        ButtonGroup: ({ children }) => R.createElement('div', null, children),
        Button: ({ children, onClick, type, className }) =>
            R.createElement('button', { type: type || 'button', onClick, className }, children),
        ToggleButton: ({ children, onClick, checked }) =>
            R.createElement('button',
                { type: 'button', onClick, 'data-checked': String(!!checked), className: 'toggle-btn' },
                children),
        Tabs: ({ children, onSelect, defaultActiveKey }) =>
            R.createElement('div', { 'data-testid': 'tabs', 'data-active': defaultActiveKey },
                R.Children.toArray(children).map((child) =>
                    R.createElement('button', {
                        key: child.props.eventKey,
                        type: 'button',
                        'data-testid': 'tab-' + child.props.eventKey,
                        onClick: () => onSelect(child.props.eventKey),
                    }, child.props.title))),
        Tab: () => null,
    };
});

jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => true),
}));

jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchRequestList:   jest.fn(),
    fetchStatusNumbers: jest.fn(),
    bulkRequest:        jest.fn(),
}));

import Authenticator from '../../services/Authenticator';

global.links = new Proxy({}, { get: () => '/x/' });

const MyTeamRequests =
    require('../../container/MyTeam/MyTeamRequests/MyTeamRequests').default;

/* ------------------------------------------------------------------ fixtures */

const ROWS = [
    {
        id: 11, table_name: 'change_schedules', status: 'Pending',
        created_by: 'Ana Cruz', department_name: 'IT', created_at: '2026-07-01',
        date_requested: '2026-07-02', updated_by: 'Sup One', updated_at: '2026-07-03',
        employee_note: 'please approve',
        fourth_column: { work_days: ['mon', 'tue', 'wed'] },
        fifth_column: { allow_late: '1', allow_undertime: '0', allow_night_diff: '1' },
    },
    {
        id: 12, table_name: 'alter_logs', status: 'Approved',
        created_by: 'Ben Reyes', department_name: 'HR', created_at: '2026-07-04',
        date_requested: '2026-07-05', updated_by: 'Sup One', updated_at: '2026-07-06',
        employee_note: null,
        fourth_column: { current_time_in: '08:00', current_time_out: '17:00' },
        fifth_column: { new_time_in: '09:00', new_time_out: '18:00' },
    },
    {
        id: 13, table_name: 'alter_log_punches', status: 'Declined',
        created_by: 'Cara Lim', department_name: 'IT', created_at: '2026-07-07',
        date_requested: '2026-07-08', updated_by: 'Sup One', updated_at: '2026-07-09',
        employee_note: null,
        fourth_column: JSON.stringify([{ time_in: 1751328000, time_out: 1751356800 }]),
        fifth_column: JSON.stringify([{ start_time: 1751331600, end_time: 1751360400 }]),
    },
    {
        id: 14, table_name: 'rest_day_works', status: 'Canceled',
        created_by: 'Dan Uy', department_name: 'OPS', created_at: '2026-07-10',
        date_requested: '2026-07-11', updated_by: 'Sup One', updated_at: '2026-07-12',
        employee_note: null, fourth_column: '2026-07-11 08:00', fifth_column: '2026-07-11 17:00',
    },
    {
        id: 15, table_name: 'overtimes', status: 'Pending',
        created_by: 'Eve Sy', department_name: 'OPS', created_at: '2026-07-13',
        date_requested: '2026-07-14', updated_by: 'Sup One', updated_at: '2026-07-15',
        employee_note: null, fourth_column: '18:00', fifth_column: '20:00',
    },
];

const DEPARTMENTS = [
    { id: 3, DepartmentName: 'Information Technology' },
    { id: 4, DepartmentName: 'Human Resources' },
];

const listResult = ({ data = ROWS, department = DEPARTMENTS } = {}) => ({
    result: { data, department, current_page: 1, last_page: 3 },
    record_number: 'Showing 1 to 5 of 15',
});

const baseProps = (over = {}) => ({
    user: { id: 7, departments_handled_strict: [{ id: 3, department_name: 'IT' }] },
    settings: { current_payroll_cutoff: { start_date: '2026-07-01', end_date: '2026-07-15' } },
    filters: undefined,
    requestList: listResult(),
    isListLoaded: true,
    isNumbersLoaded: true,
    statusNumbers: { pending: 4, approved: 2, canceled: 1, declined: 3 },
    stored_departments: [],
    fetchRequestList: jest.fn(() => Promise.resolve()),
    fetchStatusNumbers: jest.fn(() => Promise.resolve()),
    bulkRequest: jest.fn(() => Promise.resolve()),
    ...over,
});

const renderScreen = (props, ref) => render(
    <MemoryRouter><MyTeamRequests {...props} ref={ref} /></MemoryRouter>
);

const flush = () => act(async () => { await Promise.resolve(); });

// find a <button> whose visible text contains the given label
const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

// Typing into a text box: assign through the native setter so React's value tracker
// still sees a change and fires onChange (a plain fireEvent.change is swallowed).
const typeInto = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    fireEvent.change(el);
};

const lastFetchArgs = (props) => {
    const calls = props.fetchRequestList.mock.calls;
    return calls[calls.length - 1][0];
};

describe('My Team Requests - page lifecycle', () => {
    beforeEach(() => {
        Authenticator.scanFeature.mockImplementation(() => true);
        Authenticator.scanLevel.mockImplementation(() => true);
    });
    afterEach(() => jest.clearAllMocks());

    /* ============================================================ PHASE 1 - MOUNT */

    test('opening_the_screen_before_any_list_is_cached_shows_the_loading_page_and_asks_the_server_for_pending_requests_in_the_current_payroll_cutoff', async () => {
        const props = baseProps({ isListLoaded: false });
        const { getByTestId, queryByText } = renderScreen(props);
        await flush();

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryByText('My Team Request')).toBeNull();

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(props.fetchRequestList).toHaveBeenCalledWith(expect.objectContaining({
            url: 'my_team_requests',
            status: 'pending',
            request_type: 'all',
            page: 1,
            valid_from: '2026-07-01',
            valid_to: '2026-07-15',
            first_load: true,
        }));
    });

    test('opening_the_screen_when_the_list_is_already_cached_renders_the_table_immediately_and_does_not_call_the_server_again', async () => {
        const props = baseProps();
        const { getByText } = renderScreen(props);
        await flush();

        expect(props.fetchRequestList).not.toHaveBeenCalled();
        expect(getByText('My Team Request')).toBeInTheDocument();
        expect(getByText('Showing 1 to 5 of 15')).toBeInTheDocument();
    });

    test('opening_the_screen_when_no_payroll_cutoff_is_configured_asks_the_server_with_an_empty_date_range', async () => {
        const props = baseProps({
            isListLoaded: false,
            settings: {},
            filters: { first_load: false, valid_from: null, valid_to: null, status: 'pending' },
        });
        renderScreen(props);
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.valid_from).toBeNull();
        expect(sent.valid_to).toBeNull();
    });

    test('reopening_the_screen_reuses_the_saved_status_and_page_filters_but_silently_drops_the_saved_department_FINDING_MTR_DEPT_1', async () => {
        const props = baseProps({
            isListLoaded: false,
            filters: {
                status: 'approved', page: 4, name: 'ana', department_id: 3,
                request_type: 'overtime', first_load: false,
                valid_from: '2026-06-01', valid_to: '2026-06-15',
            },
        });
        renderScreen(props);
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.status).toBe('approved');
        expect(sent.page).toBe(4);
        expect(sent.name).toBe('ana');
        expect(sent.request_type).toBe('overtime');
        // FINDING MTR-DEPT-1 (characterised): the constructor writes
        //   department_id: filters?.department_id ?? handled.length == 1 ? null : null
        // The ternary swallows the ?? branch, so BOTH outcomes are null - a supervisor who
        // saved a department filter always comes back to "- Department -".
        expect(sent.department_id).toBeNull();
    });

    /* ====================================================== PHASE 2 - DATA ARRIVES */

    test('when_the_list_arrives_every_request_type_renders_its_own_row_details_and_cancelled_rows_get_no_tick_box', async () => {
        const props = baseProps();
        const { container, getByText } = renderScreen(props);
        await flush();

        expect(getByText('Ana Cruz')).toBeInTheDocument();
        expect(getByText('Eve Sy')).toBeInTheDocument();
        // change_schedules arm: work days / rest days split
        expect(getByText(/Work Days: mon, tue, wed/)).toBeInTheDocument();
        expect(getByText(/Rest Days: thu, fri, sat, sun/)).toBeInTheDocument();
        // alter_logs arm
        expect(getByText('In: 09:00')).toBeInTheDocument();
        expect(getByText('Out: 17:00')).toBeInTheDocument();
        // rest_day_works + overtimes arms
        expect(getByText(/From: 2026-07-11 08:00/)).toBeInTheDocument();
        expect(getByText('20:00')).toBeInTheDocument();
        // note only rendered when present
        expect(getByText(/please approve/)).toBeInTheDocument();

        // 5 rows, but the Canceled one has no checkbox -> 4 selectable
        expect(container.querySelectorAll('tbody tr').length).toBe(5);
        expect(container.querySelectorAll('input[name="checkedList"]').length).toBe(4);
    });

    test('the_department_dropdown_only_fills_in_after_a_second_render_because_the_list_is_copied_into_state_on_update_not_on_mount_FINDING_MTR_DEPT_2', async () => {
        const props = baseProps();
        const { container, rerender } = renderScreen(props);
        await flush();

        const optionsAtMount = container.querySelectorAll('select[name="department_id"] option');
        expect(optionsAtMount.length).toBe(1);              // only "- Department -"

        rerender(<MemoryRouter><MyTeamRequests {...props} /></MemoryRouter>);
        await flush();

        const optionsAfter = container.querySelectorAll('select[name="department_id"] option');
        expect(optionsAfter.length).toBe(3);
        expect(optionsAfter[1].label).toBe('Information Technology');
    });

    test('an_empty_result_shows_the_no_record_message_and_hides_the_table_and_pagination', async () => {
        const props = baseProps({ requestList: listResult({ data: [] }) });
        const { container, getByText } = renderScreen(props);
        await flush();

        expect(getByText(/Sorry, No Record Found/)).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
        expect(container.querySelector('[data-testid="paginate"]')).toBeNull();
        // the filter bar is still usable so the supervisor can widen the search
        expect(btn(container, 'Filter')).toBeTruthy();
    });

    test('the_status_counters_show_zero_until_the_counts_have_loaded', async () => {
        const loaded = renderScreen(baseProps());
        await flush();
        expect(btn(loaded.container, 'Pending').textContent).toMatch(/4/);
        loaded.unmount();

        const notLoaded = renderScreen(baseProps({ isNumbersLoaded: false, statusNumbers: {} }));
        await flush();
        expect(btn(notLoaded.container, 'Pending').textContent).toMatch(/0/);
    });

    test('missing_individual_counters_fall_back_to_zero_instead_of_undefined', async () => {
        const props = baseProps({ statusNumbers: { pending: 9 } });
        const { container } = renderScreen(props);
        await flush();

        expect(btn(container, 'Pending').textContent).toMatch(/9/);
        expect(btn(container, 'Approved').textContent).toMatch(/0/);
        expect(btn(container, 'Cancelled').textContent).toMatch(/0/);
        expect(btn(container, 'Declined').textContent).toMatch(/0/);
    });

    /* ===================================================== PHASE 3 - USER ACTIONS */

    test('switching_to_the_overtime_tab_reloads_the_list_for_overtime_requests_starting_from_page_one', async () => {
        const props = baseProps();
        const { getByTestId } = renderScreen(props);
        await flush();

        await act(async () => { fireEvent.click(getByTestId('tab-overtime')); });
        await flush();

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        const sent = lastFetchArgs(props);
        expect(sent.request_type).toBe('overtime');
        expect(sent.page).toBe(1);
        expect(sent.status).toBe('pending');
    });

    test('every_request_type_tab_reloads_the_list_for_its_own_type', async () => {
        const props = baseProps();
        const { getByTestId } = renderScreen(props);
        await flush();

        for (const key of ['alteration', 'rest_day_work', 'change_schedule', 'alter_logs_punches', 'all']) {
            await act(async () => { fireEvent.click(getByTestId('tab-' + key)); });
            await flush();
            expect(lastFetchArgs(props).request_type).toBe(key);
        }
        expect(props.fetchRequestList).toHaveBeenCalledTimes(5);
    });

    test('a_supervisor_without_the_request_type_features_only_sees_the_all_requests_tab', async () => {
        Authenticator.scanFeature.mockImplementation(() => false);
        const props = baseProps();
        const { getByTestId, queryByTestId } = renderScreen(props);
        await flush();

        expect(getByTestId('tab-all')).toBeInTheDocument();
        expect(queryByTestId('tab-overtime')).toBeNull();
        expect(queryByTestId('tab-alteration')).toBeNull();
        expect(queryByTestId('tab-change_schedule')).toBeNull();
    });

    test('clicking_the_approved_status_filter_reloads_only_approved_requests_from_page_one', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Approved')); });
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.status).toBe('approved');
        expect(sent.page).toBe(1);
    });

    test('each_of_the_four_status_filters_reloads_the_list_with_that_status', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const map = [['Pending', 'pending'], ['Approved', 'approved'],
                     ['Cancelled', 'canceled'], ['Declined', 'declined']];
        for (const [label, value] of map) {
            await act(async () => { fireEvent.click(btn(container, label)); });
            await flush();
            expect(lastFetchArgs(props).status).toBe(value);
        }
        expect(props.fetchRequestList).toHaveBeenCalledTimes(4);
    });

    test('filtering_by_department_reloads_the_list_for_that_department_only_and_marks_the_search_as_filtered', async () => {
        const props = baseProps();
        const { container, rerender } = renderScreen(props);
        await flush();
        // second render so the department options exist (see FINDING MTR-DEPT-2)
        rerender(<MemoryRouter><MyTeamRequests {...props} /></MemoryRouter>);
        await flush();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department_id"]'),
                { target: { value: '3' } });
        });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.department_id).toBe('3');
        expect(sent.page).toBe(1);
        expect(sent.use_filter).toBe(1);
        expect(sent.departmentselect).toBe(0);
        expect(sent.status).toBe('pending');        // the status filter is kept
        expect(sent.request_type).toBe('all');      // and so is the tab
        expect(sent.action).toBeUndefined();        // cleared action is dropped from the payload
    });

    test('typing_a_name_in_the_search_box_reaches_the_server_when_the_filter_is_applied', async () => {
        const props = baseProps();
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                action: '', status: 'pending', name: 'ana', department_id: '3',
                page: 1, use_filter: 1, valid_from: null, valid_to: null,
            });
        });

        const sent = lastFetchArgs(props);
        expect(sent.name).toBe('ana');
        expect(sent.department_id).toBe('3');
    });

    test('the_name_search_box_is_declared_with_an_invalid_input_type_so_nothing_typed_into_it_is_registered_by_the_form_FINDING_MTR_NAME_1', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const nameBox = container.querySelector('input[name="name"]');
        // FINDING MTR-NAME-1 (characterised): the markup is
        //   <input type="textfield" ... name="name" onChange={handleChange} value={values.name} />
        // "textfield" is not a valid HTML input type. Browsers silently coerce it to "text"
        // so production still works, but any engine that does NOT coerce (and React's own
        // change plugin, which keys off element.type) stops treating it as a text field and
        // the keystrokes never reach the form state. It also renders value={null}, which React
        // warns about. Invalid markup on the busiest filter on the screen.
        expect(nameBox.getAttribute('type')).toBe('textfield');

        await act(async () => { typeInto(nameBox, 'ana'); });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(lastFetchArgs(props).name).toBeUndefined();
    });

    test('turning_show_all_on_clears_the_chosen_department_and_reloads_the_whole_division', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        await act(async () => {
            fireEvent.click(container.querySelector('input.showall_checkbox'));
        });
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.showall).toBe(1);
        expect(sent.departmentselect).toBe(1);
        expect(sent.department_id).toBeUndefined();   // nulled, so it never reaches the server
        expect(sent.page).toBe(1);
    });

    test('a_supervisor_who_is_not_a_division_head_or_hr_never_sees_the_show_all_toggle', async () => {
        Authenticator.scanLevel.mockImplementation(() => false);
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        expect(container.querySelector('input.showall_checkbox')).toBeNull();
    });

    test('moving_to_page_two_reloads_the_same_filters_for_page_two', async () => {
        const props = baseProps();
        const { getByTestId } = renderScreen(props);
        await flush();

        await act(async () => { fireEvent.click(getByTestId('page-2')); });
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.page).toBe(2);
        expect(sent.status).toBe('pending');
        expect(sent.request_type).toBe('all');
    });

    test('ticking_select_all_ticks_every_non_cancelled_row_and_unticking_it_clears_them_again', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const selectAll = container.querySelector('input[name="isAll"]');
        const rowBoxes = () => Array.from(container.querySelectorAll('input[name="checkedList"]'));

        expect(rowBoxes().every((b) => b.checked === false)).toBe(true);

        await act(async () => { fireEvent.click(selectAll); });
        await flush();
        expect(rowBoxes().length).toBe(4);
        expect(rowBoxes().every((b) => b.checked === true)).toBe(true);
        expect(rowBoxes().map((b) => b.value))
            .toEqual(['11.change_schedules', '12.alter_logs',
                      '13.alter_log_punches', '15.overtimes']);

        await act(async () => { fireEvent.click(selectAll); });
        await flush();
        expect(rowBoxes().every((b) => b.checked === false)).toBe(true);
    });

    test('ticking_one_row_selects_only_that_request', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const boxes = container.querySelectorAll('input[name="checkedList"]');
        await act(async () => { fireEvent.click(boxes[1]); });
        await flush();

        expect(container.querySelectorAll('input[name="checkedList"]')[1].checked).toBe(true);
        expect(container.querySelectorAll('input[name="checkedList"]')[0].checked).toBe(false);
    });

    test('opening_a_row_links_to_the_detail_page_of_that_request_type', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const links = Array.from(container.querySelectorAll('a.nav-link'));
        expect(links.length).toBe(5);
        expect(links.map((a) => a.getAttribute('href')))
            .toEqual(['/x/11', '/x/12', '/x/13', '/x/14', '/x/15']);
    });

    /* ========================================================== PHASE 4 - SUBMIT */

    test('approving_the_selected_requests_calls_the_bulk_endpoint_then_reloads_the_list', async () => {
        const props = baseProps();
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                action: 'bulk_action',
                bulk_action: 'approve',
                checkedList: ['11.change_schedules', '12.alter_logs'],
                status: 'pending',
                request_type: 'all',
                page: 1,
                valid_from: new Date('2026-07-01T00:00:00'),
                valid_to: new Date('2026-07-15T00:00:00'),
                name: null,
                department_id: null,
            });
        });

        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        const sent = props.bulkRequest.mock.calls[0][0];
        expect(sent).toEqual(expect.objectContaining({
            url: 'my_team_requests',
            action: 'bulk_action',
            bulk_action: 'approve',
            checkedList: ['11.change_schedules', '12.alter_logs'],
            valid_from: '2026-07-01',
            valid_to: '2026-07-15',
        }));
        expect(sent.name).toBeUndefined();
        expect(sent.department_id).toBeUndefined();

        // the list is refreshed with the same payload right after the bulk update
        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(props.fetchRequestList.mock.calls[0][0]).toEqual(sent);
    });

    test('declining_the_selected_requests_sends_the_deny_action', async () => {
        const props = baseProps();
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();

        const values = {
            action: 'bulk_action', bulk_action: 'deny',
            checkedList: ['15.overtimes'], page: 1, valid_from: null, valid_to: null,
        };
        await act(async () => { await ref.current.onSubmitHandler(values); });

        expect(props.bulkRequest.mock.calls[0][0].bulk_action).toBe('deny');
        // after a bulk run the selection and the action are reset so the next click is clean
        expect(values.checkedList).toEqual([]);
        expect(values.action).toBe('');
    });

    test('when_the_bulk_update_fails_the_error_is_swallowed_and_the_list_is_not_reloaded', async () => {
        const props = baseProps({
            bulkRequest: jest.fn(() => Promise.reject(new Error('500 from server'))),
        });
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                action: 'bulk_action', bulk_action: 'approve',
                checkedList: ['11.change_schedules'], page: 1,
            });
        });

        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        expect(props.fetchRequestList).not.toHaveBeenCalled();   // reload never happens
        expect(spy).toHaveBeenCalledWith('Error during API calls:', expect.any(Error));
        spy.mockRestore();
    });

    test('a_plain_filter_submit_formats_the_date_range_drops_empty_values_and_never_calls_the_bulk_endpoint', async () => {
        const props = baseProps();
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                action: '', status: 'approved', name: '', department_id: null,
                checked: 'should-be-ignored', page: 2,
                valid_from: new Date('2026-06-16T00:00:00'),
                valid_to: new Date('2026-06-30T00:00:00'),
            });
        });

        expect(props.bulkRequest).not.toHaveBeenCalled();
        const sent = props.fetchRequestList.mock.calls[0][0];
        expect(sent).toEqual({
            url: 'my_team_requests', status: 'approved', page: 2,
            valid_from: '2026-06-16', valid_to: '2026-06-30',
        });
        expect(sent.checked).toBeUndefined();
        expect(sent.name).toBeUndefined();
    });

    test('pressing_update_without_choosing_an_action_or_any_rows_still_fires_the_bulk_api_instead_of_stopping_at_the_validation_message_FINDING_MTR_BULK_1', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        // nothing ticked, "Select Action" still on the dropdown
        expect(container.querySelectorAll('input[name="checkedList"]:checked').length).toBe(0);
        expect(container.querySelector('select[name="bulk_action"]').value).toBe('');

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        // FINDING MTR-BULK-1 (characterised, not endorsed): the Update button sets
        // action="bulk_action" in its onClick, but the form submit that the same click
        // triggers is validated against the values Formik held BEFORE that write, so the
        // conditional "Select a record to be updated" / "Please choose action" rules are
        // never armed. The bulk endpoint is called with an empty selection.
        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        const sent = props.bulkRequest.mock.calls[0][0];
        expect(sent.checkedList).toEqual([]);
        expect(sent.bulk_action).toBeUndefined();
    });

    test('pressing_update_after_ticking_rows_and_choosing_approve_sends_those_rows_to_the_bulk_endpoint', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        await act(async () => {
            fireEvent.click(container.querySelector('input[name="isAll"]'));
        });
        await flush();
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="bulk_action"]'),
                { target: { value: 'approve' } });
        });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        const sent = props.bulkRequest.mock.calls[0][0];
        expect(sent.bulk_action).toBe('approve');
        expect(sent.checkedList).toEqual(['11.change_schedules', '12.alter_logs',
                                          '13.alter_log_punches', '15.overtimes']);
        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
    });
});
