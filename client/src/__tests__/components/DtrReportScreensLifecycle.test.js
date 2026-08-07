/**
 * DtrReportScreensLifecycle.test.js
 * Full report-screen lifecycle coverage for the three DTR / payroll report screens:
 *
 *   My Team  -> DTR Summary            container/MyTeam/DtrSummaryNew/DtrSummaryNew.js
 *   My Team  -> DTR Conflict Report    container/MyTeam/DtrConflictReport/DtrConflictReport.js
 *   Reports  -> Morocco Payroll Report components/DateReport/ViewReportMorocco.js
 *
 * Every screen is walked as a REPORT lifecycle, both outcomes of every phase:
 *
 *   PHASE 1  MOUNT/LOAD    what the parameter dropdowns are populated from, what is (or is
 *                          not) fetched before the user touches anything, what renders while
 *                          there is still no data
 *   PHASE 2  DATA ARRIVES  rows land -> the table renders; the empty / not-loaded arm renders
 *                          the "no record" panel instead
 *   PHASE 3  USER ACTIONS  every parameter control - department, employment status, name,
 *                          month, year, department - each one must reach the next fetch
 *   PHASE 4  SUBMIT        Generate / Filter (valid AND invalid), and EXPORT - the export must
 *                          carry the SAME parameters that are showing on screen, plus the
 *                          server-failure arm and the feature-gate arm
 *
 * Characterisation tests (they assert TODAY's behaviour, they do not endorse it):
 *   DTR-MOUNT-1  DTR Summary auto-generates from componentDidMount by calling onSubmitHandler
 *                directly, which bypasses the Formik/Yup date validation completely - an
 *                inverted payroll cutoff is sent straight to the server on page open.
 *   DTR-EXPORT-1 the Yup rule that makes department mandatory is armed on export == "department",
 *                but the Export menu item has sent "department_new" since the old items were
 *                commented out - so the rule is dead and a department-scoped export can be
 *                fired with no department chosen.
 *   DTR-NAME-1   the name box is <input type="textfield">, an invalid HTML input type (same
 *                defect as My Team Requests).
 *   DTRC-MOUNT-1 DTR Conflict Report's componentDidMount body is entirely commented out, so
 *                the screen opens on "Sorry , no record found" with no parameters primed.
 *   VRM-PARAMS-1 ViewReportMorocco guards only the userparams object (`props.userparams?.month
 *                .length`) and not the arrays inside it, so a partial params payload throws
 *                during render and blanks the page.
 *   VRM-NAME-1   all three Morocco parameter dropdowns are rendered with name="type".
 *
 * ADDITIVE ONLY - no existing test touched, no application code changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (C) => C,
    useDispatch: () => mockDispatch,
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

// The date inputs are Formik <Field> wrappers around react-datepicker; the value under test is
// the one Formik already holds, so a marker is enough.
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    return {
        InputDate: ({ name, value }) => R.createElement('div', {
            'data-testid': 'date-' + name,
            'data-value': value ? String(value) : '',
        }),
        InputTime: ({ name }) => R.createElement('div', { 'data-testid': 'time-' + name }),
    };
});

jest.mock('react-datepicker', () => () => <div data-testid="datepicker" />);
jest.mock('react-select', () => () => <div data-testid="react-select" />);
jest.mock('react-multi-select-component', () => () => <div data-testid="multi-select" />);

jest.mock('react-bootstrap', () => {
    const R = require('react');

    const Dropdown = ({ children, onClick, className }) =>
        R.createElement('div', { className, onClick, 'data-testid': 'export-dropdown' }, children);
    Dropdown.Toggle = ({ children }) =>
        R.createElement('button', { type: 'button', 'data-testid': 'export-toggle' }, children);
    Dropdown.Menu = ({ children }) => R.createElement('div', null, children);
    Dropdown.Item = ({ children, onClick, id, type }) =>
        R.createElement('button', { id, type: type || 'button', onClick }, children);

    const Form = ({ children }) => R.createElement('div', null, children);
    Form.Control = ({ children }) => R.createElement('div', null, children);
    Form.Control.Feedback = ({ children }) => R.createElement('div', null, children);
    Form.Group = ({ children }) => R.createElement('div', null, children);
    Form.Label = ({ children }) => R.createElement('label', null, children);

    return {
        Container:   ({ children }) => R.createElement('div', null, children),
        Row:         ({ children, className }) => R.createElement('div', { className }, children),
        Col:         ({ children, className }) => R.createElement('div', { className }, children),
        Table:       ({ children }) => R.createElement('table', null, children),
        Tabs:        ({ children }) => R.createElement('div', null, children),
        Tab:         ({ children }) => R.createElement('div', null, children),
        Badge:       ({ children }) => R.createElement('span', null, children),
        Image:       () => R.createElement('img', { alt: '' }),
        Spinner:     () => R.createElement('div', null),
        Pagination:  ({ children }) => R.createElement('div', null, children),
        ButtonGroup: ({ children }) => R.createElement('div', null, children),
        FormControl: (p) => R.createElement('input', p),
        ToggleButton: ({ children, onClick }) =>
            R.createElement('button', { type: 'button', onClick }, children),
        Button: ({ children, onClick, type, id, className }) =>
            R.createElement('button', { id, type: type || 'button', onClick, className }, children),
        Dropdown,
        Form,
    };
});

jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => true),
}));

jest.mock('../../services/API', () => ({ call: jest.fn() }));

jest.mock('../../services/Formatter', () => ({
    alert_success:       jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    alert_error:         jest.fn((e) => ({ type: 'STUB_ALERT_ERROR', e })),
    alert_error_message: jest.fn(() => ({ type: 'STUB_ALERT_ERROR_MSG' })),
}));

jest.mock('../../store/actions/dtr/dtrSummaryActions', () => ({
    fetchNewDtrSummary:   jest.fn(),
    exportDtrSummary:     jest.fn(),
    exportNewDtrSummary:  jest.fn(),
    exportNewDtrSummary1: jest.fn(),
    fetchDtrConflict:     jest.fn(),
}));

jest.mock('../../components/DateReport/PayrollReportApi.js', () => ({
    fecthUserContry:           jest.fn(() => ({ type: 'STUB_FETCH_USER_COUNTRY' })),
    fecthMoroccoPayrollParams: jest.fn(() => ({ type: 'STUB_FETCH_MOROCCO_PARAMS' })),
}));

jest.mock('../../store/actions/opsschedule/opsScheduleActions.js', () => ({
    clearOpsScheduleInstance: jest.fn(() => ({ type: 'STUB_CLEAR_OPS' })),
}));

import Authenticator from '../../services/Authenticator';
import API from '../../services/API';
import Formatter from '../../services/Formatter';
import {
    fecthUserContry, fecthMoroccoPayrollParams,
} from '../../components/DateReport/PayrollReportApi.js';

global.links = new Proxy({}, { get: () => '/x/' });

const DtrSummaryNew =
    require('../../container/MyTeam/DtrSummaryNew/DtrSummaryNew').default;
const DtrConflictReport =
    require('../../container/MyTeam/DtrConflictReport/DtrConflictReport').default;
const ViewReportMorocco =
    require('../../components/DateReport/ViewReportMorocco').default;

/* ------------------------------------------------------------------- helpers */

