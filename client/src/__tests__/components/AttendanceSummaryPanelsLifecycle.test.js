/**
 * AttendanceSummaryPanelsLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. components/Report/TeamAttendanceSummaryPanel/TeamAttendanceSummaryPanel.js
 *      Menu: Reports -> Team Attendance Summary   (also embedded in Dashboard ->
 *      HandlerDashboard with show_list={false})
 *   2. components/Report/HRTeamAttendanceSummaryPanel/HRTeamAttendanceSummaryPanel.js
 *      Menu: Reports -> HR Team Attendance Summary
 *   3. components/AssetManagementForm/AssetReport/AssetReport.js
 *      Menu: Reports -> Asset Reports   (route global.links.asset_reports)
 *
 * CURRENT MEASURED COVERAGE (29 Jul master run)
 *   TeamAttendanceSummaryPanel.js .....  0%    (never mounted - both parent screens mock it out)
 *   HRTeamAttendanceSummaryPanel.js ...  0%    (same)
 *   AssetReport.js .................... 45.45%
 *   62 uncovered statements across the three files.
 *
 * AFTER THIS SUITE (measured on the three files in isolation)
 *   TeamAttendanceSummaryPanel.js .... 84.21% stmts / 85.37% branch
 *   HRTeamAttendanceSummaryPanel.js .. 84.21% stmts / 85.37% branch
 *   AssetReport.js ................... 90.91% stmts /   100% branch
 *   The residue in all three files is mapStateToProps/mapDispatchToProps, which the house
 *   `connect: () => (Component) => Component` stub deliberately never invokes.
 *
 * These two panels are where the attendance numbers actually reach a manager's eye, so the
 * assertions below are on the rendered CELL VALUES, the per-metric colour class, the
 * active/inactive tile class and the exact key dispatched on click - not on "it rendered".
 *
 * FINDINGS (each characterises TODAY's behaviour; each is plain JS/DOM and reproduces in
 * Chrome - none of them is a jsdom artefact):
 *   _FINDING_PCT_SUFFIX      Team panel prints the attendance/leave figures bare ("90",
 *                            "TARGET: 95") while the byte-identical HR panel prints them with
 *                            a % sign. Same numbers, two different readings.
 *   _FINDING_UNDEF_RED       When the API omits a metric block, `undefined >= undefined` is
 *                            false, so the empty tile is painted with the failing "red" class
 *                            instead of a neutral one.
 *   _FINDING_SEMICOLON       AssetReport's render has a stray `;` after </Formik> INSIDE the
 *                            <Wrapper> JSX, so a literal semicolon is painted at the bottom of
 *                            the Asset Reports page.
 *   _FINDING_DOUBLE_SUBMIT   Filter/Export are type="submit" buttons whose onClick also calls
 *                            handleSubmit() without preventing the click's default action, so
 *                            one click submits the form TWICE - two /user/getallassets calls,
 *                            or two CSV downloads per Export click.
 *   _FINDING_ACTION_PAYLOAD  onSubmitHandler copies every non-empty value into formData, so the
 *                            internal Formik fields `action` and `method:"store"` are shipped to
 *                            the backend as if they were filters.
 *   _FINDING_ANCHOR_LEAK     The export anchor is appendChild'd to document.body and never
 *                            removed, so every Export click leaves an orphan <a> behind.
 *   _FINDING_SILENT_EXPORT   The export .catch body is commented out; a failed export produces
 *                            no download, no message and no error - the page just sits there.
 *   _FINDING_MOUNT_FILTER    componentDidMount fetches with this.state (always empty strings)
 *                            instead of the restored asset_reports_filter that Formik has
 *                            already painted into the form, so the visible filter and the
 *                            fetched data disagree on a cold load.
 *
 * ADDITIVE ONLY - no existing test file touched, no application source changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../store/actions/report/reportActions', () => ({
    setSelectedAttendanceSummary: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ getAllAssets: jest.fn() }));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => false),
    scanLevel: jest.fn(() => false),
}));
jest.mock('../../services/API', () => ({ call: jest.fn() }));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => (
    <div data-testid="asset-wrapper">{children}</div>
));

global.links = new Proxy({}, { get: (target, key) => '/' + String(key) + '/' });

const TeamPanel = require('../../components/Report/TeamAttendanceSummaryPanel/TeamAttendanceSummaryPanel.js').default;
const HRPanel = require('../../components/Report/HRTeamAttendanceSummaryPanel/HRTeamAttendanceSummaryPanel.js').default;
const AssetReport = require('../../components/AssetManagementForm/AssetReport/AssetReport.js').default;
const Authenticator = require('../../services/Authenticator');
const API = require('../../services/API');

/* ------------------------------------------------------------------ fixtures */

