// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/Template/ReportNavigatorShort/ReportNavigatorShort.js', () => (props) => <div data-testid="report-navigator" />);

jest.mock('react-multi-select-component', () => ({
    __esModule: true,
    default: ({ labelledBy }) => <div aria-label={labelledBy} />,
}));

jest.mock('../../components/Report/TeamAttendanceSummaryPanel', () => () => <div data-testid="attendance-summary-panel" />);

jest.mock('../../services/Formatter', () => ({
    __esModule: true,
    default: {
        array_to_multiselect_array: jest.fn(() => []),
        array_to_getvalue: jest.fn(() => []),
        alert_error: jest.fn(() => ({ type: 'ALERT_ERROR' })),
    },
}));

jest.mock('../../services/Validator.js', () => ({
    __esModule: true,
    default: {
        isValid: jest.fn(() => false),
    },
}));

jest.mock('../../services/Authenticator.js', () => ({
    __esModule: true,
    default: {
        scanFeature: jest.fn(() => false),
    },
}));

jest.mock('../../services/DtrFormatter', () => ({
    __esModule: true,
    default: {
        displayLog: jest.fn((v) => v || ''),
    },
}));

// -------------------------------------------------------------------------
// TeamAttendanceSummary component
// -------------------------------------------------------------------------
let TeamAttendanceSummary;
try {
    const m = require('../../container/Report/TeamAttendanceSummary/TeamAttendanceSummary');
    TeamAttendanceSummary = m.TeamAttendanceSummary || m.default;
} catch {
    TeamAttendanceSummary = require('../../container/Report/TeamAttendanceSummary/TeamAttendanceSummary').default;
}

const defaultTeamAttendanceProps = {
    user: {
        id: 1,
        full_name: 'Test Supervisor',
        pov_timezone: 'Asia/Manila',
        departments_handled: [],
    },
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
    report: {
        team_attendance_summary: [],
        selected_summary: 'attendance',
        dispute_record: [],
    },
    myTeamList: {
        team_list: [],
    },
    myDepartmentsTeamsList: {
        team_list: [],
    },
    getTeamAttendanceSummary: jest.fn(),
    exportAttendanceSummary:  jest.fn(),
    fetchDepartmentsTeams:    jest.fn(),
};

function renderTeamAttendanceSummary(props = {}) {
    return render(
        <MemoryRouter>
            <TeamAttendanceSummary {...defaultTeamAttendanceProps} {...props} />
        </MemoryRouter>
    );
}

describe('TeamAttendanceSummary component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderTeamAttendanceSummary()).not.toThrow();
    });

    test('renders Team Attendance Summary header', () => {
        const { getByText } = renderTeamAttendanceSummary();
        expect(getByText(/Team Attendance Summary/i)).toBeInTheDocument();
    });

    test('renders Employee Name filter input', () => {
        const { getByPlaceholderText } = renderTeamAttendanceSummary();
        expect(getByPlaceholderText(/Employee Name/i)).toBeInTheDocument();
    });

    test('does not crash during loading with empty report state', () => {
        expect(() => renderTeamAttendanceSummary({
            report: { team_attendance_summary: [], selected_summary: 'attendance', dispute_record: [] },
        })).not.toThrow();
    });

    test('does not crash with departments in user prop', () => {
        expect(() => renderTeamAttendanceSummary({
            user: {
                ...defaultTeamAttendanceProps.user,
                departments_handled: [{ id: 1, department_name: 'Engineering' }],
            },
        })).not.toThrow();
    });
});

// -------------------------------------------------------------------------
// DtrConflictReport component
// -------------------------------------------------------------------------
let DtrConflictReport;
try {
    const m = require('../../container/MyTeam/DtrConflictReport/DtrConflictReport');
    DtrConflictReport = m.DtrConflictReport || m.default;
} catch {
    DtrConflictReport = require('../../container/MyTeam/DtrConflictReport/DtrConflictReport').default;
}

const defaultDtrConflictProps = {
    user: {
        id: 1,
        full_name: 'Test Supervisor',
        pov_timezone: 'Asia/Manila',
        departments_handled: [],
    },
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
    dtrSummary: {
        isListLoaded: false,
        dtrItems: [],
        pagination: { current_page: 1, last_page: 1, has_next_page: false },
    },
    settings: {
        current_payroll_cutoff: { start_date: '2026-06-01', end_date: '2026-06-15' },
    },
    exportNewDtrSummary1: jest.fn(),
    fetchDtrConflict:     jest.fn(),
};

function renderDtrConflictReport(props = {}) {
    return render(
        <MemoryRouter>
            <DtrConflictReport {...defaultDtrConflictProps} {...props} />
        </MemoryRouter>
    );
}

describe('DtrConflictReport component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderDtrConflictReport()).not.toThrow();
    });

    test('renders DTR Conflict Report page title', () => {
        const { getByText } = renderDtrConflictReport();
        expect(getByText(/DTR Conflict Report/i)).toBeInTheDocument();
    });

    test('renders valid_from date input', () => {
        const { container } = renderDtrConflictReport();
        const dateInputs = container.querySelectorAll('input[type="date"]');
        expect(dateInputs.length).toBeGreaterThanOrEqual(1);
    });

    test('renders valid_to date input', () => {
        const { container } = renderDtrConflictReport();
        const inputs = container.querySelectorAll('input[name="valid_from"], input[name="valid_to"]');
        expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    test('does not crash when dtrItems is empty', () => {
        expect(() => renderDtrConflictReport({
            dtrSummary: { isListLoaded: false, dtrItems: [], pagination: {} },
        })).not.toThrow();
    });

    test('does not crash when isListLoaded is true with empty items', () => {
        expect(() => renderDtrConflictReport({
            dtrSummary: { isListLoaded: true, dtrItems: [], pagination: {} },
        })).not.toThrow();
    });

    test('renders Generate & Export button', () => {
        const { getByText } = renderDtrConflictReport();
        expect(getByText(/Generate & Export/i)).toBeInTheDocument();
    });
});
