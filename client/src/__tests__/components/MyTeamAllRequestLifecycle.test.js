/**
 * MyTeamAllRequestLifecycle.test.js
 *
 * SOURCE UNDER TEST
 *   src/container/MyTeam/MyTeamRequests/MyTeamAllRequest.js
 *   (the class component and the module-level helpers in the same file:
 *    selectAllChecklist, resetValues, Status)
 *   NOT under test: mapStateToProps / mapDispatchToProps (source lines 629-647). This suite
 *   mocks react-redux `connect` to an identity function, so that wiring never executes here.
 *
 * MENU PATH
 *   My Team -> My Team Overall Request   (route my_team_all_requests = /app/team/MyTeamAllRequests)
 *
 * COVERAGE (measured, not quoted)
 *   29-JUL BASELINE   Latest-Test-30-07-2026/Coverage_Report_29072026/Coverage_Report/Frontend/
 *                     coverage-summary.json records this file at 0/147 lines and 0/28 functions
 *                     - 0% covered. (A "114 uncovered / 22.4%" figure circulates elsewhere in the
 *                     package; it is not reproducible from that report, so it is not repeated.)
 *   THIS SUITE ALONE  91.16% lines / 92.55% branches / 71.43% functions, measured 05-Aug-2026 with
 *                     --collectCoverageFrom=src/container/MyTeam/MyTeamRequests/MyTeamAllRequest.js
 *                     The residual gap is the connect() wiring described above.
 *
 * RELATION TO EXISTING SUITES (overlap disclosed, nothing shared)
 *   Two suites already touch this component and are NOT modified by this file:
 *     src/__tests__/containers/evoxtest_MyTeamAllRequestDeep2.test.js  (9 tests, render/interaction)
 *     src/__tests__/existing/MyTeamAllRequest.test.js                  (4 tests, smoke)
 *   Both stub Paginate and InputDate as inert placeholders, so neither can drive pagination or the
 *   date-range validation arm. That, plus the findings below, is the marginal value added here.
 *
 * WHAT THIS SUITE WALKS, IN THE ORDER A SUPERVISOR HITS IT
 *   PHASE 1 MOUNT      constructor filter seeding from props.filters / props.requesttype,
 *                      componentDidMount's unconditional fetch, the loading gate
 *   PHASE 2 RENDER     the five table_name arms + the unhandled default arm, Status badges,
 *                      Canceled rows, notes, detail links, the empty-list arm, counters
 *   PHASE 3 FILTERS    status toggles, request-type tabs, department, the restored name filter,
 *                      date range (valid + invalid), Show All (permitted + denied), pagination
 *   PHASE 4 BULK       per-selection approve / deny, select-all, the armed validation arm,
 *                      the unarmed validation arm, the bulk failure arm, the fetch failure arm
 *
 * FINDINGS DISCOVERED (characterised below - asserted as they behave TODAY, not endorsed)
 *   MTAR-DEPT-1  the saved department filter can never be restored: the constructor writes
 *                `filters?.department_id ?? handled.length == 1 ? null : null`, and because ??
 *                binds tighter than ?: BOTH branches of the ternary are the literal null.
 *   MTAR-DATE-1  the saved date range is silently dropped on every mount - valid_from and
 *                valid_to are hard-coded to null in the constructor and props.filters is
 *                never consulted for them, unlike every other filter on the screen.
 *   MTAR-DEPT-2  the department dropdown is empty on first paint; the department list is only
 *                copied into state by componentDidUpdate, which does not run on mount.
 *   MTAR-BULK-1  pressing Update with nothing ticked and no action chosen still fires the bulk
 *                endpoint: the button writes action="bulk_action" in onClick, but Formik
 *                validates the values it held BEFORE that write, so the conditional Yup rules
 *                are not armed for that first click.
 *   MTAR-EVAL-1  the change_schedules arm resolves payroll labels with
 *                eval('payroll_items.' + key) over SERVER-SUPPLIED keys; an unrecognised flag
 *                renders a bare comma instead of being skipped (and the eval is an injection
 *                surface on data the client does not control).
 *   MTAR-MUT-1   the selection reset at the end of onSubmitHandler sits AFTER the try/catch, so a
 *                bulk update that the server rejected still wipes the supervisor's ticks - the
 *                screen reports nothing and the obvious retry goes out with an empty selection.
 *
 * WITHDRAWN 05-Aug-2026 (audit repair - full reasoning at each former site)
 *   MTAR-NAME-1  "the name box is declared type=textfield so typing never reaches the query".
 *                Withdrawn: jsdom 11 does not normalise input.type, real browsers do. It was a
 *                measurement of jsdom, and it would have failed on a correct fix.
 *   MTAR-CHK-1   "the bulk branch posts a stray `checked` value". Withdrawn: this screen owns no
 *                `checked` field, so the arm is dead defensive code, not a reachable defect.
 *   Deleting both cost no coverage - the file still measures 91.16% lines from this suite alone.
 *
 * HOW PHASE 4 DRIVES THE COMPONENT
 *   The bulk journeys (tick -> choose action -> Update) are driven through the rendered UI.
 *   Five tests at the end of Phase 4 instead call onSubmitHandler directly through a ref, because
 *   they cover payload-shaping and error branches that the UI cannot reach deterministically
 *   (a rejected promise from either endpoint, and the null/blank stripping rules). Those five are
 *   handler-level unit tests and are named as such - they do not claim a UI journey.
 *
 * ADDITIVE ONLY - no existing test file and no application source was modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ mocks */

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