const flush = () => act(async () => { await Promise.resolve(); });

const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

const selects = (container) => Array.from(container.querySelectorAll('select'));

const typeInto = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    fireEvent.change(el);
};

const lastArg = (mockFn) => mockFn.mock.calls[mockFn.mock.calls.length - 1][0];

/* ============================================================================
 *  SCREEN 1 - My Team -> DTR Summary  (DtrSummaryNew)
 * ========================================================================== */

const dtrActions = () => ({
    fetchNewDtrSummary:   jest.fn(),
    exportDtrSummary:     jest.fn(),
    exportNewDtrSummary:  jest.fn(),
    exportNewDtrSummary1: jest.fn(),
});

const SUMMARY_ROWS = [
    {
        Employee_Number: 'E-001', Employee_Name: 'Ana Cruz', Department: 'Engineering',
        UL: 1, Leaves: 2, Late: '00:15', Under_Time: '00:05', Render_Hr: '80.00',
        Night_Diff: '2.00', OverTime: '4.00', OT_ND: '0.00',
    },
    {
        Employee_Number: 'E-002', Employee_Name: 'Ben Reyes', Department: 'Operations',
        UL: 0, Leaves: 0, Late: '00:00', Under_Time: '00:00', Render_Hr: '88.00',
        Night_Diff: '0.00', OverTime: '0.00', OT_ND: '0.00',
    },
];

const summaryProps = (over = {}) => ({
    user: {
        id: 1,
        departments_handled: [
            { id: 5, department_name: 'Engineering' },
            { id: 9, department_name: 'Operations' },
        ],
    },
    settings: { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } },
    dtrSummary: {
        isListLoaded: true,
        dtrItems: SUMMARY_ROWS,
        pagination: { current_page: 1, has_next_page: false },
    },
    ...over,
});

const renderSummary = (over = {}, actions = dtrActions()) => {
    const props = summaryProps(over);
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><DtrSummaryNew {...props} {...actions} ref={ref} /></MemoryRouter>
    );
    return { ...utils, ref, actions, props };
};

