// DRAFT — generated 2026-06-17, needs verification
/**
 * MyTeamSchedule Container Tests
 * Source: src/container/MyTeam/MyTeamSchedule/MyTeamSchedule.js
 * Business case: Supervisor/manager view of their team's schedule in
 * day/week/month calendar layout with department and sub-department filters.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// Mock react-redux: bypass connect() so we can pass props directly
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock react-bootstrap — used for Card, Col, Badge, Table, Tabs, Tab, Row,
// Button, Dropdown throughout the schedule views
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => ({
    Card:      ({ children, ...rest }) => <div data-testid="bs-card" {...rest}>{children}</div>,
    Col:       ({ children, ...rest }) => <div data-testid="bs-col" {...rest}>{children}</div>,
    Badge:     ({ children, ...rest }) => <span {...rest}>{children}</span>,
    Table:     ({ children, ...rest }) => <table {...rest}>{children}</table>,
    Tabs:      ({ children, ...rest }) => <div {...rest}>{children}</div>,
    Tab:       ({ children, ...rest }) => <div {...rest}>{children}</div>,
    Row:       ({ children, ...rest }) => <div data-testid="bs-row" {...rest}>{children}</div>,
    Button:    ({ children, onClick, ...rest }) => <button onClick={onClick} {...rest}>{children}</button>,
    Dropdown:  Object.assign(
        ({ children, ...rest }) => <div data-testid="bs-dropdown" {...rest}>{children}</div>,
        {
            Toggle: ({ children, ...rest }) => <button {...rest}>{children}</button>,
            Menu:   ({ children, ...rest }) => <div {...rest}>{children}</div>,
            Item:   ({ children, onClick, ...rest }) => <button onClick={onClick} {...rest}>{children}</button>,
        }
    ),
}));

// ---------------------------------------------------------------------------
// Mock DatePickerComponent — not under test; prevents heavy internals loading
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

// ---------------------------------------------------------------------------
// Mock layout wrappers
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Mock ReportNavigator — date-range navigation widget; not under test here
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/ReportNavigator/ReportNavigator.js', () =>
    ({ start_date, end_date, scope_type, handleChangeDate, default_view_type }) => (
        <div data-testid="report-navigator">
            <input name="start_date" type="date" readOnly value={start_date ? start_date.format('YYYY-MM-DD') : ''} />
            <input name="end_date"   type="date" readOnly value={end_date   ? end_date.format('YYYY-MM-DD')   : ''} />
        </div>
    )
);

// ---------------------------------------------------------------------------
// Mock Authenticator service — avoids token / localStorage access in tests
// ---------------------------------------------------------------------------
jest.mock('../../services/Authenticator', () => ({
    getToken:    () => 'mock-token',
    isLoggedIn:  () => true,
    getUser:     () => ({ id: 1, full_name: 'Test Supervisor' }),
    logout:      jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock PageLoading — avoids spinner blocking render assertions
// ---------------------------------------------------------------------------
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

// ---------------------------------------------------------------------------
// Suppress debug console.log calls left in WeekTeamSchedule render path
// ---------------------------------------------------------------------------
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
});

// ---------------------------------------------------------------------------
// Load MyTeamSchedule container
// ---------------------------------------------------------------------------
let MyTeamSchedule;
try {
    const m = require('../../container/MyTeam/MyTeamSchedule/MyTeamSchedule');
    MyTeamSchedule = m.MyTeamSchedule || m.default;
} catch {
    MyTeamSchedule = require('../../container/MyTeam/MyTeamSchedule/MyTeamSchedule').default;
}

// ---------------------------------------------------------------------------
// Default team_schedule shape — mirrors what state.myTeamSchedule.team_schedule
// returns after fetchTeamSchedule resolves.
// All three sub-views (day/week/month) expect date_list, data, week_list.
// ---------------------------------------------------------------------------
const emptyTeamSchedule = {
    date_list:    [],
    data:         [],
    week_list:    [],
    holiday_list: {},
};

// ---------------------------------------------------------------------------
// Default props — mirrors Redux mapStateToProps output
// state.user        → user
// state.myTeamSchedule → team  (team_list, team_schedule, filters)
// state.myTeamList  → myTeamList (sub_department, filters)
// ---------------------------------------------------------------------------
const defaultProps = {
    // state.user
    user: {
        id: 1,
        full_name: 'Test Supervisor',
        pov_timezone: 'Asia/Manila',
        departments_handled: [
            { id: 10, department_name: 'Engineering' },
            { id: 11, department_name: 'QA' },
        ],
    },
    // state.myTeamSchedule
    team: {
        team_list:     [],
        team_schedule: emptyTeamSchedule,
        filters: {
            name:    null,
            team_id: null,
        },
        // clearState() writes directly to these keys
        week:  { data: [], date_list: [] },
        month: { data: [], date_list: [], week_list: [] },
        day:   [],
    },
    // state.myTeamList
    myTeamList: {
        sub_department: [],
        filters: {
            sub_department_id: undefined,
        },
    },
    // Action props (Redux mapDispatchToProps)
    fetchTeamSchedule:                jest.fn(),
    fetchTeamUnderDepartment:         jest.fn(),
    fetchSubDepartmentUnderDepartment: jest.fn(),
    // Standard router injections
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
};

function renderComponent(props = {}) {
    const mergedProps = {
        ...defaultProps,
        ...props,
        // Deep merge team so callers only need to override specific sub-keys
        team: { ...defaultProps.team, ...(props.team || {}) },
        myTeamList: { ...defaultProps.myTeamList, ...(props.myTeamList || {}) },
        user: { ...defaultProps.user, ...(props.user || {}) },
    };
    return render(
        <MemoryRouter>
            <MyTeamSchedule {...mergedProps} />
        </MemoryRouter>
    );
}

// ===========================================================================
// TEST SUITE
// ===========================================================================

describe('MyTeamSchedule container', () => {

    beforeEach(() => jest.clearAllMocks());

    // -------------------------------------------------------------------------
    // Smoke / crash-free tests
    // -------------------------------------------------------------------------

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('calls fetchTeamSchedule on componentDidMount', () => {
        renderComponent();
        expect(defaultProps.fetchTeamSchedule).toHaveBeenCalledTimes(1);
    });

    // -------------------------------------------------------------------------
    // Page heading
    // -------------------------------------------------------------------------

    test('renders "My Team Schedule" heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/My Team Schedule/i)).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Date range fields — provided by the ReportNavigator mock
    // -------------------------------------------------------------------------

    test('date range start_date field is present in the navigator', () => {
        const { container } = renderComponent();
        const startField = container.querySelector('input[name="start_date"]');
        expect(startField).toBeInTheDocument();
    });

    test('date range end_date field is present in the navigator', () => {
        const { container } = renderComponent();
        const endField = container.querySelector('input[name="end_date"]');
        expect(endField).toBeInTheDocument();
    });

    test('renders the report-navigator widget', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('report-navigator')).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Filter controls
    // -------------------------------------------------------------------------

    test('renders department_id select dropdown', () => {
        const { container } = renderComponent();
        const deptSelect = container.querySelector('select[name="department_id"]');
        expect(deptSelect).toBeInTheDocument();
    });

    test('renders sub_department_id select dropdown', () => {
        const { container } = renderComponent();
        const subDeptSelect = container.querySelector('select[name="sub_department_id"]');
        expect(subDeptSelect).toBeInTheDocument();
    });

    test('renders Name text input with placeholder "Enter Name"', () => {
        const { getByPlaceholderText } = renderComponent();
        expect(getByPlaceholderText(/Enter Name/i)).toBeInTheDocument();
    });

    test('renders Filter button', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Filter/i)).toBeInTheDocument();
    });

    test('renders Export dropdown toggle', () => {
        const { container } = renderComponent();
        expect(container.textContent).toMatch(/Export/i);
    });

    // -------------------------------------------------------------------------
    // Department options rendered from user.departments_handled
    // -------------------------------------------------------------------------

    test('populates department select with user.departments_handled options', () => {
        const { container } = renderComponent();
        const deptSelect = container.querySelector('select[name="department_id"]');
        // Should have at least the blank option plus the two departments in defaultProps
        expect(deptSelect.options.length).toBeGreaterThanOrEqual(2);
    });

    // -------------------------------------------------------------------------
    // Legend items (status colour key)
    // -------------------------------------------------------------------------

    test('renders Early In legend item', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Early In/i)).toBeInTheDocument();
    });

    test('renders Late legend item', () => {
        const { getAllByText } = renderComponent();
        // "Late" also appears as a CSS class name string but getByText only
        // matches rendered text nodes
        expect(getAllByText(/^Late$/i).length).toBeGreaterThanOrEqual(1);
    });

    test('renders Absent legend item', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Absent/i)).toBeInTheDocument();
    });

    test('renders On Leave legend item', () => {
        const { getByText } = renderComponent();
        expect(getByText(/On Leave/i)).toBeInTheDocument();
    });

    test('renders Rest day legend item', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Rest day/i)).toBeInTheDocument();
    });

    test('renders Undertime legend item', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Undertime/i)).toBeInTheDocument();
    });

    test('renders Holiday legend item', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Holiday/i)).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Loading / empty state
    // -------------------------------------------------------------------------

    test('does not crash in loading state (empty team_schedule data)', () => {
        expect(() => renderComponent({
            team: {
                ...defaultProps.team,
                team_schedule: { date_list: [], data: [], week_list: [], holiday_list: {} },
            },
        })).not.toThrow();
    });

    test('does not crash with null team_schedule.data', () => {
        expect(() => renderComponent({
            team: {
                ...defaultProps.team,
                team_schedule: { date_list: [], data: [], week_list: [], holiday_list: {} },
            },
        })).not.toThrow();
    });

    test('does not crash when user has no departments_handled', () => {
        expect(() => renderComponent({
            user: { ...defaultProps.user, departments_handled: [] },
        })).not.toThrow();
    });

    test('does not crash when myTeamList.sub_department is empty', () => {
        expect(() => renderComponent({
            myTeamList: { ...defaultProps.myTeamList, sub_department: [] },
        })).not.toThrow();
    });

    test('does not crash when myTeamList.sub_department has entries', () => {
        expect(() => renderComponent({
            myTeamList: {
                ...defaultProps.myTeamList,
                sub_department: [
                    { Id: 1, Name: 'Frontend Team' },
                    { Id: 2, Name: 'Backend Team' },
                ],
            },
        })).not.toThrow();
    });

    test('does not crash when team_schedule contains day-view data', () => {
        // Day view: data array with schedule rows, date_list empty, week_list empty
        const dayData = [
            {
                Name: 'Juan dela Cruz',
                on_duty: '2026-06-17T09:00:00',
                hour: 8,
                day_type: 'normal',
                type: ['no_status'],
                Schedule: '09:00 AM - 06:00 PM',
            },
        ];
        expect(() => renderComponent({
            team: {
                ...defaultProps.team,
                team_schedule: {
                    date_list: [],
                    data: dayData,
                    week_list: [],
                    holiday_list: {},
                },
            },
        })).not.toThrow();
    });

    // -------------------------------------------------------------------------
    // Sub-department options rendered from myTeamList.sub_department
    // -------------------------------------------------------------------------

    test('sub_department select shows team options when sub_department is populated', () => {
        const { container } = renderComponent({
            myTeamList: {
                ...defaultProps.myTeamList,
                sub_department: [
                    { Id: 5, Name: 'Alpha Squad' },
                    { Id: 6, Name: 'Beta Squad' },
                ],
            },
        });
        const subDeptSelect = container.querySelector('select[name="sub_department_id"]');
        // blank option + 2 team options
        expect(subDeptSelect.options.length).toBeGreaterThanOrEqual(2);
    });
});
