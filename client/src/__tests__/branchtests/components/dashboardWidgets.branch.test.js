/**
 * EVOX — Jest: the Dashboard widgets
 *
 * Sources under test:
 *   src/components/Dashboard/TeamAttendance/TeamAttendance.js
 *   src/components/Dashboard/Holiday/Holiday.js
 *   src/components/Dashboard/BirthdayAnniversary/BirthdayAnniversary.js
 *   src/components/Dashboard/DtrNotifications/DtrNotifications.js
 *   src/components/Dashboard/JobOpenings/JobOpenings.js
 *
 * Menu path: Dashboard (Team Attendance, Holidays, Celebrations, My DTR Notifications and
 *            Job Openings panels)
 *
 * Coverage before this file: TeamAttendance 11 uncovered functions / 7 branch arms,
 *   BirthdayAnniversary 5 / 2, DtrNotifications 5 / 5, Holiday 3 / 0, JobOpenings 6 / 0.
 *
 * Rules asserted here (both arms of every conditional):
 *   - Each widget asks for its own data as it mounts, and each renders its "nothing to show"
 *     message rather than an empty table when the store slice is empty.
 *   - Team attendance renders one row per member, lists every status a member carries, and
 *     spells out the slug of each measured value (overtime, undertime...).
 *   - Celebrations pick the icon that matches the occasion.
 *   - DTR notifications hide any row dated in the future, and offer the Alter Log link only to
 *     users who are not on multi-login — who get a disabled button instead. The link carries
 *     the existing alter-log request id when one exists and an empty id when none does.
 *
 * Determinism: the DTR notification dates are fixed far in the past and far in the future, so
 * the "beyond the current date" rule is exercised without depending on the day the suite runs.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

global.__connected = [];

jest.mock('react-redux', () => {
    const actual = jest.requireActual('react-redux');
    return {
        ...actual,
        // Returns the plain component (so it can be driven with explicit props) while recording
        // what it asked the store for.
        connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
            global.__connected.push({ mapStateToProps, mapDispatchToProps });
            return Component;
        },
    };
});

jest.mock('react-router-dom', () => ({
    Link: ({ to, children, className, title }) => (
        <a
            className={className}
            title={title}
            href={typeof to === 'object' && to !== null ? to.pathname : String(to)}
            data-date={typeof to === 'object' && to !== null ? String(to.date) : undefined}
        >
            {children}
        </a>
    ),
    Redirect: ({ to }) => <div data-testid="redirect">{String(to)}</div>,
}));

jest.mock('react-datepicker', () => () => <div data-testid="datepicker" />);
jest.mock('react-show-more-list', () => ({ children }) => <div>{children}</div>);

jest.mock('../../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../../components/Dashboard/DashboardAnnouncementsList', () => () => (
    <div data-testid="announcements-list" />
));
jest.mock('../../../container/PageLoading/PageLoading', () => () => <div data-testid="page-loading" />);

jest.mock('../../../store/actions/dashboard/dashboardActions', () => ({
    getTeamAttendanceStatus: jest.fn((id) => ({ type: 'THUNK_TEAM_ATTENDANCE', id })),
    getThisMonthHoliday: jest.fn(() => ({ type: 'THUNK_HOLIDAYS' })),
    getBirthdayAnniv: jest.fn((id) => ({ type: 'THUNK_BIRTHDAYS', id })),
    getDashboardOverall: jest.fn((page_type) => ({ type: 'THUNK_DASHBOARD_OVERALL', page_type })),
    getMyDtrNotifications: jest.fn(() => ({ type: 'THUNK_DTR_NOTIFICATIONS' })),
}));

jest.mock('../../../store/actions/announcement/departmentAnnouncementActions', () => ({
    fetchDashboardAnnouncementList: jest.fn((data) => ({ type: 'THUNK_DASHBOARD_ANNOUNCEMENTS', data })),
}));

jest.mock('../../../store/actions/admin/jobOpeningActions.js', () => ({
    fetchJobOpenings: jest.fn(() => ({ type: 'THUNK_JOB_OPENINGS' })),
}));

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const dashboardActions = require('../../../store/actions/dashboard/dashboardActions');
const announcementActions = require('../../../store/actions/announcement/departmentAnnouncementActions');
const jobOpeningActions = require('../../../store/actions/admin/jobOpeningActions.js');

const lastWiring = () => global.__connected[global.__connected.length - 1];

const TeamAttendance = require('../../../components/Dashboard/TeamAttendance/TeamAttendance').default;
const teamAttendanceWiring = lastWiring();

const Holiday = require('../../../components/Dashboard/Holiday/Holiday').default;
const holidayWiring = lastWiring();

const BirthdayAnniversary = require('../../../components/Dashboard/BirthdayAnniversary/BirthdayAnniversary').default;
const birthdayWiring = lastWiring();

const DtrNotifications = require('../../../components/Dashboard/DtrNotifications/DtrNotifications').default;
const dtrNotificationsWiring = lastWiring();

const JobOpenings = require('../../../components/Dashboard/JobOpenings/JobOpenings').default;
const jobOpeningsWiring = lastWiring();

const storeState = {
    user: { id: 7 },
    dashboard: { team_attendance: [], holidays: [], birthday_and_anniv: [], my_dtr_notifications: [] },
    departmentAnnouncement: { list: [] },
    careerList: { careerlist: { PHL: [], IND: [] } },
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Team Attendance panel', () => {
    const renderPanel = (team_attendance) => {
        const getTeamAttendanceStatus = jest.fn();
        const utils = render(
            <TeamAttendance
                user={{ id: 7 }}
                dashboard={{ team_attendance }}
                getTeamAttendanceStatus={getTeamAttendanceStatus}
            />,
        );
        return { ...utils, getTeamAttendanceStatus };
    };

    test('the panel asks for the attendance of the signed-in user as it mounts', () => {
        const { getTeamAttendanceStatus } = renderPanel([]);

        expect(getTeamAttendanceStatus).toHaveBeenCalledWith(7);
    });

    test('a team with no attendance rows shows the empty message instead of a table', () => {
        const { getByText, container } = renderPanel([]);

        expect(getByText('No record found')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('one row per team member is rendered with their schedule', () => {
        const { getByText, container } = renderPanel([
            { name: 'Ana Cruz', schedule: ['09:00 - 18:00'], status: ['On Time'], values: {} },
            { name: 'Ben Reyes', schedule: ['13:00 - 22:00', '(2nd shift)'], status: [], values: {} },
        ]);

        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(getByText('Ana Cruz')).toBeInTheDocument();
        expect(getByText('09:00 - 18:00')).toBeInTheDocument();
        expect(getByText('(2nd shift)')).toBeInTheDocument();
    });

    test('a member carrying several statuses has all of them listed', () => {
        const { getByText } = renderPanel([
            { name: 'Ana Cruz', schedule: ['09:00 - 18:00'], status: ['Late', 'Undertime'], values: {} },
        ]);

        expect(getByText('Late')).toBeInTheDocument();
        expect(getByText('Undertime')).toBeInTheDocument();
    });

    test('a member with no status at all shows only their name and schedule', () => {
        const { container } = renderPanel([
            { name: 'Ben Reyes', schedule: ['09:00 - 18:00'], status: [], values: {} },
        ]);

        const cells = container.querySelectorAll('tbody tr td');
        expect(cells).toHaveLength(3);
        expect(cells[2].textContent.trim()).toBe('');
    });

    test('measured values are spelled out from their slug with the measurement beside them', () => {
        const { container } = renderPanel([
            {
                name: 'Ana Cruz',
                schedule: ['09:00 - 18:00'],
                status: ['Late'],
                values: { over_time: '01:00', under_time: '00:30' },
            },
        ]);

        const statusCell = container.querySelectorAll('tbody tr td')[2];
        expect(statusCell.textContent).toContain('Over Time');
        expect(statusCell.textContent).toContain('(01:00)');
        expect(statusCell.textContent).toContain('Under Time');
        expect(statusCell.textContent).toContain('(00:30)');
    });

    test('the panel reads the user and dashboard slices and can refresh itself', () => {
        const dispatch = jest.fn();

        expect(teamAttendanceWiring.mapStateToProps(storeState)).toEqual({
            user: storeState.user,
            dashboard: storeState.dashboard,
        });

        teamAttendanceWiring.mapDispatchToProps(dispatch).getTeamAttendanceStatus(7);

        expect(dashboardActions.getTeamAttendanceStatus).toHaveBeenCalledWith(7);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_TEAM_ATTENDANCE', id: 7 });
    });
});

describe('Holidays panel', () => {
    const renderPanel = (holidays) => {
        const getThisMonthHoliday = jest.fn();
        const utils = render(
            <Holiday holiday={{ holidays }} user={{ id: 7 }} getThisMonthHoliday={getThisMonthHoliday} />,
        );
        return { ...utils, getThisMonthHoliday };
    };

    test('the panel asks for this month\'s holidays as it mounts', () => {
        const { getThisMonthHoliday } = renderPanel([]);

        expect(getThisMonthHoliday).toHaveBeenCalledTimes(1);
    });

    test('a month with no holidays shows the empty message instead of a table', () => {
        const { getByText, container } = renderPanel([]);

        expect(getByText('No holidays to be displayed')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('each holiday is listed with its date and name', () => {
        const { getByText, container } = renderPanel([
            { holiday_date: '2026-08-21', holiday_name: 'Ninoy Aquino Day' },
            { holiday_date: '2026-08-31', holiday_name: 'National Heroes Day' },
        ]);

        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(getByText('2026-08-21')).toBeInTheDocument();
        expect(getByText('Ninoy Aquino Day')).toBeInTheDocument();
        expect(getByText('National Heroes Day')).toBeInTheDocument();
    });

    test('the panel reads the user and dashboard slices and can refresh itself', () => {
        const dispatch = jest.fn();

        expect(holidayWiring.mapStateToProps(storeState)).toEqual({
            user: storeState.user,
            holiday: storeState.dashboard,
        });

        holidayWiring.mapDispatchToProps(dispatch).getThisMonthHoliday();

        expect(dashboardActions.getThisMonthHoliday).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_HOLIDAYS' });
    });
});

describe('Celebrations panel', () => {
    const renderPanel = (birthday_and_anniv) => {
        const getDashboardOverall = jest.fn();
        const utils = render(
            <BirthdayAnniversary
                user={{ id: 7 }}
                dashboard={{ birthday_and_anniv }}
                getDashboardOverall={getDashboardOverall}
                getBirthdayAnniv={jest.fn()}
            />,
        );
        return { ...utils, getDashboardOverall };
    };

    test('the panel asks the combined dashboard endpoint for the celebrations page as it mounts', () => {
        const { getDashboardOverall } = renderPanel([]);

        expect(getDashboardOverall).toHaveBeenCalledWith(2);
    });

    test('a team with nothing to celebrate shows the empty message', () => {
        const { getByText, container } = renderPanel([]);

        expect(getByText('No celebrations found')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('a birthday, an anniversary and a regularisation each get their own icon', () => {
        const { container } = renderPanel([
            { type: 'birthday', last_name: 'Cruz', first_name: 'Ana', date: 'Aug 20', display: 'Birthday' },
            { type: 'Anniversary', last_name: 'Reyes', first_name: 'Ben', date: 'Aug 21', display: '3 years' },
            { type: 'regularization', last_name: 'Lim', first_name: 'Cara', date: 'Aug 22', display: 'Regular' },
        ]);

        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(3);
        expect(rows[0].querySelector('i')).toHaveClass('fa-birthday-cake');
        expect(rows[1].querySelector('i')).toHaveClass('fa-calendar-check-o');
        expect(rows[2].querySelector('i')).toHaveClass('fa-calendar-check-o');
        expect(rows[0].textContent).toContain('Cruz, Ana');
    });

    test('an occasion of an unknown kind is listed without an icon', () => {
        const { container } = renderPanel([
            { type: 'promotion', last_name: 'Cruz', first_name: 'Ana', date: 'Aug 20', display: 'Promoted' },
        ]);

        const row = container.querySelector('tbody tr');
        expect(row.querySelector('i')).toBeNull();
        expect(row.textContent).toContain('Promoted');
    });

    test('the panel reads the user and dashboard slices and can refresh either way', () => {
        const dispatch = jest.fn();

        expect(birthdayWiring.mapStateToProps(storeState)).toEqual({
            user: storeState.user,
            dashboard: storeState.dashboard,
        });

        const props = birthdayWiring.mapDispatchToProps(dispatch);
        props.getDashboardOverall(2);
        props.getBirthdayAnniv(7);

        expect(dashboardActions.getDashboardOverall).toHaveBeenCalledWith(2);
        expect(dashboardActions.getBirthdayAnniv).toHaveBeenCalledWith(7);
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'THUNK_DASHBOARD_OVERALL', page_type: 2 });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'THUNK_BIRTHDAYS', id: 7 });
    });
});

describe('My DTR Notifications panel', () => {
    const PAST = '2020-01-15';
    const FUTURE = '2099-01-15';

    const renderPanel = (my_dtr_notifications, user) => render(
        <DtrNotifications
            user={user === undefined ? { id: 7, use_multi: false } : user}
            dashboard={{ my_dtr_notifications }}
            getMyDtrNotifications={jest.fn()}
        />,
    );

    test('a cutoff with no missing punches shows the empty message', () => {
        const { getByText, container } = renderPanel([]);

        expect(getByText('No Notifications this Payroll Cutoff')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('a past date is listed with its status and details', () => {
        const { container, getByText } = renderPanel([
            { date: PAST, status: 'Missing Punch', details: 'No time out', requests: [] },
        ]);

        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(getByText('Missing Punch')).toBeInTheDocument();
        expect(getByText('No time out')).toBeInTheDocument();
    });

    test('a date still in the future is not listed at all', () => {
        const { container, queryByText } = renderPanel([
            { date: FUTURE, status: 'Missing Punch', details: 'No time out', requests: [] },
        ]);

        expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
        expect(queryByText('Missing Punch')).toBeNull();
    });

    test('only the past dates of a mixed list are listed', () => {
        const { container } = renderPanel([
            { date: PAST, status: 'Missing Punch', details: 'No time out', requests: [] },
            { date: FUTURE, status: 'Missing Punch', details: 'Tomorrow', requests: [] },
        ]);

        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    });

    test('a user not on multi-login is offered the Alter Log link for an existing request', () => {
        const { container } = renderPanel([
            {
                date: PAST,
                status: 'Missing Punch',
                details: 'No time out',
                time_in: '09:00',
                time_out: null,
                requests: [
                    { id: 55, request_type: 'alter_log', status: 'pending' },
                    { id: 56, request_type: 'overtime', status: 'approved' },
                ],
            },
        ]);

        const link = container.querySelector('a.btn');
        expect(link).toBeInTheDocument();
        expect(link.getAttribute('href')).toBe('/x/baserequest/AlterLog/55');
        expect(link.getAttribute('data-date')).toBe(PAST);
    });

    test('a day with no alter log request yet links to a blank Alter Log form', () => {
        const { container } = renderPanel([
            {
                date: PAST,
                status: 'Missing Punch',
                details: 'No time out',
                requests: [{ id: 56, request_type: 'overtime', status: 'approved' }],
            },
        ]);

        expect(container.querySelector('a.btn').getAttribute('href')).toBe('/x/baserequest/AlterLog/');
    });

    test('a user on multi-login gets a disabled button instead of the Alter Log link', () => {
        const { container } = renderPanel(
            [{ date: PAST, status: 'Missing Punch', details: 'No time out', requests: [] }],
            { id: 7, use_multi: true },
        );

        expect(container.querySelector('a.btn')).toBeNull();
        expect(container.querySelector('button')).toBeDisabled();
    });

    test('the panel reads the user and dashboard slices and can refresh itself', () => {
        const dispatch = jest.fn();

        expect(dtrNotificationsWiring.mapStateToProps(storeState)).toEqual({
            user: storeState.user,
            dashboard: storeState.dashboard,
        });

        dtrNotificationsWiring.mapDispatchToProps(dispatch).getMyDtrNotifications();

        expect(dashboardActions.getMyDtrNotifications).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_DTR_NOTIFICATIONS' });
    });
});

describe('Job Openings panel', () => {
    test('the panel asks for the job openings as it mounts and embeds the careers board', () => {
        const fetchJobOpenings = jest.fn();

        const { container } = render(
            <JobOpenings
                careerList={{ PHL: [], IND: [] }}
                fetchJobOpenings={fetchJobOpenings}
                fetchDashboardAnnouncementList={jest.fn()}
            />,
        );

        expect(fetchJobOpenings).toHaveBeenCalledTimes(1);
        expect(container.querySelector('iframe').getAttribute('src')).toContain('client.taptalent.io/career/eastvantage');
    });

    test('the panel still renders when no career list has arrived yet', () => {
        const { container } = render(
            <JobOpenings fetchJobOpenings={jest.fn()} fetchDashboardAnnouncementList={jest.fn()} />,
        );

        expect(container.querySelector('iframe')).toBeInTheDocument();
    });

    test('choosing a category refetches the dashboard announcements for that category', () => {
        const fetchDashboardAnnouncementList = jest.fn();
        const ref = React.createRef();

        render(
            <JobOpenings
                ref={ref}
                careerList={{ PHL: [], IND: [] }}
                fetchJobOpenings={jest.fn()}
                fetchDashboardAnnouncementList={fetchDashboardAnnouncementList}
            />,
        );
        ref.current.handleSelect('hr-announcements');

        expect(fetchDashboardAnnouncementList).toHaveBeenCalledWith({ category: 'hr-announcements' });
    });

    test('the panel reads the user, announcement and career slices and can refresh both feeds', () => {
        const dispatch = jest.fn();

        expect(jobOpeningsWiring.mapStateToProps(storeState)).toEqual({
            user: storeState.user,
            departmentAnnouncement: storeState.departmentAnnouncement,
            careerList: storeState.careerList.careerlist,
        });

        const props = jobOpeningsWiring.mapDispatchToProps(dispatch);
        props.fetchJobOpenings();
        props.fetchDashboardAnnouncementList({ category: 'all' });

        expect(jobOpeningActions.fetchJobOpenings).toHaveBeenCalledTimes(1);
        expect(announcementActions.fetchDashboardAnnouncementList).toHaveBeenCalledWith({ category: 'all' });
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'THUNK_JOB_OPENINGS' });
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            type: 'THUNK_DASHBOARD_ANNOUNCEMENTS',
            data: { category: 'all' },
        });
    });
});