// The date pickers are the real filter inputs on this screen, so the stub has to write
// into Formik for real - otherwise the date-range validation arm cannot be exercised.
// It is fully synchronous: no FileReader, no timers, nothing that needs a flush to settle.
// CONTRACT CHECKED AGAINST SOURCE (components/DatePickerComponent/DatePicker.js line 186):
//   InputDate renders react-datepicker with onChange={date => form.setFieldValue(props.name, date)}
// i.e. it writes ITS OWN `name` prop into Formik, carrying a Date object. The stub does exactly
// that. What the stub does NOT reproduce is react-datepicker's own parsing/UI - if that component
// ever stopped handing a Date to onChange, these tests would stay green.
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    const { useFormikContext } = require('formik');
    return {
        InputDate: ({ name }) => {
            const form = useFormikContext();
            return R.createElement('input', {
                type: 'text',
                'data-testid': 'date-' + name,
                onChange: (e) => form.setFieldValue(
                    name, e.target.value ? new Date(e.target.value + 'T00:00:00') : null),
            });
        },
        InputTime: () => R.createElement('div', null),
    };
});

// Pagination stub.
// CONTRACT CHECKED AGAINST SOURCE (components/Template/Paginate/Paginate.js line 19): each page
// control is a <Button type="submit"> whose onClick is form.setFieldValue("page", page) - so the
// field name is "page" and the click submits the surrounding form. The stub reproduces both.
// It deliberately renders one button per page rather than the real First/Prev/1..10/Next/Last
// window, so it proves the container's reaction to a page change, not Paginate's own windowing.
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
        Container:   ({ children }) => R.createElement('div', null, children),
        Row:         ({ children }) => R.createElement('div', null, children),
        Col:         ({ children }) => R.createElement('div', null, children),
        Table:       ({ children }) => R.createElement('table', null, children),
        Badge:       ({ children, variant }) =>
            R.createElement('span', { 'data-variant': variant, className: 'badge' }, children),
        FormControl: (p) => R.createElement('input', p),
        Pagination:  ({ children }) => R.createElement('div', null, children),
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

// The route table the row links are built from. Distinct prefixes per request type so the
// "each row deep-links to its own detail screen" rule is actually observable.
global.links = {
    base:            '/app/',
    change_schedule: '/app/team/ChangeSchedule/',
    alter_log:       '/app/team/AlterLog/',
    alter_log_punch: '/app/team/AlterLogPunch/',
    rest_day_work:   '/app/team/RestDayWork/',
    overtime:        '/app/team/Overtime/',
};

const MyTeamAllRequest =
    require('../../container/MyTeam/MyTeamRequests/MyTeamAllRequest').default;

/* --------------------------------------------------------------- fixtures */

const ROWS = [
    {
        id: 21, table_name: 'change_schedules', status: 'Pending',
        created_by: 'Ana Cruz', department_name: 'Information Technology',
        created_at: '2026-07-01', date_requested: '2026-07-02',
        updated_by: 'Sup One', updated_at: '2026-07-03',
        employee_note: 'shifting to a 4-day week',
        fourth_column: { work_days: ['mon', 'tue', 'wed'] },
        fifth_column: { allow_late: '1', allow_undertime: '0', allow_night_diff: '1' },
    },
    {
        id: 22, table_name: 'alter_logs', status: 'Approved',
        created_by: 'Ben Reyes', department_name: 'Human Resources',
        created_at: '2026-07-04', date_requested: '2026-07-05',
        updated_by: 'Sup One', updated_at: '2026-07-06', employee_note: null,
        fourth_column: { current_time_in: '08:00', current_time_out: '17:00' },
        fifth_column: { new_time_in: '09:00', new_time_out: '18:00' },
    },
    {
        id: 23, table_name: 'alter_log_punches', status: 'Declined',
        created_by: 'Cara Lim', department_name: 'Information Technology',
        created_at: '2026-07-07', date_requested: '2026-07-08',
        updated_by: 'Sup One', updated_at: '2026-07-09', employee_note: null,
        fourth_column: '08:00 / 12:00 / 13:00 / 17:00',
        fifth_column:  '08:15 / 12:00 / 13:00 / 18:30',
    },
    {
        id: 24, table_name: 'rest_day_works', status: 'Canceled',
        created_by: 'Dan Uy', department_name: 'Operations',
        created_at: '2026-07-10', date_requested: '2026-07-11',
        updated_by: 'Sup One', updated_at: '2026-07-12', employee_note: null,
        fourth_column: '2026-07-11 08:00', fifth_column: '2026-07-11 17:00',
    },
    {
        id: 25, table_name: 'overtimes', status: 'Pending',
        created_by: 'Eve Sy', department_name: 'Operations',
        created_at: '2026-07-13', date_requested: '2026-07-14',
        updated_by: 'Sup One', updated_at: '2026-07-15', employee_note: null,
        fourth_column: '18:00', fifth_column: '20:00',
    },
];

const DEPARTMENTS = [
    { id: 5, DepartmentName: 'Information Technology' },
    { id: 6, DepartmentName: 'Operations' },
];

const listResult = ({ data = ROWS, department = DEPARTMENTS, last_page = 3 } = {}) => ({
    result: { data, department, current_page: 1, last_page },
    record_number: 'Showing 1 to 5 of 15 entries',
});