const USER_ROW = {
    user_id: 77,
    name: 'Gary Aure',
    emp_num: 'EV-1042',
    job_title: 'Senior Developer',
    date: '2026-03-05',
    status: 'Rest Day Work',
    hours: 4,
};

// Every figure below is fixed. No assertion in this file reads the system clock.
const summaryFixture = (overrides = {}) => ({
    total_headcount: 120,
    scheduled_employees: { total_count: 110, target_percentage: 95 },
    attendance: { total_percentage: 97, target_percentage: 95, total_count: 107, users: [] },
    planned_leaves: { total_percentage: 3, target_percentage: 5, total_count: 4, users: [] },
    unplanned_leaves: { total_percentage: 8, target_percentage: 5, total_count: 9, users: [] },
    total_rest_day_work: { total_hours: 16.5, total_count: 2 },
    total_overtime: { total_hours: 31.25, total_count: 6 },
    dtr_collection: { total_count: 0 },
    ...overrides,
});

const renderPanel = (Panel, props) => {
    const setSelectedAttendanceSummary = jest.fn();
    const utils = render(
        <MemoryRouter>
            <Panel
                team_attendance_summary={summaryFixture()}
                selected_summary="attendance"
                scope_type="day"
                setSelectedAttendanceSummary={setSelectedAttendanceSummary}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, setSelectedAttendanceSummary };
};

// The label sits directly inside its clickable tile div.
const tileFor = (getByText, label) => getByText(label).parentElement;

beforeEach(() => {
    jest.clearAllMocks();
    Authenticator.scanFeature.mockReturnValue(false);
    Authenticator.scanLevel.mockReturnValue(false);
});

/* ================================================================================
 * 1. TeamAttendanceSummaryPanel - Reports -> Team Attendance Summary
 * ============================================================================= */

