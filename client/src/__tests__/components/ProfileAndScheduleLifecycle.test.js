/**
 * ProfileAndScheduleLifecycle.test.js
 *
 * PAGE-LIFECYCLE coverage for the Profile screen and the Schedule Assign screen.
 *
 *   Menu: (any employee row) -> Profile          container/Profile/Profile.js
 *         Profile -> Job Info tab                container/Profile/JobInformation/JobInformation.js
 *         Profile -> Schedule tab                container/Profile/Schedule/Schedule.js
 *         Employee -> Assign Schedule            container/Schedule/ScheduleAssign/ScheduleAssign.js
 *
 * PHASE 1  MOUNT/LOAD    what is dispatched on open, what renders before data arrives
 * PHASE 2  DATA ARRIVES  new props -> state rebuild -> what now renders
 *                        (standard vs flexible vs customised schedule shapes)
 * PHASE 3  USER ACTIONS  tab / sub-route switch, date-range navigation, template pick, toggles
 * PHASE 4  SUBMIT        assign-schedule save, valid AND invalid
 *
 * ADDITIVE ONLY. No existing test is modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

/* ------------------------------------------------------------------ plumbing */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../services/API', () => ({ call: jest.fn() }));

/* services/Helper.js does `import moment, * as Moment from "moment"` and then feeds the
   NAMESPACE into moment-range's extendMoment(). Webpack hands a CommonJS dependency's
   module.exports straight back for `import * as`, so it is the callable moment function
   in the browser; babel-jest instead builds a non-callable namespace copy, which would
   make generateWeekList/generateWeekListCustom explode for test reasons only.
   Flagging moment as an ES module makes Jest behave like the real bundle. */
jest.mock('moment', () => {
    const actual = jest.requireActual('moment');
    actual.__esModule = true;
    actual.default = actual;
    return actual;
});

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanFeature: jest.fn(() => true),
        scanLevel: jest.fn(() => false),
        checkPermission: jest.fn(() => true),
        checkRole: jest.fn(() => true),
        check: jest.fn(() => true),
    },
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
jest.mock('../../components/Template/BackButton', () => () => <button type="button">Back</button>);
jest.mock('../../components/ChangePasswordForm', () => () => <div />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: () => <div data-testid="input-date" />,
}));
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle',
    () => () => <div data-testid="request-subtitle" />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-select', () => () => <div data-testid="react-select" />);
jest.mock('react-datepicker', () => ({ selected, onChange }) => (
    <input
        data-testid="datepicker"
        value={selected ? String(selected) : ''}
        onChange={(e) => onChange && onChange(new Date(e.target.value))}
    />
));

/* Profile's direct children are stubbed so the PARENT lifecycle is what is measured.
   The real JobInformation / Schedule modules are required straight from their .js file
   below, which is a different module path, so they are NOT stubbed for their own suites. */
jest.mock('../../container/Profile/PersonalInformation', () => () => <div data-testid="tab-body-personal" />);
jest.mock('../../container/Profile/JobInformation',      () => () => <div data-testid="tab-body-job" />);
jest.mock('../../container/Profile/TimeOff',             () => () => <div data-testid="tab-body-timeoff" />);
jest.mock('../../container/Profile/Schedule',            () => () => <div data-testid="tab-body-schedule" />);
jest.mock('../../container/Profile/ScheduleHistory',     () => () => <div data-testid="tab-body-schedhistory" />);
jest.mock('../../container/Profile/LeaveCredits',        () => () => <div data-testid="leave-credits" />);

/* The Schedule sub-route's date bar: three buttons, one per scope the screen supports. */
jest.mock('../../components/Template/ReportNavigator', () => (props) => {
    const m = require('moment');
    return (
        <div data-testid="report-navigator">
            <button type="button" data-testid="nav-week"
                onClick={() => props.handleChangeDate(m('2026-08-03'), m('2026-08-09'), 'week')}>W</button>
            <button type="button" data-testid="nav-month"
                onClick={() => props.handleChangeDate(m('2026-08-01'), m('2026-08-31'), 'month')}>M</button>
            <button type="button" data-testid="nav-custom"
                onClick={() => props.handleChangeDate(m('2026-08-03'), m('2026-08-12'), 'custom')}>C</button>
        </div>
    );
});

/* Schedule Assign's heavy form widgets. */
jest.mock('../../components/Schedule/ScheduleDetails.js', () => ({
    Scheduledetails:                       () => <div data-testid="sched-details" />,
    ScheduledetailsWithTimezone:           () => <div data-testid="sched-details-tz" />,
    onSelectTimeHandlerStd:                jest.fn(),
    onSelectTimeHandlerFlexi:              jest.fn(),
    FlexibleSchedDetailsFormWithTimezone:  () => <div data-testid="flex-form-tz" />,
    SchedulePolicy:                        () => <div data-testid="schedule-policy" />,
    StandardSchedDetailsFormWithTimezone:  () => <div data-testid="std-form-tz" />,
    WorkDays:                              () => <div data-testid="work-days" />,
    StandardSchedDetailsForm:              () => <div data-testid="std-form" />,
    FlexibleSchedDetailsForm:              () => <div data-testid="flex-form" />,
    ScheduleHolidayPolicy:                 () => <div data-testid="holiday-policy" />,
}));

