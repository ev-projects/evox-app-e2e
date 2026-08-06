/**
 * DtrIndiaAndOverallRequestLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco.js
 *        Menu: My Team -> Employee -> Daily Time Record   (India / Morocco locale variant)
 *        and   My Account -> Daily Time Record            (own record, same screen)
 *   2. container/MyOverallRequest/MyOverallRequest.js
 *        Menu: My Account -> My Overall Requests
 *
 * 29-JUL COVERAGE BASELINE: both files were at 0% - 119 uncovered lines, no test file of any
 * kind referenced either container.
 *
 * Both screens are walked phase by phase, both arms of every branch:
 *   PHASE 1  MOUNT/LOAD    what is fetched on open, what the render gates hide until data lands
 *   PHASE 2  FILTERS       year -> month -> payroll cutoff cascade (DTR); tabs + status
 *                          toggles + date range (Overall Requests)
 *   PHASE 3  ROWS          every row-shape branch: holiday / rest day / leave / future date /
 *                          per-request-type row renderer / status badge
 *   PHASE 4  ACTIONS       Alter Log button guards, Update Schedule feature gate, Toggle
 *                          Outlook point-of-view switch, pagination, detail links
 *
 * FINDINGS (characterised - these tests assert what the code does TODAY, they do not endorse it)
 *   DTR-CLONE-1     DailyTimeRecordIndiaMorocco.js is a verbatim copy of DailyTimeRecord.js.
 *                   The ONLY functional divergence in the whole file is the settings key
 *                   (current_payroll_cutoff_in_mar vs current_payroll_cutoff_ph). There are no
 *                   locale-specific columns and no locale-specific rules: India and Morocco
 *                   employees are shown the Philippine payroll columns Late / Undertime / NSD
 *                   (night shift differential) / OT / OTND unchanged.
 *   DTR-INMAR-1     if settings carries no current_payroll_cutoff_in_mar, componentWillReceiveProps
 *                   hands undefined to setPayrollCutoffInstance, which dereferences
 *                   payrollCutoff.year with no guard. The TypeError escapes the lifecycle method
 *                   (verified: it propagates out of the React commit rather than being contained
 *                   as a rejected promise) and there is no error boundary above this screen, so
 *                   the DTR never loads - no request, no remembered cutoff, no message.
 *   DTR-GUARD-1     handleSelectPayrollCutoff guards on Validator.isValid(selectedYear) - the
 *                   whole OBJECT, not its .value. Validator.isValid({}) is true, so the guard
 *                   passes on the constructor's empty {} and the filter lookup throws.
 *   DTR-POV-1       Toggle Outlook reads dtr.owner_POV with no guard, so one row without an
 *                   owner_POV payload blanks the entire DTR.
 *   DTR-EVAL-1      the summary holiday columns are resolved with eval('props...' + key), so a
 *                   holiday column key that is not a bare JS identifier raises a SyntaxError
 *                   and blanks the whole page.
 *   DTR-DEADSTATE-1 the constructor's isDtrSummaryLoaded state flag is never read - render
 *                   gates the summary block on props.dtr.isDtrSummaryLoaded instead.
 *   MOR-CROSSLEAK-1 the default tab is read from state.myTeamRequestList.requesttype - the MY
 *                   TEAM screen's reducer - so the tab last used on My Team Requests decides
 *                   which tab My Overall Requests opens on.
 *   MOR-DATEDROP-1  the constructor restores status / name / page / checkedList from the saved
 *                   filters but hard-codes valid_from, valid_to and department_id back to null.
 *   MOR-TABPAGE-1   the status toggles reset page to 1, the request-type tabs do not, so
 *                   switching tab from page 7 asks the server for page 7 of the new type.
 *   MOR-ALLSTATUS-1 the "All Status" toggle is commented out and onSubmitHandler drops null
 *                   values, so there is no way to see every status at once; the all_status
 *                   counter is still computed on every render and never displayed.
 *   MOR-STATUS-CASE-1 the Status badge switch matches "Pending"/"Approved"/"Canceled"/"Declined"
 *                   only. A lowercase status - the exact casing the filter buttons send to the
 *                   server - falls through the switch and the row shows no badge at all.
 *   MOR-DEADPAGE-1  render builds a whole <Field>/<Button> array, one per page, that is never
 *                   inserted into the JSX - dead work on every keystroke, O(last_page).
 *   MOR-RESTDAY-NPE-1 the change_schedules row guards item.fourth_column with ?. but then calls
 *                   .rest_day.join() unguarded, so a row missing rest_day blanks the page.
 *   MOR-UNKNOWN-1   a request whose table_name is not one of the four known tables falls out of
 *                   the switch with link = '', and its eye icon links back to the current page.
 *
 * ADDITIVE ONLY - no existing test file touched, no application source changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const R = require('react');
    return {
        ContainerHeader:  ({ children }) => R.createElement('div', null, children),
        Content:          ({ children, title, subtitle }) => R.createElement('div', null,
            R.createElement('div', { 'data-testid': 'content-title' }, title),
            R.createElement('div', { 'data-testid': 'content-subtitle' }, subtitle),
            children),
        ContainerWrapper: ({ children }) => R.createElement('div', null, children),
        ContainerBody:    ({ children }) => R.createElement('div', null, children),
        Row:              ({ children }) => R.createElement('div', null, children),
        Col:              ({ children }) => R.createElement('div', null, children),
    };
});
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

// react-select stub that keeps the real contract: it publishes the option list it was handed
// and hands the whole option object (or null when cleared) back through onChange.
jest.mock('react-select', () => {
    const R = require('react');
    return ({ name, value, options, onChange, placeholder, className }) => {
        const current = (value && value.value !== undefined && value.value !== null)
            ? String(value.value) : '';
        return R.createElement('select', {
            'data-testid': 'select-' + name,
            'data-placeholder': placeholder,
            'data-classname': className,
            value: current,
            onChange: (e) => onChange(
                (options || []).find((o) => String(o.value) === e.target.value) || null),
        },
        [R.createElement('option', { key: '__blank__', value: '' }, '')].concat(
            (options || []).map((o) =>
                R.createElement('option', { key: String(o.value), value: String(o.value) }, o.label))));
    };
});

// InputDate must be a real writable control here: the Yup date-order rule on My Overall
// Requests can only be exercised if the test can actually put dates into the form.
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    const { useFormikContext } = require('formik');
    return {
        InputDate: ({ name, value }) => {
            const form = useFormikContext();
            return R.createElement('input', {
                'data-testid': 'date-' + name,
                'data-value': value ? String(value) : '',
                onChange: (e) => form.setFieldValue(
                    name, e.target.value === '' ? null : new Date(e.target.value + 'T00:00:00')),
            });
        },
        InputTime: ({ name }) => R.createElement('div', { 'data-testid': 'time-' + name }),
    };
});

// Pagination stub that keeps the real flow: write the page field, then submit the form.
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

    const Toast = ({ children }) => R.createElement('div', { className: 'toast' }, children);
    Toast.Header = ({ children }) => R.createElement('div', { className: 'toast-header' }, children);
    Toast.Body = ({ children }) => R.createElement('div', { className: 'toast-body' }, children);

    const Form = ({ children }) => R.createElement('div', null, children);
    Form.Group = ({ children }) => R.createElement('div', null, children);
    Form.Label = ({ children }) => R.createElement('label', null, children);
    Form.Control = ({ children }) => R.createElement('div', null, children);

    return {
        Toast,
        Form,
        Container:   ({ children }) => R.createElement('div', null, children),
        Row:         ({ children, className }) => R.createElement('div', { className }, children),
        Col:         ({ children, className }) => R.createElement('div', { className }, children),
        Table:       ({ children, className }) => R.createElement('table', { className }, children),
        Image:       () => R.createElement('img', null),
        Card:        ({ children }) => R.createElement('div', null, children),
        Spinner:     () => R.createElement('div', null),
        InputGroup:  ({ children }) => R.createElement('div', null, children),
        FormControl: (p) => R.createElement('input', p),
        Pagination:  ({ children }) => R.createElement('div', null, children),
        ButtonGroup: ({ children }) => R.createElement('div', null, children),
        Badge:       ({ children, variant, className }) =>
            R.createElement('span', { 'data-variant': variant, className }, children),
        Button: ({ children, onClick, type, className, style }) =>
            R.createElement('button', { type: type || 'button', onClick, className, style }, children),
        ToggleButton: ({ children, onClick, checked, className }) =>
            R.createElement('button',
                { type: 'button', onClick, className, 'data-checked': String(!!checked) },
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

jest.mock('../../store/actions/dtr/dtrActions', () => ({
    viewEmployeeDtr:         jest.fn(),
    getFilterForDtr:         jest.fn(),
    setSelectedPayrollCutoff: jest.fn(),
    getUserDtrSummary:       jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ fetchUser: jest.fn() }));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));
jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchRequestList:   jest.fn(),
    fetchStatusNumbers: jest.fn(),
}));

import Authenticator from '../../services/Authenticator';

global.links = new Proxy({}, { get: () => '/x/' });

const DtrIndia =
    require('../../container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco').default;
const DtrPhilippines =
    require('../../container/DailyTimeRecord/DailyTimeRecord').default;
const MyOverallRequest =
    require('../../container/MyOverallRequest/MyOverallRequest').default;

const flush = () => act(async () => { await Promise.resolve(); });

// FINDING DTR-INMAR-1 produces an un-awaited rejected promise. Own it here so the noise does
// not leak into unrelated tests.
const swallowRejection = () => {};

/* ================================================================= DTR fixtures */

