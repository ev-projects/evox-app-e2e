/**
 * evoxtest_TeamAttendanceSummaryDeep3.test.js
 * Wave-3 coverage for container/Report/TeamAttendanceSummary/TeamAttendanceSummary.js
 * (29 Jul: 61 unc stmts, NO test existed). Menu: Reports → Team Attendance Summary.
 *
 * Arms: handleSubmit formData build (date keys skipped, empty values skipped, multiselect
 * arrays flattened), handleExport (toString variants + department_id passthrough),
 * setSelectedDepartments (teams reset + fetchDepartmentsTeams), setSelectedTeams,
 * handleChangeDate (scope + dates + auto submit), handleFilterChange, and the render gates
 * (departments_handled -> options, myDepartmentsTeamsList -> team options, summary panel
 * only when report data is valid).
 * ADDITIVE ONLY.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
jest.mock('../../components/Report/TeamAttendanceSummaryPanel',
    () => () => <div data-testid="summary-panel" />);
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
    fetchDepartmentsTeams: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const TeamAttendanceSummary =
    require('../../container/Report/TeamAttendanceSummary/TeamAttendanceSummary').default;

const baseProps = () => ({
    user: { id: 7, departments_handled: [{ id: 1, department_name: 'IT' }] },
    report: { team_attendance_summary: null, selected_summary: null },
    myTeamList: { team_list: [] },
    myDepartmentsTeamsList: { team_list: [{ Id: 5, Name: 'Alpha Team' }] },
    getTeamAttendanceSummary: jest.fn(),
    exportAttendanceSummary: jest.fn(),
    fetchDepartmentsTeams: jest.fn(),
});

describe('TeamAttendanceSummary (Deep3)', () => {
    afterEach(() => jest.clearAllMocks());

    test('renders filters; summary panel hidden until report data arrives', () => {
        const props = baseProps();
        const { queryByTestId, rerender, getByTestId } = render(<TeamAttendanceSummary {...props} />);

        expect(queryByTestId('summary-panel')).toBeNull();

        rerender(<TeamAttendanceSummary {...props}
            report={{ team_attendance_summary: { day1: {} }, selected_summary: null }} />);
        expect(getByTestId('summary-panel')).toBeInTheDocument();
    });

    test('filter submit flattens departments and teams, skipping dates and empties', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<TeamAttendanceSummary {...props} ref={ref} />);

        act(() => {
            ref.current.setState({
                selectedDepartments: [{ label: 'IT', value: 1 }],
                selectedTeams: [{ label: 'Alpha Team', value: 5 }],
                name: 'ann',
            });
        });
        act(() => { ref.current.handleSubmit(); });

        const [start, end, formData] = props.getTeamAttendanceSummary.mock.calls[0];
        expect(moment.isMoment(start) && moment.isMoment(end)).toBe(true);
        expect(formData).toEqual({
            name: 'ann', scope_type: 'week',
            selectedDepartments: [1], selectedTeams: [5],
        });
    });

    test('export stringifies the multiselect values', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<TeamAttendanceSummary {...props} ref={ref} />);

        act(() => {
            ref.current.setState({
                selectedDepartments: [{ label: 'IT', value: 1 }, { label: 'HR', value: 2 }],
            });
        });
        act(() => { ref.current.handleExport(); });

        const formData = props.exportAttendanceSummary.mock.calls[0][2];
        expect(formData.selectedDepartments).toBe('1,2');
        expect(formData.scope_type).toBe('week');
    });

    test('selecting departments resets teams and fetches their team list', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<TeamAttendanceSummary {...props} ref={ref} />);

        act(() => {
            ref.current.setState({ selectedTeams: [{ label: 'Old', value: 9 }] });
        });
        act(() => {
            ref.current.setSelectedDepartments([{ label: 'IT', value: 1 }]);
        });

        expect(ref.current.state.selectedTeams).toEqual([]);
        expect(props.fetchDepartmentsTeams).toHaveBeenCalledWith(7, { departments: [1] });

        act(() => { ref.current.setSelectedTeams([{ label: 'Alpha Team', value: 5 }]); });
        expect(ref.current.state.selectedTeams).toEqual([{ label: 'Alpha Team', value: 5 }]);
    });

    test('date navigation updates scope then auto-submits — with STALE dates (FINDING FE-TAS-1)', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<TeamAttendanceSummary {...props} ref={ref} />);
        const staleStart = ref.current.state.start_date;

        const from = moment('2026-07-01'); const to = moment('2026-07-31');
        act(() => { ref.current.handleChangeDate(from, to, 'month'); });

        expect(ref.current.state.scope_type).toBe('month');
        expect(props.getTeamAttendanceSummary).toHaveBeenCalledTimes(1);
        // FINDING FE-TAS-1 — FIXED 2026-08-04: handleChangeDate now passes the new dates straight
        // into handleSubmit, so navigating the date range fetches THAT range, not the previous one.
        // (This assertion was flipped from toBe(staleStart) when the fix landed — it is now the guard.)
        expect(props.getTeamAttendanceSummary.mock.calls[0][0]).toBe(from);
        expect(props.getTeamAttendanceSummary.mock.calls[0][0]).not.toBe(staleStart);
        expect(ref.current.state.start_date).toBe(from);      // state itself does update afterwards
    });

    test('name filter handler writes named state', () => {
        const props = baseProps();
        const ref = React.createRef();
        render(<TeamAttendanceSummary {...props} ref={ref} />);

        act(() => {
            ref.current.handleFilterChange({ target: { name: 'name', value: 'bob' } });
        });

        expect(ref.current.state.name).toBe('bob');
    });

    test('renders with empty departments_handled and empty team list (fallback arms)', () => {
        const props = baseProps();
        props.user = { id: 7, departments_handled: [] };
        props.myDepartmentsTeamsList = { team_list: [] };

        const { getAllByTestId } = render(<TeamAttendanceSummary {...props} />);

        expect(getAllByTestId('multi-select').length).toBe(2);   // both selects render with [] options
    });
});