jest.mock('react-bootstrap', () => {
    const ReactLib = require('react');
    const box = (Tag) => ({ children }) => <Tag>{children}</Tag>;

    const Form = ({ children }) => <div>{children}</div>;
    Form.Group = box('div');
    Form.Row   = box('div');
    Form.Label = box('label');
    const FormControl = ({ children, as, onChange }) =>
        as === 'select'
            ? <select onChange={onChange}>{children}</select>
            : <input onChange={onChange} />;
    FormControl.Feedback = box('div');
    Form.Control = FormControl;

    return {
        Container: box('div'),
        Row:       box('div'),
        Col:       box('div'),
        Card:      box('div'),
        Table:     box('table'),
        InputGroup: box('div'),
        Image:     () => <img alt="" />,
        Spinner:   () => <div />,
        FormControl,
        Form,
        Button: ({ children, onClick, type }) => (
            <button type={type || 'button'} onClick={onClick}>{children}</button>
        ),
        Tab: () => null,
        Tabs: ({ children, onSelect }) => (
            <div data-testid="tabs">
                {ReactLib.Children.toArray(children).map((child, i) => (
                    <button key={i} type="button"
                        data-testid={'tab-' + child.props.eventKey}
                        onClick={() => onSelect && onSelect(child.props.eventKey)}>
                        {child.props.title}
                    </button>
                ))}
            </div>
        ),
    };
});

jest.mock('../../store/actions/profile/profileActions', () => ({
    fetchTimeOff: jest.fn(), fetchPersonalInformation: jest.fn(), fetchProfile: jest.fn(),
    fetchJobInformation: jest.fn(), fetchLeaveCredits: jest.fn(), fetchSchedule: jest.fn(),
    fetchTemporarySchedule: jest.fn(), setDateList: jest.fn(), setWeekList: jest.fn(),
    setScope: jest.fn(), fetchScheduleHistory: jest.fn(), changePassword: jest.fn(),
}));
jest.mock('../../store/actions/dtr/dtrActions', () => ({ viewEmployeeDtr: jest.fn() }));
jest.mock('../../store/actions/scheduleActions', () => ({
    scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(),
    listTemplate: jest.fn(), getTemplateSchedule: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ getUserInfo: jest.fn() }));

global.links = new Proxy({}, { get: () => '/x/' });

const Authenticator   = require('../../services/Authenticator').default;
const Profile         = require('../../container/Profile/Profile').default;
const JobInformation  = require('../../container/Profile/JobInformation/JobInformation').default;
const ProfileSchedule = require('../../container/Profile/Schedule/Schedule').default;
const ScheduleAssign  = require('../../container/Schedule/ScheduleAssign/ScheduleAssign').default;

const flush = () => act(() => Promise.resolve());

beforeEach(() => {
    Authenticator.scanFeature.mockReturnValue(true);
    Authenticator.scanLevel.mockReturnValue(false);
});
afterEach(() => jest.clearAllMocks());

/* =========================================================================== */
/*  PROFILE PAGE — the container that owns the tabs                            */
/* =========================================================================== */

const profileState = (over = {}) => ({
    details: { id: 42, full_name: 'Ann Reyes', department: 'IT', job_title: 'Developer' },
    profile_picture: null,
    personal_information: {},
    employment_status: null,
    job_information: null,
    leaves_list: [],
    schedule: null,
    temporary_schedule: [],
    dates: [], date_list: [], week_list: [], scope: 'week',
    ...over,
});

const profileProps = (over = {}) => ({
    params:   { id: '42' },
    location: { pathname: '/profile/42' },
    profile:  profileState(),
    user:     { id: 42 },
    dtr:      { list: [] },
    page:     { isReloading: false },
    fetchProfile: jest.fn(),
    fetchPersonalInformation: jest.fn(),
    fetchJobInformation: jest.fn(),
    fetchLeaveCredits: jest.fn(),
    fetchSchedule: jest.fn(),
    fetchScheduleHistory: jest.fn(),
    fetchTimeOff: jest.fn(),
    fetchTemporarySchedule: jest.fn(),
    setDateList: jest.fn(),
    setWeekList: jest.fn(),
    setScope: jest.fn(),
    viewEmployeeDtr: jest.fn(),
    ...over,
});

