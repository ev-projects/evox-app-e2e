/**
 * DRAFT — needs verification
 *
 * EVOX Jest P0: MyTeamRequests Container Tests
 * Source: src/container/MyTeam/MyTeamRequests/MyTeamRequests.js
 * Business case: Manager-facing view that lists all pending/approved/cancelled/declined
 * requests from their direct-report team.  Managers can filter by date range,
 * department, employee name, and status, and can bulk-approve or bulk-deny records.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// react-redux: connect passthrough (component receives props directly)
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

// ---------------------------------------------------------------------------
// GridComponent / AdminLte layout shells
// ---------------------------------------------------------------------------
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Template wrappers
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);

// ---------------------------------------------------------------------------
// DatePickerComponent
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" data-testid={`datepicker-${name}`} />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));

// ---------------------------------------------------------------------------
// RequestButtons (not directly used in this component but follows pattern)
// ---------------------------------------------------------------------------
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);

// ---------------------------------------------------------------------------
// Authenticator service — scanFeature returns true so all tabs render,
// scanLevel returns false so the ShowAll checkbox is hidden (simpler tree)
// ---------------------------------------------------------------------------
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Validator service — isValid returns true for any truthy value
// ---------------------------------------------------------------------------
jest.mock('../../services/Validator', () => ({
    isValid: jest.fn((v) => v != null && v !== '' && v !== false),
}));

// ---------------------------------------------------------------------------
// Formatter service
// ---------------------------------------------------------------------------
jest.mock('../../services/Formatter', () => ({
    slug_to_title: jest.fn((s) => s),
}));

// ---------------------------------------------------------------------------
// PageLoading — shown when isListLoaded is false
// ---------------------------------------------------------------------------
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading">Loading...</div>);

// ---------------------------------------------------------------------------
// react-bootstrap — passthrough stubs so the component tree renders cleanly
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children, ...rest }) => <div {...rest}>{children}</div>;
    return {
        Container:   passthrough,
        Col:         passthrough,
        Row:         passthrough,
        Table:       ({ children }) => <table>{children}</table>,
        Button:      ({ children, onClick, type, ...rest }) => (
            <button onClick={onClick} type={type} {...rest}>{children}</button>
        ),
        Badge:       ({ children }) => <span>{children}</span>,
        Tabs:        ({ children }) => <div data-testid="tabs">{children}</div>,
        Tab:         ({ children, title }) => <div data-testid={`tab-${title}`}>{children}</div>,
        Pagination:  ({ children }) => <div>{children}</div>,
        FormControl: (props) => <input {...props} />,
        ToggleButton: ({ children, onClick, checked, ...rest }) => (
            <button
                onClick={onClick}
                data-checked={String(checked)}
                data-testid={`toggle-${rest.className || 'btn'}`}
                {...rest}
            >
                {children}
            </button>
        ),
        ButtonGroup: ({ children }) => <div data-testid="button-group">{children}</div>,
    };
});

// ---------------------------------------------------------------------------
// Store action mocks (dispatch targets)
// ---------------------------------------------------------------------------
jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchRequestList:   jest.fn(() => Promise.resolve()),
    fetchStatusNumbers: jest.fn(() => Promise.resolve()),
    bulkRequest:        jest.fn(() => Promise.resolve()),
}));

// ---------------------------------------------------------------------------
// global.links stub (used in link building inside the render loop)
// ---------------------------------------------------------------------------
global.links = {
    base:            '/',
    alter_log:       '/team/AlterLog/',
    alter_log_punch: '/team/AlterLogPunch/',
    overtime:        '/team/Overtime/',
    rest_day_work:   '/team/RestDayWork/',
    change_schedule: '/team/ChangeSchedule/',
};

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
const mockFetchRequestList   = jest.fn(() => Promise.resolve());
const mockFetchStatusNumbers = jest.fn(() => Promise.resolve());
const mockBulkRequest        = jest.fn(() => Promise.resolve());

/** A minimal loaded request list with one pending alter_log record */
const loadedRequestList = {
    result: {
        data: [
            {
                id:            1,
                table_name:    'alter_logs',
                status:        'Pending',
                created_by:    'Juan dela Cruz',
                department_name: 'Engineering',
                created_at:    '2026-06-01',
                date_requested:'2026-06-01',
                employee_note: 'Forgot to clock in',
                updated_by:    null,
                updated_at:    null,
                fourth_column: { current_time_in: '08:00', current_time_out: '17:00' },
                fifth_column:  { new_time_in: '08:30', new_time_out: '17:30' },
            },
        ],
        last_page:    1,
        current_page: 1,
        department:   [],
    },
    record_number: '1-1 of 1',
};

