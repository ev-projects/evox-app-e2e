/**
 * ReportsParameterLifecycle.test.js
 *
 * The REPORT PARAMETER LIFECYCLE for the three parameter-driven report screens:
 *   - components/DateReport/ViewReport.js            (Reports -> India Payroll Report)
 *   - container/MyTeam/DtrSummaryNew/DtrSummaryNew.js(My Team -> DTR Summary)
 *   - container/MyTeam/DtrConflictReport/...js       (My Team -> DTR Conflict Report)
 *
 * PHASE 1 MOUNT      - which parameter dropdowns are populated, what the screen shows
 *                      before any report has been generated, which lookup calls fire.
 * PHASE 2 DATA       - what renders when rows arrive, and when zero rows arrive.
 * PHASE 3 PARAMETERS - month / year / date-range / department / name / status changes.
 * PHASE 4 SUBMIT     - Generate and Export, valid AND invalid parameter combinations,
 *                      server failure, and the "does Export use the parameters that are
 *                      actually on screen?" check.
 *
 * ADDITIVE ONLY - no existing test is modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
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
jest.mock('react-select', () => () => <div data-testid="react-select" />);
jest.mock('react-datepicker', () => () => <div data-testid="react-datepicker" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name, value }) => (
        <input type="date" name={name} data-testid={`date-${name}`}
               readOnly value={value ? new Date(value).toISOString().slice(0, 10) : ''} />
    ),
    InputTime: ({ name }) => <input type="time" name={name} />,
}));

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const Box = ({ children, onClick, className }) => (
        <div onClick={onClick} className={className}>{children}</div>
    );
    const Button = ({ children, onClick, type, id }) => (
        <button id={id} type={type || 'button'} onClick={onClick}>{children}</button>
    );
    const Dropdown = ({ children, onClick, className }) => (
        <div data-testid="export-dropdown" className={className} onClick={onClick}>{children}</div>
    );
    Dropdown.Toggle = ({ children }) => <span>{children}</span>;
    Dropdown.Menu = Box;
    Dropdown.Item = ({ children, onClick, type, id }) => (
        <button id={id} type={type || 'button'} onClick={onClick}>{children}</button>
    );
    const Form = Box;
    Form.Control = Box;
    Form.Control.Feedback = Box;
    return {
        Row: Box, Col: Box, Container: Box, Tabs: Box, Tab: Box, Badge: Box,
        ToggleButton: Box, ButtonGroup: Box, Pagination: Box, FormControl: Box,
        Table: ({ children }) => <table>{children}</table>,
        Button, Dropdown, Form,
    };
});

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error:   jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
}));
jest.mock('../../components/DateReport/PayrollReportApi.js', () => ({
    fecthUserContry:            jest.fn(() => ({ type: 'STUB_FETCH_COUNTRY' })),
    fecthMoroccoPayrollParams:  jest.fn(() => ({ type: 'STUB_FETCH_MA_PARAMS' })),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));
jest.mock('../../store/actions/dtr/dtrSummaryActions', () => ({
    fetchNewDtrSummary:  jest.fn(), fetchDtrConflict:     jest.fn(),
    exportDtrSummary:    jest.fn(), exportNewDtrSummary:  jest.fn(),
    exportNewDtrSummary1: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import PayrollReportApi from '../../components/DateReport/PayrollReportApi.js';

const ViewReport        = require('../../components/DateReport/ViewReport').default;
const DtrSummaryNew     = require('../../container/MyTeam/DtrSummaryNew/DtrSummaryNew').default;
const DtrConflictReport =
    require('../../container/MyTeam/DtrConflictReport/DtrConflictReport').default;

/* ------------------------------------------------------------------ helpers */