describe('Profile page — PHASE 1: opening the page', () => {

    test('opening_a_profile_loads_that_employees_header_timesheet_and_personal_info_tab', () => {
        const props = profileProps();
        const { getByText, getByTestId } = render(<Profile {...props} />);

        const week_start = moment().startOf('week').add(1, 'days').format('YYYY-MM-DD');
        const week_end   = moment().endOf('week').add(1, 'days').format('YYYY-MM-DD');

        expect(props.viewEmployeeDtr).toHaveBeenCalledWith('42', week_start, week_end);
        expect(props.setScope).toHaveBeenCalledWith('week');
        expect(props.setDateList).toHaveBeenCalledTimes(1);
        expect(props.setWeekList).toHaveBeenCalledTimes(1);
        expect(props.fetchProfile).toHaveBeenCalledWith('42');
        expect(props.fetchPersonalInformation).toHaveBeenCalledWith('42');

        expect(getByText(/Ann Reyes/)).toBeInTheDocument();
        expect(getByTestId('tab-body-personal')).toBeInTheDocument();
    });

    test('while_the_page_is_still_reloading_the_tabs_and_tab_body_are_not_shown', () => {
        const props = profileProps({ page: { isReloading: true } });
        const { queryByTestId, getByText } = render(<Profile {...props} />);

        expect(queryByTestId('tabs')).toBeNull();
        expect(queryByTestId('tab-body-personal')).toBeNull();
        expect(getByText(/Ann Reyes/)).toBeInTheDocument();   // header still renders
    });

    test('an_employee_with_no_profile_details_yet_sees_no_tabs_at_all', () => {
        const props = profileProps({ profile: profileState({ details: {} }) });
        const { queryByTestId } = render(<Profile {...props} />);

        expect(queryByTestId('tabs')).toBeNull();
    });

    test('viewing_someone_else_without_the_permissions_hides_personal_job_and_time_off_tabs', () => {
        Authenticator.scanFeature.mockReturnValue(false);
        const props = profileProps({ user: { id: 99 } });      // not the profile owner
        const { queryByTestId, getByTestId } = render(<Profile {...props} />);

        expect(queryByTestId('tab-personal_information')).toBeNull();
        expect(queryByTestId('tab-job_information')).toBeNull();
        expect(queryByTestId('tab-time_off')).toBeNull();
        expect(getByTestId('tab-schedule')).toBeInTheDocument();
        expect(getByTestId('tab-schedule_history')).toBeInTheDocument();
    });
});

describe('Profile page — PHASE 3: switching tabs (each tab is its own server call)', () => {

    test('switching_to_the_job_info_tab_fetches_job_information_and_shows_that_tab_body', () => {
        const props = profileProps();
        const { getByTestId, queryByTestId } = render(<Profile {...props} />);

        act(() => { fireEvent.click(getByTestId('tab-job_information')); });

        expect(props.fetchJobInformation).toHaveBeenCalledWith('42');
        expect(getByTestId('tab-body-job')).toBeInTheDocument();
        expect(queryByTestId('tab-body-personal')).toBeNull();
    });

    test('switching_to_the_time_off_tab_fetches_leave_credits_and_this_months_time_off', () => {
        const props = profileProps();
        const { getByTestId } = render(<Profile {...props} />);

        act(() => { fireEvent.click(getByTestId('tab-time_off')); });

        expect(props.fetchLeaveCredits).toHaveBeenCalledWith('42');
        expect(props.fetchTimeOff).toHaveBeenCalledTimes(1);
        const [id, from, to] = props.fetchTimeOff.mock.calls[0];
        expect(id).toBe('42');
        expect(from.format('YYYY-MM-DD')).toBe(moment().startOf('month').format('YYYY-MM-DD'));
        expect(to.format('YYYY-MM-DD')).toBe(moment().endOf('month').format('YYYY-MM-DD'));
        expect(getByTestId('tab-body-timeoff')).toBeInTheDocument();
    });

    test('switching_to_the_schedule_tab_fetches_the_default_and_temporary_schedules_for_this_week', () => {
        const props = profileProps();
        const { getByTestId } = render(<Profile {...props} />);

        act(() => { fireEvent.click(getByTestId('tab-schedule')); });

        expect(props.fetchSchedule).toHaveBeenCalledWith('42');
        expect(props.fetchTemporarySchedule).toHaveBeenCalledWith('42');
        expect(getByTestId('tab-body-schedule')).toBeInTheDocument();
    });

    test('switching_to_the_schedule_history_tab_fetches_the_history_with_no_extra_filter', () => {
        const props = profileProps();
        const { getByTestId } = render(<Profile {...props} />);

        act(() => { fireEvent.click(getByTestId('tab-schedule_history')); });

        expect(props.fetchScheduleHistory).toHaveBeenCalledWith('42', null);
        expect(getByTestId('tab-body-schedhistory')).toBeInTheDocument();
    });

    test('opening_a_different_employees_profile_reloads_everything_and_returns_to_the_personal_info_tab', () => {
        const props = profileProps();
        const { getByTestId, rerender } = render(<Profile {...props} />);

        act(() => { fireEvent.click(getByTestId('tab-schedule')); });
        expect(getByTestId('tab-body-schedule')).toBeInTheDocument();

        jest.clearAllMocks();
        Authenticator.scanFeature.mockReturnValue(true);

        act(() => {
            rerender(<Profile {...props} params={{ id: '77' }} location={{ pathname: '/profile/77' }} />);
        });

        expect(props.fetchProfile).toHaveBeenCalledWith('77');
        expect(props.viewEmployeeDtr).toHaveBeenCalledTimes(1);
        expect(getByTestId('tab-body-personal')).toBeInTheDocument();

        // FINDING FE-PROF-1 (characterised): the route-change reload calls
        // fetchPersonalInformation once itself and then AGAIN from the tab-change
        // effect, so every profile-to-profile navigation double-hits the endpoint.
        expect(props.fetchPersonalInformation).toHaveBeenCalledTimes(2);
    });
});

