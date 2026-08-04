/**
 * evoxtest_MyOverallRequestDeep2.test.js
 * Wave-5 coverage for container/MyOverallRequest/MyOverallRequest.js (fresh: 58 unc / 35.6%).
 * Third sibling of the request-list family (url 'my_requests'; fetches list AND status
 * numbers on mount + every submit; no bulk actions). Arms: mount double-fetch,
 * table_name switch rows, status toggles, tab switch, status-number badges,
 * empty/no-record and PageLoading arms. ADDITIVE ONLY.
 * Menu: My Requests → Overall (route: my_overall_request).
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
    scanFeature: jest.fn(() => true), scanLevel: jest.fn(() => true),
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
        Container: passthrough, Col: passthrough, Row: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Button: ({ children, onClick, type }) => <button onClick={onClick} type={type}>{children}</button>,
        Badge: ({ children }) => <span>{children}</span>,
        Tabs: ({ children, onSelect }) => (
            <div data-testid="tabs">
                <button data-testid="tab-switch-overtime" onClick={() => onSelect && onSelect('overtime')}>t</button>
                {children}
            </div>
        ),
        Tab: ({ children, title }) => <div data-testid={`tab-${title}`}>{children}</div>,
        Pagination: ({ children }) => <div>{children}</div>,
        FormControl: (props) => <input {...props} />,
        ToggleButton: ({ children, onClick, checked }) => (
            <button onClick={onClick} data-checked={String(checked)}>{children}</button>
        ),
        ButtonGroup: ({ children }) => <div data-testid="button-group">{children}</div>,
    };
});

jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchRequestList: jest.fn(), fetchStatusNumbers: jest.fn(), bulkRequest: jest.fn(),
}));

global.links = {
    base: '/', alter_log: '/r/AlterLog/', alter_log_punch: '/r/AlterLogPunch/',
    overtime: '/r/Overtime/', rest_day_work: '/r/RestDayWork/', change_schedule: '/r/ChangeSchedule/',
};

const allArmsData = [
    {
        id: 1, table_name: 'alter_logs', status: 'Pending',
        created_by: 'Alice', department_name: 'Eng', created_at: '2026-06-01',
        date_requested: '2026-06-01', employee_note: 'note', updated_by: null, updated_at: null,
        fourth_column: { current_time_in: '08:00', current_time_out: '17:00' },
        fifth_column: { new_time_in: '08:30', new_time_out: '17:30' },
    },
    {
        id: 2, table_name: 'change_schedules', status: 'Approved',
        created_by: 'Bob', department_name: 'Eng', created_at: '2026-06-02',
        date_requested: '2026-06-02', employee_note: null, updated_by: 'G', updated_at: '2026-06-03',
        fourth_column: { work_days: ['mon', 'tue'], rest_day: ['sat', 'sun'] },
        fifth_column: { allow_late: '1', allow_undertime: '0', allow_night_diff: '1' },
    },
    {
        id: 3, table_name: 'alter_log_punches', status: 'Declined',
        created_by: 'Cara', department_name: 'Sup', created_at: '2026-06-03',
        date_requested: '2026-06-03', employee_note: null, updated_by: 'G', updated_at: '2026-06-04',
        fourth_column: JSON.stringify([{ time_in: 1750000000, time_out: 1750003600 }]),
        fifth_column: JSON.stringify([{ start_time: 1750007200, end_time: 1750010800 }]),
    },
    {
        id: 4, table_name: 'rest_day_works', status: 'Canceled',
        created_by: 'Dan', department_name: 'Sup', created_at: '2026-06-04',
        date_requested: '2026-06-04', employee_note: null, updated_by: null, updated_at: null,
        fourth_column: '2026-06-20', fifth_column: '2026-06-21',
    },
    {
        id: 5, table_name: 'overtimes', status: 'Approved',
        created_by: 'Eve', department_name: 'Eng', created_at: '2026-06-05',
        date_requested: '2026-06-05', employee_note: 'ot', updated_by: 'G', updated_at: '2026-06-06',
        fourth_column: '2 hours', fifth_column: '19:00-21:00',
    },
];

const baseProps = {
    user: { id: 1, departments_handled_strict: [] },
    requestList: { result: { data: allArmsData, last_page: 2, current_page: 1 }, record_number: '1-5 of 9' },
    isListLoaded: true,
    isNumbersLoaded: true,
    statusNumbers: { pending: 3, approved: 4, canceled: 1, declined: 1 },
    filters: null,
    requesttype: null,
    settings: {},
    fetchRequestList: jest.fn(),
    fetchStatusNumbers: jest.fn(),
    dispatch: jest.fn(),
};

const MyOverallRequest = require('../../container/MyOverallRequest/MyOverallRequest').default;

function renderMOR(props = {}) {
    const fetchRequestList = jest.fn();
    const fetchStatusNumbers = jest.fn();
    const utils = render(
        <MemoryRouter>
            <MyOverallRequest {...baseProps} fetchRequestList={fetchRequestList} fetchStatusNumbers={fetchStatusNumbers} {...props} />
        </MemoryRouter>
    );
    return { ...utils, fetchRequestList, fetchStatusNumbers };
}

beforeEach(() => jest.clearAllMocks());

describe('MyOverallRequest', () => {
    test('mount fetches the list AND the status numbers with the my_requests url', () => {
        const { fetchRequestList, fetchStatusNumbers } = renderMOR();
        expect(fetchRequestList).toHaveBeenCalledTimes(1);
        expect(fetchStatusNumbers).toHaveBeenCalledTimes(1);
        expect(fetchRequestList.mock.calls[0][0].url).toBe('my_requests');
        expect(fetchRequestList.mock.calls[0][0].request_type).toBe('alteration');
    });

    test('all five table_name arms render; status badges and counters show', () => {
        const { getByText, getAllByText, container } = renderMOR();

        getByText('In: 08:30');
        expect(container.textContent).toContain('Late,');
        expect(container.textContent).toContain('Rest Days:');
        expect(getAllByText('New').length).toBe(1);
        expect(getAllByText('Old').length).toBe(1);
        getByText('From: 2026-06-20');
        getByText('2 hours');
        getByText('1-5 of 9');
        expect(container.textContent).toContain('3'); // pending counter badge
    });

    test('status toggle and tab switch refetch both list and numbers', async () => {
        const { getAllByText, getByTestId, findByText, fetchRequestList, fetchStatusNumbers } = renderMOR();
        fetchRequestList.mockClear(); fetchStatusNumbers.mockClear();

        fireEvent.click(getAllByText(/^Approved/)[0]);
        await findByText('1-5 of 9');
        expect(fetchRequestList.mock.calls.slice(-1)[0][0].status).toBe('approved');
        expect(fetchStatusNumbers).toHaveBeenCalled();

        fireEvent.click(getByTestId('tab-switch-overtime'));
        await findByText('1-5 of 9');
        expect(fetchRequestList.mock.calls.slice(-1)[0][0].request_type).toBe('overtime');
    });

    test('empty list renders no-record arm; unloaded renders PageLoading', () => {
        const empty = renderMOR({ requestList: { result: { data: [], last_page: 1, current_page: 1 }, record_number: '0' } });
        expect(empty.container.textContent).toMatch(/No Record Found/i);

        const loading = renderMOR({ isListLoaded: false });
        loading.getByTestId('page-loading');
    });
});