const CUTOFF_JUL_2 = {
    id: 32, name: 'Jul 16 - 31', year: '2026', month: '07', month_label: 'July',
    start_date: '2026-07-16', end_date: '2026-07-31',
};
const CUTOFF_JUL_1 = {
    id: 31, name: 'Jul 01 - 15', year: '2026', month: '07', month_label: 'July',
    start_date: '2026-07-01', end_date: '2026-07-15',
};
const CUTOFF_JUN = {
    id: 30, name: 'Jun 16 - 30', year: '2026', month: '06', month_label: 'June',
    start_date: '2026-06-16', end_date: '2026-06-30',
};

const DTR_FILTER = {
    2025: { 12: { label: 'December', data: { 20: { id: 20, name: 'Dec 01 - 15', start_date: '2025-12-01', end_date: '2025-12-15' } } } },
    2026: {
        '06': { label: 'June', data: { 30: CUTOFF_JUN } },
        '07': { label: 'July', data: { 31: CUTOFF_JUL_1, 32: CUTOFF_JUL_2 } },
    },
};

const row = (over = {}) => ({
    date: '2026-07-16',
    attendance_status: { slug: 'present', name: 'Present' },
    holidays: [],
    is_rest_day: 0,
    leaves: [],
    requests: [],
    time_in: '2026-07-16 08:00:00',
    time_out: '2026-07-16 17:00:00',
    start_datetime: '2026-07-16 08:00:00',
    end_datetime: '2026-07-16 17:00:00',
    start_flexy_datetime: null,
    end_flexy_datetime: null,
    payroll_items: { late: '00:05:00', undertime: '00:10:00', night_diff: '01:00:00', overtime: '02:00:00', overtime_night_diff: '00:30:00' },
    owner_POV: {
        start_datetime: '2026-07-16 13:30:00', end_datetime: '2026-07-16 22:30:00',
        start_flexy_datetime: null, end_flexy_datetime: null,
        time_in: '2026-07-16 13:30:00', time_out: '2026-07-16 22:30:00',
    },
    ...over,
});

const DTR_SUMMARY = {
    data: {
        reg: { late: '00:05:00', undertime: '00:10:00', night_diff: '01:00:00', overtime: '02:00:00', overtime_night_diff: '00:30:00', ul: '1' },
        legal: { rendered_hours: '08:00:00', night_diff: '00:00:00', overtime: '01:00:00', overtime_night_diff: '00:00:00' },
    },
    column: { legal: 1, special: 1 },
    column_names: { legal: 'Legal Holiday', special: 'Special Holiday' },
};

const dtrProps = (over = {}) => {
    const dtr = {
        filter: DTR_FILTER,
        isFilterLoaded: true,
        isDtrLoaded: true,
        isDtrSummaryLoaded: true,
        dtrSummary: DTR_SUMMARY,
        list: [row()],
        employeeInfo: { full_name: 'Aarav Sharma', department: 'Engineering IN', timezone: 'Asia/Kolkata' },
        selectedPayrollCutoff: {},
        ...(over.dtr || {}),
    };
    delete over.dtr;
    return {
        params: { id: 9 },
        user: { id: 7 },
        location: { pathname: '/dtr/9' },
        history: { goBack: jest.fn() },
        settings: { current_payroll_cutoff_in_mar: CUTOFF_JUL_2 },
        dtr,
        viewEmployeeDtr: jest.fn(),
        getFilterForDtr: jest.fn(),
        setSelectedPayrollCutoff: jest.fn(),
        getUserDtrSummary: jest.fn(),
        fetchUser: jest.fn(),
        setRedirect: jest.fn(),
        ...over,
    };
};

const renderDtr = (props, Component = DtrIndia) => {
    const ref = React.createRef();
    const utils = render(<MemoryRouter><Component {...props} ref={ref} /></MemoryRouter>);
    return { ...utils, ref };
};

// Drive the screen into the "cutoff chosen, DTR on screen" state the same way the app does.
const openCutoff = async (props, cutoff = CUTOFF_JUL_2, Component = DtrIndia) => {
    const bag = renderDtr(props, Component);
    await act(async () => { await bag.ref.current.setPayrollCutoffInstance(cutoff); });
    return bag;
};

const texts = (nodes) => Array.from(nodes).map((n) => n.textContent.trim());

/* ============================================== My Overall Request fixtures */

const REQ_ALTER = {
    id: 11, table_name: 'alter_logs', status: 'Pending',
    created_at: '2026-07-01 09:00', date_requested: '2026-07-01',
    updated_by: 'Sup One', updated_at: '2026-07-02', employee_note: 'wrong bio punch',
    fourth_column: { current_time_in: '08:00', current_time_out: '17:00' },
    fifth_column: { new_time_in: '09:00', new_time_out: '18:00' },
};
const REQ_OT = {
    id: 12, table_name: 'overtimes', status: 'Approved',
    created_at: '2026-07-03 09:00', date_requested: '2026-07-03',
    updated_by: 'Sup One', updated_at: '2026-07-04', employee_note: null,
    fourth_column: '18:00', fifth_column: '20:00',
};
const REQ_RDW = {
    id: 13, table_name: 'rest_day_works', status: 'Declined',
    created_at: '2026-07-05 09:00', date_requested: '2026-07-05',
    updated_by: 'Sup One', updated_at: '2026-07-06', employee_note: null,
    fourth_column: '2026-07-05 08:00', fifth_column: '2026-07-05 17:00',
};
const REQ_CS = {
    id: 14, table_name: 'change_schedules', status: 'Canceled',
    created_at: '2026-07-07 09:00', date_requested: '2026-07-07',
    updated_by: 'Sup One', updated_at: '2026-07-08', employee_note: null,
    fourth_column: { rest_day: ['sat', 'sun'], work_days: ['mon', 'tue'] },
    fifth_column: { allow_late: '1', allow_undertime: '0', allow_night_diff: '1' },
};

const ROWS = [REQ_ALTER, REQ_OT, REQ_RDW, REQ_CS];

const morProps = (over = {}) => ({
    requestList: {
        result: { data: ROWS, current_page: 1, last_page: 3 },
        record_number: 'Showing 1 to 4 of 12',
    },
    isListLoaded: true,
    isNumbersLoaded: true,
    statusNumbers: { pending: 4, approved: 2, canceled: 1, declined: 3 },
    filters: undefined,
    requesttype: undefined,
    settings: {},
    fetchRequestList: jest.fn(),
    fetchStatusNumbers: jest.fn(),
    ...over,
});

const renderMor = (props) => {
    const ref = React.createRef();
    const utils = render(<MemoryRouter><MyOverallRequest {...props} ref={ref} /></MemoryRouter>);
    return { ...utils, ref };
};

const lastListArgs = (props) => {
    const calls = props.fetchRequestList.mock.calls;
    return calls[calls.length - 1][0];
};

const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

/* ==================================================================================== */
/* ============================ DAILY TIME RECORD - INDIA / MOROCCO =================== */
/* ==================================================================================== */

