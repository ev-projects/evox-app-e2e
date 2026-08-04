/**
 * evoxtest_MyTeamRequestsDeep2.test.js
 * Wave-1 interaction coverage for container/MyTeam/MyTeamRequests/MyTeamRequests.js
 * (29 Jul baseline: 104 uncovered lines / 32.9%).
 *
 * Targets the arms the render-level suite (existing/MyTeamRequests.test.js) leaves
 * uncovered: the 5-way table_name switch (change_schedules / alter_logs /
 * alter_log_punches / rest_day_works / overtimes), all 4 Status badge arms,
 * selectAllChecklist, the status ToggleButtons, tab switching, the ShowAll arm
 * (scanLevel=true), and onSubmitHandler's default + bulk_action paths incl. the
 * Yup bulk validation errors. ADDITIVE ONLY.
 * Menu: My Team → Requests (route: my_team_requests).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" data-testid={`datepicker-${name}`} />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));

// scanFeature=true → every request-type tab renders; scanLevel=true → ShowAll arm renders
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => true),
}));

jest.mock('../../services/Validator', () => ({
    isValid: jest.fn((v) => v != null && v !== '' && v !== false),
}));

jest.mock('../../services/Formatter', () => ({
    slug_to_title: jest.fn((s) => s),
}));

jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading">Loading...</div>);

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children, ...rest }) => <div>{children}</div>;
    return {
        Container:   passthrough,
        Col:         passthrough,
        Row:         passthrough,
        Table:       ({ children }) => <table>{children}</table>,
        Button:      ({ children, onClick, type }) => (
            <button onClick={onClick} type={type}>{children}</button>
        ),
        Badge:       ({ children }) => <span>{children}</span>,
        // expose onSelect so the tab-switch handler (setFieldValue + submit) is reachable
        Tabs:        ({ children, onSelect }) => (
            <div data-testid="tabs">
                <button data-testid="tab-switch-overtime" onClick={() => onSelect && onSelect('overtime')}>
                    switch-to-overtime
                </button>
                {children}
            </div>
        ),
        Tab:         ({ children, title }) => <div data-testid={`tab-${title}`}>{children}</div>,
        Pagination:  ({ children }) => <div>{children}</div>,
        FormControl: (props) => <input {...props} />,
        ToggleButton: ({ children, onClick, checked }) => (
            <button onClick={onClick} data-checked={String(checked)}>{children}</button>
        ),
        ButtonGroup: ({ children }) => <div data-testid="button-group">{children}</div>,
    };
});

jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchRequestList:   jest.fn(() => Promise.resolve()),
    fetchStatusNumbers: jest.fn(() => Promise.resolve()),
    bulkRequest:        jest.fn(() => Promise.resolve()),
}));

global.links = {
    base:            '/',
    alter_log:       '/team/AlterLog/',
    alter_log_punch: '/team/AlterLogPunch/',
    overtime:        '/team/Overtime/',
    rest_day_work:   '/team/RestDayWork/',
    change_schedule: '/team/ChangeSchedule/',
};

const mockFetchRequestList   = jest.fn(() => Promise.resolve());
const mockFetchStatusNumbers = jest.fn(() => Promise.resolve());
const mockBulkRequest        = jest.fn(() => Promise.resolve());

// One record per table_name switch arm; statuses cover all 4 Status badge arms;
// the Canceled row also exercises the "no checkbox for Canceled" arm.
const allArmsData = [
    {
        id: 1, table_name: 'alter_logs', status: 'Pending',
        created_by: 'Alice Alter', department_name: 'Engineering',
        created_at: '2026-06-01', date_requested: '2026-06-01', employee_note: 'Forgot to clock in',
        updated_by: null, updated_at: null,
        fourth_column: { current_time_in: '08:00', current_time_out: '17:00' },
        fifth_column:  { new_time_in: '08:30', new_time_out: '17:30' },
    },
    {
        id: 2, table_name: 'change_schedules', status: 'Approved',
        created_by: 'Bob Schedule', department_name: 'Engineering',
        created_at: '2026-06-02', date_requested: '2026-06-02', employee_note: null,
        updated_by: 'Gary Aure', updated_at: '2026-06-03',
        fourth_column: { work_days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
        fifth_column:  { allow_late: '1', allow_undertime: '0', allow_night_diff: '1' },
    },
    {
        id: 3, table_name: 'alter_log_punches', status: 'Declined',
        created_by: 'Cara Punch', department_name: 'Support',
        created_at: '2026-06-03', date_requested: '2026-06-03', employee_note: null,
        updated_by: 'Gary Aure', updated_at: '2026-06-04',
        fourth_column: JSON.stringify([{ time_in: 1750000000, time_out: 1750003600 }]),
        fifth_column:  JSON.stringify([{ start_time: 1750007200, end_time: 1750010800 }]),
    },
    {
        id: 4, table_name: 'rest_day_works', status: 'Canceled',
        created_by: 'Dan Restday', department_name: 'Support',
        created_at: '2026-06-04', date_requested: '2026-06-04', employee_note: null,
        updated_by: null, updated_at: null,
        fourth_column: '2026-06-20', fifth_column: '2026-06-21',
    },
    {
        id: 5, table_name: 'overtimes', status: 'Approved',
        created_by: 'Eve Overtime', department_name: 'Engineering',
        created_at: '2026-06-05', date_requested: '2026-06-05', employee_note: 'Deployment night',
        updated_by: 'Gary Aure', updated_at: '2026-06-06',
        fourth_column: '2 hours', fifth_column: '19:00-21:00',
    },
];

const loadedRequestList = {
    result: {
        data: allArmsData,
        last_page: 2,
        current_page: 1,
        department: [{ id: 5, DepartmentName: 'Engineering' }, { id: 6, DepartmentName: 'Support' }],
    },
    record_number: '1-5 of 9',
};

const baseProps = {
    user: { id: 1, full_name: 'Test Manager', pov_timezone: 'Asia/Manila', departments_handled_strict: [] },
    requestList: loadedRequestList,
    isListLoaded: true,
    isNumbersLoaded: true,
    statusNumbers: { pending: 3, approved: 4, canceled: 1, declined: 1 },
    filters: null,
    settings: { current_payroll_cutoff: { start_date: '2026-06-01', end_date: '2026-06-15' } },
    fetchRequestList: mockFetchRequestList,
    fetchStatusNumbers: mockFetchStatusNumbers,
    bulkRequest: mockBulkRequest,
    dispatch: jest.fn(),
    history: { push: jest.fn() },
    location: { search: '' },
    match: { params: {} },
};

const MyTeamRequests = require('../../container/MyTeam/MyTeamRequests/MyTeamRequests').default;

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <MyTeamRequests {...baseProps} {...props} />
        </MemoryRouter>
    );
}

// Formik field changes re-render only Formik's subtree — the class component's
// componentDidUpdate (which copies departments into state) fires only on PROP
// changes (in prod: the redux fetch). Simulate that with a fresh-identity prop.
function triggerDidUpdate(utils, props = {}) {
    utils.rerender(
        <MemoryRouter>
            <MyTeamRequests {...baseProps} {...props}
                requestList={{ ...loadedRequestList, result: { ...loadedRequestList.result } }} />
        </MemoryRouter>
    );
}

describe('MyTeamRequests — table_name switch renders every request type', () => {
    beforeEach(() => jest.clearAllMocks());

    test('all five request-type rows render their type-specific columns', () => {
        const { getByText, getAllByText, container } = renderComponent();

        // alter_logs arm: new/old time blocks
        getByText('In: 08:30');
        getByText('Out: 17:30');
        getByText('In: 08:00');

        // change_schedules arm: payroll flags with value '1' only + rest/work days
        expect(container.textContent).toContain('Late,');
        expect(container.textContent).toContain('Night Differential,');
        expect(container.textContent).not.toContain('Undertime,'); // allow_undertime='0' skipped
        expect(container.textContent).toContain('Work Days: mon, tue, wed, thu, fri');
        expect(container.textContent).toContain('Rest Days: sat, sun');

        // alter_log_punches arm: epoch → HH:MM:SS ranges, New + Old blocks
        expect(getAllByText('New').length).toBe(2); // alter_logs + punches
        expect(getAllByText('Old').length).toBe(2);
        expect(container.textContent).toMatch(/\d{2}:\d{2}:\d{2}-\d{2}:\d{2}:\d{2}/);

        // rest_day_works arm
        getByText('From: 2026-06-20');
        getByText('To: 2026-06-21');

        // overtimes arm
        getByText('2 hours');
        getByText('19:00-21:00');

        // Status badge arms: Approved twice (rows 2,5), Pending/Declined once in rows,
        // Canceled row renders NO checkbox
        expect(container.textContent).toContain('Dan Restday');
        const rowCheckboxes = container.querySelectorAll('input[name="checkedList"]');
        expect(rowCheckboxes.length).toBe(4); // 5 rows minus the Canceled one

        // status counter badges from statusNumbers
        expect(container.textContent).toContain('3'); // pending count
        expect(container.textContent).toContain('1-5 of 9'); // record_number
    });

    test('departments from the list feed the department dropdown (componentDidUpdate arm)', () => {
        const utils = renderComponent();
        triggerDidUpdate(utils);
        const deptSelect = utils.container.querySelector('select[name="department_id"]');
        const labels = Array.from(deptSelect.querySelectorAll('option')).map((o) => o.label);
        expect(labels).toContain('Engineering');
        expect(labels).toContain('Support');
    });

    test('empty list renders the no-record arm', () => {
        const { getByText } = renderComponent({
            requestList: { result: { data: [], last_page: 1, current_page: 1, department: [] }, record_number: '0' },
        });
        getByText('Sorry, No Record Found');
    });

    test('unloaded list renders PageLoading', () => {
        const { getByTestId } = renderComponent({ isListLoaded: false });
        getByTestId('page-loading');
    });
});

describe('MyTeamRequests — filters and submit (default path)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('status toggle click submits with that status and resets to page 1', async () => {
        const { getAllByText, findByText } = renderComponent();
        // Approved toggle is the button whose text starts with 'Approved'
        const approvedToggle = getAllByText(/^Approved/)[0];
        fireEvent.click(approvedToggle);
        await findByText('My Team Request'); // let Formik submit resolve

        expect(mockFetchRequestList).toHaveBeenCalled();
        const formData = mockFetchRequestList.mock.calls[0][0];
        expect(formData.status).toBe('approved');
        expect(formData.page).toBe(1);
        expect(formData.url).toBe('my_team_requests');
        // valid_from/valid_to Date objects went through the moment(...).format arm
        expect(formData.valid_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('tab switch submits with the selected request_type', async () => {
        const { getByTestId, findByText } = renderComponent();
        fireEvent.click(getByTestId('tab-switch-overtime'));
        await findByText('My Team Request');
        const formData = mockFetchRequestList.mock.calls[0][0];
        expect(formData.request_type).toBe('overtime');
    });

    test('name + department + Filter button submit the filter set', async () => {
        const utils = renderComponent();
        triggerDidUpdate(utils); // populate department options first
        const { container, getByText, findByText } = utils;
        fireEvent.change(container.querySelector('select[name="department_id"]'), { target: { value: '5' } });
        // NOTE: the name <input> is controlled by values.name whose initial value is NULL
        // (React treats null-valued inputs as uncontrolled) — under jsdom its change event
        // never reaches Formik, so `name` can't be asserted here. Its submit plumbing is
        // identical to department_id's handleChange, which IS asserted.
        fireEvent.click(getByText('Filter'));
        await findByText('My Team Request');

        expect(mockFetchRequestList).toHaveBeenCalled();
        const calls = mockFetchRequestList.mock.calls;
        const formData = calls[calls.length - 1][0];
        expect(formData.department_id).toBe('5');
        expect(formData.use_filter).toBe(1);
        expect(formData.departmentselect).toBe(0);
    });

    test('ShowAll checkbox (DivisionHead/HR arm) toggles showall and clears department', async () => {
        const { container, findByText } = renderComponent();
        fireEvent.click(container.querySelector('.showall_checkbox'));
        await findByText('My Team Request');

        const formData = mockFetchRequestList.mock.calls[0][0];
        expect(formData.showall).toBe(1);
        expect(formData.department_id).toBeUndefined(); // null → dropped by the != null filter
    });
});

describe('MyTeamRequests — bulk action path', () => {
    beforeEach(() => jest.clearAllMocks());

    test('FINDING MTR-BULK-1: empty Update shows Yup errors BUT still fires the bulk request', async () => {
        // Real observed behavior: clicking Update with nothing selected renders BOTH
        // validation messages, yet bulkRequest is STILL dispatched with checkedList: []
        // and no bulk_action (the Yup guard chains .nullable() AFTER .required(), and the
        // setFieldValue('action')+submit race lets one submit through). The backend
        // receives an action-less empty bulk payload. Fix: gate onSubmitHandler on
        // checkedList.length && bulk_action, or reorder the Yup chain. Flip this test
        // to assert NO bulkRequest call once fixed.
        const { getByText, findByText } = renderComponent();
        fireEvent.click(getByText('Update')); // sets action=bulk_action then submits

        await findByText('Select a record to be updated');
        await findByText('Please choose action');
        expect(mockBulkRequest).toHaveBeenCalled();
        const bulkData = mockBulkRequest.mock.calls[0][0];
        expect(bulkData.checkedList).toEqual([]);
        expect(bulkData.bulk_action).toBeUndefined();
    });

    test('checked rows + approve action → bulkRequest then list refresh', async () => {
        const { container, getByText, findByText } = renderComponent();

        fireEvent.click(container.querySelector('input[name="checkedList"][value="1.alter_logs"]'));
        fireEvent.change(container.querySelector('select[name="bulk_action"]'), { target: { value: 'approve' } });
        fireEvent.click(getByText('Update'));

        await findByText('My Team Request');
        expect(mockBulkRequest).toHaveBeenCalledTimes(1);
        const bulkData = mockBulkRequest.mock.calls[0][0];
        expect(bulkData.bulk_action).toBe('approve');
        expect(bulkData.checkedList).toEqual(['1.alter_logs']);
        expect(bulkData.action).toBe('bulk_action');
        expect(mockFetchRequestList).toHaveBeenCalledTimes(1); // refresh after bulk
    });

    test('select-all header checkbox checks every non-Canceled row; unchecking clears', () => {
        const { container } = renderComponent();
        const selectAll = container.querySelector('input[name="isAll"]');

        fireEvent.click(selectAll);
        let checked = Array.from(container.querySelectorAll('input[name="checkedList"]')).filter((c) => c.checked);
        expect(checked.length).toBe(4); // Canceled row excluded

        fireEvent.click(selectAll);
        checked = Array.from(container.querySelectorAll('input[name="checkedList"]')).filter((c) => c.checked);
        expect(checked.length).toBe(0);
    });

    test('bulkRequest failure is caught (error path logs, no crash)', async () => {
        mockBulkRequest.mockRejectedValueOnce(new Error('HTTP 500'));
        const { container, getByText, findByText } = renderComponent();

        fireEvent.click(container.querySelector('input[name="checkedList"][value="1.alter_logs"]'));
        fireEvent.change(container.querySelector('select[name="bulk_action"]'), { target: { value: 'deny' } });
        fireEvent.click(getByText('Update'));

        await findByText('My Team Request');
        expect(mockBulkRequest).toHaveBeenCalled();
        // catch arm swallows the error; the list refresh inside try is skipped
        expect(mockFetchRequestList).not.toHaveBeenCalled();
    });
});