/* =========================================================================== */
/*  PROFILE -> JOB INFO tab                                                    */
/* =========================================================================== */

describe('Profile Job Info tab — PHASE 2: what renders once the data arrives', () => {

    const jobProps = (over = {}) => ({
        profile: null,
        user: { id: 42, department: 'IT' },
        ...over,
    });

    test('before_the_profile_arrives_the_job_info_tab_renders_nothing', () => {
        const { container } = render(<JobInformation {...jobProps()} />);
        expect(container.querySelectorAll('table').length).toBe(0);
    });

    test('an_employee_with_no_employment_history_and_no_job_history_shows_neither_table', () => {
        const props = jobProps({ profile: { employment_status: null, job_information: null } });
        const { container } = render(<JobInformation {...props} />);
        expect(container.querySelectorAll('table').length).toBe(0);
    });

    test('employment_status_and_job_information_render_newest_first_in_two_tables', () => {
        const props = jobProps({
            profile: {
                employment_status: [
                    { date: '2024-01-01', emp_status: 'Probationary', comment: 'hired' },
                    { date: '2025-01-01', emp_status: 'Regular',      comment: 'regularised' },
                ],
                job_information: [
                    { date: '2024-01-01', location: 'Manila', department: 'IT', jobTitle: 'Dev',        reportsTo: 'Lea' },
                    { date: '2025-01-01', location: 'Manila', department: 'IT', jobTitle: 'Senior Dev', reportsTo: 'Lea' },
                ],
            },
        });
        const { container, getByText } = render(<JobInformation {...props} />);

        expect(container.querySelectorAll('table').length).toBe(2);
        expect(getByText('Regular')).toBeInTheDocument();
        expect(getByText('Senior Dev')).toBeInTheDocument();

        // reversed: the 2025 row is rendered above the 2024 row
        const statusRows = container.querySelectorAll('table')[0].querySelectorAll('tbody tr');
        expect(statusRows[0].textContent).toContain('Regular');
        expect(statusRows[1].textContent).toContain('Probationary');
    });

    test('a_client_user_viewing_someone_else_only_sees_job_rows_from_their_own_department', () => {
        Authenticator.scanLevel.mockReturnValue(true);          // logged in as Client level
        const props = jobProps({
            id: 7,                                              // viewing a different employee
            profile: {
                employment_status: null,
                job_information: [
                    { date: '2024-01-01', location: 'Manila', department: 'IT', jobTitle: 'Dev',      reportsTo: 'Lea' },
                    { date: '2025-01-01', location: 'Cebu',   department: 'HR', jobTitle: 'Recruiter', reportsTo: 'Max' },
                ],
            },
        });
        const { getByText, queryByText } = render(<JobInformation {...props} />);

        expect(getByText('Dev')).toBeInTheDocument();
        expect(queryByText('Recruiter')).toBeNull();
    });
});

/* =========================================================================== */
/*  PROFILE -> SCHEDULE tab (the week / month / custom schedule grid)          */
/* =========================================================================== */

const WEEK_DATES = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06',
                    '2026-08-07', '2026-08-08', '2026-08-09'];

const standardSched = () => ({
    schedule_type: 'standard',
    rest_day: ['sat', 'sun'],
    schedule_details: { all: { start_time: '09:00', end_time: '18:00' } },
});

const flexibleSched = () => ({
    schedule_type: 'flexible',
    rest_day: ['sun'],
    schedule_details: {
        all: {
            start_time: '09:00', end_time: '18:00',
            start_flexy_time: '08:00', end_flexy_time: '19:00',
        },
    },
});

const customisedTemporary = () => ([
    {   // single-day override
        valid_from: '2026-08-03', valid_to: '2026-08-03', rest_day: [],
        schedule_details: { all: {
            start_time: '07:00', end_time: '16:00',
            start_flexy_time: '06:30', end_flexy_time: '16:30' } },
    },
    {   // date-range override
        valid_from: '2026-08-05', valid_to: '2026-08-07', rest_day: ['tue'],
        schedule_details: { all: {
            start_time: '11:00', end_time: '20:00',
            start_flexy_time: '10:30', end_flexy_time: '20:30' } },
    },
]);