describe('Daily Time Record (India / Morocco) - page lifecycle', () => {
    beforeAll(() => process.on('unhandledRejection', swallowRejection));
    afterAll(() => process.removeListener('unhandledRejection', swallowRejection));
    beforeEach(() => { Authenticator.scanFeature.mockImplementation(() => true); });
    afterEach(() => jest.clearAllMocks());

    /* ------------------------------------------------------- PHASE 1: MOUNT / LOAD */

    test('opening_an_employees_daily_time_record_asks_the_server_for_that_employees_payroll_cutoff_filters', () => {
        const props = dtrProps();
        renderDtr(props);

        expect(props.getFilterForDtr).toHaveBeenCalledTimes(1);
        expect(props.getFilterForDtr).toHaveBeenCalledWith(9);
        // nothing is loaded yet - the cutoff has not been chosen
        expect(props.viewEmployeeDtr).not.toHaveBeenCalled();
    });

    test('while_the_payroll_cutoff_filters_are_still_loading_no_dropdown_is_offered_at_all', () => {
        const props = dtrProps({ dtr: { isFilterLoaded: false } });
        const { container, queryByTestId } = renderDtr(props);

        expect(queryByTestId('select-year')).toBeNull();
        expect(container.querySelector('.dtr-filter')).toBeNull();
        expect(container.querySelector('table')).toBeNull();
    });

    test('once_the_filters_arrive_only_the_year_dropdown_is_offered_until_a_year_is_picked', () => {
        const props = dtrProps();
        const { getByTestId, queryByTestId } = renderDtr(props);

        const year = getByTestId('select-year');
        expect(year.getAttribute('data-placeholder')).toBe('Select Year');
        expect(texts(year.querySelectorAll('option')).filter(Boolean)).toEqual(['2025', '2026']);
        expect(queryByTestId('select-month')).toBeNull();
        expect(queryByTestId('select-payroll_cutoff')).toBeNull();
    });

    test('the_daily_time_record_table_stays_hidden_until_a_year_a_month_and_a_cutoff_have_all_been_chosen', async () => {
        const props = dtrProps();
        const { container, getByTestId } = renderDtr(props);
        expect(container.querySelector('table')).toBeNull();

        await act(async () => {
            fireEvent.change(getByTestId('select-year'), { target: { value: '2026' } });
        });
        expect(container.querySelector('table')).toBeNull();   // month + cutoff still missing

        await act(async () => {
            fireEvent.change(getByTestId('select-month'), { target: { value: '07' } });
        });
        expect(container.querySelector('table')).toBeNull();   // cutoff still missing

        await act(async () => {
            fireEvent.change(getByTestId('select-payroll_cutoff'), { target: { value: '32' } });
        });
        expect(container.querySelector('table.dtr-table')).not.toBeNull();
    });

    test('the_table_stays_hidden_when_the_record_itself_has_not_finished_loading_even_though_a_cutoff_is_chosen', async () => {
        const props = dtrProps({ dtr: { isDtrLoaded: false } });
        const { container } = await openCutoff(props);

        expect(container.querySelector('table')).toBeNull();
        // the cutoff was still sent to the server - only the table is gated
        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(9, '2026-07-16', '2026-07-31');
    });

    /* ------------------------------------------------- PHASE 2: THE FILTER CASCADE */

    test('picking_a_year_offers_that_years_months_in_calendar_order_and_wipes_any_earlier_month_and_cutoff', async () => {
        const props = dtrProps();
        const { getByTestId, ref } = renderDtr(props);

        await act(async () => {
            fireEvent.change(getByTestId('select-year'), { target: { value: '2026' } });
        });

        expect(ref.current.state.selectedYear).toEqual({ value: '2026', label: '2026' });
        expect(ref.current.state.selectedMonth).toEqual({});
        expect(ref.current.state.selectedPayrollCutoff).toEqual({});
        expect(texts(getByTestId('select-month').querySelectorAll('option')).filter(Boolean))
            .toEqual(['June', 'July']);
        // still no cutoff dropdown - a month must come first
        expect(document.querySelector('[data-testid="select-payroll_cutoff"]')).toBeNull();
    });

    test('clearing_the_year_hides_the_month_and_cutoff_dropdowns_again', async () => {
        const props = dtrProps();
        const { getByTestId, queryByTestId, ref } = renderDtr(props);

        await act(async () => {
            fireEvent.change(getByTestId('select-year'), { target: { value: '2026' } });
        });
        expect(queryByTestId('select-month')).not.toBeNull();

        // an empty selection reaches the handler as null
        await act(async () => {
            fireEvent.change(getByTestId('select-year'), { target: { value: '' } });
        });

        expect(ref.current.state.selectedYear).toBeNull();
        expect(queryByTestId('select-month')).toBeNull();
        expect(queryByTestId('select-payroll_cutoff')).toBeNull();
    });

    test('picking_a_month_offers_that_months_payroll_cutoffs_and_wipes_any_earlier_cutoff', async () => {
        const props = dtrProps();
        const { getByTestId, ref } = renderDtr(props);

        await act(async () => {
            fireEvent.change(getByTestId('select-year'), { target: { value: '2026' } });
        });
        await act(async () => {
            fireEvent.change(getByTestId('select-month'), { target: { value: '07' } });
        });

        expect(ref.current.state.selectedMonth).toEqual({ value: '07', label: 'July' });
        expect(ref.current.state.selectedPayrollCutoff).toEqual({});
        expect(texts(getByTestId('select-payroll_cutoff').querySelectorAll('option')).filter(Boolean))
            .toEqual(['Jul 01 - 15', 'Jul 16 - 31']);
    });

    test('clearing_the_month_hides_the_cutoff_dropdown_and_leaves_the_year_alone', async () => {
        const props = dtrProps();
        const { getByTestId, queryByTestId, ref } = renderDtr(props);

        await act(async () => {
            fireEvent.change(getByTestId('select-year'), { target: { value: '2026' } });
        });
        await act(async () => {
            fireEvent.change(getByTestId('select-month'), { target: { value: '07' } });
        });
        expect(queryByTestId('select-payroll_cutoff')).not.toBeNull();

        await act(async () => {
            fireEvent.change(getByTestId('select-month'), { target: { value: '' } });
        });

        expect(ref.current.state.selectedMonth).toBeNull();
        expect(ref.current.state.selectedYear).toEqual({ value: '2026', label: '2026' });
        expect(queryByTestId('select-payroll_cutoff')).toBeNull();
    });

    test('picking_a_payroll_cutoff_loads_that_employees_record_for_the_cutoff_dates_and_remembers_the_cutoff', async () => {
        const props = dtrProps();
        const { getByTestId, container } = renderDtr(props);

        await act(async () => {
            fireEvent.change(getByTestId('select-year'), { target: { value: '2026' } });
        });
        await act(async () => {
            fireEvent.change(getByTestId('select-month'), { target: { value: '06' } });
        });
        await act(async () => {
            fireEvent.change(getByTestId('select-payroll_cutoff'), { target: { value: '30' } });
        });

        expect(props.viewEmployeeDtr).toHaveBeenCalledTimes(1);
        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(9, '2026-06-16', '2026-06-30');
        expect(props.setSelectedPayrollCutoff).toHaveBeenCalledWith(CUTOFF_JUN);
        // the chosen range is echoed back to the user above the table
        expect(container.querySelector('.cutoff-text-border').textContent)
            .toMatch(/2026-06-16.*2026-06-30/);
    });

    test('the_summary_endpoint_is_never_called_from_this_screen_because_both_of_its_call_sites_are_commented_out', async () => {
        const props = dtrProps();
        await openCutoff(props);
        expect(props.getUserDtrSummary).not.toHaveBeenCalled();
    });

    // FINDING DTR-GUARD-1 (characterised, not endorsed): handleSelectPayrollCutoff gates on
    //   Validator.isValid( this.state.selectedYear )
    // which tests the whole OBJECT rather than its .value. Validator.isValid({}) returns true
    // ({} != "" is true after ToPrimitive), so the constructor's empty {} sails through the
    // guard and this.props.dtr.filter[undefined][undefined] throws. The screen is saved only by
    // the render gate that hides the cutoff dropdown until a year and month exist - the guard
    // itself protects nothing.
    test('choosing_a_cutoff_before_a_year_and_month_exist_blows_up_instead_of_being_rejected_by_the_guard_FINDING_DTR_GUARD_1', () => {
        const props = dtrProps();
        const { ref } = renderDtr(props);

        expect(ref.current.state.selectedYear).toEqual({});
        expect(() => ref.current.handleSelectPayrollCutoff({ value: 32, label: 'Jul 16 - 31' }))
            .toThrow(TypeError);
        expect(props.viewEmployeeDtr).not.toHaveBeenCalled();
    });

    test('seeding_the_screen_from_a_payroll_cutoff_fills_all_three_dropdowns_and_marks_the_cutoff_as_loaded', async () => {
        const props = dtrProps();
        const { ref, getByTestId } = await openCutoff(props, CUTOFF_JUL_1);

        expect(ref.current.state.selectedYear).toEqual({ label: '2026', value: '2026' });
        expect(ref.current.state.selectedMonth).toEqual({ label: 'July', value: '07' });
        expect(ref.current.state.selectedPayrollCutoff).toEqual({ label: 'Jul 01 - 15', value: 31 });
        expect(ref.current.state.isCurrentPayrollCutoffLoaded).toBe(true);
        expect(getByTestId('select-year').value).toBe('2026');
        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(9, '2026-07-01', '2026-07-15');
    });

    test('a_remembered_cutoff_from_the_previous_visit_wins_over_the_locale_default_when_the_settings_land', async () => {
        const props = dtrProps({ dtr: { selectedPayrollCutoff: CUTOFF_JUN } });
        const { rerender } = renderDtr(props);

        const next = { ...props, settings: { current_payroll_cutoff_in_mar: CUTOFF_JUL_2 } };
        await act(async () => {
            rerender(<MemoryRouter><DtrIndia {...next} /></MemoryRouter>);
        });

        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(9, '2026-06-16', '2026-06-30');
        expect(props.setSelectedPayrollCutoff).toHaveBeenCalledWith(CUTOFF_JUN);
    });

    test('arriving_with_a_forced_reset_throws_the_remembered_cutoff_away_and_falls_back_to_the_india_morocco_default', async () => {
        const props = dtrProps({ dtr: { selectedPayrollCutoff: CUTOFF_JUN } });
        const { rerender } = renderDtr(props);

        const next = {
            ...props,
            location: { pathname: '/dtr/9', resetInitialState: true },
            settings: { current_payroll_cutoff_in_mar: CUTOFF_JUL_2 },
        };
        await act(async () => {
            rerender(<MemoryRouter><DtrIndia {...next} /></MemoryRouter>);
        });

        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(9, '2026-07-16', '2026-07-31');
        expect(props.setSelectedPayrollCutoff).toHaveBeenCalledWith(CUTOFF_JUL_2);
    });

    // FINDING DTR-INMAR-1 (characterised, not endorsed): componentWillReceiveProps reaches for
    // nextProps.settings.current_payroll_cutoff_in_mar and hands it straight to the async
    // setPayrollCutoffInstance WITHOUT awaiting it. When the key is absent - a user whose
    // company settings only carry the PH cutoff, or a settings payload that arrives partially -
    // reading payrollCutoff.year throws inside the async function, the rejection is dropped on
    // the floor, and the screen simply sits blank: no table, no request, no error message.
    test('an_employee_whose_settings_carry_no_india_morocco_cutoff_takes_the_whole_screen_down_FINDING_DTR_INMAR_1', async () => {
        const props = dtrProps({ dtr: { selectedPayrollCutoff: {} } });
        const { ref } = renderDtr(props);

        // This is exactly what componentWillReceiveProps does on line 144 when the settings
        // payload has no current_payroll_cutoff_in_mar key - it reads an absent property off
        // nextProps.settings and passes the resulting undefined straight in.
        expect(props.settings.current_payroll_cutoff_ph).toBeUndefined();
        const settingsWithoutInMar = { current_payroll_cutoff_ph: CUTOFF_JUL_1 };
        expect(settingsWithoutInMar.current_payroll_cutoff_in_mar).toBeUndefined();

        let err = null;
        try {
            await ref.current.setPayrollCutoffInstance(
                settingsWithoutInMar.current_payroll_cutoff_in_mar);
        } catch (e) { err = e; }

        expect(err).toBeInstanceOf(TypeError);
        expect(String(err)).toMatch(/year/);
        // nothing was requested and nothing was remembered - the screen is simply dead
        expect(props.viewEmployeeDtr).not.toHaveBeenCalled();
        expect(props.setSelectedPayrollCutoff).not.toHaveBeenCalled();
        expect(ref.current.state.isCurrentPayrollCutoffLoaded).toBe(false);
    });

    // FINDING DTR-CLONE-1 (characterised, not endorsed): DailyTimeRecordIndiaMorocco.js is a
    // copy-paste of DailyTimeRecord.js. Diffing the two files leaves exactly three differences:
    // the CSS import, the class name, and current_payroll_cutoff_in_mar vs
    // current_payroll_cutoff_ph. There is NO India/Morocco specific column and NO India/Morocco
    // specific rule - Indian and Moroccan employees are shown the Philippine payroll model
    // (NSD = night shift differential, OTND = overtime night differential), which neither the
    // Indian nor the Moroccan labour code defines. Two files must now be edited in lockstep for
    // every DTR change.
    test('the_india_morocco_screen_renders_exactly_the_same_philippine_payroll_columns_as_the_ph_screen_FINDING_DTR_CLONE_1', async () => {
        const india = await openCutoff(dtrProps(), CUTOFF_JUL_2, DtrIndia);
        const indiaHeaders = texts(india.container.querySelectorAll('thead th'));
        const indiaFirstRow = texts(india.container.querySelectorAll('tbody tr:first-child td'));

        expect(indiaHeaders).toEqual([
            'Date', 'Status', 'Schedule', 'Clock In', 'Clock Out',
            'Late', 'Undertime', 'NSD', 'OT', 'OTND', 'Requests STATUS', '',
        ]);

        india.unmount();

        const ph = await openCutoff(dtrProps(), CUTOFF_JUL_2, DtrPhilippines);
        expect(texts(ph.container.querySelectorAll('thead th'))).toEqual(indiaHeaders);
        expect(texts(ph.container.querySelectorAll('tbody tr:first-child td'))).toEqual(indiaFirstRow);
    });

    test('the_india_morocco_screen_ignores_the_philippine_cutoff_setting_entirely', async () => {
        const props = dtrProps({ dtr: { selectedPayrollCutoff: {} } });
        const { rerender } = renderDtr(props);

        const next = {
            ...props,
            settings: { current_payroll_cutoff_ph: CUTOFF_JUL_1, current_payroll_cutoff_in_mar: CUTOFF_JUN },
        };
        await act(async () => {
            rerender(<MemoryRouter><DtrIndia {...next} /></MemoryRouter>);
        });

        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(9, '2026-06-16', '2026-06-30');
        expect(props.viewEmployeeDtr).not.toHaveBeenCalledWith(9, '2026-07-01', '2026-07-15');
    });

    /* --------------------------------------------------------- PHASE 3: THE ROWS */

    test('a_normal_working_day_shows_its_attendance_status_schedule_clock_times_and_every_payroll_item', async () => {
        const props = dtrProps();
        const { container } = await openCutoff(props);

        const tds = texts(container.querySelectorAll('tbody tr td'));
        expect(container.querySelector('tbody tr').className).toBe('center present-bg-color');
        expect(tds[1]).toBe('Present');
        expect(tds[5]).toBe('00:05:00');   // Late
        expect(tds[6]).toBe('00:10:00');   // Undertime
        expect(tds[7]).toBe('01:00:00');   // NSD
        expect(tds[8]).toBe('02:00:00');   // OT
        expect(tds[9]).toBe('00:30:00');   // OTND
        expect(container.querySelector('.dtr-date .month').textContent).toBe('Jul');
        expect(container.querySelector('.dtr-date .day').textContent).toBe('16');
    });

    test('a_day_with_a_holiday_is_colour_coded_as_the_holiday_and_replaces_the_attendance_status_with_the_holiday_name', async () => {
        const props = dtrProps({
            dtr: {
                list: [row({
                    attendance_status: { slug: 'absent', name: 'Absent' },
                    holidays: [{ type: 'legal_holiday', name: 'Independence Day' }],
                })],
            },
        });
        const { container } = await openCutoff(props);

        expect(container.querySelector('tbody tr').className).toBe('center legal_holiday-bg-color');
        expect(container.querySelector('tbody .dtr-status').textContent).toBe('Independence Day');
        expect(container.querySelector('tbody .dtr-status').textContent).not.toMatch(/Absent/);
    });

    test('a_rest_day_with_no_holiday_is_colour_coded_as_a_rest_day_and_keeps_its_attendance_status', async () => {
        const props = dtrProps({
            dtr: {
                list: [row({
                    is_rest_day: 1,
                    attendance_status: { slug: 'no_record', name: 'No Record' },
                })],
            },
        });
        const { container } = await openCutoff(props);

        expect(container.querySelector('tbody tr').className).toBe('center rest_day-bg-color');
        expect(container.querySelector('tbody .dtr-status').textContent).toBe('No Record');
    });

    test('days_that_have_not_happened_yet_are_left_off_the_record_while_earlier_days_stay', async () => {
        const props = dtrProps({
            dtr: {
                list: [
                    row({ date: '2026-07-16' }),
                    row({ date: '2099-01-01' }),
                    row({ date: '2026-07-17' }),
                ],
            },
        });
        const { container } = await openCutoff(props);

        const dates = texts(container.querySelectorAll('tbody tr .dtr-date'));
        expect(dates.length).toBe(2);
        expect(dates[0]).toMatch(/Jul16/);
        expect(dates[1]).toMatch(/Jul17/);
    });

    test('an_approved_paid_leave_removes_the_undertime_from_the_row_but_leaves_the_other_payroll_items_alone', async () => {
        const props = dtrProps({
            dtr: { list: [row({ leaves: [{ amount: 1, status: 'approved' }] })] },
        });
        const { container } = await openCutoff(props);

        const tds = texts(container.querySelectorAll('tbody tr td'));
        expect(tds[6]).toBe('');           // undertime suppressed
        expect(tds[5]).toBe('00:05:00');   // late untouched
        expect(tds[8]).toBe('02:00:00');   // overtime untouched
    });

    test('a_leave_that_is_still_pending_or_that_pays_nothing_leaves_the_undertime_on_the_record', async () => {
        const pending = dtrProps({
            dtr: { list: [row({ leaves: [{ amount: 1, status: 'pending' }] })] },
        });
        const a = await openCutoff(pending);
        expect(texts(a.container.querySelectorAll('tbody tr td'))[6]).toBe('00:10:00');
        a.unmount();

        const unpaid = dtrProps({
            dtr: { list: [row({ leaves: [{ amount: 0, status: 'approved' }] })] },
        });
        const b = await openCutoff(unpaid);
        expect(texts(b.container.querySelectorAll('tbody tr td'))[6]).toBe('00:10:00');
    });

    test('every_request_raised_against_a_day_is_listed_on_that_row_in_readable_title_case', async () => {
        const props = dtrProps({
            dtr: {
                list: [row({
                    requests: [
                        { id: 501, request_type: 'alter_log', status: 'pending' },
                        { id: 502, request_type: 'rest_day_work', status: 'approved' },
                    ],
                })],
            },
        });
        const { container } = await openCutoff(props);

        const items = texts(container.querySelectorAll('.requests-list li'));
        expect(items).toEqual(['Alter Log - Pending', 'Rest Day Work - Approved']);
        expect(container.querySelectorAll('.requests-list li')[1].className).toBe('Approved');
    });

    test('a_day_with_no_requests_shows_an_empty_request_list_rather_than_a_placeholder', async () => {
        const props = dtrProps();
        const { container } = await openCutoff(props);
        expect(container.querySelectorAll('.requests-list li').length).toBe(0);
        expect(container.querySelector('.requests-list ul')).not.toBeNull();
    });

    /* ------------------------------------------------------ PHASE 4: THE ACTIONS */

    test('on_your_own_record_a_day_without_an_alter_log_offers_a_blank_alter_log_form_and_a_day_with_one_reopens_it', async () => {
        const props = dtrProps({
            params: { id: 7 }, user: { id: 7 },
            dtr: {
                list: [
                    row({ date: '2026-07-16' }),
                    row({ date: '2026-07-17', requests: [{ id: 501, request_type: 'alter_log', status: 'pending' }] }),
                ],
            },
        });
        const { container } = await openCutoff(props);

        const hrefs = Array.from(container.querySelectorAll('.dtr-actions a'))
            .map((a) => a.getAttribute('href'));
        expect(hrefs).toEqual(['/x/request/AlterLog/', '/x/request/AlterLog/501']);
    });

    test('an_alter_log_that_has_already_been_approved_removes_the_edit_button_for_that_day', async () => {
        const props = dtrProps({
            params: { id: 7 }, user: { id: 7 },
            dtr: {
                list: [row({ requests: [{ id: 501, request_type: 'alter_log', status: 'approved' }] })],
            },
        });
        const { container } = await openCutoff(props);
        expect(container.querySelectorAll('.dtr-actions a').length).toBe(0);
    });

    test('a_rest_day_cannot_be_altered_even_on_your_own_record', async () => {
        const props = dtrProps({
            params: { id: 7 }, user: { id: 7 },
            dtr: { list: [row({ is_rest_day: 1 })] },
        });
        const { container } = await openCutoff(props);
        expect(container.querySelectorAll('.dtr-actions a').length).toBe(0);
    });

    test('an_approver_looking_at_someone_elses_record_never_gets_an_alter_log_button', async () => {
        const props = dtrProps();   // params 9, user 7
        const { container } = await openCutoff(props);
        expect(container.querySelectorAll('.dtr-actions a').length).toBe(0);
    });

    test('an_approver_with_the_schedule_feature_gets_an_update_schedule_link_to_that_employee', async () => {
        const props = dtrProps();
        const { container } = await openCutoff(props);

        const link = container.querySelector('.btn-update-sched a');
        expect(link).not.toBeNull();
        expect(link.getAttribute('href')).toBe('/x/9');
        expect(Authenticator.scanFeature).toHaveBeenCalledWith('change_employee_schedule');
    });

    test('an_approver_without_the_schedule_feature_and_an_employee_on_their_own_record_both_lose_the_update_schedule_link', async () => {
        Authenticator.scanFeature.mockImplementation(() => false);
        const denied = await openCutoff(dtrProps());
        expect(denied.container.querySelector('.btn-update-sched')).toBeNull();
        denied.unmount();

        Authenticator.scanFeature.mockImplementation(() => true);
        const own = await openCutoff(dtrProps({ params: { id: 7 }, user: { id: 7 } }));
        expect(own.container.querySelector('.btn-update-sched')).toBeNull();
    });

    test('the_employees_name_and_department_are_only_shown_when_an_approver_is_reviewing_someone_elses_record', async () => {
        const approval = renderDtr(dtrProps());
        expect(approval.getByTestId('content-subtitle').textContent)
            .toBe('Name: Aarav Sharma Department: Engineering IN');
        approval.unmount();

        const own = renderDtr(dtrProps({ params: { id: 7 }, user: { id: 7 } }));
        expect(own.getByTestId('content-subtitle').textContent).toBe('');
        expect(own.getByTestId('content-title').textContent).toBe('Daily Time Record');
    });

    test('toggling_outlook_switches_the_schedule_and_clock_columns_to_the_record_owners_own_timezone', async () => {
        const props = dtrProps();
        const { container } = await openCutoff(props);

        // default: the approver's point of view, no timezone hint on the Schedule header
        expect(container.querySelector('.dtr-schedule-toggle-on').textContent.trim()).toBe('');
        expect(texts(container.querySelectorAll('tbody tr .dtr-log'))[0]).toMatch(/8:00:00/);

        await act(async () => {
            fireEvent.click(container.querySelector('.toggle-outlook-dtr'));
        });

        expect(container.querySelector('.dtr-schedule-toggle-on').textContent.trim())
            .toBe('( Asia/Kolkata )');
        expect(texts(container.querySelectorAll('tbody tr .dtr-log'))[0]).toMatch(/13:30:00/);
        expect(texts(container.querySelectorAll('tbody tr .dtr-log'))[1]).toMatch(/22:30:00/);

        // and back again
        await act(async () => {
            fireEvent.click(container.querySelector('.toggle-outlook-dtr'));
        });
        expect(container.querySelector('.dtr-schedule-toggle-on').textContent.trim()).toBe('');
        expect(texts(container.querySelectorAll('tbody tr .dtr-log'))[0]).toMatch(/8:00:00/);
    });

    test('the_toggle_outlook_button_is_not_offered_on_your_own_record', async () => {
        const props = dtrProps({ params: { id: 7 }, user: { id: 7 } });
        const { container } = await openCutoff(props);
        expect(container.querySelector('.toggle-outlook-dtr')).toBeNull();
    });

    // FINDING DTR-POV-1 (characterised, not endorsed): the toggled branch calls
    //   DtrFormatter.displaySchedule(dtr.owner_POV)  and  DtrFormatter.displayLog(dtr.owner_POV.time_in)
    // with no guard at all, while the untoggled branch reads the row itself. A single row whose
    // owner_POV was not returned by the API (a day with no schedule assigned, or an older row
    // written before the column existed) takes down the whole DTR the moment the approver
    // presses Toggle Outlook.
    test('toggling_outlook_on_a_day_the_server_returned_without_an_owner_point_of_view_blanks_the_whole_record_FINDING_DTR_POV_1', async () => {
        const props = dtrProps({ dtr: { list: [row({ owner_POV: undefined })] } });
        const { container } = await openCutoff(props);
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => {
            act(() => { fireEvent.click(container.querySelector('.toggle-outlook-dtr')); });
        }).toThrow(TypeError);

        spy.mockRestore();
    });

    /* ------------------------------------------------------ PHASE 5: THE SUMMARY */

    test('the_summary_block_totals_the_cutoff_and_adds_one_card_per_holiday_type_configured_for_the_locale', async () => {
        const props = dtrProps();
        const { container } = await openCutoff(props);

        const summary = container.querySelector('.SummaryBlock');
        expect(summary.querySelector('.late .toast-body').textContent).toBe('00:05:00');
        expect(summary.querySelector('.ut .toast-body').textContent).toBe('00:10:00');
        expect(summary.querySelector('.nsd .toast-body').textContent).toBe('01:00:00');
        expect(summary.querySelector('.ot .toast-body').textContent).toBe('02:00:00');
        expect(summary.querySelector('.otnd .toast-body').textContent).toBe('00:30:00');
        expect(summary.querySelector('.ul .toast-body').textContent).toBe('1');

        const holidayCards = summary.querySelectorAll('.holidays');
        expect(holidayCards.length).toBe(2);
        expect(holidayCards[0].querySelector('h5').textContent).toBe('Legal Holiday');
        expect(texts(holidayCards[0].querySelectorAll('.toast-body')))
            .toEqual(['08:00:00', '00:00:00', '01:00:00', '00:00:00']);
    });

    test('a_holiday_column_with_no_hours_recorded_against_it_shows_zeroes_rather_than_blanks', async () => {
        const props = dtrProps();
        const { container } = await openCutoff(props);

        // 'special' is a configured column but carries no data in dtrSummary.data
        const special = container.querySelectorAll('.holidays')[1];
        expect(special.querySelector('h5').textContent).toBe('Special Holiday');
        expect(texts(special.querySelectorAll('.toast-body'))).toEqual(['0', '0', '0', '0']);
    });

    test('the_summary_block_is_hidden_while_the_totals_are_still_being_calculated_but_the_table_still_renders', async () => {
        const props = dtrProps({ dtr: { isDtrSummaryLoaded: false } });
        const { container } = await openCutoff(props);

        expect(container.querySelector('.SummaryBlock')).toBeNull();
        expect(container.querySelector('table.dtr-table')).not.toBeNull();
    });

    // FINDING DTR-DEADSTATE-1 (characterised, not endorsed): the constructor seeds
    // isDtrSummaryLoaded: true into component state, but render gates the summary block on
    // this.props.dtr.isDtrSummaryLoaded. The state flag is written once and never read - a
    // maintainer flipping it expects the block to hide and nothing happens.
    test('the_components_own_summary_loaded_flag_is_never_read_by_the_render_FINDING_DTR_DEADSTATE_1', async () => {
        const props = dtrProps({ dtr: { isDtrSummaryLoaded: false } });
        const { container, ref } = await openCutoff(props);

        expect(ref.current.state.isDtrSummaryLoaded).toBe(true);   // state says "loaded"
        expect(container.querySelector('.SummaryBlock')).toBeNull(); // the prop decided otherwise
    });

    // FINDING DTR-EVAL-1 (characterised, not endorsed): DtrSummaryBlock resolves each holiday
    // column with  eval('props.computations.column_names?.' + dtr_type)  and
    // eval('props.computations.data?.' + dtr_type). The column key comes straight from the
    // server, so any key that is not a bare JavaScript identifier - a space, a hyphen, a digit
    // first - raises a SyntaxError during render and blanks the entire page. It is also a
    // server-controlled string being handed to eval().
    test('a_holiday_column_name_that_is_not_a_bare_javascript_identifier_blanks_the_whole_page_FINDING_DTR_EVAL_1', async () => {
        const props = dtrProps({
            dtr: {
                dtrSummary: {
                    data: { reg: DTR_SUMMARY.data.reg },
                    column: { 'special non-working': 1 },
                    column_names: { 'special non-working': 'Special Non-Working' },
                },
            },
        });
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(openCutoff(props)).rejects.toThrow(SyntaxError);

        spy.mockRestore();
    });
});