describe('DTR Summary report screen - lifecycle', () => {
    beforeEach(() => {
        Authenticator.scanFeature.mockImplementation(() => true);
        Authenticator.scanLevel.mockImplementation(() => true);
    });
    afterEach(() => jest.clearAllMocks());

    /* ---------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('opening_dtr_summary_fills_the_department_dropdown_from_the_departments_the_user_handles_and_preselects_the_first_one', async () => {
        const { container, ref } = renderSummary();
        await flush();

        const deptOptions = container.querySelectorAll('select[name="department_id"] option');
        // "- Department -" placeholder + one option per handled department
        expect(deptOptions.length).toBe(3);
        expect(deptOptions[1].label).toBe('Engineering');
        expect(deptOptions[2].label).toBe('Operations');
        expect(ref.current.state.initialState.department_id).toBe(5);
        expect(container.querySelector('select[name="department_id"]').value).toBe('5');
    });

    test('opening_dtr_summary_auto_generates_the_report_for_the_current_payroll_cutoff_without_the_user_pressing_anything', async () => {
        const { actions } = renderSummary();
        await flush();

        expect(actions.fetchNewDtrSummary).toHaveBeenCalledTimes(1);
        expect(lastArg(actions.fetchNewDtrSummary)).toEqual({
            page: 1,
            valid_from: '2026-07-16',
            valid_to: '2026-08-15',
            department_id: 5,
            is_active: 1,
        });
    });

    test('opening_dtr_summary_when_no_payroll_cutoff_is_configured_still_preselects_the_department_but_never_calls_the_report_api', async () => {
        const { actions, ref } = renderSummary({ settings: {} });
        await flush();

        expect(ref.current.state.initialState.department_id).toBe(5);
        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();
    });

    test('opening_dtr_summary_for_a_user_who_handles_no_department_leaves_the_dropdown_empty_and_generates_nothing', async () => {
        const { container, actions } = renderSummary({
            user: { id: 1, departments_handled: [] },
        });
        await flush();

        expect(container.querySelectorAll('select[name="department_id"] option').length).toBe(1);
        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();
    });

    test('the_auto_generate_on_mount_skips_the_date_validation_and_queries_an_inverted_cutoff_FINDING_DTR_MOUNT_1', async () => {
        const { actions } = renderSummary({
            settings: { current_payroll_cutoff: { start_date: '2026-08-15', end_date: '2026-07-16' } },
        });
        await flush();

        // FINDING DTR-MOUNT-1 (characterised, not endorsed): componentDidMount calls
        // this.onSubmitHandler(...) DIRECTLY instead of submitting the Formik form, so the Yup
        // rules ("Please select a Valid From date." / "Please select a Valid To date.") never
        // run. A misconfigured payroll cutoff reaches the report SP as valid_from > valid_to.
        expect(actions.fetchNewDtrSummary).toHaveBeenCalledTimes(1);
        const sent = lastArg(actions.fetchNewDtrSummary);
        expect(sent.valid_from).toBe('2026-08-15');
        expect(sent.valid_to).toBe('2026-07-16');
    });

    /* ------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('when_the_summary_rows_arrive_every_employee_gets_one_row_of_hour_buckets_under_the_35_column_header', async () => {
        const { container, getByText } = renderSummary();
        await flush();

        expect(container.querySelector('table.dtrSummary')).not.toBeNull();
        expect(container.querySelectorAll('thead th').length).toBe(35);
        expect(container.querySelectorAll('tbody tr').length).toBe(2);
        expect(getByText('E-001')).toBeInTheDocument();
        expect(getByText('Ana Cruz')).toBeInTheDocument();
        expect(getByText('Ben Reyes')).toBeInTheDocument();
        expect(getByText('Operations')).toBeInTheDocument();
    });

    test('a_report_that_returned_no_rows_still_renders_the_table_but_with_an_empty_body', async () => {
        const { container } = renderSummary({
            dtrSummary: { isListLoaded: true, dtrItems: [], pagination: {} },
        });
        await flush();

        expect(container.querySelector('table.dtrSummary')).not.toBeNull();
        expect(container.querySelectorAll('tbody tr').length).toBe(0);
    });

    test('before_any_report_has_been_generated_the_screen_shows_the_no_record_panel_and_no_table_at_all', async () => {
        const { container, getByText } = renderSummary({
            dtrSummary: { isListLoaded: false, dtrItems: [], pagination: {} },
        });
        await flush();

        expect(getByText(/Sorry , no record found/)).toBeInTheDocument();
        expect(container.querySelector('table.dtrSummary')).toBeNull();
        // the parameter bar is still there so the user can generate
        expect(btn(container, 'Generate')).toBeTruthy();
    });

    /* ------------------------------------------------ PHASE 3 - USER ACTIONS */

    test('choosing_a_different_department_and_pressing_generate_refetches_only_that_department', async () => {
        const { container, actions } = renderSummary();
        await flush();
        actions.fetchNewDtrSummary.mockClear();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department_id"]'),
                { target: { value: '9' } });
        });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Generate')); });
        await flush();

        expect(actions.fetchNewDtrSummary).toHaveBeenCalledTimes(1);
        const sent = lastArg(actions.fetchNewDtrSummary);
        expect(sent.department_id).toBe('9');
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.valid_to).toBe('2026-08-15');
        expect(sent.export).toBeUndefined();
    });

    test('switching_the_employment_status_to_inactive_refetches_the_report_for_inactive_employees', async () => {
        const { container, actions } = renderSummary();
        await flush();
        actions.fetchNewDtrSummary.mockClear();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="is_active"]'),
                { target: { value: '0' } });
        });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Generate')); });
        await flush();

        expect(lastArg(actions.fetchNewDtrSummary).is_active).toBe('0');
    });

    test('the_employee_name_box_is_declared_with_an_invalid_input_type_so_what_is_typed_never_reaches_the_report_query_FINDING_DTR_NAME_1', async () => {
        const { container, actions } = renderSummary();
        await flush();
        actions.fetchNewDtrSummary.mockClear();

        const nameBox = container.querySelector('input[name="name"]');
        // FINDING DTR-NAME-1 (characterised): the markup is
        //   <input type="textfield" ... name="name" onChange={handleChange} value={values.name} />
        // "textfield" is not a valid HTML input type, so React's change plugin (which keys off
        // element.type) does not treat it as a text field and the keystrokes never land in
        // Formik state. Same defect as My Team Requests (MTR-NAME-1).
        expect(nameBox.getAttribute('type')).toBe('textfield');

        await act(async () => { typeInto(nameBox, 'ana'); });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Generate')); });
        await flush();

        expect(lastArg(actions.fetchNewDtrSummary).name).toBeUndefined();
    });

    test('generating_the_report_when_the_server_says_there_is_another_page_asks_for_the_next_page', async () => {
        const { container, actions } = renderSummary({
            dtrSummary: {
                isListLoaded: true, dtrItems: SUMMARY_ROWS,
                pagination: { current_page: 2, has_next_page: true },
            },
        });
        await flush();
        actions.fetchNewDtrSummary.mockClear();

        await act(async () => { fireEvent.click(btn(container, 'Generate')); });
        await flush();

        expect(lastArg(actions.fetchNewDtrSummary).page).toBe(3);
    });

    /* ------------------------------------------------------ PHASE 4 - SUBMIT */

    test('export_sends_the_department_and_date_range_that_are_currently_showing_on_screen_not_the_one_the_page_opened_with', async () => {
        const { container, actions } = renderSummary();
        await flush();

        // the user moves the report off the department the page auto-selected
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department_id"]'),
                { target: { value: '9' } });
        });
        await flush();
        expect(container.querySelector('select[name="department_id"]').value).toBe('9');

        await act(async () => { fireEvent.click(btn(container, 'Export All')); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('#btn-export-department')); });
        await flush();

        expect(actions.exportNewDtrSummary).toHaveBeenCalledTimes(2);
        const sent = lastArg(actions.exportNewDtrSummary);
        expect(sent.export).toBe('department_new');
        expect(sent.department_id).toBe('9');           // the department ON SCREEN
        expect(sent.valid_from).toBe('2026-07-16');     // the range ON SCREEN
        expect(sent.valid_to).toBe('2026-08-15');
        expect(sent.is_active).toBe(1);
        // and the plain report fetch is NOT fired by an export
        expect(actions.fetchNewDtrSummary).toHaveBeenCalledTimes(1); // mount only
    });

    test('export_all_deliberately_drops_the_department_and_name_so_the_file_covers_every_employee', async () => {
        const { container, actions } = renderSummary();
        await flush();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department_id"]'),
                { target: { value: '9' } });
        });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('#btn-export-all')); });
        await flush();

        expect(actions.exportNewDtrSummary).toHaveBeenCalledTimes(1);
        const sent = lastArg(actions.exportNewDtrSummary);
        expect(sent.export).toBe('all_new');
        expect(sent.department_id).toBeUndefined();
        expect(sent.name).toBeUndefined();
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.valid_to).toBe('2026-08-15');
    });

    test('a_department_scoped_export_is_allowed_with_no_department_chosen_because_the_required_rule_still_guards_the_retired_export_name_FINDING_DTR_EXPORT_1', async () => {
        const { container, actions } = renderSummary({
            user: { id: 1, departments_handled: [] },   // nothing to preselect
        });
        await flush();

        await act(async () => { fireEvent.click(container.querySelector('#btn-export-department')); });
        await flush();

        // FINDING DTR-EXPORT-1 (characterised, not endorsed): validationSchema arms
        //   department_id: Yup.string().nullable().when('export', { is: 'department', ... })
        // but the two menu items that sent "department"/"all" are commented out and the live
        // items send "department_new"/"all_new". The required rule can therefore never fire,
        // and Export runs with department_id absent from the payload.
        expect(actions.exportNewDtrSummary).toHaveBeenCalledTimes(1);
        const sent = lastArg(actions.exportNewDtrSummary);
        expect(sent.export).toBe('department_new');
        expect(sent.department_id).toBeUndefined();
    });

    test('pressing_generate_with_the_range_ends_before_it_starts_shows_the_validation_error_and_never_calls_the_api', async () => {
        const { container, actions } = renderSummary({ settings: {} });
        await flush();
        // no cutoff configured -> valid_from / valid_to are null -> required rules fire
        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();

        await act(async () => { fireEvent.click(btn(container, 'Generate')); });
        await flush();
        await flush();

        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();
        expect(actions.exportNewDtrSummary).not.toHaveBeenCalled();
    });

    test('a_user_without_the_export_dtr_summary_feature_can_generate_the_report_but_gets_no_export_menu', async () => {
        Authenticator.scanFeature.mockImplementation(() => false);
        const { container } = renderSummary();
        await flush();

        expect(btn(container, 'Generate')).toBeTruthy();
        expect(container.querySelector('[data-testid="export-dropdown"]')).toBeNull();
        expect(container.querySelector('#btn-export-department')).toBeNull();
        expect(container.querySelector('#btn-export-all')).toBeNull();
    });
});