describe('TeamAttendanceSummaryPanel - the numbers a manager reads', () => {

    it('prints the total headcount returned by the report', () => {
        const { container } = renderPanel(TeamPanel, {});
        expect(container.querySelector('.total-headcount-container span')).toHaveTextContent('120');
    });

    it('shows the scheduled headcount tile only when the report scope is a single day', () => {
        const { getByText } = renderPanel(TeamPanel, { scope_type: 'day' });
        const tile = tileFor(getByText, 'Scheduled Headcount');
        expect(tile).not.toHaveAttribute('hidden');
        expect(tile.querySelector('span')).toHaveTextContent('110');
    });

    it('hides the scheduled headcount tile for a week scope', () => {
        const { getByText } = renderPanel(TeamPanel, { scope_type: 'week' });
        expect(tileFor(getByText, 'Scheduled Headcount')).toHaveAttribute('hidden');
    });

    it('hides the scheduled headcount tile when the dashboard supplies no scope at all', () => {
        const { getByText } = renderPanel(TeamPanel, { scope_type: undefined });
        expect(tileFor(getByText, 'Scheduled Headcount')).toHaveAttribute('hidden');
    });

    it('marks only the selected metric tile as active and leaves every other tile inactive', () => {
        const { getByText } = renderPanel(TeamPanel, { selected_summary: 'planned_leaves' });
        expect(tileFor(getByText, 'Recorded Planned Leaves')).toHaveClass('summary-active');
        ['Scheduled Headcount', 'Recorded Attendance', 'Recorded Unplanned Leaves',
            'Rest Day Work', 'Overtime'].forEach((label) => {
            expect(tileFor(getByText, label)).toHaveClass('summary-inactive');
        });
    });

    it('bolds the label of the selected tile and leaves the other labels unstyled', () => {
        const { getByText } = renderPanel(TeamPanel, { selected_summary: 'total_overtime' });
        expect(getByText('Overtime')).toHaveClass('active-text', 'font-weight-bolder');
        expect(getByText('Rest Day Work').className).toBe('');
        expect(getByText('Recorded Attendance').className).toBe('');
    });

    it('leaves every tile inactive when no metric has been selected yet', () => {
        const { container, getByText } = renderPanel(TeamPanel, { selected_summary: undefined });
        expect(container.querySelectorAll('.summary-active')).toHaveLength(0);
        expect(container.querySelectorAll('.summary-inactive')).toHaveLength(6);
        expect(getByText('Recorded Attendance').className).toBe('');
    });

    it('dispatches the matching summary key when each attendance tile is clicked', () => {
        const { getByText, setSelectedAttendanceSummary } = renderPanel(TeamPanel, {});
        const expected = [
            ['Scheduled Headcount', 'scheduled_employees'],
            ['Recorded Attendance', 'attendance'],
            ['Recorded Planned Leaves', 'planned_leaves'],
            ['Recorded Unplanned Leaves', 'unplanned_leaves'],
        ];
        expected.forEach(([label]) => fireEvent.click(tileFor(getByText, label)));
        expect(setSelectedAttendanceSummary.mock.calls).toEqual(expected.map(([, key]) => [key]));
    });

    it('dispatches the payroll summary keys when the rest-day and overtime tiles are clicked', () => {
        const { getByText, setSelectedAttendanceSummary } = renderPanel(TeamPanel, {});
        fireEvent.click(tileFor(getByText, 'Rest Day Work'));
        fireEvent.click(tileFor(getByText, 'Overtime'));
        expect(setSelectedAttendanceSummary.mock.calls).toEqual([
            ['total_rest_day_work'],
            ['total_overtime'],
        ]);
    });

    it('paints recorded attendance green when it reaches the target', () => {
        const { getByText } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 96, target_percentage: 95, total_count: 100 },
            }),
        });
        const tile = tileFor(getByText, 'Recorded Attendance');
        expect(tile.querySelector('span')).toHaveClass('green');
        expect(tile.querySelector('span')).toHaveTextContent('96');
        expect(tile.querySelector('small')).toHaveTextContent('(100)');
    });

    it('paints recorded attendance green on the exact target boundary', () => {
        const { getByText } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 95, target_percentage: 95, total_count: 99 },
            }),
        });
        expect(tileFor(getByText, 'Recorded Attendance').querySelector('span')).toHaveClass('green');
    });

    it('paints recorded attendance red when it falls short of the target', () => {
        const { getByText } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 90, target_percentage: 95, total_count: 88 },
            }),
        });
        expect(tileFor(getByText, 'Recorded Attendance').querySelector('span')).toHaveClass('red');
    });

    it('inverts the rule for planned leaves - green while they stay at or under target', () => {
        const { getByText } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                planned_leaves: { total_percentage: 5, target_percentage: 5, total_count: 6 },
            }),
        });
        expect(tileFor(getByText, 'Recorded Planned Leaves').querySelector('span')).toHaveClass('green');
    });

    it('paints planned leaves red once they exceed the target', () => {
        const { getByText } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                planned_leaves: { total_percentage: 9, target_percentage: 5, total_count: 11 },
            }),
        });
        const tile = tileFor(getByText, 'Recorded Planned Leaves');
        expect(tile.querySelector('span')).toHaveClass('red');
        expect(tile.querySelector('.target')).toHaveTextContent('TARGET: 5');
    });

    it('inverts the rule for unplanned leaves - green at or under target, red above it', () => {
        const under = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                unplanned_leaves: { total_percentage: 2, target_percentage: 5, total_count: 3 },
            }),
        });
        expect(tileFor(under.getByText, 'Recorded Unplanned Leaves').querySelector('span')).toHaveClass('green');
        under.unmount();

        const over = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                unplanned_leaves: { total_percentage: 12, target_percentage: 5, total_count: 13 },
            }),
        });
        expect(tileFor(over.getByText, 'Recorded Unplanned Leaves').querySelector('span')).toHaveClass('red');
    });

    it('reports rest day work and overtime as hours with the headcount in brackets', () => {
        const { getByText } = renderPanel(TeamPanel, {});
        const rest = tileFor(getByText, 'Rest Day Work');
        expect(rest.querySelector('span')).toHaveTextContent('16.5');
        expect(rest.querySelector('small')).toHaveTextContent('(2)');
        const ot = tileFor(getByText, 'Overtime');
        expect(ot.querySelector('span')).toHaveTextContent('31.25');
        expect(ot.querySelector('small')).toHaveTextContent('(6)');
    });

    /**
     * _FINDING_PCT_SUFFIX - the Team panel omits the % sign that the otherwise byte-identical
     * HR panel prints, so the same 97 reads as "97" here and "97%" on the HR screen.
     */
    it('_FINDING_PCT_SUFFIX prints attendance and target without any percent sign', () => {
        const { getByText } = renderPanel(TeamPanel, {});
        const tile = tileFor(getByText, 'Recorded Attendance');
        expect(tile.querySelector('span').textContent).toBe('97');
        expect(tile.querySelector('.target').textContent).toBe('TARGET: 95');
        expect(tile.textContent).not.toContain('%');
    });

    /**
     * _FINDING_UNDEF_RED - a report payload that omits a metric block leaves the comparison
     * as `undefined >= undefined` (false), so the blank tile is painted as failing.
     */
    it('_FINDING_UNDEF_RED paints a missing metric block red instead of neutral', () => {
        const { getByText } = renderPanel(TeamPanel, {
            team_attendance_summary: { total_headcount: 120 },
        });
        ['Recorded Attendance', 'Recorded Planned Leaves', 'Recorded Unplanned Leaves']
            .forEach((label) => {
                const span = tileFor(getByText, label).querySelector('span');
                expect(span).toHaveClass('red');
                expect(span.textContent).toBe('');
            });
    });
});