const settle = async () => {
    // Formik 2 validates + submits through promises; give the queue a real tick.
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

const THIS_YEAR = new Date().getFullYear();

function selects(container) { return container.querySelectorAll('select'); }
function bodyRows(container) { return container.querySelectorAll('tbody tr'); }

function chooseMonth(container, month) {
    fireEvent.change(selects(container)[0], { target: { value: String(month) } });
}
function chooseYear(container, year) {
    fireEvent.change(selects(container)[1], { target: { value: String(year) } });
}

const okPayload = (items = [], newHires = []) => ({
    status: 200,
    data: { content: { timeoffItems: items, timeoffItemsnew: newHires } },
});

/* DTR screens ------------------------------------------------------------- */

const dtrActions = () => ({
    fetchNewDtrSummary:   jest.fn(),
    fetchDtrConflict:     jest.fn(),
    exportDtrSummary:     jest.fn(),
    exportNewDtrSummary:  jest.fn(),
    exportNewDtrSummary1: jest.fn(),
});

const CUTOFF = { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } };

const dtrUser = {
    id: 1,
    departments_handled: [
        { id: 5, department_name: 'Engineering' },
        { id: 7, department_name: 'Finance' },
    ],
};

const emptyList = { pagination: { current_page: 1, has_next_page: false }, dtrItems: [] };

function renderDtrSummary(props = {}, actions = dtrActions()) {
    const ref = React.createRef();
    const utils = render(
        <DtrSummaryNew ref={ref} user={dtrUser} settings={CUTOFF}
                       dtrSummary={emptyList} {...actions} {...props} />
    );
    return { ...utils, ref, actions };
}

function renderConflict(props = {}, actions = dtrActions()) {
    const ref = React.createRef();
    const utils = render(
        <DtrConflictReport ref={ref} user={dtrUser} settings={CUTOFF}
                           dtrSummary={emptyList} {...actions} {...props} />
    );
    return { ...utils, ref, actions };
}

async function pressGenerate(container) {
    fireEvent.click(container.querySelector('#btn-generate'));  // arms export=false and submits
    await settle();
}

async function pressExport(container, itemId) {
    fireEvent.click(container.querySelector(itemId));           // arms the export mode and submits
    await settle();
}

/**
 * The Name box is declared as <input type="textfield"> - not a valid HTML input type.
 * A real browser normalises that to "text", so React wires its change plugin and typing
 * works. jsdom keeps the literal "textfield", React skips the input, and a plain
 * fireEvent.change is swallowed. See FINDING_RPT_NAME_INPUT_TYPE. To still model a real
 * user typing a name we set the value and fire the component's own change handler.
 */
function typeName(container, value) {
    const input = container.querySelector('input[name="name"]');
    const handlersKey = Object.keys(input).find((k) => k.startsWith('__reactEventHandlers'));
    input.value = value;
    act(() => { input[handlersKey].onChange({ target: input, currentTarget: input, persist() {} }); });
    return input;
}

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockResolvedValue(okPayload());
    window.URL.createObjectURL = jest.fn(() => 'blob:csv');
});

/* ===================================================================== */
/* India Payroll Report - month + year parameters                         */
/* ===================================================================== */