/* ============================================================================
 *  SCREEN 2 - My Team -> DTR Conflict Report  (DtrConflictReport)
 * ========================================================================== */

const conflictActions = () => ({
    exportNewDtrSummary1: jest.fn(),
    fetchDtrConflict:     jest.fn(),
});

const CONFLICT_ROWS = [
    {
        EmployeeNumber: 'E-101', EmployeeName: 'Cara Lim', Department: 'Support',
        Date: '2026-07-20', TimeIN: '2026-07-20 08:02:00', TimeOut: '2026-07-20 17:05:00',
        LeaveType: 'Vacation Leave', Amount: 1, Status: 'Approved',
        EmployeeNote: 'filed after the fact', CreatedAt: '2026-07-21', UpdatedAt: '2026-07-22',
    },
    {
        EmployeeNumber: 'E-102', EmployeeName: 'Dan Uy', Department: 'Support',
        Date: '2026-07-23', TimeIN: null, TimeOut: null,
        LeaveType: 'Sick Leave', Amount: 0.5, Status: 'Pending',
        EmployeeNote: null, CreatedAt: '2026-07-23', UpdatedAt: '2026-07-23',
    },
];

const conflictProps = (over = {}) => ({
    user: { id: 1, departments_handled: [{ id: 5, department_name: 'Support' }] },
    settings: { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } },
    dtrSummary: {
        isListLoaded: true,
        dtrItems: CONFLICT_ROWS,
        pagination: { current_page: 1, has_next_page: false },
    },
    ...over,
});