describe('TeamAttendanceSummaryPanel - the drill-down list', () => {

    it('lists one row per user of the selected metric with every column filled', () => {
        const { container } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                attendance: {
                    total_percentage: 97, target_percentage: 95, total_count: 2,
                    users: [
                        USER_ROW,
                        { ...USER_ROW, user_id: 78, name: 'Glenn Macasarte', emp_num: 'EV-1043', job_title: 'QA', date: '2026-12-31', status: 'Present', hours: 8 },
                    ],
                },
            }),
        });
        const rows = container.querySelectorAll('.dtr-list tbody tr');
        expect(rows).toHaveLength(2);
        const cells = Array.from(rows[0].querySelectorAll('td')).map((td) => td.textContent.trim());
        expect(cells).toEqual(['Gary Aure', 'EV-1042', 'Senior Developer', 'Mar 5', 'Rest Day Work (4)']);
        const second = Array.from(rows[1].querySelectorAll('td')).map((td) => td.textContent.trim());
        expect(second).toEqual(['Glenn Macasarte', 'EV-1043', 'QA', 'Dec 31', 'Present (8)']);
    });

    it('turns the status text into a css class by lowercasing it and dashing the spaces', () => {
        const { container } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                attendance: {
                    total_percentage: 97, target_percentage: 95, total_count: 1,
                    users: [{ ...USER_ROW, status: 'Unplanned  Leave' }],
                },
            }),
        });
        expect(container.querySelector('.dtr-list tbody td.status').className)
            .toBe('status unplanned-leave');
    });

    it('appends the hours to the status only when the hours value is meaningful', () => {
        const { container } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                attendance: {
                    total_percentage: 97, target_percentage: 95, total_count: 4,
                    users: [
                        { ...USER_ROW, status: 'Overtime', hours: 2.5 },
                        { ...USER_ROW, status: 'Present', hours: 0 },
                        { ...USER_ROW, status: 'Absent', hours: null },
                        { ...USER_ROW, status: 'Leave', hours: '' },
                    ],
                },
            }),
        });
        const statuses = Array.from(container.querySelectorAll('.dtr-list tbody td.status'))
            .map((td) => td.textContent.trim());
        expect(statuses).toEqual(['Overtime (2.5)', 'Present', 'Absent', 'Leave']);
    });

    it('links each employee to the DTR page when the user holds the attendance report feature', () => {
        Authenticator.scanFeature.mockReturnValue(true);
        const { container } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 97, target_percentage: 95, total_count: 1, users: [USER_ROW] },
            }),
        });
        expect(Authenticator.scanFeature).toHaveBeenCalledWith('view_attendance_report');
        expect(container.querySelector('.dtr-list tbody a')).toHaveAttribute('href', '/dtr/77');
    });

    it('links each employee to the profile page when the attendance report feature is denied', () => {
        Authenticator.scanFeature.mockReturnValue(false);
        const { container } = renderPanel(TeamPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 97, target_percentage: 95, total_count: 1, users: [USER_ROW] },
            }),
        });
        expect(container.querySelector('.dtr-list tbody a')).toHaveAttribute('href', '/profile/77');
    });

    it('suppresses the drill-down list when the dashboard mounts the panel with show_list false', () => {
        const { container } = renderPanel(TeamPanel, {
            show_list: false,
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 97, target_percentage: 95, total_count: 1, users: [USER_ROW] },
            }),
        });
        expect(container.querySelector('.dtr-list')).toBeNull();
        expect(container.querySelector('.summary-wrapper')).not.toBeNull();
    });

    it('shows the drill-down list by default when show_list is not supplied at all', () => {
        const { container } = renderPanel(TeamPanel, {
            show_list: undefined,
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 97, target_percentage: 95, total_count: 1, users: [USER_ROW] },
            }),
        });
        expect(container.querySelectorAll('.dtr-list tbody tr')).toHaveLength(1);
    });

    it('renders no list when the selected metric came back with an empty user array', () => {
        const { container } = renderPanel(TeamPanel, { selected_summary: 'attendance' });
        expect(container.querySelector('.dtr-list')).toBeNull();
    });

    it('renders no list when the selected metric carries no user collection at all', () => {
        const { container } = renderPanel(TeamPanel, { selected_summary: 'total_overtime' });
        expect(container.querySelector('.dtr-list')).toBeNull();
    });
});

/* ================================================================================
 * 2. HRTeamAttendanceSummaryPanel - Reports -> HR Team Attendance Summary
 * ============================================================================= */

