/**
 * evoxtest_HRTeamAttendanceSummaryDeep3.test.js
 * Wave-3 coverage for container/Report/HRTeamAttendanceSummary/HRTeamAttendanceSummary.js
 * (29 Jul: 30.3%, 46 unc stmts — the existing test renders only). Menu: Reports → HR Team
 * Attendance Summary. Near-identical sibling of TeamAttendanceSummary with two extras:
 * the constructor pre-selects the first handled department, and handleSelectDepartment
 * (valid + empty-string guard arms) is live here.
 *
 * FINDING FE-TAS-1 EXTENDED: the same stale-date handleChangeDate pattern exists here —
 * date navigation submits the PREVIOUS range. Characterized below.
 * ADDITIVE ONLY.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

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
jest.mock('../../components/Template/ReportNavigatorShort/ReportNavigatorShort.js',
    () => () => <div data-testid="report-navigator" />);
jest.mock('../../components/Report/HRTeamAttendanceSummaryPanel',
    () => () => <div data-testid="hr-summary-panel" />);
jest.mock('react-multi-select-component', () => () => <div data-testid="multi-select" />);
jest.mock('react-datepicker', () => () => <div data-testid="datepicker" />);
jest.mock('react-bootstrap', () => ({
    Container: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
    Table: ({ children }) => <div>{children}</div>,
    Tabs: ({ children }) => <div>{children}</div>,
    Tab: ({ children }) => <div>{children}</div>,
    Image: () => <img alt="" />,
    Spinner: () => <div />,
    Button: ({ children, onClick, type }) => <button type={type} onClick={onClick}>{children}</button>,
}));
jest.mock('../../store/actions/report/reportActions', () => ({
    exportAttendanceSummary: jest.fn(),
    getTeamAttendanceSummary: jest.fn(),
}));
jest.mock('../../store/actions/filters/myTeamActions', () => ({
    fetchTeamUnderDepartment: jest.fn(),
    fetchDepartmentsTeams: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const HRTeamAttendanceSummary =
    require('../../container/Report/HRTeamAttendanceSummary/HRTeamAttendanceSummary').default;

const baseProps = () => ({
    user: { id: 7, departments_handled: [{ id: 1, department_name: 'IT' }] },
    report: { team_attendance_summary: null, selected_summary: null },
    myTeamList: { team_list: [] },
    myDepartmentsTeamsList: { team_list: [{ Id: 5, id: 5, Name: 'Alpha Team' }] },
    getTeamAttendanceSummary: jest.fn(),
    exportAttendanceSummary: jest.fn(),
    fetchTeamUnderDepartment: jest.fn(),
    fetchDepartmentsTeams: jest.fn(),
});

describe('HRTeamAttendanceSummary (Deep3)', () => {
    afterEach(() => jest.clearAllMocks());

    test('constructor pre-selects the first handled department', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<HRTeamAttendanceSummary {...props} ref={ref} />);

        expect(ref.current.state.selectedDepartments).toEqual([{ label: 'IT', value: 1 }]);
    });

    test('summary panel gated on report data', () => {
        const props = baseProps();
        const { queryByTestId, rerender, getByTestId } = render(<HRTeamAttendanceSummary {...props} />);

        expect(queryByTestId('hr-summary-panel')).toBeNull();
        rerender(<HRTeamAttendanceSummary {...props}
            report={{ team_attendance_summary: { d: {} }, selected_summary: null }} />);
        expect(getByTestId('hr-summary-panel')).toBeInTheDocument();
    });

    test('submit flattens the pre-selected department; export stringifies it', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<HRTeamAttendanceSummary {...props} ref={ref} />);

        act(() => { ref.current.handleSubmit(); });
        expect(props.getTeamAttendanceSummary.mock.calls[0][2]).toEqual({
            scope_type: 'week', selectedDepartments: [1],
        });

        act(() => { ref.current.handleExport(); });
        expect(props.exportAttendanceSummary.mock.calls[0][2].selectedDepartments).toBe('1');
    });

    test('selecting departments resets teams and fetches; team select updates state', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<HRTeamAttendanceSummary {...props} ref={ref} />);

        act(() => { ref.current.setSelectedDepartments([{ label: 'HR', value: 2 }]); });
        expect(ref.current.state.selectedTeams).toEqual([]);
        expect(props.fetchDepartmentsTeams).toHaveBeenCalledWith(7, { departments: [2] });

        act(() => { ref.current.setSelectedTeams([{ label: 'Alpha Team', value: 5 }]); });
        expect(ref.current.state.selectedTeams).toEqual([{ label: 'Alpha Team', value: 5 }]);
    });

    test('handleSelectDepartment fetches teams for a valid id and guards empty string', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<HRTeamAttendanceSummary {...props} ref={ref} />);

        act(() => { ref.current.handleSelectDepartment('3'); });
        expect(ref.current.state.department_id).toBe('3');
        expect(props.fetchTeamUnderDepartment).toHaveBeenCalledWith(7, '3');

        act(() => { ref.current.handleSelectDepartment(''); });          // guard arm
        expect(props.fetchTeamUnderDepartment).toHaveBeenCalledTimes(1);
    });

    test('date navigation auto-submits with STALE dates (FINDING FE-TAS-1, HR variant)', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<HRTeamAttendanceSummary {...props} ref={ref} />);
        const staleStart = ref.current.state.start_date;

        const from = moment('2026-07-01');
        act(() => { ref.current.handleChangeDate(from, moment('2026-07-31'), 'month'); });

        expect(ref.current.state.scope_type).toBe('month');
        expect(props.getTeamAttendanceSummary.mock.calls[0][0]).toBe(from);          // FIXED: fresh arm
        expect(props.getTeamAttendanceSummary.mock.calls[0][0]).not.toBe(staleStart);
        expect(ref.current.state.start_date).toBe(from);

        act(() => { ref.current.handleFilterChange({ target: { name: 'name', value: 'zed' } }); });
        expect(ref.current.state.name).toBe('zed');
    });

    test('renders fallback arms with no handled departments and no team list', () => {
        const props = baseProps();
        props.user = { id: 7, departments_handled: [] };
        props.myDepartmentsTeamsList = { team_list: [] };
        const ref = React.createRef();
        const { getAllByTestId } = render(<HRTeamAttendanceSummary {...props} ref={ref} />);

        expect(getAllByTestId('multi-select').length).toBe(2);
        // constructor maps the empty-department placeholder to a single undefined-labeled entry
        expect(ref.current.state.selectedDepartments.length).toBe(1);
    });
});