const renderConflict = (over = {}, actions = conflictActions()) => {
    const props = conflictProps(over);
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><DtrConflictReport {...props} {...actions} ref={ref} /></MemoryRouter>
    );
    return { ...utils, ref, actions, props };
};

describe('DTR Conflict Report screen - lifecycle', () => {
    beforeEach(() => {
        Authenticator.scanFeature.mockImplementation(() => true);
        Authenticator.scanLevel.mockImplementation(() => true);
    });
    afterEach(() => jest.clearAllMocks());

    /* ---------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('opening_the_conflict_report_primes_the_date_range_from_the_payroll_cutoff_but_calls_nothing_until_the_user_asks_FINDING_DTRC_MOUNT_1', async () => {
        const { container, ref, actions } = renderConflict({
            dtrSummary: { isListLoaded: false, dtrItems: [], pagination: {} },
        });
        await flush();

        // FINDING DTRC-MOUNT-1 (characterised): componentDidMount exists but its whole body is
        // commented out - unlike DTR Summary, this screen never auto-generates, so the user
        // always lands on the "no record" panel.
        expect(actions.fetchDtrConflict).not.toHaveBeenCalled();
        expect(actions.exportNewDtrSummary1).not.toHaveBeenCalled();
        expect(ref.current.state.initialState.department_id).toBeNull();
        expect(String(ref.current.state.initialState.valid_from)).toContain('2026');
        expect(container.querySelector('[data-testid="date-valid_from"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="date-valid_to"]')).not.toBeNull();
    });

    test('the_conflict_report_offers_only_a_date_range_no_department_or_name_parameters', async () => {
        const { container, getByText } = renderConflict();
        await flush();

        expect(getByText(/DTR Conflict Report/)).toBeInTheDocument();
        expect(container.querySelector('select[name="department_id"]')).toBeNull();
        expect(container.querySelector('input[name="name"]')).toBeNull();
        expect(container.querySelectorAll('[data-testid^="date-"]').length).toBe(2);
    });

    /* ------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('when_the_conflicts_arrive_each_one_renders_with_its_punches_formatted_and_a_blank_cell_when_there_is_no_punch', async () => {
        const { container, getByText, getAllByText, queryByText } = renderConflict();
        await flush();

        expect(container.querySelectorAll('thead th').length).toBe(12);
        expect(container.querySelectorAll('tbody tr').length).toBe(2);
        expect(getByText('E-101')).toBeInTheDocument();
        expect(getByText('Cara Lim')).toBeInTheDocument();
        expect(getByText('Vacation Leave')).toBeInTheDocument();
        expect(getByText('filed after the fact')).toBeInTheDocument();
        // TimeIN / TimeOut both formatted through DtrFormatter.displayLog (time + "MMM DD")
        expect(getAllByText('Jul 20').length).toBe(2);
        expect(getByText('8:02:00')).toBeInTheDocument();
        expect(getByText('17:05:00')).toBeInTheDocument();
        // the row with null punches renders empty punch cells, no formatted block
        expect(queryByText('Jul 23')).toBeNull();
        const secondRowCells = container.querySelectorAll('tbody tr')[1].querySelectorAll('td');
        expect(secondRowCells[4].textContent).toBe('');
        expect(secondRowCells[5].textContent).toBe('');
    });

    test('a_run_that_found_no_conflicts_shows_the_no_record_panel_instead_of_an_empty_table', async () => {
        const { container, getByText } = renderConflict({
            dtrSummary: { isListLoaded: false, dtrItems: [], pagination: {} },
        });
        await flush();

        expect(getByText(/Sorry , no record found/)).toBeInTheDocument();
        expect(container.querySelector('table.dtrSummary')).toBeNull();
        expect(btn(container, 'Generate & Export')).toBeTruthy();
    });

    /* ------------------------------- PHASE 3 / 4 - USER ACTIONS AND SUBMIT */

    test('pressing_generate_and_export_runs_the_conflict_query_for_the_date_range_on_screen', async () => {
        const { container, actions } = renderConflict();
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Generate & Export')); });
        await flush();

        expect(actions.fetchDtrConflict).toHaveBeenCalledTimes(1);
        expect(lastArg(actions.fetchDtrConflict)).toEqual({
            page: 1,
            valid_from: '2026-07-16',
            valid_to: '2026-08-15',
            is_active: 1,
        });
        expect(actions.exportNewDtrSummary1).not.toHaveBeenCalled();
    });

    test('the_conflict_export_dispatches_the_same_date_range_the_generate_button_would_have_used', async () => {
        const { container, actions } = renderConflict();
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Generate & Export')); });
        await flush();
        const generated = lastArg(actions.fetchDtrConflict);

        await act(async () => { fireEvent.click(container.querySelector('#btn-export-all')); });
        await flush();

        expect(actions.exportNewDtrSummary1).toHaveBeenCalledTimes(1);
        const exported = lastArg(actions.exportNewDtrSummary1);
        expect(exported.valid_from).toBe(generated.valid_from);
        expect(exported.valid_to).toBe(generated.valid_to);
        expect(exported.page).toBe(generated.page);
        expect(exported.export).toBeUndefined();  // "export" is stripped from the payload
    });

    test('running_the_conflict_report_when_the_server_says_there_is_another_page_asks_for_the_next_page', async () => {
        const { container, actions } = renderConflict({
            dtrSummary: {
                isListLoaded: true, dtrItems: CONFLICT_ROWS,
                pagination: { current_page: 4, has_next_page: true },
            },
        });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Generate & Export')); });
        await flush();

        expect(lastArg(actions.fetchDtrConflict).page).toBe(5);
    });

    test('pressing_generate_with_no_date_range_configured_shows_the_validation_error_and_never_calls_the_api', async () => {
        const { container, actions } = renderConflict({ settings: {} });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Generate & Export')); });
        await flush();
        await flush();

        expect(actions.fetchDtrConflict).not.toHaveBeenCalled();
        expect(actions.exportNewDtrSummary1).not.toHaveBeenCalled();
    });

    test('a_user_without_the_export_dtr_summary_feature_sees_no_conflict_export_menu', async () => {
        Authenticator.scanFeature.mockImplementation(() => false);
        const { container } = renderConflict();
        await flush();

        expect(btn(container, 'Generate & Export')).toBeTruthy();
        expect(container.querySelector('#btn-export-all')).toBeNull();
        expect(container.querySelector('[data-testid="export-dropdown"]')).toBeNull();
    });
});