describe('HRTeamAttendanceSummaryPanel - the HR variant of the same numbers', () => {

    it('prints the headcount, the scheduled count and the payroll hours', () => {
        const { container, getByText } = renderPanel(HRPanel, {});
        expect(container.querySelector('.total-headcount-container span')).toHaveTextContent('120');
        expect(tileFor(getByText, 'Scheduled Headcount').querySelector('span')).toHaveTextContent('110');
        expect(tileFor(getByText, 'Overtime').querySelector('span')).toHaveTextContent('31.25');
    });

    /**
     * _FINDING_PCT_SUFFIX (other half) - HR renders the identical figures WITH a % sign.
     */
    it('_FINDING_PCT_SUFFIX prints the same attendance figure with a percent sign, unlike the team panel', () => {
        const { getByText } = renderPanel(HRPanel, {});
        const tile = tileFor(getByText, 'Recorded Attendance');
        expect(tile.querySelector('span').textContent).toBe('97%');
        expect(tile.querySelector('.target').textContent).toBe('TARGET: 95%');
    });

    it('applies the same green/red rule to attendance as the team panel', () => {
        const good = renderPanel(HRPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 99, target_percentage: 95, total_count: 5 },
            }),
        });
        expect(tileFor(good.getByText, 'Recorded Attendance').querySelector('span')).toHaveClass('green');
        good.unmount();

        const bad = renderPanel(HRPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 80, target_percentage: 95, total_count: 5 },
            }),
        });
        expect(tileFor(bad.getByText, 'Recorded Attendance').querySelector('span')).toHaveClass('red');
    });

    it('keeps the inverted leave rule - unplanned leave over target is red, under target is green', () => {
        const over = renderPanel(HRPanel, {
            team_attendance_summary: summaryFixture({
                unplanned_leaves: { total_percentage: 11, target_percentage: 5, total_count: 12 },
            }),
        });
        expect(tileFor(over.getByText, 'Recorded Unplanned Leaves').querySelector('span')).toHaveClass('red');
        over.unmount();

        const under = renderPanel(HRPanel, {
            team_attendance_summary: summaryFixture({
                unplanned_leaves: { total_percentage: 1, target_percentage: 5, total_count: 2 },
            }),
        });
        expect(tileFor(under.getByText, 'Recorded Unplanned Leaves').querySelector('span')).toHaveClass('green');
    });

    it('hides the scheduled headcount tile outside a day scope and shows it inside one', () => {
        const month = renderPanel(HRPanel, { scope_type: 'month' });
        expect(tileFor(month.getByText, 'Scheduled Headcount')).toHaveAttribute('hidden');
        month.unmount();

        const day = renderPanel(HRPanel, { scope_type: 'day' });
        expect(tileFor(day.getByText, 'Scheduled Headcount')).not.toHaveAttribute('hidden');
    });

    it('dispatches the selected summary key when an HR tile is clicked', () => {
        const { getByText, setSelectedAttendanceSummary } = renderPanel(HRPanel, {});
        fireEvent.click(tileFor(getByText, 'Recorded Unplanned Leaves'));
        expect(setSelectedAttendanceSummary).toHaveBeenCalledTimes(1);
        expect(setSelectedAttendanceSummary).toHaveBeenCalledWith('unplanned_leaves');
    });

    it('dispatches its own key from every one of the six HR tiles', () => {
        const { getByText, setSelectedAttendanceSummary } = renderPanel(HRPanel, {});
        const expected = [
            ['Scheduled Headcount', 'scheduled_employees'],
            ['Recorded Attendance', 'attendance'],
            ['Recorded Planned Leaves', 'planned_leaves'],
            ['Recorded Unplanned Leaves', 'unplanned_leaves'],
            ['Rest Day Work', 'total_rest_day_work'],
            ['Overtime', 'total_overtime'],
        ];
        expected.forEach(([label]) => fireEvent.click(tileFor(getByText, label)));
        expect(setSelectedAttendanceSummary.mock.calls).toEqual(expected.map(([, key]) => [key]));
    });

    it('marks the selected HR tile active and bolds its label while the rest stay inactive', () => {
        const { getByText, container } = renderPanel(HRPanel, { selected_summary: 'total_rest_day_work' });
        expect(tileFor(getByText, 'Rest Day Work')).toHaveClass('summary-active');
        expect(getByText('Rest Day Work')).toHaveClass('active-text', 'font-weight-bolder');
        expect(container.querySelectorAll('.summary-inactive')).toHaveLength(5);
        expect(getByText('Overtime').className).toBe('');
    });

    it('_FINDING_UNDEF_RED paints missing HR metric blocks red exactly like the team panel', () => {
        const { getByText } = renderPanel(HRPanel, { team_attendance_summary: { total_headcount: 0 } });
        expect(tileFor(getByText, 'Recorded Attendance').querySelector('span')).toHaveClass('red');
        expect(tileFor(getByText, 'Recorded Planned Leaves').querySelector('span')).toHaveClass('red');
        expect(tileFor(getByText, 'Recorded Unplanned Leaves').querySelector('span')).toHaveClass('red');
    });

    it('gates the HR drill-down link on the HR level rather than on a feature flag', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const { container } = renderPanel(HRPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 97, target_percentage: 95, total_count: 1, users: [USER_ROW] },
            }),
        });
        expect(Authenticator.scanLevel).toHaveBeenCalledWith('HR');
        expect(Authenticator.scanFeature).not.toHaveBeenCalled();
        expect(container.querySelector('.dtr-list tbody a')).toHaveAttribute('href', '/dtr/77');
    });

    it('sends a non-HR viewer to the profile page instead of the DTR page', () => {
        Authenticator.scanLevel.mockReturnValue(false);
        const { container } = renderPanel(HRPanel, {
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 97, target_percentage: 95, total_count: 1, users: [USER_ROW] },
            }),
        });
        expect(container.querySelector('.dtr-list tbody a')).toHaveAttribute('href', '/profile/77');
    });

    it('formats the drill-down date as month and day and keeps the status class', () => {
        const { container } = renderPanel(HRPanel, {
            team_attendance_summary: summaryFixture({
                planned_leaves: {
                    total_percentage: 3, target_percentage: 5, total_count: 1,
                    users: [{ ...USER_ROW, date: '2026-01-09', status: 'Planned Leave', hours: 8 }],
                },
            }),
            selected_summary: 'planned_leaves',
        });
        const cells = Array.from(container.querySelectorAll('.dtr-list tbody td')).map((td) => td.textContent.trim());
        expect(cells[3]).toBe('Jan 9');
        expect(container.querySelector('.dtr-list tbody td.status').className).toBe('status planned-leave');
        expect(cells[4]).toBe('Planned Leave (8)');
    });

    it('renders no HR drill-down list when show_list is false even though users exist', () => {
        const { container } = renderPanel(HRPanel, {
            show_list: false,
            team_attendance_summary: summaryFixture({
                attendance: { total_percentage: 97, target_percentage: 95, total_count: 1, users: [USER_ROW] },
            }),
        });
        expect(container.querySelector('.dtr-list')).toBeNull();
    });
});

