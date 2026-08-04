// WAVE-2 REACHABILITY PASS — authored 2026-07-27, needs first live Jest run
// Target: src/container/Report/HRTeamAttendanceSummary/HRTeamAttendanceSummary.js (66 stmts, 0%)
// Reachability: RouteList.js -> /app/report/HRTeamAttendanceSummary/
// KNOWN CRASH RISK: constructor reads user.departments_handled — tests always provide the array.
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
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
jest.mock('../../components/Template/ReportNavigatorShort/ReportNavigatorShort.js', () => () => <div>ReportNavigatorShort</div>);
jest.mock('../../components/Report/HRTeamAttendanceSummaryPanel', () => () => <div>SummaryPanel</div>);
// The component uses a DEFAULT import (`import MultiSelect from "react-multi-select-component"`),
// so the mock must expose `default` — a named-only mock hands the raw module object to React
// ("Element type is invalid ... got: object", 2026-07-27 run).
jest.mock('react-multi-select-component', () => {
    const MultiSelect = ({ value }) => <select data-testid="multiselect" value={value} readOnly />;
    return { __esModule: true, default: MultiSelect, MultiSelect };
});
jest.mock('react-datepicker', () => () => <input type="date" />);

const HRTeamAttendanceSummary = require('../../container/Report/HRTeamAttendanceSummary/HRTeamAttendanceSummary').default;

const defaultProps = {
    user: {
        id: 1,
        departments_handled: [],
        departments_handled_strict: [],
    },
    report: {
        team_attendance_summary: [],
        selected_summary: {},
        isSummaryLoaded: false,
    },
    myTeamList: {},
    myDepartmentsTeamsList: { team_list: [] },   // team_list must exist (07-27 run fix)
    getTeamAttendanceSummary: jest.fn(),
    exportAttendanceSummary: jest.fn(),
    fetchTeamUnderDepartment: jest.fn(),
    fetchDepartmentsTeams: jest.fn(),
};

function renderPage(props = {}) {
    return render(
        <MemoryRouter>
            <HRTeamAttendanceSummary {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('HRTeamAttendanceSummary container', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing with no departments handled', () => {
        expect(() => renderPage()).not.toThrow();
    });

    test('renders without crashing with one handled department', () => {
        expect(() =>
            renderPage({
                user: {
                    ...defaultProps.user,
                    departments_handled: [{ id: 3, department_name: 'HR' }],
                },
            })
        ).not.toThrow();
    });

    test('does not fetch on mount (componentWillMount body is commented out)', () => {
        renderPage();
        expect(defaultProps.getTeamAttendanceSummary).not.toHaveBeenCalled();
        expect(defaultProps.fetchDepartmentsTeams).not.toHaveBeenCalled();
    });

    test('renders without crashing when a summary is present', () => {
        expect(() =>
            renderPage({
                report: {
                    ...defaultProps.report,
                    isSummaryLoaded: true,
                    team_attendance_summary: [{ date: '2026-07-01', status: 'Present' }],
                },
            })
        ).not.toThrow();
    });
});