const schedProps = (over = {}) => ({
    id: 42,
    profile: {
        scope: 'week',
        dates: WEEK_DATES,
        date_list: WEEK_DATES,
        week_list: [],
        schedule: standardSched(),
        temporary_schedule: [],
    },
    user: { id: 42 },
    dtr: [],
    start_date: moment('2026-08-03'),
    end_date: moment('2026-08-09'),
    viewEmployeeDtr: jest.fn(),
    setScope: jest.fn(),
    setDateList: jest.fn(),
    setWeekList: jest.fn(),
    fetchTimeOff: jest.fn(),
    ...over,
});

describe('Profile Schedule tab — PHASE 2: rendering the schedule grid', () => {

    test('before_the_profile_arrives_the_schedule_tab_renders_nothing', () => {
        const { container } = render(<ProfileSchedule {...schedProps({ profile: null })} />);
        expect(container.textContent).toBe('');
    });

    test('a_standard_schedule_shows_the_same_start_and_end_time_on_every_working_day_and_rest_day_on_weekends', () => {
        const { container, getAllByText } = render(<ProfileSchedule {...schedProps()} />);

        expect(container.textContent).toContain('09:00');
        expect(container.textContent).toContain('18:00');
        expect(getAllByText('REST DAY').length).toBe(2);     // sat + sun
    });

    test('a_flexible_schedule_also_shows_the_flexible_window_under_the_core_hours', () => {
        const props = schedProps();
        props.profile.schedule = flexibleSched();
        const { container, getAllByText } = render(<ProfileSchedule {...props} />);

        expect(container.textContent).toContain('08:00');
        expect(container.textContent).toContain('19:00');
        expect(getAllByText('REST DAY').length).toBe(1);     // sun only
    });

    test('a_customised_temporary_schedule_overrides_the_default_hours_for_the_days_it_covers', () => {
        const props = schedProps();
        props.profile.schedule = flexibleSched();
        props.profile.temporary_schedule = customisedTemporary();
        const { container } = render(<ProfileSchedule {...props} />);

        expect(container.textContent).toContain('07:00');    // single-day override, Aug 3
        expect(container.textContent).toContain('11:00');    // range override, Aug 5-7
        expect(container.textContent).toContain('20:30');
    });

    test('when_the_timesheet_has_a_record_for_every_day_the_actual_punches_replace_the_planned_hours', () => {
        const props = schedProps();
        props.dtr = WEEK_DATES.map((d, i) => ({
            attendance_status: { name: i >= 5 ? 'Rest Day' : 'Present' },
            start_datetime: d + ' 08:15:00',
            end_datetime:   d + ' 17:45:00',
            start_flexy_datetime: d + ' 07:45:00',
            end_flexy_datetime:   d + ' 18:15:00',
        }));
        const { container, getAllByText } = render(<ProfileSchedule {...props} />);

        expect(container.textContent).toContain('08:15');
        expect(container.textContent).toContain('17:45');
        expect(getAllByText('REST DAY').length).toBe(2);
    });

    test('a_partly_filled_timesheet_uses_punches_where_they_exist_and_the_plan_for_the_rest', () => {
        const props = schedProps();
        props.dtr = [{
            attendance_status: { name: 'Present' },
            start_datetime: '2026-08-03 08:15:00',
            end_datetime:   '2026-08-03 17:45:00',
            start_flexy_datetime: '2026-08-03 07:45:00',
            end_flexy_datetime:   '2026-08-03 18:15:00',
        }];
        const { container } = render(<ProfileSchedule {...props} />);

        expect(container.textContent).toContain('08:15');    // day 1 from the timesheet
        expect(container.textContent).toContain('09:00');    // remaining days from the plan
    });

    test('an_empty_week_renders_the_day_headers_but_no_schedule_cards', () => {
        const props = schedProps();
        props.profile.dates = [];
        props.profile.date_list = [];
        const { container, getByText } = render(<ProfileSchedule {...props} />);

        expect(getByText('Monday')).toBeInTheDocument();
        expect(container.textContent).not.toContain('09:00');
    });

    test('a_month_view_lays_the_weeks_out_as_rows_and_pads_the_first_and_last_week', () => {
        const props = schedProps();
        props.profile.scope = 'month';
        props.profile.dates = [[moment('2026-08-05'), moment('2026-08-06'), moment('2026-08-07')]];
        props.profile.date_list = ['2026-08-05', '2026-08-06', '2026-08-07'];
        props.profile.week_list = [['Wednesday', 'Friday']];
        props.profile.temporary_schedule = customisedTemporary();
        const { container } = render(<ProfileSchedule {...props} />);

        expect(container.textContent).toContain('Aug, 5');
        expect(container.textContent).toContain('11:00');    // range override applies in month view too
    });

    test('a_month_view_with_a_complete_timesheet_shows_the_punches_and_marks_rest_days', () => {
        const props = schedProps();
        props.profile.scope = 'month';
        props.profile.dates = [[moment('2026-08-08'), moment('2026-08-09')]];
        props.profile.date_list = ['2026-08-08', '2026-08-09'];
        props.profile.week_list = [['Saturday', 'Sunday']];
        props.dtr = [
            { attendance_status: { name: 'Present' },
              start_datetime: '2026-08-08 09:05:00', end_datetime: '2026-08-08 18:05:00',
              start_flexy_datetime: '2026-08-08 08:05:00', end_flexy_datetime: '2026-08-08 19:05:00' },
            { attendance_status: { name: 'Rest Day' },
              start_datetime: null, end_datetime: null,
              start_flexy_datetime: null, end_flexy_datetime: null },
        ];
        const { container, getAllByText } = render(<ProfileSchedule {...props} />);

        expect(container.textContent).toContain('09:05');
        expect(getAllByText('REST DAY').length).toBe(1);
    });

    test('an_unknown_scope_falls_back_to_the_placeholder_instead_of_a_grid', () => {
        const props = schedProps();
        props.profile.scope = 'quarter';
        const { getByText } = render(<ProfileSchedule {...props} />);
        expect(getByText('Neither')).toBeInTheDocument();
    });
});