describe('India Payroll Report - parameter lifecycle', () => {

    // ---------------------------------------------------------- PHASE 1
    test('opening_the_report_offers_every_year_from_2024_to_this_year_and_asks_the_server_for_the_user_country', () => {
        const { container } = render(<ViewReport user={{ id: 1 }} />);

        const yearOptions = Array.from(selects(container)[1].querySelectorAll('option'))
            .map((o) => o.value).filter(Boolean);
        const expected = [];
        for (let y = 2024; y <= THIS_YEAR; y++) expected.push(String(y));
        expect(yearOptions).toEqual(expected.slice().reverse()); // newest year first
        expect(PayrollReportApi.fecthUserContry).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_COUNTRY' });
    });

    test('before_any_report_is_generated_the_table_is_empty_and_no_report_call_has_been_made', () => {
        const { container } = render(<ViewReport user={{ id: 1 }} />);

        expect(bodyRows(container).length).toBe(0);
        expect(API.call).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------- PHASE 3
    test('picking_a_month_and_a_year_changes_only_the_screen_and_calls_no_server_until_generate_is_pressed', () => {
        const { container } = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(container, 7);
        chooseYear(container, THIS_YEAR);

        expect(selects(container)[0].value).toBe('7');
        expect(selects(container)[1].value).toBe(String(THIS_YEAR));
        expect(API.call).not.toHaveBeenCalled();
    });

    test('clearing_the_month_back_to_the_placeholder_immediately_flags_the_missing_month', () => {
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(utils.container, 7);
        expect(utils.queryByText('Please Select Month')).toBeNull();

        chooseMonth(utils.container, '');
        utils.getByText('Please Select Month');
    });

    // ---------------------------------------------------------- PHASE 4 invalid
    test('generating_with_no_month_and_no_year_shows_both_errors_and_never_calls_the_report_api', () => {
        const utils = render(<ViewReport user={{ id: 1 }} />);

        fireEvent.click(utils.getByText(/Filter/));

        utils.getByText('Please Select Month');
        utils.getByText('Please Select Year');
        expect(API.call).not.toHaveBeenCalled();
    });

    test('generating_with_only_the_year_chosen_is_still_blocked_by_the_missing_month', async () => {
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        utils.getByText('Please Select Month');
        expect(utils.queryByText('Please Select Year')).toBeNull();
        expect(API.call).not.toHaveBeenCalled();
    });

    test('generating_with_only_the_month_chosen_is_still_blocked_by_the_missing_year', async () => {
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(utils.container, 3);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        utils.getByText('Please Select Year');
        expect(utils.queryByText('Please Select Month')).toBeNull();
        expect(API.call).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------- PHASE 4 happy + PHASE 2
    test('generating_with_a_month_and_a_year_asks_the_server_for_exactly_those_parameters_and_lists_the_returned_employees', async () => {
        API.call.mockResolvedValue(okPayload(
            [{ Sno: 1, Employee_Name: 'Asha Rao' }, { Sno: 2, Employee_Name: 'Ben Kaur' }]
        ));
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(utils.container, 7);
        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        expect(API.call).toHaveBeenCalledTimes(1);
        const url = API.call.mock.calls[0][0].url;
        expect(url).toContain('timeoff_month=7');
        expect(url).toContain(`timeoff_year=${THIS_YEAR}`);
        expect(url).not.toContain('export=1');
        expect(bodyRows(utils.container).length).toBe(2);
        utils.getByText('Asha Rao');
    });

    test('a_report_that_lists_new_hires_shows_the_new_hire_band_with_the_cutoff_dates_of_the_chosen_month', async () => {
        API.call.mockResolvedValue(okPayload(
            [{ Sno: 1, Employee_Name: 'Asha Rao' }],
            [{ Sno: 2, Employee_Name: 'Nina New' }]
        ));
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(utils.container, 7);
        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        utils.getByText(/NEW HIRE \(Jun 21 - Jul 20\)/);
        utils.getByText('Nina New');
    });

    test('changing_the_month_after_a_report_and_generating_again_refetches_for_the_new_month_only', async () => {
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(utils.container, 7);
        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        chooseMonth(utils.container, 8);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        expect(API.call).toHaveBeenCalledTimes(2);
        expect(API.call.mock.calls[1][0].url).toContain('timeoff_month=8');
        expect(API.call.mock.calls[1][0].url).not.toContain('timeoff_month=7');
    });

    // ---------------------------------------------------------- empty + failure arms
    test('a_month_with_no_payroll_data_leaves_the_table_empty_and_shows_no_error', async () => {
        API.call.mockResolvedValue(okPayload([], []));
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(utils.container, 7);
        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        expect(bodyRows(utils.container).length).toBe(0);
        expect(utils.queryByText(/NEW HIRE/)).toBeNull();
        expect(Formatter.alert_error).not.toHaveBeenCalled();
    });

    test('a_server_that_answers_with_an_error_status_leaves_the_previous_table_untouched', async () => {
        API.call.mockResolvedValue({ status: 500, data: {} });
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(utils.container, 7);
        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        expect(bodyRows(utils.container).length).toBe(0);
    });

    test('when_the_report_call_is_rejected_the_screen_raises_the_error_alert_and_shows_no_rows', async () => {
        API.call.mockRejectedValue(new Error('HTTP 500'));
        const utils = render(<ViewReport user={{ id: 1 }} />);

        chooseMonth(utils.container, 7);
        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByText(/Filter/));
        await settle();

        expect(Formatter.alert_error).toHaveBeenCalled();
        expect(bodyRows(utils.container).length).toBe(0);
    });

    // ---------------------------------------------------------- export parameters
    test('exporting_without_choosing_the_parameters_shows_the_same_errors_and_downloads_nothing', () => {
        const utils = render(<ViewReport user={{ id: 1 }} />);

        fireEvent.click(utils.getByTestId('export-dropdown'));

        utils.getByText('Please Select Month');
        utils.getByText('Please Select Year');
        expect(API.call).not.toHaveBeenCalled();
    });

    test('exporting_uses_the_month_and_year_currently_shown_on_screen_not_the_ones_last_generated', async () => {
        const downloads = [];
        const realCreate = document.createElement.bind(document);
        const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = realCreate(tag);
            if (tag === 'a') el.click = () => downloads.push(el.getAttribute('download'));
            return el;
        });

        const utils = render(<ViewReport user={{ id: 1 }} />);
        chooseMonth(utils.container, 7);
        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByText(/Filter/));      // generated for July
        await settle();

        chooseMonth(utils.container, 9);                 // the user now looks at September
        fireEvent.click(utils.getByTestId('export-dropdown'));
        await settle();

        const exportUrl = API.call.mock.calls[API.call.mock.calls.length - 1][0].url;
        expect(exportUrl).toContain('export=1');
        expect(exportUrl).toContain('timeoff_month=9');   // matches the dropdown on screen
        expect(exportUrl).toContain(`timeoff_year=${THIS_YEAR}`);
        expect(downloads[0]).toBe(`India_Payroll_Report_Sep_${THIS_YEAR}.csv`);
        spy.mockRestore();
    });

    test('an_export_that_fails_raises_the_error_alert_and_downloads_no_file', async () => {
        const downloads = [];
        const realCreate = document.createElement.bind(document);
        const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = realCreate(tag);
            if (tag === 'a') el.click = () => downloads.push('clicked');
            return el;
        });
        API.call.mockRejectedValue(new Error('gateway down'));

        const utils = render(<ViewReport user={{ id: 1 }} />);
        chooseMonth(utils.container, 7);
        chooseYear(utils.container, THIS_YEAR);
        fireEvent.click(utils.getByTestId('export-dropdown'));
        await settle();

        expect(Formatter.alert_error).toHaveBeenCalled();
        expect(downloads.length).toBe(0);
        spy.mockRestore();
    });
});