/** An empty loaded request list */
const emptyRequestList = {
    result: {
        data:         [],
        last_page:    1,
        current_page: 1,
        department:   [],
    },
    record_number: '0-0 of 0',
};

const baseProps = {
    // Action creators (unconnected render; connect is passthrough)
    fetchRequestList: jest.fn(() => Promise.resolve({ data: {} })),
    fetchStatusNumbers: jest.fn(() => Promise.resolve({ data: {} })),
    bulkRequest: jest.fn(),
    user: {
        id:                         1,
        full_name:                  'Test Manager',
        pov_timezone:               'Asia/Manila',
        departments_handled_strict: [],
    },
    requestList:      loadedRequestList,
    isListLoaded:     true,
    isNumbersLoaded:  false,
    statusNumbers:    {},
    filters:          null,
    settings: {
        current_payroll_cutoff: {
            start_date: '2026-06-01',
            end_date:   '2026-06-15',
        },
    },
    fetchRequestList:   mockFetchRequestList,
    fetchStatusNumbers: mockFetchStatusNumbers,
    bulkRequest:        mockBulkRequest,
    dispatch:           jest.fn(),
    history:            { push: jest.fn() },
    location:           { search: '' },
    match:              { params: {} },
};

// ---------------------------------------------------------------------------
// Component loader (handles named or default export)
// ---------------------------------------------------------------------------
let MyTeamRequests;
try {
    const m = require('../../container/MyTeam/MyTeamRequests/MyTeamRequests');
    MyTeamRequests = m.MyTeamRequests || m.default;
} catch {
    MyTeamRequests = require('../../container/MyTeam/MyTeamRequests/MyTeamRequests').default;
}

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <MyTeamRequests {...baseProps} {...props} />
        </MemoryRouter>
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('MyTeamRequests container', () => {
    beforeEach(() => jest.clearAllMocks());

    // 1. Smoke test
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    // 2. Request list renders (at least one row when data is present)
    test('renders request list rows when data is loaded', () => {
        const { getByText } = renderComponent();
        // Employee name from the fixture should appear in the table
        expect(getByText(/Juan dela Cruz/i)).toBeInTheDocument();
    });

    // 3. Status filter buttons are visible
    test('renders Pending status filter button', () => {
        const { getAllByText } = renderComponent();
        const pendingEls = getAllByText(/Pending/i);
        expect(pendingEls.length).toBeGreaterThan(0);
    });

    test('renders Approved status filter button', () => {
        const { getAllByText } = renderComponent();
        const approvedEls = getAllByText(/Approved/i);
        expect(approvedEls.length).toBeGreaterThan(0);
    });

    test('renders Cancelled status filter button', () => {
        const { getAllByText } = renderComponent();
        const cancelledEls = getAllByText(/Cancelled/i);
        expect(cancelledEls.length).toBeGreaterThan(0);
    });

    test('renders Declined status filter button', () => {
        const { getAllByText } = renderComponent();
        const declinedEls = getAllByText(/Declined/i);
        expect(declinedEls.length).toBeGreaterThan(0);
    });

    // 4. Loading state — PageLoading shown instead of list
    test('renders PageLoading when isListLoaded is false', () => {
        const { getByTestId } = renderComponent({ isListLoaded: false });
        expect(getByTestId('page-loading')).toBeInTheDocument();
    });

    test('does not render request table during loading state', () => {
        const { queryByText } = renderComponent({ isListLoaded: false });
        expect(queryByText(/Juan dela Cruz/i)).not.toBeInTheDocument();
    });

    // 5. Empty state — no data in list, component must not crash
    test('does not crash when request list is empty', () => {
        expect(() => renderComponent({ requestList: emptyRequestList })).not.toThrow();
    });

    test('shows no-record message when list is empty', () => {
        const { getByText } = renderComponent({ requestList: emptyRequestList });
        expect(getByText(/Sorry, No Record Found/i)).toBeInTheDocument();
    });

    // 6. fetchRequestList is called on mount
    test('calls fetchRequestList on mount', () => {
        renderComponent({ isListLoaded: false });
        expect(mockFetchRequestList).toHaveBeenCalled();
    });

    // 7. Does not crash when settings payroll cutoff is absent
    test('does not crash when current_payroll_cutoff is null', () => {
        expect(() =>
            renderComponent({ settings: { current_payroll_cutoff: null } })
        ).not.toThrow();
    });
});
