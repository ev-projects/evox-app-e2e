/**
 * evoxtest_TeamAttendanceTeamsFilterWave18.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/container/Report/TeamAttendanceSummary/TeamAttendanceSummary.js
 *   src/container/Report/HRTeamAttendanceSummary/HRTeamAttendanceSummary.js
 *
 * MENU PATH
 *   Reports -> Team Attendance Summary
 *   Reports -> HR Team Attendance Summary
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   TeamAttendanceSummary    5 uncovered functions / 2 uncovered branches
 *   HRTeamAttendanceSummary  6 uncovered functions / 3 uncovered branches
 *   All of the functions are connect wiring, taken by
 *   evoxtest_MyTeamReportConnectWiringWave18.test.js. The branch residue is the sub-department
 *   ("selectedTeams") multiselect: line 85 of the export builder on both screens, plus line 50
 *   of the HR screen's filter builder. The existing Deep3 suites only ever populate the
 *   DEPARTMENT multiselect, so the team arm of both switches is never entered.
 *
 * FINDINGS
 *   TAS-DEADARM  TeamAttendanceSummary.js:75 and HRTeamAttendanceSummary.js:75 —
 *                `case "department_id":` inside handleExport. The constructor's department_id
 *                is commented out (line 26) and the only control that writes to state by name
 *                is the employee-name box, so state never has a department_id key and the arm
 *                cannot be entered. Not tested.
 *   TAS-EMPTYARR Both screens filter state with `!= ""`, and an empty array equals "" in JS.
 *                An untouched multiselect is therefore omitted from the payload entirely
 *                rather than sent as []. Asserted below on both screens.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
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
jest.mock('../../components/Report/TeamAttendanceSummaryPanel',
    () => () => <div data-testid="summary-panel" />);
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
    fetchDepartmentsTeams: jest.fn(),
    fetchTeamUnderDepartment: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const TeamAttendanceSummary =
    require('../../container/Report/TeamAttendanceSummary/TeamAttendanceSummary').default;
const HRTeamAttendanceSummary =
    require('../../container/Report/HRTeamAttendanceSummary/HRTeamAttendanceSummary').default;

const makeProps = () => ({
    user: { id: 7, departments_handled: [{ id: 1, department_name: 'IT' }] },
    report: { team_attendance_summary: null, selected_summary: null },
    myTeamList: { team_list: [] },
    myDepartmentsTeamsList: { team_list: [{ Id: 5, Name: 'Alpha Team' }] },
    getTeamAttendanceSummary: jest.fn(),
    exportAttendanceSummary: jest.fn(),
    fetchDepartmentsTeams: jest.fn(),
    fetchTeamUnderDepartment: jest.fn(),
});

const mount = (Screen) => {
    const props = makeProps();
    const ref = React.createRef();
    render(<Screen {...props} ref={ref} />);
    return { props, ref };
};

const DEPARTMENTS = [{ label: 'IT', value: 1 }, { label: 'HR', value: 2 }];
const TEAMS = [{ label: 'Alpha Team', value: 5 }, { label: 'Bravo Team', value: 6 }];

beforeEach(() => jest.clearAllMocks());

describe.each([
    ['Team Attendance Summary', () => TeamAttendanceSummary],
    ['HR Team Attendance Summary', () => HRTeamAttendanceSummary],
])('%s — the sub-department (team) multiselect', (_label, getScreen) => {

    test('a filter run flattens the chosen teams to a plain id array alongside the departments', () => {
        const { props, ref } = mount(getScreen());

        act(() => {
            ref.current.setState({
                selectedDepartments: DEPARTMENTS,
                selectedTeams: TEAMS,
                name: 'ann',
            });
        });
        act(() => { ref.current.handleSubmit(); });

        expect(props.getTeamAttendanceSummary).toHaveBeenCalledTimes(1);
        const [start, end, formData] = props.getTeamAttendanceSummary.mock.calls[0];
        expect(moment.isMoment(start)).toBe(true);
        expect(moment.isMoment(end)).toBe(true);
        expect(formData.selectedTeams).toEqual([5, 6]);
        expect(formData.selectedDepartments).toEqual([1, 2]);
        expect(formData.name).toBe('ann');
        // the date range travels as the first two arguments, never inside the filter payload
        expect(formData).not.toHaveProperty('start_date');
        expect(formData).not.toHaveProperty('end_date');
    });

    test('an export turns the chosen teams into a comma separated string, not an array', () => {
        const { props, ref } = mount(getScreen());

        act(() => {
            ref.current.setState({ selectedDepartments: DEPARTMENTS, selectedTeams: TEAMS });
        });
        act(() => { ref.current.handleExport(); });

        expect(props.exportAttendanceSummary).toHaveBeenCalledTimes(1);
        const formData = props.exportAttendanceSummary.mock.calls[0][2];
        expect(formData.selectedTeams).toBe('5,6');
        expect(formData.selectedDepartments).toBe('1,2');
    });

    test('a single chosen team exports as a bare id with no trailing comma', () => {
        const { props, ref } = mount(getScreen());

        act(() => { ref.current.setState({ selectedTeams: [TEAMS[0]] }); });
        act(() => { ref.current.handleExport(); });

        expect(props.exportAttendanceSummary.mock.calls[0][2].selectedTeams).toBe('5');
    });

    test('TAS-EMPTYARR an untouched team multiselect is left out of both payloads', () => {
        const { props, ref } = mount(getScreen());

        act(() => { ref.current.setState({ selectedDepartments: DEPARTMENTS, selectedTeams: [] }); });
        act(() => { ref.current.handleSubmit(); });
        act(() => { ref.current.handleExport(); });

        expect(props.getTeamAttendanceSummary.mock.calls[0][2]).not.toHaveProperty('selectedTeams');
        expect(props.exportAttendanceSummary.mock.calls[0][2]).not.toHaveProperty('selectedTeams');
    });

    test('choosing departments clears any team already picked, because the team list is department scoped', () => {
        const { props, ref } = mount(getScreen());

        act(() => { ref.current.setState({ selectedTeams: TEAMS }); });
        act(() => { ref.current.setSelectedDepartments(DEPARTMENTS); });

        expect(ref.current.state.selectedTeams).toEqual([]);
        expect(props.fetchDepartmentsTeams).toHaveBeenCalledWith(7, { departments: [1, 2] });
    });
});