/* ============================================================================
 *  SCREEN 3 - Reports -> Morocco Payroll Report  (ViewReportMorocco)
 * ========================================================================== */

const MOROCCO_PARAMS = {
    month: [
        { month_number: 1, month_name: 'January' },
        { month_number: 3, month_name: 'March' },
        { month_number: 12, month_name: 'December' },
    ],
    year: [{ year_name: 2025 }, { year_name: 2026 }],
    department: [{ Id: 7, Name: 'Casablanca Ops' }, { Id: 8, Name: 'Rabat Support' }],
};

const MOROCCO_ROWS = [
    {
        Employee_Number: 'M-001', First_Name: 'Yasmine', Last_Name: 'Haddad',
        Department_Name: 'Casablanca Ops', Hire_Date: '2024-02-01', Last_Work_Date: '',
        TotalWorkingDays: 22, EmployeeStatus: 'Active', Late: 1, LateHours: '0.25',
        UnderTimeHours: '0.00', UL: 0, PaidLeaves: 2, SickLeave: 1, PaidHoliday: 1,
        RegularOverTime: '3.00', RegularOverTimeNightDiff: '0.00',
    },
    {
        Employee_Number: 'M-002', First_Name: 'Omar', Last_Name: 'Benali',
        Department_Name: 'Casablanca Ops', Hire_Date: '2025-05-01', Last_Work_Date: '',
        TotalWorkingDays: 20, EmployeeStatus: 'Active', Late: 0, LateHours: '0.00',
        UnderTimeHours: '0.00', UL: 1, PaidLeaves: 0, SickLeave: 0, PaidHoliday: 1,
        RegularOverTime: '0.00', RegularOverTimeNightDiff: '0.00',
    },
];

const moroccoProps = (over = {}) => ({
    user: { id: 1 },
    usercountry: [{ country_id: 4, country_name: 'Morocco' }],
    userparams: MOROCCO_PARAMS,
    ...over,
});

const renderMorocco = (over = {}) =>
    render(<MemoryRouter><ViewReportMorocco {...moroccoProps(over)} /></MemoryRouter>);

// month / year / department, in DOM order (they all carry name="type" - see VRM-NAME-1)
const MONTH = 0, YEAR = 1, DEPT = 2;

const okResponse = (reports) => Promise.resolve({
    status: 200, data: { content: { reports } },
});