describe('Profile Schedule tab — PHASE 3: navigating the date range', () => {

    test('moving_to_another_week_refetches_that_weeks_timesheet_and_rebuilds_the_week_grid', () => {
        const props = schedProps();
        const { getByTestId } = render(<ProfileSchedule {...props} />);

        act(() => { fireEvent.click(getByTestId('nav-week')); });

        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(42, '2026-08-03', '2026-08-09');
        expect(props.setScope).toHaveBeenCalledWith('week');
        expect(props.setDateList).toHaveBeenCalledTimes(1);
        expect(props.setWeekList).toHaveBeenCalledTimes(1);
        const weekArg = props.setWeekList.mock.calls[0][0];
        expect(Array.isArray(weekArg.dates_list)).toBe(true);
    });

    test('switching_to_the_month_view_refetches_the_month_and_rebuilds_a_month_grid', () => {
        const props = schedProps();
        const { getByTestId } = render(<ProfileSchedule {...props} />);

        act(() => { fireEvent.click(getByTestId('nav-month')); });

        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(42, '2026-08-01', '2026-08-31');
        expect(props.setScope).toHaveBeenCalledWith('month');
        expect(props.setDateList.mock.calls[0][0].length).toBe(31);
        expect(props.setWeekList.mock.calls[0][0].week_list.length).toBeGreaterThan(0);
    });

    test('choosing_a_custom_date_range_refetches_that_range_and_builds_a_custom_grid', () => {
        const props = schedProps();
        const { getByTestId } = render(<ProfileSchedule {...props} />);

        act(() => { fireEvent.click(getByTestId('nav-custom')); });

        expect(props.viewEmployeeDtr).toHaveBeenCalledWith(42, '2026-08-03', '2026-08-12');
        expect(props.setScope).toHaveBeenCalledWith('custom');
        expect(props.setDateList.mock.calls[0][0].length).toBeGreaterThan(0);
        expect(props.setWeekList.mock.calls[0][0].dates_list.length).toBeGreaterThan(0);
    });
});

/* =========================================================================== */
/*  ASSIGN SCHEDULE screen                                                     */
/* =========================================================================== */

const assignProps = (over = {}) => ({
    params: { user_id: 42 },
    user: { id: 42, user_offset_seconds: 0, pov_timezone: 'Asia/Manila' },
    user_info: { user_offset_seconds: 3600, pov_timezone: 'Asia/Singapore' },
    page_reloaded: false,
    template_list: [],
    default_schedule: null,
    template_data: null,
    listTemplate: jest.fn(),
    getUserInfo: jest.fn(),
    scheduleAssign: jest.fn(),
    getDefaultSchedule: jest.fn(),
    getTemplateSchedule: jest.fn(),
    ...over,
});

const savedStandard = (over = {}) => ({
    creation_type: 'customize',
    valid_from: '2026-08-01',
    work_days: ['mon', 'tue'],
    schedule_policies: {
        allow_late: '5', allow_undertime: '10', allow_night_diff: '1',
        allow_special_holiday: '1', allow_legal_holiday: '1',
    },
    schedule_type: 'standard',
    schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } },
    pov_schedule_details: null,
    ...over,
});