/* ================================================================================
 * 3. AssetReport - Reports -> Asset Reports
 * ============================================================================= */

describe('AssetReport - Reports -> Asset Reports', () => {

    const ASSETS = [
        { emp_num: 'EV-1042', EmpName: 'Gary Aure', IsPersonalEquipment: 'No', equipment_type: 'Laptop', serial_no: 'SN-1', asset_tag: 'TAG-1' },
        { emp_num: 'EV-1043', EmpName: 'Glenn Macasarte', IsPersonalEquipment: 'Yes', equipment_type: 'Monitor', serial_no: 'SN-2', asset_tag: 'TAG-2' },
    ];

    const renderReport = (props = {}) => {
        const getAllAssets = jest.fn();
        const utils = render(
            <AssetReport
                user={{ is_all_asset_loaded: true, departments_handled: [{ id: 1, department_name: 'IT' }] }}
                geos={[{ country_id: 5, country_name: 'Philippines' }, { country_id: 6, country_name: 'India' }]}
                all_assets={[]}
                asset_reports_filter={undefined}
                getAllAssets={getAllAssets}
                setRedirect={jest.fn()}
                {...props}
            />
        );
        return { ...utils, getAllAssets };
    };

    let clickSpy;

    beforeEach(() => {
        // The export anchor is appended straight to document.body and never removed, so it
        // survives RTL cleanup - clear it explicitly to keep the counts deterministic.
        document.querySelectorAll('a[download]').forEach((a) => a.remove());
        window.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/asset-csv');
        clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        API.call.mockResolvedValue({ data: 'emp_num,asset\nEV-1042,Laptop' });
    });

    afterEach(() => {
        clickSpy.mockRestore();
        document.querySelectorAll('a[download]').forEach((a) => a.remove());
    });

    /* ---------------------------------------------------------------- mount */

    it('fetches the asset list on mount when it has not been loaded yet', () => {
        const { getAllAssets } = renderReport({
            user: { is_all_asset_loaded: false, departments_handled: [] },
        });
        expect(getAllAssets).toHaveBeenCalledTimes(1);
        expect(getAllAssets).toHaveBeenCalledWith({ geo_id: '', department_id: '', emp_name: '' });
    });

    it('does not refetch the asset list when it is already loaded in the store', () => {
        const { getAllAssets } = renderReport({
            user: { is_all_asset_loaded: true, departments_handled: [] },
        });
        expect(getAllAssets).not.toHaveBeenCalled();
    });

    /**
     * _FINDING_MOUNT_FILTER - the form is repainted with the persisted filter while the mount
     * fetch still asks for everything, so what the user sees selected is not what was fetched.
     */
    it('_FINDING_MOUNT_FILTER refetches unfiltered while showing the restored filter in the form', () => {
        const { getAllAssets, container } = renderReport({
            user: { is_all_asset_loaded: false, departments_handled: [{ id: 1, department_name: 'IT' }] },
            asset_reports_filter: { geo_id: '5', department_id: '1', emp_name: 'Gary' },
        });
        expect(container.querySelector('select[name="geo_id"]').value).toBe('5');
        expect(container.querySelector('input[name="emp_name"]').value).toBe('Gary');
        expect(getAllAssets).toHaveBeenCalledWith({ geo_id: '', department_id: '', emp_name: '' });
    });

    /* --------------------------------------------------------------- render */

    it('offers one geo option per country plus the blank placeholder', () => {
        const { container } = renderReport();
        const options = container.querySelectorAll('select[name="geo_id"] option');
        expect(options).toHaveLength(3);
        expect(options[1]).toHaveAttribute('value', '5');
        expect(options[1]).toHaveAttribute('label', 'Philippines');
        expect(options[2]).toHaveAttribute('label', 'India');
    });

    it('offers only the blank placeholder when the user handles no geos or departments', () => {
        const { container } = renderReport({
            geos: [],
            user: { is_all_asset_loaded: true, departments_handled: [] },
        });
        expect(container.querySelectorAll('select[name="geo_id"] option')).toHaveLength(1);
        expect(container.querySelectorAll('select[name="department_id"] option')).toHaveLength(1);
    });

    it('lists only the departments the logged in user handles', () => {
        const { container } = renderReport({
            user: {
                is_all_asset_loaded: true,
                departments_handled: [
                    { id: 7, department_name: 'Engineering' },
                    { id: 9, department_name: 'Finance' },
                ],
            },
        });
        const options = container.querySelectorAll('select[name="department_id"] option');
        expect(options).toHaveLength(3);
        expect(options[1]).toHaveAttribute('value', '7');
        expect(options[2]).toHaveAttribute('label', 'Finance');
    });

    it('renders one table row per asset with all six columns in order', () => {
        const { container } = renderReport({ all_assets: ASSETS });
        const rows = container.querySelectorAll('.table-container tbody tr');
        expect(rows).toHaveLength(2);
        expect(Array.from(rows[0].querySelectorAll('td')).map((td) => td.textContent))
            .toEqual(['EV-1042', 'Gary Aure', 'No', 'Laptop', 'SN-1', 'TAG-1']);
        expect(Array.from(rows[1].querySelectorAll('td')).map((td) => td.textContent))
            .toEqual(['EV-1043', 'Glenn Macasarte', 'Yes', 'Monitor', 'SN-2', 'TAG-2']);
    });

    it('renders the header row but no body rows when no assets came back', () => {
        const { container } = renderReport({ all_assets: [] });
        expect(container.querySelectorAll('.table-container thead th')).toHaveLength(6);
        expect(container.querySelectorAll('.table-container tbody tr')).toHaveLength(0);
    });

    it('renders an empty table rather than crashing when the asset list is undefined', () => {
        const { container } = renderReport({ all_assets: undefined });
        expect(container.querySelectorAll('.table-container tbody tr')).toHaveLength(0);
        expect(container.querySelector('h2')).toHaveTextContent('IT Asset Reports');
    });

    it('starts the filter form empty when no previous filter is stored', () => {
        const { container } = renderReport({ asset_reports_filter: undefined });
        expect(container.querySelector('select[name="geo_id"]').value).toBe('');
        expect(container.querySelector('select[name="department_id"]').value).toBe('');
        expect(container.querySelector('input[name="emp_name"]').value).toBe('');
    });

    /**
     * _FINDING_SEMICOLON - a stray `;` after </Formik> is JSX text, so it is painted on screen.
     */
    it('_FINDING_SEMICOLON paints a stray semicolon at the end of the page body', () => {
        const { getByTestId } = renderReport();
        expect(getByTestId('asset-wrapper').textContent.trim().endsWith(';')).toBe(true);
    });

    /* --------------------------------------------------------------- filter */

    it('sends the typed employee name and the chosen geo and department as the filter payload', async () => {
        const { container, getAllAssets } = renderReport();
        fireEvent.change(container.querySelector('select[name="geo_id"]'), { target: { name: 'geo_id', value: '5' } });
        fireEvent.change(container.querySelector('select[name="department_id"]'), { target: { name: 'department_id', value: '1' } });
        fireEvent.change(container.querySelector('input[name="emp_name"]'), { target: { name: 'emp_name', value: 'Gary' } });
        await act(async () => { fireEvent.click(container.querySelector('button.btn-primary')); });

        expect(getAllAssets.mock.calls[0][0]).toEqual({
            action: 'filter', method: 'store', geo_id: '5', department_id: '1', emp_name: 'Gary',
        });
    });

    it('drops empty and null filter fields from the payload instead of sending them', async () => {
        const { container, getAllAssets } = renderReport({
            asset_reports_filter: { geo_id: null, department_id: '', emp_name: null },
        });
        await act(async () => { fireEvent.click(container.querySelector('button.btn-primary')); });
        expect(getAllAssets.mock.calls[0][0]).toEqual({ action: 'filter', method: 'store' });
        expect(getAllAssets.mock.calls[0][0]).not.toHaveProperty('geo_id');
        expect(getAllAssets.mock.calls[0][0]).not.toHaveProperty('emp_name');
    });

    it('does not call the export endpoint when the filter button is used', async () => {
        const { container } = renderReport();
        await act(async () => { fireEvent.click(container.querySelector('button.btn-primary')); });
        expect(API.call).not.toHaveBeenCalled();
    });

    /**
     * _FINDING_ACTION_PAYLOAD - the internal Formik bookkeeping fields ride along to the API.
     */
    it('_FINDING_ACTION_PAYLOAD ships the internal action and method fields to the backend as filters', async () => {
        const { container, getAllAssets } = renderReport();
        await act(async () => { fireEvent.click(container.querySelector('button.btn-primary')); });
        expect(getAllAssets.mock.calls[0][0]).toHaveProperty('action', 'filter');
        expect(getAllAssets.mock.calls[0][0]).toHaveProperty('method', 'store');
    });

    /**
     * _FINDING_DOUBLE_SUBMIT - onClick calls handleSubmit() AND lets the click's default
     * action submit the form, so the screen fires two identical requests per click. Firing the
     * form's submit event on its own proves only one of the two comes from the form.
     */
    it('_FINDING_DOUBLE_SUBMIT fires the filter request twice for a single button click', async () => {
        const { container, getAllAssets } = renderReport();
        await act(async () => { fireEvent.click(container.querySelector('button.btn-primary')); });
        expect(getAllAssets).toHaveBeenCalledTimes(2);
        expect(getAllAssets.mock.calls[0]).toEqual(getAllAssets.mock.calls[1]);
    });

    it('neither filters nor exports when the form is submitted without a button setting the action', async () => {
        const { container, getAllAssets } = renderReport();
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        // action is still null, so onSubmitHandler falls through both branches silently.
        expect(getAllAssets).not.toHaveBeenCalled();
        expect(API.call).not.toHaveBeenCalled();
    });

    /* --------------------------------------------------------------- export */

    it('posts the current filter to the asset export endpoint when Export is pressed', async () => {
        const { container, getByText } = renderReport();
        fireEvent.change(container.querySelector('input[name="emp_name"]'), { target: { name: 'emp_name', value: 'Glenn' } });
        await act(async () => { fireEvent.click(getByText('Export')); });

        expect(API.call.mock.calls[0][0]).toEqual({
            method: 'post',
            url: '/user/assetExport',
            params: { action: 'export', method: 'store', emp_name: 'Glenn' },
        });
    });

    it('turns the export response into a downloadable Asset_Reports.csv and clicks it', async () => {
        const { getByText, getAllAssets } = renderReport();
        await act(async () => { fireEvent.click(getByText('Export')); });

        expect(window.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        const anchor = document.querySelector('a[download]');
        expect(anchor).not.toBeNull();
        expect(anchor.getAttribute('download')).toBe('Asset_Reports.csv');
        expect(anchor.getAttribute('href')).toBe('blob:http://localhost/asset-csv');
        expect(clickSpy).toHaveBeenCalled();
        expect(getAllAssets).not.toHaveBeenCalled();
    });

    /**
     * _FINDING_SILENT_EXPORT - the catch block is empty (its only line is commented out).
     */
    it('_FINDING_SILENT_EXPORT swallows a failed export with no download and no message', async () => {
        API.call.mockRejectedValue({ response: { status: 500 } });
        const { getByText, getByTestId } = renderReport();
        await act(async () => { fireEvent.click(getByText('Export')); });

        expect(window.URL.createObjectURL).not.toHaveBeenCalled();
        expect(document.querySelector('a[download]')).toBeNull();
        expect(clickSpy).not.toHaveBeenCalled();
        expect(getByTestId('asset-wrapper').textContent).toContain('IT Asset Reports');
    });

    /**
     * _FINDING_ANCHOR_LEAK + _FINDING_DOUBLE_SUBMIT - one Export click posts twice and leaves
     * both anchors behind in the document.
     */
    it('_FINDING_ANCHOR_LEAK leaves every export anchor behind in the document body', async () => {
        const { getByText } = renderReport();
        await act(async () => { fireEvent.click(getByText('Export')); });
        expect(API.call).toHaveBeenCalledTimes(2);
        expect(document.body.querySelectorAll('a[download="Asset_Reports.csv"]')).toHaveLength(2);
        expect(clickSpy).toHaveBeenCalledTimes(2);
    });
});