/* ===================================================================== */
/* DTR Summary - date range + department + name + status parameters       */
/* ===================================================================== */

describe('DTR Summary - parameter lifecycle', () => {

    // ---------------------------------------------------------- PHASE 1
    test('opening_dtr_summary_preselects_the_current_payroll_cutoff_and_the_first_department_handled_then_loads_that_report', () => {
        const { ref, actions, container } = renderDtrSummary();

        expect(container.querySelector('[data-testid="date-valid_from"]').value).toBe('2026-07-16');
        expect(container.querySelector('[data-testid="date-valid_to"]').value).toBe('2026-08-15');
        expect(ref.current.state.initialState.department_id).toBe(5);
        expect(actions.fetchNewDtrSummary).toHaveBeenCalledTimes(1);

        const sent = actions.fetchNewDtrSummary.mock.calls[0][0];
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.valid_to).toBe('2026-08-15');
        expect(sent.department_id).toBe(5);
        expect(sent.is_active).toBe(1);
        expect(sent.page).toBe(1);
    });

    test('the_department_dropdown_lists_every_department_the_manager_handles', () => {
        const { container } = renderDtrSummary();

        const deptOptions = Array.from(selects(container)[0].querySelectorAll('option'))
            .map((o) => o.getAttribute('label'));
        expect(deptOptions).toEqual(['- Department -', 'Engineering', 'Finance']);
    });

    test('without_a_payroll_cutoff_configured_the_dates_stay_empty_and_no_report_is_loaded_on_open', () => {
        const { actions, container } = renderDtrSummary({ settings: {} });

        expect(container.querySelector('[data-testid="date-valid_from"]').value).toBe('');
        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();
    });

    test('a_manager_who_handles_no_department_gets_no_automatic_report_on_open', () => {
        const { actions } = renderDtrSummary({ user: { id: 2, departments_handled: [] } });

        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------- PHASE 2
    test('until_results_arrive_the_screen_says_sorry_no_record_found', () => {
        const utils = renderDtrSummary();

        utils.getByText(/Sorry , no record found/);
        expect(bodyRows(utils.container).length).toBe(0);
    });

    test('when_the_report_comes_back_the_screen_lists_one_row_per_employee_instead_of_the_no_record_message', () => {
        const utils = renderDtrSummary({
            dtrSummary: {
                isListLoaded: true,
                pagination: { current_page: 1, has_next_page: false },
                dtrItems: [
                    { Employee_Number: 'E1', Employee_Name: 'Asha Rao', Department: 'Engineering' },
                    { Employee_Number: 'E2', Employee_Name: 'Ben Kaur', Department: 'Engineering' },
                ],
            },
        });

        expect(utils.queryByText(/Sorry , no record found/)).toBeNull();
        expect(bodyRows(utils.container).length).toBe(2);
        utils.getByText('Asha Rao');
    });

    test('a_report_that_loads_with_zero_matching_employees_shows_an_empty_table_and_no_error', () => {
        const utils = renderDtrSummary({
            dtrSummary: {
                isListLoaded: true,
                pagination: { current_page: 1, has_next_page: false },
                dtrItems: [],
            },
        });

        expect(bodyRows(utils.container).length).toBe(0);
        expect(utils.queryByText(/Sorry , no record found/)).toBeNull();
    });

    // ---------------------------------------------------------- PHASE 3 + 4
    test('choosing_a_different_department_and_pressing_generate_refetches_for_that_department_only', async () => {
        const { container, actions } = renderDtrSummary();
        actions.fetchNewDtrSummary.mockClear();

        fireEvent.change(selects(container)[0], { target: { value: '7' } });
        await pressGenerate(container);

        expect(actions.fetchNewDtrSummary).toHaveBeenCalledTimes(1);
        expect(actions.fetchNewDtrSummary.mock.calls[0][0].department_id).toBe('7');
    });

    test('typing_a_name_and_pressing_generate_sends_that_name_as_a_filter', async () => {
        const { container, actions } = renderDtrSummary();
        actions.fetchNewDtrSummary.mockClear();

        typeName(container, 'Asha');
        await pressGenerate(container);

        expect(actions.fetchNewDtrSummary.mock.calls[0][0].name).toBe('Asha');
    });

    test('the_name_box_is_declared_with_an_invalid_input_type_FINDING_RPT_NAME_INPUT_TYPE', () => {
        const { container } = renderDtrSummary();

        // FINDING: type="textfield" is not an HTML input type. Browsers silently fall back
        // to "text" so the box works today, but nothing guarantees that fallback.
        expect(container.querySelector('input[name="name"]').getAttribute('type')).toBe('textfield');
    });

    test('switching_the_employment_status_to_inactive_asks_the_server_for_inactive_employees', async () => {
        const { container, actions } = renderDtrSummary();
        actions.fetchNewDtrSummary.mockClear();

        fireEvent.change(selects(container)[1], { target: { value: '0' } });
        await pressGenerate(container);

        expect(actions.fetchNewDtrSummary.mock.calls[0][0].is_active).toBe('0');
    });

    test('generating_with_an_empty_date_range_is_rejected_before_any_server_call', async () => {
        const { container, actions } = renderDtrSummary({ settings: {} });
        actions.fetchNewDtrSummary.mockClear();

        await pressGenerate(container);

        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();
    });

    test('generating_with_a_from_date_later_than_the_to_date_is_rejected_before_any_server_call', async () => {
        const { container, actions } = renderDtrSummary({
            settings: { current_payroll_cutoff: { start_date: '2026-08-15', end_date: '2026-07-16' } },
        });
        actions.fetchNewDtrSummary.mockClear();

        await pressGenerate(container);

        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------- export parameters
    test('exporting_the_department_report_sends_the_same_department_and_date_range_that_are_on_screen', async () => {
        const { container, actions } = renderDtrSummary();

        fireEvent.change(selects(container)[0], { target: { value: '7' } });
        await pressExport(container, '#btn-export-department');

        expect(actions.exportNewDtrSummary).toHaveBeenCalledTimes(1);
        const sent = actions.exportNewDtrSummary.mock.calls[0][0];
        expect(sent.department_id).toBe('7');
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.valid_to).toBe('2026-08-15');
        expect(sent.export).toBe('department_new');
    });

    test('exporting_all_departments_deliberately_drops_the_department_filter_but_keeps_the_date_range', async () => {
        const { container, actions } = renderDtrSummary();

        fireEvent.change(selects(container)[0], { target: { value: '7' } });
        await pressExport(container, '#btn-export-all');

        expect(actions.exportNewDtrSummary).toHaveBeenCalledTimes(1);
        const sent = actions.exportNewDtrSummary.mock.calls[0][0];
        expect(sent.department_id).toBeUndefined();
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.export).toBe('all_new');
    });

    test('exporting_with_an_empty_date_range_is_rejected_and_no_export_is_started', async () => {
        const { container, actions } = renderDtrSummary({ settings: {} });

        await pressExport(container, '#btn-export-department');

        expect(actions.exportNewDtrSummary).not.toHaveBeenCalled();
    });

    test('exporting_silently_ignores_the_name_search_that_is_filtering_the_screen_FINDING_RPT_EXPORT_NAME', async () => {
        const { container, actions } = renderDtrSummary();
        actions.fetchNewDtrSummary.mockClear();

        typeName(container, 'Asha');
        await pressGenerate(container);
        expect(actions.fetchNewDtrSummary.mock.calls[0][0].name).toBe('Asha'); // screen is filtered

        await pressExport(container, '#btn-export-department');

        // FINDING: the export drops "name", so the downloaded file holds the whole
        // department while the screen shows only the employees matching "Asha".
        expect(actions.exportNewDtrSummary.mock.calls[0][0].name).toBeUndefined();
    });

    test('changing_a_parameter_while_the_previous_report_had_a_next_page_generates_page_two_instead_of_page_one_FINDING_RPT_PAGE_BUMP', async () => {
        const { container, actions } = renderDtrSummary({
            dtrSummary: {
                pagination: { current_page: 1, has_next_page: true },
                dtrItems: [],
            },
        });
        actions.fetchNewDtrSummary.mockClear();

        fireEvent.change(selects(container)[0], { target: { value: '7' } });
        await pressGenerate(container);

        // FINDING: a brand new filter should start at page 1; the has_next_page bump
        // is applied to a fresh Generate as well, so page 1 of Finance is skipped.
        expect(actions.fetchNewDtrSummary.mock.calls[0][0].page).toBe(2);
    });
});

/* ===================================================================== */
/* DTR Conflict Report - date range only                                  */
/* ===================================================================== */

describe('DTR Conflict Report - parameter lifecycle', () => {

    test('opening_the_conflict_report_preselects_the_payroll_cutoff_but_waits_for_the_user_to_press_generate', () => {
        const { container, actions } = renderConflict();

        expect(container.querySelector('[data-testid="date-valid_from"]').value).toBe('2026-07-16');
        expect(container.querySelector('[data-testid="date-valid_to"]').value).toBe('2026-08-15');
        expect(actions.fetchDtrConflict).not.toHaveBeenCalled();
    });

    test('the_conflict_report_says_sorry_no_record_found_until_a_report_has_been_generated', () => {
        const utils = renderConflict();

        utils.getByText(/Sorry , no record found/);
    });

    test('a_generated_conflict_report_lists_one_row_per_conflicting_punch', () => {
        const utils = renderConflict({
            dtrSummary: {
                isListLoaded: true,
                pagination: { current_page: 1, has_next_page: false },
                dtrItems: [
                    { EmployeeNumber: 'E1', EmployeeName: 'Asha Rao', Date: '2026-07-20' },
                    { EmployeeNumber: 'E2', EmployeeName: 'Ben Kaur', Date: '2026-07-21' },
                ],
            },
        });

        expect(bodyRows(utils.container).length).toBe(2);
        utils.getByText('Asha Rao');
    });

    test('a_period_with_no_conflicts_loads_an_empty_table_rather_than_an_error', () => {
        const utils = renderConflict({
            dtrSummary: {
                isListLoaded: true,
                pagination: { current_page: 1, has_next_page: false },
                dtrItems: [],
            },
        });

        expect(bodyRows(utils.container).length).toBe(0);
        expect(utils.queryByText(/Sorry , no record found/)).toBeNull();
    });

    test('pressing_generate_and_export_asks_the_server_for_the_date_range_shown_in_the_date_pickers', async () => {
        const { container, actions } = renderConflict();

        await pressGenerate(container);

        expect(actions.fetchDtrConflict).toHaveBeenCalledTimes(1);
        const sent = actions.fetchDtrConflict.mock.calls[0][0];
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.valid_to).toBe('2026-08-15');
        expect(sent.page).toBe(1);
        expect(actions.exportNewDtrSummary1).not.toHaveBeenCalled();
    });

    test('the_export_dtr_conflict_action_carries_the_identical_date_range_as_the_generate_action', async () => {
        const { container, actions } = renderConflict();

        await pressGenerate(container);
        await pressExport(container, '#btn-export-all');

        const generated = actions.fetchDtrConflict.mock.calls[0][0];
        const exported  = actions.exportNewDtrSummary1.mock.calls[0][0];
        expect(exported.valid_from).toBe(generated.valid_from);
        expect(exported.valid_to).toBe(generated.valid_to);
        expect(exported.is_active).toBe(generated.is_active);
    });

    test('generating_the_conflict_report_with_an_empty_date_range_is_rejected_before_any_server_call', async () => {
        const { container, actions } = renderConflict({ settings: {} });

        await pressGenerate(container);

        expect(actions.fetchDtrConflict).not.toHaveBeenCalled();
    });

    test('generating_the_conflict_report_with_an_inverted_date_range_is_rejected_before_any_server_call', async () => {
        const { container, actions } = renderConflict({
            settings: { current_payroll_cutoff: { start_date: '2026-08-15', end_date: '2026-07-16' } },
        });

        await pressGenerate(container);

        expect(actions.fetchDtrConflict).not.toHaveBeenCalled();
        expect(actions.exportNewDtrSummary1).not.toHaveBeenCalled();
    });

    test('a_conflict_report_whose_previous_page_had_more_data_bumps_the_requested_page_FINDING_RPT_PAGE_BUMP', async () => {
        const { container, actions } = renderConflict({
            dtrSummary: { pagination: { current_page: 3, has_next_page: true }, dtrItems: [] },
        });

        await pressGenerate(container);

        // Same bump as DTR Summary: pressing Generate continues from the next page.
        expect(actions.fetchDtrConflict.mock.calls[0][0].page).toBe(4);
    });
});