/* ==================================================================================== */
/* ================================== MY OVERALL REQUESTS ============================= */
/* ==================================================================================== */

describe('My Overall Requests - page lifecycle', () => {
    afterEach(() => jest.clearAllMocks());

    /* ------------------------------------------------------- PHASE 1: MOUNT / LOAD */

    test('opening_the_screen_asks_the_server_for_my_pending_alteration_requests_and_for_the_status_counters', async () => {
        const props = morProps();
        renderMor(props);
        await flush();

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(props.fetchStatusNumbers).toHaveBeenCalledTimes(1);
        expect(props.fetchRequestList).toHaveBeenCalledWith({
            status: 'pending', valid_from: null, valid_to: null, department_id: null,
            name: null, page: 1, checkedList: [], isAll: false, action: null,
            bulk_action: null, request_type: 'alteration', url: 'my_requests',
        });
        expect(props.fetchStatusNumbers.mock.calls[0][0])
            .toEqual(props.fetchRequestList.mock.calls[0][0]);
    });

    test('the_loading_page_is_shown_until_the_list_arrives_and_the_server_is_still_asked_for_it', async () => {
        const props = morProps({ isListLoaded: false });
        const { getByTestId, container } = renderMor(props);
        await flush();

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
    });

    // FINDING MOR-CROSSLEAK-1 (characterised, not endorsed): mapStateToProps wires
    //   requesttype : state.myTeamRequestList.requesttype
    // - the MY TEAM request list reducer, not this screen's own myRequestList. Whatever tab a
    // supervisor last opened on My Team Requests silently becomes the opening tab of their
    // personal My Overall Requests, and the very first fetch on mount goes out for that type.
    test('the_opening_tab_is_inherited_from_the_my_team_requests_screen_instead_of_this_screens_own_state_FINDING_MOR_CROSSLEAK_1', async () => {
        const props = morProps({ requesttype: 'overtime' });
        const { getByTestId } = renderMor(props);
        await flush();

        expect(lastListArgs(props).request_type).toBe('overtime');
        expect(getByTestId('tabs').getAttribute('data-active')).toBe('overtime');
    });

    // FINDING MOR-DATEDROP-1 (characterised, not endorsed): the constructor restores status,
    // name, page, checkedList, isAll, action and bulk_action from the saved filters but writes
    // valid_from: null, valid_to: null and department_id: null unconditionally. A user who
    // filtered June, opened a request and pressed Back gets their status and page back but
    // loses the date range, so the list they return to is not the list they left.
    test('coming_back_to_the_screen_restores_the_saved_status_and_page_but_silently_drops_the_saved_date_range_FINDING_MOR_DATEDROP_1', async () => {
        const props = morProps({
            filters: {
                status: 'approved', page: 4, name: 'alter', isAll: true,
                valid_from: '2026-06-01', valid_to: '2026-06-30', department_id: 3,
            },
        });
        renderMor(props);
        await flush();

        const sent = lastListArgs(props);
        expect(sent.status).toBe('approved');
        expect(sent.page).toBe(4);
        expect(sent.name).toBe('alter');
        expect(sent.isAll).toBe(true);
        expect(sent.valid_from).toBeNull();
        expect(sent.valid_to).toBeNull();
        expect(sent.department_id).toBeNull();
    });

    /* ----------------------------------------------------------- PHASE 2: FILTERS */

    test('switching_to_the_overtime_tab_reloads_the_list_for_overtime_requests_only', async () => {
        const props = morProps();
        const { getByTestId } = renderMor(props);
        await flush();
        props.fetchRequestList.mockClear();
        props.fetchStatusNumbers.mockClear();

        await act(async () => { fireEvent.click(getByTestId('tab-overtime')); });
        await flush();

        expect(props.fetchRequestList).toHaveBeenCalledTimes(1);
        const sent = lastListArgs(props);
        expect(sent.request_type).toBe('overtime');
        expect(sent.status).toBe('pending');
        expect(sent.url).toBe('my_requests');
        expect(props.fetchStatusNumbers).toHaveBeenCalledTimes(1);
    });

    test('each_of_the_five_request_type_tabs_reloads_the_list_for_its_own_type', async () => {
        const props = morProps();
        const { getByTestId } = renderMor(props);
        await flush();
        props.fetchRequestList.mockClear();

        for (const key of ['all', 'alteration', 'overtime', 'rest_day_work', 'change_schedule']) {
            await act(async () => { fireEvent.click(getByTestId('tab-' + key)); });
            await flush();
            expect(lastListArgs(props).request_type).toBe(key);
        }
        expect(props.fetchRequestList).toHaveBeenCalledTimes(5);
    });

    test('each_of_the_four_status_filters_reloads_the_list_with_that_status_and_sends_the_user_back_to_page_one', async () => {
        const props = morProps();
        const { container, getByTestId } = renderMor(props);
        await flush();

        // walk to page 2 first so the reset is observable
        await act(async () => { fireEvent.click(getByTestId('page-2')); });
        await flush();
        expect(lastListArgs(props).page).toBe(2);

        const map = [['Approved', 'approved'], ['Cancelled', 'canceled'],
                     ['Declined', 'declined'], ['Pending', 'pending']];
        for (const [label, value] of map) {
            await act(async () => { fireEvent.click(btn(container, label)); });
            await flush();
            expect(lastListArgs(props).status).toBe(value);
            expect(lastListArgs(props).page).toBe(1);
        }
    });

    // FINDING MOR-TABPAGE-1 (characterised, not endorsed): every status ToggleButton runs
    //   setFieldValue("status", X); setFieldValue("page", 1); handleSubmit();
    // but the Tabs onSelect runs only  setFieldValue("request_type", key); handleSubmit().
    // A user reading page 3 of their alterations who clicks the Overtime tab asks the server for
    // page 3 of their overtimes - usually an empty page, which reads as "no overtime requests".
    test('switching_request_type_tab_keeps_the_user_on_the_old_page_number_instead_of_restarting_at_page_one_FINDING_MOR_TABPAGE_1', async () => {
        const props = morProps();
        const { getByTestId } = renderMor(props);
        await flush();

        await act(async () => { fireEvent.click(getByTestId('page-3')); });
        await flush();
        expect(lastListArgs(props).page).toBe(3);

        await act(async () => { fireEvent.click(getByTestId('tab-overtime')); });
        await flush();

        expect(lastListArgs(props).request_type).toBe('overtime');
        expect(lastListArgs(props).page).toBe(3);
    });

    test('paging_through_the_list_keeps_the_current_tab_and_status_filter', async () => {
        const props = morProps({ requesttype: 'rest_day_work' });
        const { getByTestId } = renderMor(props);
        await flush();

        await act(async () => { fireEvent.click(getByTestId('page-2')); });
        await flush();

        const sent = lastListArgs(props);
        expect(sent.page).toBe(2);
        expect(sent.request_type).toBe('rest_day_work');
        expect(sent.status).toBe('pending');
    });

    test('filtering_a_valid_date_range_sends_it_to_the_server_as_plain_dates_and_restarts_at_page_one', async () => {
        const props = morProps();
        const { getByTestId, container } = renderMor(props);
        await flush();

        await act(async () => { fireEvent.click(getByTestId('page-2')); });
        await flush();

        await act(async () => {
            fireEvent.change(getByTestId('date-valid_from'), { target: { value: '2026-07-01' } });
        });
        await act(async () => {
            fireEvent.change(getByTestId('date-valid_to'), { target: { value: '2026-07-31' } });
        });
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();

        const sent = lastListArgs(props);
        expect(sent.valid_from).toBe('2026-07-01');
        expect(sent.valid_to).toBe('2026-07-31');
        expect(sent.page).toBe(1);
    });

    test('filtering_a_date_range_that_ends_before_it_starts_is_rejected_and_never_reaches_the_server', async () => {
        const props = morProps();
        const { getByTestId, container } = renderMor(props);
        await flush();
        props.fetchRequestList.mockClear();
        props.fetchStatusNumbers.mockClear();

        await act(async () => {
            fireEvent.change(getByTestId('date-valid_from'), { target: { value: '2026-07-31' } });
        });
        await act(async () => {
            fireEvent.change(getByTestId('date-valid_to'), { target: { value: '2026-07-01' } });
        });
        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await flush();
        await flush();

        expect(props.fetchRequestList).not.toHaveBeenCalled();
        expect(props.fetchStatusNumbers).not.toHaveBeenCalled();
    });

    test('submitting_the_filter_form_drops_every_empty_value_so_they_never_reach_the_server', async () => {
        const props = morProps();
        const { ref } = renderMor(props);
        await flush();
        props.fetchRequestList.mockClear();

        await act(async () => {
            ref.current.onSubmitHandler({
                status: 'approved', name: '', department_id: null, page: 2,
                valid_from: new Date('2026-06-16T00:00:00'),
                valid_to: new Date('2026-06-30T00:00:00'),
                url: 'my_requests',
            });
        });

        expect(props.fetchRequestList).toHaveBeenCalledWith({
            status: 'approved', page: 2, url: 'my_requests',
            valid_from: '2026-06-16', valid_to: '2026-06-30',
        });
    });

    // FINDING MOR-ALLSTATUS-1 (characterised, not endorsed): the "All Status" ToggleButton is
    // commented out (it was the only control that set status back to null), and onSubmitHandler
    // drops null values from the payload anyway. The all_status counter is still summed on every
    // render and never rendered. The result: once the screen is open there is no way to see
    // pending and approved requests together.
    test('there_is_no_control_left_that_clears_the_status_filter_so_all_statuses_can_never_be_listed_together_FINDING_MOR_ALLSTATUS_1', async () => {
        const props = morProps();
        const { container, ref } = renderMor(props);
        await flush();

        const toggles = Array.from(container.querySelectorAll('.request_list_btn'));
        expect(toggles.length).toBe(4);
        expect(toggles.map((t) => t.textContent.replace(/\s+/g, ' ').trim()))
            .toEqual(['Pending 4', 'Approved 2', 'Cancelled 1', 'Declined 3']);
        expect(btn(container, 'All Status')).toBeUndefined();

        // and even if something did set it to null, the payload builder would delete it
        props.fetchRequestList.mockClear();
        await act(async () => {
            ref.current.onSubmitHandler({ status: null, page: 1, url: 'my_requests' });
        });
        expect(props.fetchRequestList).toHaveBeenCalledWith({ page: 1, url: 'my_requests' });
    });

    test('the_status_counters_read_zero_until_the_counts_arrive_and_missing_individual_counts_fall_back_to_zero', async () => {
        const notLoaded = renderMor(morProps({ isNumbersLoaded: false, statusNumbers: {} }));
        await flush();
        expect(btn(notLoaded.container, 'Pending').textContent).toMatch(/0/);
        expect(btn(notLoaded.container, 'Declined').textContent).toMatch(/0/);
        notLoaded.unmount();

        const partial = renderMor(morProps({ statusNumbers: { pending: 9 } }));
        await flush();
        expect(btn(partial.container, 'Pending').textContent).toMatch(/9/);
        expect(btn(partial.container, 'Approved').textContent).toMatch(/0/);
        expect(btn(partial.container, 'Cancelled').textContent).toMatch(/0/);
        expect(btn(partial.container, 'Declined').textContent).toMatch(/0/);
    });

    test('the_status_filter_that_is_currently_applied_is_the_only_one_shown_as_pressed', async () => {
        const props = morProps({ filters: { status: 'declined' } });
        const { container } = renderMor(props);
        await flush();

        const state = Array.from(container.querySelectorAll('.request_list_btn'))
            .map((t) => t.getAttribute('data-checked'));
        expect(state).toEqual(['false', 'false', 'false', 'true']);
    });

    /* -------------------------------------------------------------- PHASE 3: ROWS */

    test('an_empty_result_replaces_the_table_the_record_counter_and_the_pager_with_a_no_record_message', async () => {
        const props = morProps({
            requestList: { result: { data: [], current_page: 1, last_page: 0 }, record_number: 'Showing 0 of 0' },
        });
        const { container, getByText, queryByTestId, queryByText } = renderMor(props);
        await flush();

        expect(getByText(/Sorry, No Record Found/)).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
        expect(queryByTestId('paginate')).toBeNull();
        expect(queryByText('Showing 0 of 0')).toBeNull();
        // the filter bar stays usable so the range can be widened
        expect(btn(container, 'Filter')).toBeTruthy();
    });

    test('a_populated_result_shows_the_record_counter_one_row_per_request_and_the_pager', async () => {
        const props = morProps();
        const { container, getByText, getByTestId } = renderMor(props);
        await flush();

        expect(getByText('Showing 1 to 4 of 12')).toBeInTheDocument();
        expect(container.querySelectorAll('tbody.request_list tr').length).toBe(4);
        expect(getByTestId('paginate')).toBeInTheDocument();
        expect(texts(container.querySelectorAll('thead th'))).toEqual([
            'Request Type / Date / Note', 'Date Requested', 'Request Information',
            'Status', 'Updated By / Date', 'Actions',
        ]);
    });

    test('each_row_is_titled_with_the_singular_request_type_and_only_carries_a_note_when_the_employee_wrote_one', async () => {
        const props = morProps();
        const { container } = renderMor(props);
        await flush();

        const rows = container.querySelectorAll('tbody.request_list tr');
        expect(texts(Array.from(rows).map((r) => r.querySelector('td b'))))
            .toEqual(['Alter Log', 'Overtime', 'Rest Day Work', 'Change Schedule']);
        expect(rows[0].textContent).toMatch(/NOTE: wrong bio punch/);
        expect(rows[1].textContent).not.toMatch(/NOTE:/);
    });

    test('an_alteration_row_shows_the_requested_times_beside_the_times_being_replaced', async () => {
        const props = morProps({
            requestList: { result: { data: [REQ_ALTER], current_page: 1, last_page: 1 }, record_number: '1' },
        });
        const { container, getByText } = renderMor(props);
        await flush();

        expect(container.querySelector('.alter-logs-new').textContent).toBe('New');
        expect(container.querySelector('.alter-logs-old').textContent).toBe('Old');
        expect(getByText('In: 09:00')).toBeInTheDocument();
        expect(getByText('Out: 18:00')).toBeInTheDocument();
        expect(getByText('In: 08:00')).toBeInTheDocument();
        expect(getByText('Out: 17:00')).toBeInTheDocument();
    });

    test('a_rest_day_work_row_shows_the_from_and_to_datetimes_and_an_overtime_row_shows_its_two_bare_times', async () => {
        const props = morProps({
            requestList: { result: { data: [REQ_RDW, REQ_OT], current_page: 1, last_page: 1 }, record_number: '2' },
        });
        const { getByText } = renderMor(props);
        await flush();

        expect(getByText('From: 2026-07-05 08:00')).toBeInTheDocument();
        expect(getByText('To: 2026-07-05 17:00')).toBeInTheDocument();
        expect(getByText('18:00')).toBeInTheDocument();
        expect(getByText('20:00')).toBeInTheDocument();
    });

    test('a_change_schedule_row_lists_its_rest_and_work_days_and_only_the_payroll_allowances_that_were_switched_on', async () => {
        const props = morProps({
            requestList: { result: { data: [REQ_CS], current_page: 1, last_page: 1 }, record_number: '1' },
        });
        const { container, getByText } = renderMor(props);
        await flush();

        expect(getByText(/Rest Days: sat,sun/)).toBeInTheDocument();
        expect(getByText(/Work Days: mon,tue/)).toBeInTheDocument();

        const allowances = texts(container.querySelectorAll('tbody.request_list tr td:nth-child(3) span'));
        expect(allowances).toEqual(['Late,', 'Night Differential,']);
        expect(allowances).not.toContain('Undertime,');   // allow_undertime was '0'
    });

    // FINDING MOR-RESTDAY-NPE-1 (characterised, not endorsed): the row builder writes
    //   item.fourth_column?.rest_day.join()
    // The optional chain protects the fourth_column lookup and then immediately dereferences
    // .rest_day without one. A change-schedule request saved with an empty rest_day (an
    // all-days-working schedule) throws during render and takes the whole list with it.
    test('a_change_schedule_request_saved_without_a_rest_day_list_blanks_the_whole_page_FINDING_MOR_RESTDAY_NPE_1', async () => {
        const props = morProps({
            requestList: {
                result: {
                    data: [{ ...REQ_CS, fourth_column: { work_days: ['mon', 'tue'] } }],
                    current_page: 1, last_page: 1,
                },
                record_number: '1',
            },
        });
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderMor(props)).toThrow(TypeError);

        spy.mockRestore();
    });

    // FINDING MOR-UNKNOWN-1 (characterised, not endorsed): the switch on item.table_name has no
    // default arm, so a request type this screen does not know about (leaves, disputes, punch
    // alterations - all of which the same endpoint can return) renders an empty Request
    // Information pair and an eye icon whose link is the empty string, i.e. the current page.
    // The user clicks "view" and nothing happens.
    test('a_request_of_a_type_this_screen_does_not_know_renders_a_dead_view_link_and_no_details_FINDING_MOR_UNKNOWN_1', async () => {
        const props = morProps({
            requestList: {
                result: {
                    data: [{ ...REQ_OT, table_name: 'alter_log_punches', fourth_column: null, fifth_column: null }],
                    current_page: 1, last_page: 1,
                },
                record_number: '1',
            },
        });
        const { container } = renderMor(props);
        await flush();

        const cells = container.querySelectorAll('tbody.request_list tr td');
        expect(cells[2].textContent).toBe('');
        expect(cells[3].textContent).toBe('');
        expect(container.querySelector('a.nav-link').getAttribute('href')).toBe('/');
    });

    test('every_known_request_type_links_to_its_own_detail_page_carrying_the_return_path', async () => {
        const props = morProps();
        const { container } = renderMor(props);
        await flush();

        const links = Array.from(container.querySelectorAll('a.nav-link'));
        expect(links.length).toBe(4);
        expect(links.map((a) => a.getAttribute('href')))
            .toEqual(['/x/11', '/x/12', '/x/13', '/x/14']);
    });

    test('a_status_returned_in_title_case_is_badged_with_its_own_colour', async () => {
        const props = morProps();
        const { container } = renderMor(props);
        await flush();

        const badges = Array.from(container.querySelectorAll('td.status span[data-variant]'));
        expect(badges.map((b) => b.textContent))
            .toEqual(['Pending', 'Approved', 'Declined', 'Canceled']);
        expect(badges.map((b) => b.getAttribute('data-variant')))
            .toEqual(['secondary', 'success', 'danger', 'dark']);
    });

    // FINDING MOR-STATUS-CASE-1 (characterised, not endorsed): the Status helper switches on
    // "Pending" / "Canceled" / "Approved" / "Declined" - title case - and has no default arm, so
    // it returns an empty array. The status values this very screen sends to the server are
    // lowercase ("pending", "approved", ...). Any row the API returns in the same lowercase form
    // renders a completely empty Status cell: the colour class is still applied to the wrapping
    // div, so the cell is a coloured blank with no word in it.
    test('a_status_returned_in_lower_case_renders_a_coloured_but_completely_empty_status_cell_FINDING_MOR_STATUS_CASE_1', async () => {
        const props = morProps({
            requestList: {
                result: {
                    data: [{ ...REQ_ALTER, status: 'pending' }, { ...REQ_OT, status: 'approved' }],
                    current_page: 1, last_page: 1,
                },
                record_number: '2',
            },
        });
        const { container } = renderMor(props);
        await flush();

        const cells = Array.from(container.querySelectorAll('td.status'));
        expect(cells.length).toBe(2);
        expect(cells.map((c) => c.textContent)).toEqual(['', '']);
        expect(cells.map((c) => c.firstChild.className)).toEqual(['pending', 'approved']);
        expect(container.querySelectorAll('td.status span[data-variant]').length).toBe(0);
    });

    // FINDING MOR-DEADPAGE-1 (characterised, not endorsed): lines 92-104 of the render build a
    // full <Field>/<Button className="pagination_btn"> element for every page of the result and
    // push it into a local `pagination` array that is never inserted into the returned JSX. The
    // real pager is the <Paginate> component further down. On a 60-page result that is 60 React
    // elements constructed and discarded on every keystroke and every tab click.
    test('the_render_builds_a_page_button_per_page_that_never_reaches_the_screen_FINDING_MOR_DEADPAGE_1', async () => {
        const props = morProps({
            requestList: { result: { data: ROWS, current_page: 1, last_page: 60 }, record_number: 'x' },
        });
        const { container, getByTestId } = renderMor(props);
        await flush();

        // not one of the 60 constructed buttons is in the document
        expect(container.querySelectorAll('.pagination_btn').length).toBe(0);
        // the only pager on screen is the real one
        expect(getByTestId('paginate').querySelectorAll('button').length).toBe(60);
    });
});