const baseProps = (over = {}) => ({
    user: { id: 7, departments_handled_strict: [{ id: 5, department_name: 'IT' }] },
    settings: { current_payroll_cutoff: { start_date: '2026-07-01', end_date: '2026-07-15' } },
    filters: undefined,
    requesttype: undefined,
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
    <MemoryRouter><MyTeamAllRequest {...props} ref={ref} /></MemoryRouter>
);

const flush = () => act(async () => { await Promise.resolve(); });

const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

const lastFetchArgs = (props) => {
    const calls = props.fetchRequestList.mock.calls;
    return calls[calls.length - 1][0];
};

// componentDidMount always fetches on this screen; clear it so a test can assert only
// the call its own interaction produced.
const mountThenClear = async (props, ref) => {
    const utils = renderScreen(props, ref);
    await flush();
    props.fetchRequestList.mockClear();
    return utils;
};

let logSpy;

describe('My Team Overall Request - supervisor request lifecycle', () => {
    beforeAll(() => {
        // render() console.logs the whole props tree on every paint.
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterAll(() => logSpy.mockRestore());

    beforeEach(() => {
        Authenticator.scanFeature.mockImplementation(() => true);
        Authenticator.scanLevel.mockImplementation(() => true);
    });
    afterEach(() => jest.clearAllMocks());

    /* ==================================================== PHASE 1 - MOUNT / LOAD */

    test('opening_the_screen_shows_the_loading_page_until_the_list_arrives_and_asks_the_server_for_pending_alteration_requests', async () => {
        const props = baseProps({ isListLoaded: false });
        const { getByTestId, queryByText } = renderScreen(props);
        await flush();

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryByText('My Team Overall Request')).toBeNull();

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(props.fetchRequestList).toHaveBeenCalledWith({
            url: 'my_team_requests',
            status: 'pending',
            request_type: 'alteration',
            page: 1,
            valid_from: null,
            valid_to: null,
            department_id: null,
            name: null,
            use_filter: 0,
            showall: 0,
            departmentselect: 1,
            checkedList: [],
            isAll: false,
            action: null,
            bulk_action: null,
            first_load: true,
        });
    });

    test('the_list_is_re_fetched_on_every_visit_even_when_a_cached_list_is_already_in_the_store', async () => {
        const props = baseProps({ isListLoaded: true });
        const { getByText } = renderScreen(props);
        await flush();

        // unlike the sibling My Team Requests screen there is no isListLoaded guard here
        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(getByText('My Team Overall Request')).toBeInTheDocument();
        expect(getByText(/Showing 1 to 5 of 15 entries/)).toBeInTheDocument();
    });

    test('the_status_counter_endpoint_is_never_called_on_this_screen', async () => {
        const props = baseProps();
        renderScreen(props);
        await flush();

        // fetchStatusNumbers is wired through mapDispatchToProps but the call site is
        // commented out, so the four counters can only ever show whatever is already cached.
        expect(props.fetchStatusNumbers).not.toHaveBeenCalled();
    });

    test('the_request_type_carried_in_from_the_store_seeds_the_active_tab_and_the_first_query', async () => {
        const props = baseProps({ requesttype: 'overtime' });
        const { getByTestId } = renderScreen(props);
        await flush();

        expect(lastFetchArgs(props).request_type).toBe('overtime');
        expect(getByTestId('tabs').getAttribute('data-active')).toBe('overtime');
    });

    test('an_empty_request_type_from_the_store_falls_back_to_the_alteration_tab', async () => {
        const props = baseProps({ requesttype: '' });
        const { getByTestId } = renderScreen(props);
        await flush();

        expect(lastFetchArgs(props).request_type).toBe('alteration');
        expect(getByTestId('tabs').getAttribute('data-active')).toBe('alteration');
    });

    test('coming_back_to_the_screen_restores_the_saved_status_page_and_name_filters', async () => {
        const props = baseProps({
            filters: {
                status: 'declined', page: 4, name: 'cruz',
                use_filter: 1, showall: 1, departmentselect: 2, first_load: false,
            },
        });
        renderScreen(props);
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.status).toBe('declined');
        expect(sent.page).toBe(4);
        expect(sent.name).toBe('cruz');
        expect(sent.use_filter).toBe(1);
        expect(sent.showall).toBe(1);
        expect(sent.departmentselect).toBe(2);
        expect(sent.first_load).toBe(false);
    });

    test('a_saved_show_all_or_use_filter_of_zero_is_restored_as_zero_and_a_saved_departmentselect_of_zero_flips_back_to_one', async () => {
        const props = baseProps({
            filters: { use_filter: 0, showall: 0, departmentselect: 0 },
        });
        renderScreen(props);
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.use_filter).toBe(0);
        expect(sent.showall).toBe(0);
        // departmentselect uses a truthiness test rather than ??, so a deliberate 0 is lost
        expect(sent.departmentselect).toBe(1);
    });

    test('a_saved_department_filter_is_always_discarded_on_mount_FINDING_MTAR_DEPT_1', async () => {
        const props = baseProps({
            filters: { department_id: 5, status: 'pending' },
            user: { id: 7, departments_handled_strict: [{ id: 5 }] },
        });
        renderScreen(props);
        await flush();

        // FINDING MTAR-DEPT-1 (characterised): the constructor writes
        //   department_id: filters?.department_id ?? handled.length == 1 ? null : null
        // ?? binds tighter than ?:, so this parses as ((a ?? b) ? null : null) and BOTH
        // outcomes are the literal null. A supervisor who filtered by department and opened
        // a request always returns to "- Department -" and a full-team list.
        expect(lastFetchArgs(props).department_id).toBeNull();
    });

    test('a_saved_department_filter_is_discarded_for_a_multi_department_supervisor_too_FINDING_MTAR_DEPT_1', async () => {
        const props = baseProps({
            filters: { department_id: 6 },
            user: { id: 7, departments_handled_strict: [{ id: 5 }, { id: 6 }, { id: 9 }] },
        });
        renderScreen(props);
        await flush();

        // the other arm of the swallowed ternary - the handled-department count is irrelevant
        expect(lastFetchArgs(props).department_id).toBeNull();
    });

    test('a_saved_date_range_is_silently_dropped_on_mount_FINDING_MTAR_DATE_1', async () => {
        const props = baseProps({
            filters: { valid_from: '2026-06-01', valid_to: '2026-06-15', status: 'approved' },
        });
        renderScreen(props);
        await flush();

        const sent = lastFetchArgs(props);
        // FINDING MTAR-DATE-1 (characterised): valid_from / valid_to are hard-coded to null in
        // the constructor - props.filters is consulted for every other field but not these two.
        // The status survives the round trip, the date range does not, so the supervisor comes
        // back to a different result set than the one they left.
        expect(sent.status).toBe('approved');
        expect(sent.valid_from).toBeNull();
        expect(sent.valid_to).toBeNull();
    });

    /* ================================================== PHASE 2 - THE LIST RENDERS */

    test('every_request_type_renders_its_own_request_information_columns', async () => {
        const props = baseProps();
        const { getByText } = await mountThenClear(props);

        // change_schedules arm: payroll flags on one side, work / rest day split on the other
        expect(getByText(/Work Days: mon, tue, wed/)).toBeInTheDocument();
        expect(getByText(/Rest Days: thu, fri, sat, sun/)).toBeInTheDocument();
        // alter_logs arm: new punch pair and old punch pair
        expect(getByText('In: 09:00')).toBeInTheDocument();
        expect(getByText('Out: 18:00')).toBeInTheDocument();
        expect(getByText('In: 08:00')).toBeInTheDocument();
        expect(getByText('Out: 17:00')).toBeInTheDocument();
        // alter_log_punches arm: whole timelog strings
        expect(getByText(/Timelog: 08:15 \/ 12:00 \/ 13:00 \/ 18:30/)).toBeInTheDocument();
        expect(getByText(/Timelog: 08:00 \/ 12:00 \/ 13:00 \/ 17:00/)).toBeInTheDocument();
        // rest_day_works arm
        expect(getByText('From: 2026-07-11 08:00')).toBeInTheDocument();
        expect(getByText('To: 2026-07-11 17:00')).toBeInTheDocument();
        // overtimes arm
        expect(getByText('18:00')).toBeInTheDocument();
        expect(getByText('20:00')).toBeInTheDocument();
    });

    test('only_the_payroll_allowances_switched_on_are_listed_for_a_change_schedule_request', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        const infoCell = container.querySelectorAll('tbody tr')[0].querySelectorAll('td')[4];
        expect(infoCell.textContent).toContain('Late,');
        expect(infoCell.textContent).toContain('Night Differential,');
        // allow_undertime is '0' so it must not be advertised as granted
        expect(infoCell.textContent).not.toContain('Undertime');
    });

    test('an_unrecognised_payroll_flag_from_the_server_renders_a_bare_comma_instead_of_being_skipped_FINDING_MTAR_EVAL_1', async () => {
        const row = {
            ...ROWS[0], id: 31,
            fifth_column: { allow_late: '1', allow_holiday_premium: '1' },
        };
        const props = baseProps({ requestList: listResult({ data: [row] }) });
        const { container } = await mountThenClear(props);

        const infoCell = container.querySelectorAll('tbody tr')[0].querySelectorAll('td')[4];
        // FINDING MTAR-EVAL-1 (characterised): the label is resolved with
        //   eval('payroll_items.' + key)
        // over keys that come straight from the API. An unknown key evaluates to undefined and
        // React renders the trailing comma on its own, so the cell reads "Late,," . Beyond the
        // cosmetic defect this is a dynamic eval over server-controlled identifiers.
        expect(infoCell.textContent).toBe('Late,,');
    });

    test('a_request_type_the_screen_does_not_know_about_renders_no_request_information_at_all', async () => {
        const row = {
            id: 41, table_name: 'leave_requests', status: 'Pending',
            created_by: 'Fay Ong', department_name: 'Finance',
            created_at: '2026-07-20', date_requested: '2026-07-21',
            updated_by: null, updated_at: null, employee_note: null,
            fourth_column: 'ignored', fifth_column: 'ignored',
        };
        const props = baseProps({ requestList: listResult({ data: [row] }) });
        const { container } = await mountThenClear(props);

        const cells = container.querySelectorAll('tbody tr')[0].querySelectorAll('td');
        expect(cells[4].textContent).toBe('');   // fourthColumn never populated
        expect(cells[5].textContent).toBe('');   // fifthColumn never populated
        // the row itself still renders, including a title derived from the table name
        expect(cells[2].textContent).toContain('Leave Request');
    });

    test('the_request_type_column_turns_the_database_table_name_into_a_readable_singular_title', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        const titles = Array.from(container.querySelectorAll('tbody tr'))
            .map((tr) => tr.querySelectorAll('td')[2].querySelector('b').textContent);
        expect(titles).toEqual([
            'Change Schedule', 'Alter Log', 'Alter Log Punch', 'Rest Day Work', 'Overtime',
        ]);
    });

    test('a_cancelled_request_cannot_be_ticked_for_a_bulk_update_while_every_other_row_can', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        expect(container.querySelectorAll('tbody tr').length).toBe(5);
        const boxes = Array.from(container.querySelectorAll('input[name="checkedList"]'));
        expect(boxes.length).toBe(4);
        expect(boxes.map((b) => b.value)).toEqual([
            '21.change_schedules', '22.alter_logs', '23.alter_log_punches', '25.overtimes',
        ]);
    });

    test('each_status_is_shown_with_its_own_badge_styling', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        const statusCells = Array.from(container.querySelectorAll('td.status'));
        const variants = statusCells.map((td) => td.querySelector('span.badge').getAttribute('data-variant'));
        expect(variants).toEqual(['secondary', 'success', 'danger', 'dark', 'secondary']);
        expect(statusCells[0].textContent).toBe('Pending');
        expect(statusCells[3].textContent).toBe('Canceled');
    });

    test('a_status_the_badge_switch_does_not_recognise_renders_no_badge_at_all', async () => {
        const row = { ...ROWS[4], id: 51, status: 'For Review' };
        const props = baseProps({ requestList: listResult({ data: [row] }) });
        const { container } = await mountThenClear(props);

        const statusCell = container.querySelector('td.status');
        // the Status helper falls through its switch and returns an empty array
        expect(statusCell.querySelector('span.badge')).toBeNull();
        expect(statusCell.textContent).toBe('');
        // ...but the row is still tickable, because only "Canceled" suppresses the checkbox
        expect(container.querySelectorAll('input[name="checkedList"]').length).toBe(1);
    });

    test('an_employee_note_is_only_shown_for_the_requests_that_carry_one', async () => {
        const props = baseProps();
        const { container, getByText } = await mountThenClear(props);

        expect(getByText(/shifting to a 4-day week/)).toBeInTheDocument();
        const rows = container.querySelectorAll('tbody tr');
        expect(rows[0].querySelectorAll('td')[2].textContent).toContain('NOTE:');
        expect(rows[1].querySelectorAll('td')[2].textContent).not.toContain('NOTE:');
    });

    test('each_row_deep_links_to_the_detail_screen_of_its_own_request_type', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        const links = Array.from(container.querySelectorAll('a.nav-link'));
        expect(links.map((a) => a.getAttribute('href'))).toEqual([
            '/app/team/ChangeSchedule/21',
            '/app/team/AlterLog/22',
            '/app/team/AlterLogPunch/23',
            '/app/team/RestDayWork/24',
            '/app/team/Overtime/25',
        ]);
    });

    test('an_empty_result_replaces_the_whole_table_with_the_no_record_message_and_hides_the_pager_and_the_record_count', async () => {
        const props = baseProps({ requestList: listResult({ data: [] }) });
        const { container, getByText, queryByText } = await mountThenClear(props);

        expect(getByText(/Sorry, No Record Found/)).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
        expect(container.querySelector('[data-testid="paginate"]')).toBeNull();
        expect(queryByText(/Showing 1 to 5 of 15 entries/)).toBeNull();
        // the filter bar survives so the supervisor can widen the search
        expect(btn(container, 'Filter')).toBeTruthy();
        expect(container.querySelector('select[name="bulk_action"]')).toBeTruthy();
    });

    test('the_department_dropdown_is_empty_on_first_paint_and_only_fills_in_on_the_next_render_FINDING_MTAR_DEPT_2', async () => {
        const props = baseProps();
        const { container, rerender } = await mountThenClear(props);

        // FINDING MTAR-DEPT-2 (characterised): the department list arrives inside requestList
        // but is copied into component state by componentDidUpdate, which never runs for the
        // first paint. The supervisor's very first look at the screen offers no departments.
        expect(container.querySelectorAll('select[name="department_id"] option').length).toBe(1);

        // The second paint below is forced with a rerender of byte-identical props. That is the
        // real componentDidUpdate branch, but not the real production trigger: in the app the
        // second paint comes from a redux store update. What this proves is "one paint is not
        // enough", which is the finding; it does not model the store round trip.

        rerender(<MemoryRouter><MyTeamAllRequest {...props} /></MemoryRouter>);
        await flush();

        const options = container.querySelectorAll('select[name="department_id"] option');
        expect(options.length).toBe(3);
        expect(options[1].label).toBe('Information Technology');
        expect(options[2].label).toBe('Operations');
    });

    test('an_empty_department_list_from_the_server_leaves_the_dropdown_with_only_the_placeholder', async () => {
        const props = baseProps({ requestList: listResult({ department: [] }) });
        const { container, rerender } = await mountThenClear(props);

        // same caveat as the test above: the rerender forces componentDidUpdate directly rather
        // than reproducing the redux prop change that triggers it in production.
        rerender(<MemoryRouter><MyTeamAllRequest {...props} /></MemoryRouter>);
        await flush();

        // componentDidUpdate only stores the list when departments.length > 0
        const options = container.querySelectorAll('select[name="department_id"] option');
        expect(options.length).toBe(1);
        expect(options[0].label).toBe('- Department -');
    });

    test('the_status_counters_show_the_cached_totals_once_they_are_loaded_and_zero_before_that', async () => {
        const loaded = await mountThenClear(baseProps());
        expect(btn(loaded.container, 'Pending').textContent).toContain('4');
        expect(btn(loaded.container, 'Approved').textContent).toContain('2');
        expect(btn(loaded.container, 'Cancelled').textContent).toContain('1');
        expect(btn(loaded.container, 'Declined').textContent).toContain('3');
        loaded.unmount();

        const cold = await mountThenClear(baseProps({
            isNumbersLoaded: false, statusNumbers: { pending: 4, approved: 2 },
        }));
        expect(btn(cold.container, 'Pending').textContent).toContain('0');
        expect(btn(cold.container, 'Approved').textContent).toContain('0');
    });

    test('a_counter_the_server_omitted_falls_back_to_zero_rather_than_printing_undefined', async () => {
        const { container } = await mountThenClear(baseProps({ statusNumbers: { pending: 9 } }));

        expect(btn(container, 'Pending').textContent).toContain('9');
        expect(btn(container, 'Approved').textContent).toContain('0');
        expect(btn(container, 'Cancelled').textContent).toContain('0');
        expect(btn(container, 'Declined').textContent).toContain('0');
        expect(container.textContent).not.toContain('undefined');
    });

    /* ================================================== PHASE 3 - FILTERING THE LIST */

    test('each_of_the_four_status_filters_reloads_the_list_with_that_status_from_page_one', async () => {
        const props = baseProps({ filters: { page: 7 } });
        const { container } = await mountThenClear(props);

        const map = [['Approved', 'approved'], ['Cancelled', 'canceled'],
                     ['Declined', 'declined'], ['Pending', 'pending']];
        for (const [label, value] of map) {
            await act(async () => { fireEvent.click(btn(container, label)); });
            await flush();
            const sent = lastFetchArgs(props);
            expect(sent.status).toBe(value);
            expect(sent.page).toBe(1);           // a status change always restarts at page 1
            expect(sent.request_type).toBe('alteration');
        }
        expect(props.fetchRequestList).toHaveBeenCalledTimes(4);
    });

    test('the_status_filter_buttons_show_which_status_is_currently_applied', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        const checked = () => Array.from(container.querySelectorAll('button.toggle-btn'))
            .filter((b) => b.getAttribute('data-checked') === 'true')
            .map((b) => b.textContent.replace(/[^A-Za-z]/g, ''));

        expect(checked()).toEqual(['Pending']);

        await act(async () => { fireEvent.click(btn(container, 'Declined')); });
        await flush();
        expect(checked()).toEqual(['Declined']);
    });

    test('every_request_type_tab_reloads_the_list_for_its_own_type_starting_from_page_one', async () => {
        const props = baseProps({ filters: { page: 5 } });
        const { getByTestId } = await mountThenClear(props);

        const tabs = ['all', 'alteration', 'overtime', 'rest_day_work',
                      'change_schedule', 'alter_logs_punches'];
        for (const key of tabs) {
            await act(async () => { fireEvent.click(getByTestId('tab-' + key)); });
            await flush();
            expect(lastFetchArgs(props).request_type).toBe(key);
            expect(lastFetchArgs(props).page).toBe(1);
        }
        expect(props.fetchRequestList).toHaveBeenCalledTimes(6);
    });

    test('the_request_type_tabs_are_not_gated_by_feature_access_on_this_screen', async () => {
        Authenticator.scanFeature.mockImplementation(() => false);
        Authenticator.scanLevel.mockImplementation(() => false);
        const props = baseProps();
        const { getByTestId } = await mountThenClear(props);

        // unlike My Team Requests, no tab on this screen consults Authenticator at all
        ['all', 'alteration', 'overtime', 'rest_day_work',
         'change_schedule', 'alter_logs_punches'].forEach((key) => {
            expect(getByTestId('tab-' + key)).toBeInTheDocument();
        });
        expect(Authenticator.scanFeature).not.toHaveBeenCalled();
    });

    test('choosing_a_department_and_pressing_filter_reloads_that_department_from_page_one_and_clears_any_pending_bulk_action', async () => {
        const props = baseProps();
        const { container, rerender } = await mountThenClear(props);
        // second paint so the department options exist at all (see FINDING MTAR-DEPT-2)
        rerender(<MemoryRouter><MyTeamAllRequest {...props} /></MemoryRouter>);
        await flush();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department_id"]'),
                { target: { value: '6' } });
        });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        const sent = lastFetchArgs(props);
        expect(sent.department_id).toBe('6');
        expect(sent.page).toBe(1);
        expect(sent.status).toBe('pending');          // the status filter is preserved
        expect(sent.request_type).toBe('alteration'); // and so is the active tab
        expect(sent.action).toBeUndefined();          // action was blanked, so it is dropped
        expect(props.bulkRequest).not.toHaveBeenCalled();
    });

    test('pressing_filter_without_touching_anything_reloads_the_current_filters_unchanged', async () => {
        const props = baseProps({ filters: { status: 'approved', name: 'reyes', page: 3 } });
        const { container } = await mountThenClear(props);

        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.status).toBe('approved');
        expect(sent.name).toBe('reyes');
        expect(sent.page).toBe(1);   // Filter always restarts the paging
    });

    // REMOVED 05-Aug-2026: a test claimed the name box is broken because the markup says
    // <input type="textfield">. That was a jsdom artifact, not an application defect. jsdom 11
    // (this client's version) returns "textfield" from input.type unnormalized; the HTML spec
    // makes `type` an enumerated attribute limited to known values, so every real browser returns
    // "text" and React's change tracking works normally. The deleted test therefore only measured
    // jsdom, and it would have FAILED the day a developer correctly changed the markup to
    // type="text" - the exact opposite of what a regression test should do.

    test('a_date_range_that_starts_before_it_ends_is_accepted_and_sent_to_the_server_as_plain_dates', async () => {
        const props = baseProps();
        const { container, getByTestId } = await mountThenClear(props);

        await act(async () => {
            fireEvent.change(getByTestId('date-valid_from'), { target: { value: '2026-07-01' } });
        });
        await flush();
        await act(async () => {
            fireEvent.change(getByTestId('date-valid_to'), { target: { value: '2026-07-20' } });
        });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        const sent = lastFetchArgs(props);
        expect(sent.valid_from).toBe('2026-07-01');
        expect(sent.valid_to).toBe('2026-07-20');
    });

    test('a_date_range_whose_start_is_after_its_end_is_rejected_and_never_reaches_the_server', async () => {
        const props = baseProps();
        const { container, getByTestId } = await mountThenClear(props);

        await act(async () => {
            fireEvent.change(getByTestId('date-valid_from'), { target: { value: '2026-07-20' } });
        });
        await flush();
        await act(async () => {
            fireEvent.change(getByTestId('date-valid_to'), { target: { value: '2026-07-01' } });
        });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();
        await flush();

        // Yup: valid_from.max(ref valid_to) and valid_to.min(ref valid_from) both fail
        expect(props.fetchRequestList).not.toHaveBeenCalled();
        expect(props.bulkRequest).not.toHaveBeenCalled();
    });

    test('turning_show_all_on_widens_the_search_to_the_whole_division_and_drops_the_chosen_department', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        await act(async () => {
            fireEvent.click(container.querySelector('input.showall_checkbox'));
        });
        await flush();

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        const sent = lastFetchArgs(props);
        expect(sent.showall).toBe(1);
        expect(sent.departmentselect).toBe(1);
        expect(sent.department_id).toBeUndefined();  // nulled, so it is stripped from the payload
        expect(sent.page).toBe(1);
        expect(sent.action).toBeUndefined();
    });

    test('turning_show_all_off_again_narrows_the_search_back_to_the_handled_departments', async () => {
        const props = baseProps({ filters: { showall: 1 } });
        const { container } = await mountThenClear(props);

        const box = container.querySelector('input.showall_checkbox');
        expect(box.checked).toBe(true);

        await act(async () => { fireEvent.click(box); });
        await flush();

        expect(lastFetchArgs(props).showall).toBe(0);
    });

    test('a_supervisor_who_is_not_a_division_head_or_hr_never_sees_the_show_all_switch', async () => {
        Authenticator.scanLevel.mockImplementation(() => false);
        const props = baseProps();
        const { container } = await mountThenClear(props);

        expect(container.querySelector('input.showall_checkbox')).toBeNull();
        expect(Authenticator.scanLevel)
            .toHaveBeenCalledWith(['DivisionHead', 'Division Head', 'HR']);
    });

    test('moving_to_another_page_keeps_every_active_filter_and_only_changes_the_page', async () => {
        const props = baseProps({ filters: { status: 'approved' }, requesttype: 'overtime' });
        const { getByTestId } = await mountThenClear(props);

        await act(async () => { fireEvent.click(getByTestId('page-3')); });
        await flush();

        const sent = lastFetchArgs(props);
        expect(sent.page).toBe(3);
        expect(sent.status).toBe('approved');
        expect(sent.request_type).toBe('overtime');
    });

    /* ============================================ PHASE 4 - APPROVING AND DECLINING */

    test('ticking_select_all_selects_every_non_cancelled_request_and_unticking_it_clears_the_selection', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        const selectAll = container.querySelector('input[name="isAll"]');
        const boxes = () => Array.from(container.querySelectorAll('input[name="checkedList"]'));

        expect(boxes().every((b) => b.checked === false)).toBe(true);

        await act(async () => { fireEvent.click(selectAll); });
        await flush();
        expect(boxes().filter((b) => b.checked).map((b) => b.value)).toEqual([
            '21.change_schedules', '22.alter_logs', '23.alter_log_punches', '25.overtimes',
        ]);

        await act(async () => { fireEvent.click(selectAll); });
        await flush();
        expect(boxes().filter((b) => b.checked).length).toBe(0);
    });

    test('ticking_a_single_request_selects_only_that_request', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        const boxes = container.querySelectorAll('input[name="checkedList"]');
        await act(async () => { fireEvent.click(boxes[3]); });
        await flush();

        const after = Array.from(container.querySelectorAll('input[name="checkedList"]'));
        expect(after.filter((b) => b.checked).map((b) => b.value)).toEqual(['25.overtimes']);
    });

    test('approving_the_ticked_requests_posts_them_to_the_bulk_endpoint_and_then_reloads_the_list_with_the_same_query', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        await act(async () => {
            fireEvent.click(container.querySelector('input[name="checkedList"][value="22.alter_logs"]'));
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
        expect(sent.url).toBe('my_team_requests');
        expect(sent.action).toBe('bulk_action');
        expect(sent.bulk_action).toBe('approve');
        expect(sent.checkedList).toEqual(['22.alter_logs']);
        // the refresh reuses the exact payload the bulk update was made with
        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(props.fetchRequestList.mock.calls[0][0]).toEqual(sent);
    });

    test('declining_every_ticked_request_sends_deny_for_the_whole_selection', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        await act(async () => {
            fireEvent.click(container.querySelector('input[name="isAll"]'));
        });
        await flush();
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="bulk_action"]'),
                { target: { value: 'deny' } });
        });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        const sent = props.bulkRequest.mock.calls[0][0];
        expect(sent.bulk_action).toBe('deny');
        expect(sent.checkedList).toEqual([
            '21.change_schedules', '22.alter_logs', '23.alter_log_punches', '25.overtimes',
        ]);
    });

    test('pressing_update_with_nothing_ticked_and_no_action_chosen_still_fires_the_bulk_endpoint_FINDING_MTAR_BULK_1', async () => {
        const props = baseProps();
        const { container } = await mountThenClear(props);

        expect(container.querySelectorAll('input[name="checkedList"]:checked').length).toBe(0);
        expect(container.querySelector('select[name="bulk_action"]').value).toBe('');

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        // FINDING MTAR-BULK-1 (characterised, not endorsed): the Update button writes
        // action="bulk_action" in its onClick, but the submit that the same click triggers is
        // validated against the values Formik held BEFORE that write. The conditional Yup rules
        // ("Select a record to be updated" / "Please choose action") are therefore not armed
        // for this click, and the bulk endpoint is called with an empty selection and no action.
        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        const sent = props.bulkRequest.mock.calls[0][0];
        expect(sent.checkedList).toEqual([]);
        expect(sent.bulk_action).toBeUndefined();
        // and the guard message only appears AFTER the call has already gone out, which is
        // precisely backwards - the supervisor is told to choose an action they already applied.
        expect(container.textContent).toContain('Please choose action');
    });

    test('once_a_bulk_action_is_already_pending_an_empty_selection_is_rejected_with_both_validation_messages', async () => {
        // the other arm of MTAR-BULK-1: when action is ALREADY "bulk_action" at validation
        // time the conditional rules do arm, and the request is refused.
        const props = baseProps({
            filters: { action: 'bulk_action', checkedList: [], bulk_action: null },
        });
        const { container, getByText } = await mountThenClear(props);

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.bulkRequest).not.toHaveBeenCalled();
        expect(props.fetchRequestList).not.toHaveBeenCalled();
        expect(getByText('Select a record to be updated')).toBeInTheDocument();
        expect(getByText('Please choose action')).toBeInTheDocument();
    });

    test('once_a_bulk_action_is_already_pending_a_complete_selection_passes_validation_and_is_submitted', async () => {
        const props = baseProps({
            filters: {
                action: 'bulk_action',
                checkedList: ['21.change_schedules'],
                bulk_action: 'approve',
            },
        });
        const { container } = await mountThenClear(props);

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(container.querySelector('.input-feedback')).toBeNull();
        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        expect(props.bulkRequest.mock.calls[0][0].checkedList).toEqual(['21.change_schedules']);
    });

    // HANDLER-LEVEL: a rejected bulkRequest cannot be produced deterministically from the UI
    // alone, so onSubmitHandler is invoked directly here. The UI-driven version of the same
    // failure is the MTAR-MUT-1 test immediately below.
    test('a_bulk_update_that_the_server_rejects_is_swallowed_and_the_list_is_not_refreshed', async () => {
        const props = baseProps({
            bulkRequest: jest.fn(() => Promise.reject(new Error('500 Internal Server Error'))),
        });
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const ref = React.createRef();
        await mountThenClear(props, ref);

        await act(async () => {
            await ref.current.onSubmitHandler({
                action: 'bulk_action', bulk_action: 'approve',
                checkedList: ['21.change_schedules'], page: 1,
                valid_from: null, valid_to: null,
            });
        });

        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        expect(props.fetchRequestList).not.toHaveBeenCalled();
        expect(errSpy).toHaveBeenCalledWith('Bulk request failed:', expect.any(Error));
        errSpy.mockRestore();
    });

    test('a_bulk_update_the_server_rejects_still_wipes_the_supervisors_ticks_and_the_retry_goes_out_empty_FINDING_MTAR_MUT_1', async () => {
        const props = baseProps({
            bulkRequest: jest.fn(() => Promise.reject(new Error('500 Internal Server Error'))),
        });
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { container } = await mountThenClear(props);

        // tick two requests and choose Deny through the real UI
        await act(async () => {
            fireEvent.click(container.querySelector('input[name="checkedList"][value="21.change_schedules"]'));
        });
        await flush();
        await act(async () => {
            fireEvent.click(container.querySelector('input[name="checkedList"][value="22.alter_logs"]'));
        });
        await flush();
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="bulk_action"]'),
                { target: { value: 'deny' } });
        });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        // the server refused, so nothing was updated and the list was not reloaded
        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        expect(props.bulkRequest.mock.calls[0][0].checkedList)
            .toEqual(['21.change_schedules', '22.alter_logs']);
        expect(props.fetchRequestList).not.toHaveBeenCalled();

        // FINDING MTAR-MUT-1 (characterised, not endorsed): the reset lives AFTER the try/catch
        // and mutates the Formik values object in place, so the failure silently costs the
        // supervisor their selection - the ticks are gone and no error is shown anywhere.
        expect(container.querySelectorAll('input[name="checkedList"]:checked').length).toBe(0);
        expect(container.textContent).not.toContain('500');

        // ...so the obvious reaction - press Update again - posts an empty selection.
        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.bulkRequest).toHaveBeenCalledTimes(2);
        expect(props.bulkRequest.mock.calls[1][0].checkedList).toEqual([]);
        expect(props.bulkRequest.mock.calls[1][0].bulk_action).toBe('deny');
        errSpy.mockRestore();
    });

    // HANDLER-LEVEL: onSubmitHandler is called directly, so this proves the reset the handler
    // performs on the values object it was handed - not what the screen shows afterwards.
    test('a_successful_bulk_update_posts_then_reloads_and_empties_the_values_object_it_was_given', async () => {
        const props = baseProps();
        const ref = React.createRef();
        await mountThenClear(props, ref);

        const values = {
            action: 'bulk_action', bulk_action: 'approve',
            checkedList: ['25.overtimes'], page: 1,
        };
        await act(async () => { await ref.current.onSubmitHandler(values); });

        expect(props.bulkRequest).toHaveBeenCalledTimes(1);
        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(values.checkedList).toEqual([]);
        expect(values.action).toBe('');
    });

    test('a_plain_filter_submit_formats_the_date_range_drops_blank_filters_and_never_touches_the_bulk_endpoint', async () => {
        const props = baseProps();
        const ref = React.createRef();
        await mountThenClear(props, ref);

        await act(async () => {
            await ref.current.onSubmitHandler({
                action: '', status: 'approved', name: '', department_id: null,
                checked: 'transient-ui-only', page: 2, showall: 0,
                valid_from: new Date('2026-06-16T00:00:00'),
                valid_to:   new Date('2026-06-30T00:00:00'),
            });
        });

        expect(props.bulkRequest).not.toHaveBeenCalled();
        // Exhaustive: toEqual pins the whole payload, so the absent keys are asserted too -
        //   name        '' is dropped (blank)
        //   department_id / action   null and '' are dropped
        //   checked     hits the `case "checked": break;` arm. That arm is dead defensive code:
        //               this screen owns no `checked` field, the key is supplied here only to
        //               execute the branch. It is not evidence of a live defect.
        const sent = props.fetchRequestList.mock.calls[0][0];
        expect(sent).toEqual({
            url: 'my_team_requests', status: 'approved', page: 2, showall: 0,
            valid_from: '2026-06-16', valid_to: '2026-06-30',
        });
    });

    // REMOVED 05-Aug-2026: a test asserted "the bulk branch posts a stray `checked` value that the
    // filter branch strips" and was labelled a finding (MTAR-CHK-1). The asymmetry in the switch is
    // real, but this screen has no Formik field called `checked` - the form's fields are status,
    // valid_from, valid_to, department_id, name, page, use_filter, showall, departmentselect,
    // checkedList, isAll, action, request_type, bulk_action, first_load and url. The key only ever
    // existed because the test hand-built it and passed it straight to onSubmitHandler, so the
    // "defect" cannot occur in production. The `case "checked": break;` arm is dead defensive code
    // carried over from a sibling screen, not a live bug.

    test('a_list_reload_the_server_rejects_is_swallowed_so_the_screen_stays_on_the_previous_results', async () => {
        const props = baseProps();
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const ref = React.createRef();
        const utils = await mountThenClear(props, ref);
        // only the reload the supervisor triggers fails; the mount fetch already succeeded
        props.fetchRequestList.mockImplementationOnce(
            () => Promise.reject(new Error('network down')));

        await act(async () => {
            await ref.current.onSubmitHandler({ action: '', status: 'declined', page: 1 });
        });

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(errSpy).toHaveBeenCalledWith('Fetch request list failed:', expect.any(Error));
        expect(utils.getByText('My Team Overall Request')).toBeInTheDocument();
        errSpy.mockRestore();
    });

    test('a_zero_valued_filter_is_still_forwarded_because_only_null_and_blank_values_are_dropped', async () => {
        const props = baseProps();
        const ref = React.createRef();
        await mountThenClear(props, ref);

        await act(async () => {
            await ref.current.onSubmitHandler({
                action: '', showall: 0, use_filter: 0, isAll: false,
                departmentselect: 1, page: 1, name: null,
            });
        });

        const sent = props.fetchRequestList.mock.calls[0][0];
        expect(sent.showall).toBe(0);
        expect(sent.use_filter).toBe(0);
        expect(sent.isAll).toBe(false);
        expect(sent.name).toBeUndefined();
    });
});
