/**
 * evoxtest_MyTeamAllRequestDeep2.test.js
 * Wave-1 interaction coverage for container/MyTeam/MyTeamRequests/MyTeamAllRequest.js
 * (29 Jul baseline: 114 uncovered lines / 22.4%). Near-clone of MyTeamRequests with
 * different filter defaults (no payroll-cutoff dates, request_type from
 * props.requesttype defaulting to 'alteration'). Same arms targeted: 5-way
 * table_name switch, Status badges, selectAll, toggles, tabs, bulk paths.
 * ADDITIVE ONLY. Menu: My Team → All Requests (route: my_team_all_requests).
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
    const passthrough = ({ children }) => <div>{children}</div>;
    return {
        Container:   passthrough,
        Col:         passthrough,
        Row:         passthrough,
        Table:       ({ children }) => <table>{children}</table>,
        Button:      ({ children, onClick, type }) => (
            <button onClick={onClick} type={type}>{children}</button>
        ),
        Badge:       ({ children }) => <span>{children}</span>,
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
    requesttype: null, // → request_type defaults to 'alteration'
    settings: { current_payroll_cutoff: { start_date: '2026-06-01', end_date: '2026-06-15' } },
    fetchRequestList: mockFetchRequestList,
    fetchStatusNumbers: mockFetchStatusNumbers,
    bulkRequest: mockBulkRequest,
    dispatch: jest.fn(),
    history: { push: jest.fn() },
    location: { search: '' },
    match: { params: {} },
};

const MyTeamAllRequest = require('../../container/MyTeam/MyTeamRequests/MyTeamAllRequest').default;

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <MyTeamAllRequest {...baseProps} {...props} />
        </MemoryRouter>
    );
}

function triggerDidUpdate(utils, props = {}) {
    utils.rerender(
        <MemoryRouter>
            <MyTeamAllRequest {...baseProps} {...props}
                requestList={{ ...loadedRequestList, result: { ...loadedRequestList.result } }} />
        </MemoryRouter>
    );
}

describe('MyTeamAllRequest — table_name switch renders every request type', () => {
    beforeEach(() => jest.clearAllMocks());

    test('all five request-type rows render their type-specific columns', () => {
        const { getByText, getAllByText, container } = renderComponent();

        getByText('In: 08:30');
        getByText('In: 08:00');
        expect(container.textContent).toContain('Late,');
        expect(container.textContent).not.toContain('Undertime,');
        expect(container.textContent).toContain('Rest Days: sat, sun');
        expect(getAllByText('New').length).toBe(2);
        expect(getAllByText('Old').length).toBe(2);
        getByText('From: 2026-06-20');
        getByText('2 hours');

        const rowCheckboxes = container.querySelectorAll('input[name="checkedList"]');
        expect(rowCheckboxes.length).toBe(4); // Canceled row has none
    });

    test('empty list renders the no-record arm; unloaded renders PageLoading', () => {
        const empty = renderComponent({
            requestList: { result: { data: [], last_page: 1, current_page: 1, department: [] }, record_number: '0' },
        });
        empty.getByText('Sorry, No Record Found');

        const loading = renderComponent({ isListLoaded: false });
        loading.getByTestId('page-loading');
    });
});

describe('MyTeamAllRequest — filters and submit', () => {
    beforeEach(() => jest.clearAllMocks());

    test('status toggle submits with that status; request_type defaults to alteration', async () => {
        const { getAllByText, findByText } = renderComponent();
        fireEvent.click(getAllByText(/^Declined/)[0]);
        await findByText(/All Request|My Team/);

        expect(mockFetchRequestList).toHaveBeenCalled();
        // componentDidMount always fires an initial fetch here — assert the toggle's call
        const calls = mockFetchRequestList.mock.calls;
        const formData = calls[calls.length - 1][0];
        expect(formData.status).toBe('declined');
        expect(formData.request_type).toBe('alteration'); // default from props.requesttype null
        expect(formData.page).toBe(1);
    });

    test('requesttype prop seeds the active request_type', async () => {
        const { getAllByText, findByText } = renderComponent({ requesttype: 'overtime' });
        fireEvent.click(getAllByText(/^Pending/)[0]);
        await findByText(/All Request|My Team/);
        const calls = mockFetchRequestList.mock.calls;
        const formData = calls[calls.length - 1][0];
        expect(formData.request_type).toBe('overtime');
    });

    test('tab switch submits the selected request_type', async () => {
        const { getByTestId, findByText } = renderComponent();
        fireEvent.click(getByTestId('tab-switch-overtime'));
        await findByText(/All Request|My Team/);
        const calls = mockFetchRequestList.mock.calls;
        const formData = calls[calls.length - 1][0];
        expect(formData.request_type).toBe('overtime');
    });

    test('department select + Filter submits the filter set (componentDidUpdate arm)', async () => {
        const utils = renderComponent();
        triggerDidUpdate(utils);
        const { container, getByText, findByText } = utils;

        const deptSelect = container.querySelector('select[name="department_id"]');
        expect(Array.from(deptSelect.querySelectorAll('option')).map((o) => o.label)).toContain('Engineering');

        fireEvent.change(deptSelect, { target: { value: '5' } });
        fireEvent.click(getByText('Filter'));
        await findByText(/All Request|My Team/);

        const calls = mockFetchRequestList.mock.calls;
        const formData = calls[calls.length - 1][0];
        expect(formData.department_id).toBe('5');
        // unlike MyTeamRequests, this variant's Filter button only sets page+action —
        // use_filter stays 0 (verified against source line ~378)
        expect(formData.page).toBe(1);
    });
});

describe('MyTeamAllRequest — bulk action path', () => {
    beforeEach(() => jest.clearAllMocks());

    test('checked rows + approve action → bulkRequest then list refresh', async () => {
        const { container, getByText, findByText } = renderComponent();

        fireEvent.click(container.querySelector('input[name="checkedList"][value="1.alter_logs"]'));
        fireEvent.change(container.querySelector('select[name="bulk_action"]'), { target: { value: 'approve' } });
        fireEvent.click(getByText('Update'));

        await findByText(/All Request|My Team/);
        expect(mockBulkRequest).toHaveBeenCalledTimes(1);
        const bulkData = mockBulkRequest.mock.calls[0][0];
        expect(bulkData.bulk_action).toBe('approve');
        expect(bulkData.checkedList).toEqual(['1.alter_logs']);
        expect(mockFetchRequestList).toHaveBeenCalledTimes(2); // mount + post-bulk refresh
    });

    test('select-all checks every non-Canceled row; unchecking clears', () => {
        const { container } = renderComponent();
        const selectAll = container.querySelector('input[name="isAll"]');

        fireEvent.click(selectAll);
        let checked = Array.from(container.querySelectorAll('input[name="checkedList"]')).filter((c) => c.checked);
        expect(checked.length).toBe(4);

        fireEvent.click(selectAll);
        checked = Array.from(container.querySelectorAll('input[name="checkedList"]')).filter((c) => c.checked);
        expect(checked.length).toBe(0);
    });

    test('bulkRequest failure is caught (error path, no crash)', async () => {
        mockBulkRequest.mockRejectedValueOnce(new Error('HTTP 500'));
        const { container, getByText, findByText } = renderComponent();

        fireEvent.click(container.querySelector('input[name="checkedList"][value="1.alter_logs"]'));
        fireEvent.change(container.querySelector('select[name="bulk_action"]'), { target: { value: 'deny' } });
        fireEvent.click(getByText('Update'));

        await findByText(/All Request|My Team/);
        expect(mockBulkRequest).toHaveBeenCalled();
        expect(mockFetchRequestList).toHaveBeenCalledTimes(1); // mount only — refresh skipped by catch
    });
});