const savedFlexible = () => ({
    creation_type: 'customize',
    valid_from: '2026-08-01',
    work_days: ['mon', 'tue'],
    schedule_policies: { allow_late: '5' },
    schedule_type: 'flexible',
    schedule_details: { all: {
        start_time: '09:00:00', end_time: '18:00:00',
        start_flexy_time: '08:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00' } },
    pov_schedule_details: { all: {
        start_time: '10:00:00', end_time: '19:00:00',
        start_flexy_time: '09:00:00', end_flexy_time: '20:00:00' } },
});

const savedCustomised = () => ({
    creation_type: 'customize',
    valid_from: '2026-08-01',
    work_days: ['mon', 'tue'],
    schedule_policies: { allow_late: '0' },
    schedule_type: 'customize',
    schedule_details: {
        mon: { start_time: '09:00:00', end_time: '18:00:00',
               start_flexy_time: '08:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00' },
        tue: { start_time: '10:00:00', end_time: '19:00:00',
               start_flexy_time: '09:00:00', end_flexy_time: '20:00:00', break_time: '01:00:00' },
    },
    pov_schedule_details: null,
});

const blankSchedule = () => ({
    creation_type: 'customize',
    valid_from: null,
    work_days: [],
    schedule_policies: {},
    schedule_type: null,
    schedule_details: {},
    pov_schedule_details: null,
});

describe('Assign Schedule — PHASE 1: opening the screen', () => {

    test('opening_assign_schedule_shows_the_loading_page_and_asks_for_the_user_templates_and_current_schedule', () => {
        const props = assignProps();
        const { getByTestId, queryByText } = render(<ScheduleAssign {...props} />);

        expect(props.getUserInfo).toHaveBeenCalledWith(42);
        expect(props.listTemplate).toHaveBeenCalledTimes(1);
        expect(props.getDefaultSchedule).toHaveBeenCalledWith('user', 42);

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryByText('Update')).toBeNull();               // form not rendered yet
    });
});

describe('Assign Schedule — PHASE 2: the saved schedule arrives', () => {

    test('a_saved_standard_schedule_opens_the_standard_form_with_the_saved_policies', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender, getByTestId, getByText } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={savedStandard()} page_reloaded={true} />);
        });

        expect(ref.current.state.schedule_type).toBe('standard');
        expect(ref.current.state.std_schedule_details.length).toBe(1);
        expect(ref.current.state.schedule_policies.allow_late).toBe(5);
        expect(ref.current.state.schedule_policies.allow_undertime).toBe(10);
        expect(ref.current.state.work_day).toEqual(['mon', 'tue']);
        expect(getByText('Standard Schedule')).toBeInTheDocument();
        expect(getByTestId('std-form-tz')).toBeInTheDocument();
    });

    test('a_saved_flexible_schedule_opens_the_flexible_form_and_keeps_the_viewers_timezone_copy', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender, getByTestId, getByText } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={savedFlexible()} page_reloaded={true} />);
        });

        expect(ref.current.state.schedule_type).toBe('flexible');
        expect(ref.current.state.flx_schedule_details.length).toBe(1);
        expect(ref.current.state.pov_schedule_details[0].start_time instanceof Date).toBe(true);
        expect(getByText('Flexible Schedule')).toBeInTheDocument();
        expect(getByTestId('flex-form-tz')).toBeInTheDocument();
    });

    test('a_saved_customised_schedule_opens_one_row_per_working_day', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender, getAllByTestId, getByText } = render(<ScheduleAssign {...props} ref={ref} />);

        // template list lands first, which is what gives the screen the timezone offset
        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref} template_list={[{ id: 1, name: 'Morning' }]} />);
        });
        expect(ref.current.state.owner_offset).toBe(3600);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref} template_list={[{ id: 1, name: 'Morning' }]}
                default_schedule={savedCustomised()} page_reloaded={true} />);
        });

        expect(ref.current.state.schedule_type).toBe('customize');
        expect(ref.current.state.cst_schedule_details.length).toBe(2);
        expect(ref.current.state.pov_schedule_details.length).toBe(2);
        expect(getByText('Customize Schedule')).toBeInTheDocument();
        expect(getAllByTestId('sched-details-tz').length).toBe(2);
    });

    test('a_schedule_that_arrives_before_the_page_is_marked_reloaded_is_ignored_and_the_form_stays_hidden', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender, getByTestId } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={savedStandard()} page_reloaded={false} />);
        });

        expect(ref.current.state.isInitialDataLoaded).toBe(false);
        expect(getByTestId('page-loading')).toBeInTheDocument();
    });
});