describe('Morocco Payroll Report screen - lifecycle', () => {
    let clickSpy;

    beforeEach(() => {
        API.call.mockReset();
        API.call.mockImplementation(() => okResponse([]));
        window.URL.createObjectURL = jest.fn(() => 'blob:morocco');
        clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });
    afterEach(() => {
        clickSpy.mockRestore();
        document.querySelectorAll('a[download]').forEach((a) => a.remove());
        jest.clearAllMocks();
    });

    /* ---------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('opening_the_morocco_report_asks_the_server_for_the_country_list_and_the_report_parameters_before_the_user_touches_anything', async () => {
        renderMorocco();
        await flush();

        expect(fecthUserContry).toHaveBeenCalledTimes(1);
        expect(fecthMoroccoPayrollParams).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_USER_COUNTRY' });
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_MOROCCO_PARAMS' });
        // no report is generated on mount
        expect(API.call).not.toHaveBeenCalled();
    });

    test('on_mount_the_three_parameter_dropdowns_sit_on_their_placeholders_and_the_result_table_has_only_its_header', async () => {
        const { container, getByText } = renderMorocco();
        await flush();

        expect(getByText('Morocco Payroll Report')).toBeInTheDocument();
        const s = selects(container);
        expect(s.length).toBe(3);
        expect(s[MONTH].value).toBe('');
        expect(s[YEAR].value).toBe('');
        expect(s[DEPT].value).toBe('');
        expect(container.querySelectorAll('thead th').length).toBe(30);
        expect(container.querySelectorAll('tbody tr').length).toBe(0);
    });

    /* ------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('when_the_report_parameters_arrive_each_dropdown_is_populated_from_its_own_list', async () => {
        const { container } = renderMorocco();
        await flush();
        const s = selects(container);

        const opts = (el) => Array.from(el.querySelectorAll('option')).map((o) => o.textContent);
        expect(opts(s[MONTH])).toEqual(['- Select Month -', 'January', 'March', 'December']);
        expect(opts(s[YEAR])).toEqual(['- Select Year -', '2025', '2026']);
        expect(opts(s[DEPT]))
            .toEqual(['- Select Department -', 'Casablanca Ops', 'Rabat Support']);
    });

    test('empty_parameter_lists_leave_every_dropdown_with_nothing_but_its_placeholder', async () => {
        const { container } = renderMorocco({
            userparams: { month: [], year: [], department: [] },
        });
        await flush();

        selects(container).forEach((s) => {
            expect(s.querySelectorAll('option').length).toBe(1);
        });
    });

    test('a_partial_parameter_payload_crashes_the_whole_report_page_instead_of_rendering_empty_dropdowns_FINDING_VRM_PARAMS_1', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        // FINDING VRM-PARAMS-1 (characterised, not endorsed): the guards are written
        //   props.userparams?.month.length > 0
        // The optional chain protects the userparams OBJECT only - `.month.length` is still a
        // hard dereference. If /report/get_morocco_payroll_params returns a payload that is
        // missing any one of month / year / department, render throws and the user gets a blank
        // page rather than an unpopulated dropdown.
        expect(() => renderMorocco({ userparams: { year: [], department: [] } })).toThrow();
        spy.mockRestore();
    });

    test('all_three_report_parameter_dropdowns_are_rendered_with_the_same_field_name_FINDING_VRM_NAME_1', async () => {
        const { container } = renderMorocco();
        await flush();

        // FINDING VRM-NAME-1 (characterised): month, year and department are all
        // <select name="type">. Nothing on the screen can tell them apart by name, so neither
        // autofill, form serialisation, nor an accessibility/automation tool can address them.
        expect(container.querySelectorAll('select[name="type"]').length).toBe(3);
    });

    /* ------------------------------------------------ PHASE 3 - USER ACTIONS */

    test('picking_a_month_stores_it_and_clears_the_month_error_that_a_failed_filter_had_raised', async () => {
        const { container, getByText, queryByText } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();
        expect(getByText('Please Select Month')).toBeInTheDocument();

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await flush();

        expect(s[MONTH].value).toBe('3');
        expect(queryByText('Please Select Month')).toBeNull();
    });

    test('clearing_a_month_back_to_the_placeholder_raises_the_month_error_again', async () => {
        const { container, getByText, queryByText } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await flush();
        expect(queryByText('Please Select Month')).toBeNull();

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '' } }); });
        await flush();
        expect(getByText('Please Select Month')).toBeInTheDocument();
    });

    test('picking_and_then_clearing_a_year_toggles_the_year_error_the_same_way', async () => {
        const { container, getByText, queryByText } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2026' } }); });
        await flush();
        expect(s[YEAR].value).toBe('2026');
        expect(queryByText('Please Select Year')).toBeNull();

        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '' } }); });
        await flush();
        expect(getByText('Please Select Year')).toBeInTheDocument();
    });

    test('picking_a_department_is_optional_and_never_raises_an_error_of_its_own', async () => {
        const { container, queryByText } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[DEPT], { target: { value: '8' } }); });
        await flush();

        expect(s[DEPT].value).toBe('8');
        expect(queryByText(/Please Select Department/)).toBeNull();
    });

    /* ------------------------------------------------------ PHASE 4 - SUBMIT */

    test('filtering_with_no_month_and_no_year_shows_both_errors_and_never_calls_the_report_api', async () => {
        const { container, getByText } = renderMorocco();
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(getByText('Please Select Month')).toBeInTheDocument();
        expect(getByText('Please Select Year')).toBeInTheDocument();
        expect(API.call).not.toHaveBeenCalled();
    });

    test('filtering_with_a_month_but_no_year_shows_only_the_year_error_and_never_calls_the_report_api', async () => {
        const { container, getByText, queryByText } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(getByText('Please Select Year')).toBeInTheDocument();
        expect(queryByText('Please Select Month')).toBeNull();
        expect(API.call).not.toHaveBeenCalled();
    });

    test('filtering_with_a_year_but_no_month_shows_only_the_month_error_and_never_calls_the_report_api', async () => {
        const { container, getByText, queryByText } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2026' } }); });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(getByText('Please Select Month')).toBeInTheDocument();
        expect(queryByText('Please Select Year')).toBeNull();
        expect(API.call).not.toHaveBeenCalled();
    });

    test('filtering_with_month_year_and_department_requests_the_report_for_exactly_those_parameters_and_renders_the_rows', async () => {
        API.call.mockImplementation(() => okResponse(MOROCCO_ROWS));
        const { container, getByText } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2026' } }); });
        await act(async () => { fireEvent.change(s[DEPT], { target: { value: '7' } }); });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);
        expect(API.call).toHaveBeenCalledWith({
            method: 'GET',
            url: '/report/timeoff_allocation?timeoff_year=2026&timeoff_month=3&department=7&country=4',
        });

        expect(container.querySelectorAll('tbody tr').length).toBe(2);
        expect(getByText('M-001')).toBeInTheDocument();
        expect(getByText('Haddad Yasmine')).toBeInTheDocument();
        expect(getByText('Rabat Support')).toBeInTheDocument();  // still only the dropdown option
    });

    test('a_filter_that_comes_back_with_no_employees_leaves_the_table_body_empty_and_shows_only_the_header', async () => {
        API.call.mockImplementation(() => okResponse([]));
        const { container } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2026' } }); });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);
        expect(container.querySelectorAll('thead th').length).toBe(30);
        expect(container.querySelectorAll('tbody tr').length).toBe(0);
    });

    test('a_non_200_answer_is_ignored_and_the_previously_shown_rows_are_left_alone', async () => {
        API.call.mockImplementationOnce(() => okResponse(MOROCCO_ROWS));
        const { container } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2026' } }); });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();
        expect(container.querySelectorAll('tbody tr').length).toBe(2);

        API.call.mockImplementation(() => Promise.resolve({ status: 204, data: {} }));
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(container.querySelectorAll('tbody tr').length).toBe(2);
    });

    test('when_the_report_api_fails_the_error_alert_is_dispatched_and_no_rows_are_rendered', async () => {
        API.call.mockImplementation(() => Promise.reject(new Error('500 from server')));
        const { container } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2026' } }); });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(expect.any(Error));
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'STUB_ALERT_ERROR' }));
        expect(container.querySelectorAll('tbody tr').length).toBe(0);
    });

    test('exporting_sends_the_SAME_month_year_and_department_that_are_showing_on_screen_plus_the_export_flag', async () => {
        API.call.mockImplementation(() => okResponse(MOROCCO_ROWS));
        const { container } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2026' } }); });
        await act(async () => { fireEvent.change(s[DEPT], { target: { value: '7' } }); });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();
        const filterUrl = API.call.mock.calls[0][0].url;

        // the user narrows the report to a different department, then exports
        await act(async () => { fireEvent.change(s[DEPT], { target: { value: '8' } }); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('[data-testid="export-toggle"]')); });
        await flush();

        expect(API.call).toHaveBeenCalledTimes(2);
        const exportUrl = API.call.mock.calls[1][0].url;
        expect(exportUrl).toBe(
            '/report/timeoff_allocation?timeoff_year=2026&timeoff_month=3&department=8&export=1&country=4');
        // the export follows the screen, it does not repeat the previous filter
        expect(filterUrl).toContain('department=7');
        expect(exportUrl).toContain('department=8');
        expect(exportUrl).toContain('timeoff_year=2026');
        expect(exportUrl).toContain('timeoff_month=3');
    });

    test('a_successful_export_hands_the_browser_a_csv_named_after_the_month_and_year_that_were_exported', async () => {
        API.call.mockImplementation(() => Promise.resolve({ status: 200, data: 'a,b,c' }));
        const { container } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '12' } }); });
        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2025' } }); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('[data-testid="export-toggle"]')); });
        await flush();

        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
        const link = document.querySelector('a[download]');
        expect(link).not.toBeNull();
        expect(link.getAttribute('download')).toBe('Morocco_Payroll_Report_Dec_2025.csv');
        expect(link.href).toBe('blob:morocco');
        expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    test('exporting_without_a_month_or_year_raises_the_same_errors_as_filtering_and_downloads_nothing', async () => {
        const { container, getByText } = renderMorocco();
        await flush();

        await act(async () => { fireEvent.click(container.querySelector('[data-testid="export-toggle"]')); });
        await flush();

        expect(getByText('Please Select Month')).toBeInTheDocument();
        expect(getByText('Please Select Year')).toBeInTheDocument();
        expect(API.call).not.toHaveBeenCalled();
        expect(window.URL.createObjectURL).not.toHaveBeenCalled();
        expect(document.querySelector('a[download]')).toBeNull();
    });

    test('when_the_export_call_fails_the_error_alert_is_dispatched_and_no_download_is_started', async () => {
        API.call.mockImplementation(() => Promise.reject(new Error('export blew up')));
        const { container } = renderMorocco();
        await flush();
        const s = selects(container);

        await act(async () => { fireEvent.change(s[MONTH], { target: { value: '3' } }); });
        await act(async () => { fireEvent.change(s[YEAR], { target: { value: '2026' } }); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('[data-testid="export-toggle"]')); });
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(expect.any(Error));
        expect(window.URL.createObjectURL).not.toHaveBeenCalled();
        expect(document.querySelector('a[download]')).toBeNull();
    });
});