describe('Assign Schedule — PHASE 3: user actions on the form', () => {

    test('picking_a_template_from_the_dropdown_loads_that_templates_schedule', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender, container } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref} template_list={[{ id: 3, name: 'Night Shift' }]} />);
        });
        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref} template_list={[{ id: 3, name: 'Night Shift' }]}
                default_schedule={savedStandard({ creation_type: 'template' })} page_reloaded={true} />);
        });

        const select = container.querySelector('select');
        expect(select).not.toBeNull();
        await act(async () => { fireEvent.change(select, { target: { value: '3' } }); });

        expect(props.getTemplateSchedule).toHaveBeenCalledWith('3', 'Default');
    });

    test('when_the_chosen_template_loads_the_form_switches_to_that_templates_schedule_type', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender, getByText } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={savedStandard()} page_reloaded={true} />);
        });
        expect(getByText('Standard Schedule')).toBeInTheDocument();

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={savedStandard()} page_reloaded={true}
                template_data={{
                    work_days: ['mon'],
                    schedule_policies: { allow_late: '2' },
                    schedule_type: 'flexible',
                    schedule_details: { all: {
                        start_time: '13:00:00', end_time: '22:00:00',
                        start_flexy_time: '12:00:00', end_flexy_time: '23:00:00',
                        break_time: '01:00:00' } },
                }} />);
        });

        expect(ref.current.state.schedule_type).toBe('flexible');
        expect(ref.current.state.creation_type).toBe('template');
        expect(getByText('Flexible Schedule')).toBeInTheDocument();
    });

    test('toggling_outlook_flips_the_side_by_side_timezone_view', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender, getByText } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={savedStandard()} page_reloaded={true} />);
        });
        expect(ref.current.state.open_contrast).toBe(true);

        await act(async () => { fireEvent.click(getByText(/Toggle Outlook/)); });
        expect(ref.current.state.open_contrast).toBe(false);
    });
});

describe('Assign Schedule — PHASE 4: saving', () => {

    test('saving_without_choosing_a_schedule_type_blocks_the_save_but_shows_a_developer_message_FINDING_FE_SCHED_1', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender, container } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={blankSchedule()} page_reloaded={true} />);
        });

        const form = container.querySelector('form');
        await act(async () => { fireEvent.submit(form); });
        await flush();

        // the guard itself works — nothing is sent to the server
        expect(props.scheduleAssign).not.toHaveBeenCalled();

        // FINDING FE-SCHED-1 (characterised): the schedule_type rule is `.required()` but not
        // `.nullable()`, so an untouched schedule fails the TYPE check first and the user is
        // shown a raw Yup message instead of the intended "Please Select Schedule Type".
        expect(container.textContent).toContain('schedule_type must be a');
        expect(container.textContent).not.toContain('Please Select Schedule Type');
    });

    test('saving_a_standard_schedule_sends_the_times_and_the_effective_dates_to_the_api', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={savedStandard()} page_reloaded={true} />);
        });

        await act(async () => {
            ref.current.onSubmitHandler({
                bind_to: 'user', bind_id: 42,
                schedule_type: 'standard',
                work_days: ['mon', 'tue'],
                std_schedule_details: [{
                    start_time: new Date('2020-01-01 09:00:00'),
                    end_time:   new Date('2020-01-01 18:00:00'),
                    break_time: new Date('2020-01-01 01:00:00'),
                }],
                from: new Date('2026-08-01 00:00:00'),
                to:   new Date('2026-08-31 00:00:00'),
            });
        });

        expect(props.scheduleAssign).toHaveBeenCalledTimes(1);
        const sent = props.scheduleAssign.mock.calls[0][0];
        expect(sent.schedule_details).toEqual({
            all: { start_time: '09:00', end_time: '18:00', break_time: '01:00' },
        });
        expect(sent.valid_from).toBe('2026-08-01');
        expect(sent.valid_to).toBe('2026-08-31');
    });

    test('saving_a_customised_schedule_sends_one_entry_per_working_day', async () => {
        const props = assignProps();
        const ref = React.createRef();
        const { rerender } = render(<ScheduleAssign {...props} ref={ref} />);

        await act(async () => {
            rerender(<ScheduleAssign {...props} ref={ref}
                default_schedule={savedCustomised()} page_reloaded={true} />);
        });

        const day = (h) => ({
            start_time:       new Date('2020-01-01 ' + h + ':00:00'),
            end_time:         new Date('2020-01-01 ' + (h + 9) + ':00:00'),
            start_flexy_time: new Date('2020-01-01 ' + (h - 1) + ':00:00'),
            end_flexy_time:   new Date('2020-01-01 ' + (h + 10) + ':00:00'),
            break_time:       new Date('2020-01-01 01:00:00'),
        });

        await act(async () => {
            ref.current.onSubmitHandler({
                schedule_type: 'customize',
                work_days: ['mon', 'tue'],
                cst_schedule_details: [day(9), day(10)],
                from: new Date('2026-08-01 00:00:00'),
                to:   new Date('2026-08-31 00:00:00'),
            });
        });

        const sent = props.scheduleAssign.mock.calls[0][0];
        expect(Object.keys(sent.schedule_details)).toEqual(['mon', 'tue']);
        expect(sent.schedule_details.mon.start_time).toBe('09:00');
        expect(sent.schedule_details.tue.start_time).toBe('10:00');
    });
});
