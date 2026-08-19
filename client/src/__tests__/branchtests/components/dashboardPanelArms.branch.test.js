/**
 * EVOX — Jest: the dashboard shells and the announcement panels
 *
 * Sources under test:
 *   src/components/Dashboard/HandlerDashboard/HandlerDashboard.js
 *   src/components/Dashboard/EmployeeDashboard/EmployeeDashboard.js
 *   src/components/Dashboard/DashboardTabs/DashboardTabs.js
 *   src/components/Dashboard/DashboardAnnouncementsList/DashboardAnnouncementsList.js
 *   src/components/Template/NotificationMenu/NotificationMenu.js (store wiring + unknown tag)
 *
 * Menu path: Dashboard — the client/handler dashboard, the employee dashboard, the tab strip
 *            across the middle of it and the Announcements tab inside that strip.
 *
 * Coverage before this file: HandlerDashboard 57.14% statements / 57.89% branches / 57.14%
 *   functions, DashboardAnnouncementsList 85.94 / 84.62 / 72, DashboardTabs 76 / 83.33 / 63.64,
 *   EmployeeDashboard 71.43 / 100 / 20, NotificationMenu 97.22 / 99.06 / 86.96. What was open:
 *   the account filter and its submit handler, the announcement category and department
 *   selectors, the tab switching, and every store wiring in the group.
 *
 * Rules asserted here (both arms of every conditional):
 *   - The handler dashboard shows the account selector only to a user handling more than one
 *     account, and refetches today's attendance and the celebrations when one is chosen.
 *   - A Client also gets this week's attendance summary and the holidays panel, and a refetch
 *     re-asks for the weekly summary; a non-Client gets neither panel and no weekly refetch.
 *   - A filter value left blank is not sent to the server.
 *   - The tab strip opens on Summary for a privileged level and on Announcements otherwise, and
 *     switching tabs mounts exactly one panel at a time.
 *   - The announcements panel falls back to the loading placeholder while the department list has
 *     not arrived, lists one card per announcement once it has, offers Show More only while more
 *     remain, and says so when none do.
 *   - An announcement that links out keeps an absolute URL as-is and prefixes a bare one with
 *     http://.
 *   - Asking the notification centre for a tag it does not know produces an empty list rather
 *     than an error.
 *   - Every panel's mapStateToProps/mapDispatchToProps read and dispatch what it needs.
 *
 * Determinism: no timers driving assertions, no date-dependent assertion, every connected child
 * panel is stubbed.
 *
 * Dead code observed (not tested, not a defect reachable from the UI): HandlerDashboard line 99
 * re-tests departments_handled.length > 0 inside the arm that already required more than one, so
 * its null branch is unreachable; DashboardAnnouncementsList line 121 reads a
 * reloadingDepartmentList state key that is never set; and three of the panels declare the same
 * key twice in mapDispatchToProps (fetchDashboardAnnouncementList, incrementDashboardAnnouncement-
 * List, getDashboardOverall, and JobOpenings' fetchDashboardAnnouncementList), so the first
 * definition of each is discarded by the object literal before it is ever dispatched.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

const mockAuth = { level: '' };

global.__connected = [];

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        global.__connected.push({ mapStateToProps, mapDispatchToProps });
        return Component;
    },
}));

jest.mock('react-router-dom', () => ({
    Link: ({ to, children, title }) => (
        <a title={title} href={typeof to === 'object' && to !== null ? to.pathname : String(to)}>{children}</a>
    ),
    Redirect: ({ to }) => <div data-testid="redirect">{String(to)}</div>,
}));

jest.mock('../../../services/Authenticator', () => {
    const hasLevel = (level) => {
        if (level == null || level === '') return false;
        if (!mockAuth.level) return false;
        return Array.isArray(level) ? level.includes(mockAuth.level) : level === mockAuth.level;
    };
    return {
        __esModule: true,
        default: {
            scanLevel: hasLevel,
            scanFeature: () => false,
            scanLevel_Feature: () => false,
            check: () => false,
        },
    };
});

jest.mock('../../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, title }) => <div data-panel={title}>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));

jest.mock('react-bootstrap', () => {
    const ReactStub = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    const Dropdown = passthrough;
    Dropdown.Toggle = passthrough;
    Dropdown.Menu = passthrough;
    Dropdown.Item = passthrough;
    const Card = ({ children }) => <div>{children}</div>;
    Card.Img = () => <img alt="" />;
    Card.ImgOverlay = ({ children }) => <div>{children}</div>;
    Card.Title = ({ children }) => <h5>{children}</h5>;
    Card.Text = ({ children }) => <p>{children}</p>;
    return {
        Card, Container: passthrough, Row: passthrough, Col: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Image: () => <img alt="" />, Spinner: () => <div />,
        // react-bootstrap's Button defaults its type to "button"; without that a Show More press
        // would submit the surrounding Formik form instead of paging the list.
        Button: ({ children, onClick, type, disabled, className }) => (
            <button onClick={onClick} type={type || 'button'} disabled={disabled} className={className}>
                {children}
            </button>
        ),
        Badge: ({ children, className }) => <span className={className}>{children}</span>,
        Tabs: ({ children, onSelect, defaultActiveKey }) => (
            <div data-default-tab={defaultActiveKey}>
                {ReactStub.Children.map(children, (child) => (child ? (
                    <div>
                        <button type="button" onClick={() => onSelect(child.props.eventKey)}>
                            {child.props.title}
                        </button>
                        {child}
                    </div>
                ) : null))}
            </div>
        ),
        Tab: ({ children }) => <div>{children}</div>,
        Dropdown,
    };
});
// react-bootstrap's Figure is imported by its own path in two of these panels.
jest.mock('react-bootstrap/Figure', () => ({ children }) => <div>{children}</div>);
jest.mock('react-show-more-list', () => ({ children }) => <div>{children}</div>);

jest.mock('../../../container/PageLoading/PageLoading', () => () => <div data-testid="page-loading" />);

// Each of these is a separately connected screen with its own suite.
jest.mock('../../../components/Dashboard/TeamAttendance', () => () => <div data-testid="team-attendance" />);
jest.mock('../../../components/Dashboard/Holiday', () => () => <div data-testid="holiday" />);
jest.mock('../../../components/Dashboard/BirthdayAnniversary', () => () => <div data-testid="celebrations" />);
jest.mock('../../../components/Report/TeamAttendanceSummaryPanel', () => () => <div data-testid="weekly-summary" />);
jest.mock('../../../components/Dashboard/DashboardAnnouncementsList', () => () => <div data-testid="announcements-panel" />);
jest.mock('../../../components/Dashboard/JobOpenings', () => () => <div data-testid="jobs-panel" />);
jest.mock('../../../components/Summary/SummaryDashbord', () => ({
    __esModule: true,
    default: () => <div data-testid="summary-panel" />,
    SummaryDashbord: () => <div data-testid="summary-panel" />,
}));
jest.mock('../../../components/Dashboard/Engagement/Engagement', () => () => <div data-testid="engagement-panel" />);
jest.mock('../../../components/PoliciesDocument/PoliciesDocumentDownload', () => () => <div data-testid="policies-panel" />);
jest.mock('../../../components/Dashboard/DashboardTabs', () => () => <div data-testid="dashboard-tabs" />);

jest.mock('../../../store/actions/dashboard/dashboardActions', () => ({
    getTeamAttendanceStatus: jest.fn((params) => ({ type: 'THUNK_TEAM_ATTENDANCE', params })),
    getBirthdayAnniv: jest.fn((params) => ({ type: 'THUNK_BIRTHDAYS', params })),
    getDashboardOverall: jest.fn((page_type, params) => ({ type: 'THUNK_OVERALL', page_type, params })),
    getMyNotifications: jest.fn((id) => ({ type: 'THUNK_MY_NOTIFICATIONS', id })),
}));
jest.mock('../../../store/actions/report/reportActions', () => ({
    getTeamAttendanceSummary: jest.fn((start, end, params) => ({ type: 'THUNK_WEEKLY_SUMMARY', start, end, params })),
}));
jest.mock('../../../store/actions/userActions', () => ({
    fetchUser: jest.fn(() => ({ type: 'THUNK_FETCH_USER' })),
}));
jest.mock('../../../store/actions/announcement/departmentAnnouncementActions', () => ({
    fetchDashboardAnnouncementList: jest.fn((data) => ({ type: 'THUNK_DASHBOARD_ANNOUNCEMENTS', data })),
    clearDepartmentAnnouncementListInstance: jest.fn(() => ({ type: 'THUNK_CLEAR_ANNOUNCEMENTS' })),
    incrementDashboardAnnouncementList: jest.fn((data) => ({ type: 'THUNK_MORE_ANNOUNCEMENTS', data })),
}));
jest.mock('../../../store/actions/lookup/lookupListActions', () => ({
    fetchDepartmentListWithAnnouncements: jest.fn(() => ({ type: 'THUNK_DEPARTMENTS_WITH_ANNOUNCEMENTS' })),
}));

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const dashboardActions = require('../../../store/actions/dashboard/dashboardActions');
const reportActions = require('../../../store/actions/report/reportActions');
const userActions = require('../../../store/actions/userActions');
const announcementActions = require('../../../store/actions/announcement/departmentAnnouncementActions');
const lookupActions = require('../../../store/actions/lookup/lookupListActions');

const lastWiring = () => global.__connected[global.__connected.length - 1];

const HandlerDashboard = require('../../../components/Dashboard/HandlerDashboard/HandlerDashboard').default;
const handlerWiring = lastWiring();

const EmployeeDashboard = require('../../../components/Dashboard/EmployeeDashboard/EmployeeDashboard').default;
const employeeWiring = lastWiring();

const DashboardTabs = require('../../../components/Dashboard/DashboardTabs/DashboardTabs').default;
const tabsWiring = lastWiring();

const AnnouncementsList = require('../../../components/Dashboard/DashboardAnnouncementsList/DashboardAnnouncementsList').default;
const announcementsWiring = lastWiring();

const NotificationMenu = require('../../../components/Template/NotificationMenu/NotificationMenu').default;
const notificationWiring = lastWiring();

beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.level = 'Employee';
});

describe('Handler dashboard — the account filter', () => {
    const renderDashboard = ({
        level = 'Department Head',
        departments_handled = [],
        team_attendance_summary = null,
    } = {}) => {
        mockAuth.level = level;
        const ref = React.createRef();
        const getTeamAttendanceStatus = jest.fn();
        const getBirthdayAnniv = jest.fn();
        const getTeamAttendanceSummary = jest.fn();
        const utils = render(
            <HandlerDashboard
                ref={ref}
                user={{ id: 7, departments_handled }}
                report={{ team_attendance_summary }}
                data={{}}
                myTeamList={{ filters: { department_id: '' } }}
                fetchUser={jest.fn()}
                getTeamAttendanceStatus={getTeamAttendanceStatus}
                getBirthdayAnniv={getBirthdayAnniv}
                getTeamAttendanceSummary={getTeamAttendanceSummary}
            />,
        );
        return { ...utils, ref, getTeamAttendanceStatus, getBirthdayAnniv, getTeamAttendanceSummary };
    };

    const twoAccounts = [
        { id: 11, department_name: 'Client A' },
        { id: 22, department_name: 'Client B' },
    ];

    test('a user handling two accounts is offered the account selector with one option each', () => {
        const { container } = renderDashboard({ departments_handled: twoAccounts });

        const options = container.querySelectorAll('select[name="department_id"] option');
        expect(options).toHaveLength(3); // the "Select Account" prompt plus one per account
        expect(options[1]).toHaveTextContent('Client A');
        expect(options[2]).toHaveTextContent('Client B');
    });

    test('a user handling a single account is offered no selector at all', () => {
        const { container } = renderDashboard({
            departments_handled: [{ id: 11, department_name: 'Client A' }],
        });

        expect(container.querySelector('select[name="department_id"]')).toBeNull();
    });

    test('a user handling no accounts is offered no selector either', () => {
        const { container } = renderDashboard({ departments_handled: [] });

        expect(container.querySelector('select[name="department_id"]')).toBeNull();
    });

    test('submitting a chosen account refetches today\'s attendance and the celebrations for it', async () => {
        const { ref, getTeamAttendanceStatus, getBirthdayAnniv } = renderDashboard({
            departments_handled: twoAccounts,
        });

        await act(async () => {
            await ref.current.onSubmitHandler({ department_id: '22', url: 'Dashboard' });
        });

        expect(getTeamAttendanceStatus).toHaveBeenCalledWith({ department_id: '22', url: 'Dashboard' });
        expect(getBirthdayAnniv).toHaveBeenCalledWith({ department_id: '22', url: 'Dashboard' });
    });

    test('choosing an account from the selector refetches the dashboard for that account', async () => {
        const { container, getTeamAttendanceStatus, getBirthdayAnniv } = renderDashboard({
            departments_handled: twoAccounts,
        });

        fireEvent.change(container.querySelector('select[name="department_id"]'), {
            target: { value: '11' },
        });
        await act(() => Promise.resolve());

        expect(getTeamAttendanceStatus).toHaveBeenLastCalledWith({ department_id: '11', url: 'Dashboard' });
        expect(getBirthdayAnniv).toHaveBeenLastCalledWith({ department_id: '11', url: 'Dashboard' });

        fireEvent.change(container.querySelector('select[name="department_id"]'), {
            target: { value: '22' },
        });
        await act(() => Promise.resolve());

        expect(getTeamAttendanceStatus).toHaveBeenLastCalledWith({ department_id: '22', url: 'Dashboard' });
        expect(getTeamAttendanceStatus).toHaveBeenCalledTimes(2);
    });

    test('a filter left blank is not sent to the server', async () => {
        const { ref, getTeamAttendanceStatus } = renderDashboard({ departments_handled: twoAccounts });

        await act(async () => {
            await ref.current.onSubmitHandler({ department_id: '', url: 'Dashboard', note: null });
        });

        expect(getTeamAttendanceStatus).toHaveBeenCalledWith({ url: 'Dashboard' });
    });
});

describe('Handler dashboard — what a Client sees that a supervisor does not', () => {
    const renderDashboard = (level, team_attendance_summary) => {
        mockAuth.level = level;
        const ref = React.createRef();
        const getTeamAttendanceSummary = jest.fn();
        const utils = render(
            <HandlerDashboard
                ref={ref}
                user={{ id: 7, departments_handled: [] }}
                report={{ team_attendance_summary }}
                data={{}}
                myTeamList={{ filters: {} }}
                fetchUser={jest.fn()}
                getTeamAttendanceStatus={jest.fn()}
                getBirthdayAnniv={jest.fn()}
                getTeamAttendanceSummary={getTeamAttendanceSummary}
            />,
        );
        return { ...utils, ref, getTeamAttendanceSummary };
    };

    test('a Client asks for this week\'s attendance summary as the dashboard mounts', () => {
        const { getTeamAttendanceSummary } = renderDashboard('Client', { total: 10 });

        expect(getTeamAttendanceSummary).toHaveBeenCalledTimes(1);
        expect(getTeamAttendanceSummary.mock.calls[0][2]).toEqual({});
    });

    test('a Client sees the weekly summary and the holidays panel alongside today\'s attendance', () => {
        const { getByTestId } = renderDashboard('Client', { total: 10 });

        expect(getByTestId('weekly-summary')).toBeInTheDocument();
        expect(getByTestId('holiday')).toBeInTheDocument();
        expect(getByTestId('team-attendance')).toBeInTheDocument();
    });

    test('a Client whose weekly summary has not arrived gets the panel heading but no chart', () => {
        const { queryByTestId, container } = renderDashboard('Client', null);

        expect(queryByTestId('weekly-summary')).toBeNull();
        expect(container.querySelector('[data-panel="This Week\'s Attendance Summary"]')).not.toBeNull();
    });

    test('a supervisor gets neither the weekly summary nor the holidays panel', () => {
        const { queryByTestId, getByTestId } = renderDashboard('Department Head', { total: 10 });

        expect(queryByTestId('weekly-summary')).toBeNull();
        expect(queryByTestId('holiday')).toBeNull();
        expect(getByTestId('celebrations')).toBeInTheDocument();
    });

    test('a supervisor does not ask for the weekly summary on mount', () => {
        const { getTeamAttendanceSummary } = renderDashboard('Department Head', { total: 10 });

        expect(getTeamAttendanceSummary).not.toHaveBeenCalled();
    });

    test('a Client re-asks for the weekly summary when the account filter is submitted', async () => {
        const { ref, getTeamAttendanceSummary } = renderDashboard('Client', { total: 10 });

        await act(async () => {
            await ref.current.onSubmitHandler({ department_id: '22' });
        });

        expect(getTeamAttendanceSummary).toHaveBeenCalledTimes(2);
        expect(getTeamAttendanceSummary.mock.calls[1][2]).toEqual({ department_id: '22' });
    });

    test('a supervisor does not re-ask for the weekly summary when the filter is submitted', async () => {
        const { ref, getTeamAttendanceSummary } = renderDashboard('Department Head', { total: 10 });

        await act(async () => {
            await ref.current.onSubmitHandler({ department_id: '22' });
        });

        expect(getTeamAttendanceSummary).not.toHaveBeenCalled();
    });
});

describe('Handler dashboard — store wiring', () => {
    test('the dashboard reads the user, client and report slices', () => {
        const state = { user: { id: 7 }, client: { list: [] }, report: { team_attendance_summary: null } };

        expect(handlerWiring.mapStateToProps(state)).toEqual({
            user: state.user, data: state.client, report: state.report,
        });
    });

    test('the dashboard can reload the user and refetch attendance, celebrations and the weekly summary', () => {
        const dispatch = jest.fn();
        const props = handlerWiring.mapDispatchToProps(dispatch);

        props.fetchUser();
        props.getTeamAttendanceStatus({ department_id: '22' });
        props.getBirthdayAnniv({ department_id: '22' });
        props.getTeamAttendanceSummary('2026-08-17', '2026-08-23', { department_id: '22' });

        expect(userActions.fetchUser).toHaveBeenCalledTimes(1);
        expect(dashboardActions.getTeamAttendanceStatus).toHaveBeenCalledWith({ department_id: '22' });
        expect(dashboardActions.getBirthdayAnniv).toHaveBeenCalledWith({ department_id: '22' });
        expect(reportActions.getTeamAttendanceSummary)
            .toHaveBeenCalledWith('2026-08-17', '2026-08-23', { department_id: '22' });
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'THUNK_FETCH_USER' });
        expect(dispatch).toHaveBeenNthCalledWith(4, {
            type: 'THUNK_WEEKLY_SUMMARY', start: '2026-08-17', end: '2026-08-23',
            params: { department_id: '22' },
        });
    });
});

describe('Employee dashboard', () => {
    test('the employee dashboard is the tab strip and nothing else', () => {
        const { getByTestId, container } = render(
            <EmployeeDashboard
                user={{ id: 7, payload: null }}
                settings={{ current_payroll_cutoff: null }}
                dashboard={{ my_dtr_notifications: [] }}
                departmentAnnouncement={{ list: [] }}
                fetchUser={jest.fn()}
            />,
        );

        expect(getByTestId('dashboard-tabs')).toBeInTheDocument();
        expect(container.querySelector('.dashboard')).not.toBeNull();
    });

    test('the dashboard reads the user, settings, dashboard and announcement slices', () => {
        const state = {
            user: { id: 7 },
            settings: { current_payroll_cutoff: '2026-08-15' },
            dashboard: { my_dtr_notifications: [] },
            departmentAnnouncement: { list: [] },
        };

        expect(employeeWiring.mapStateToProps(state)).toEqual({
            user: state.user,
            settings: state.settings,
            dashboard: state.dashboard,
            departmentAnnouncement: state.departmentAnnouncement,
        });
    });

    test('the dashboard can reload the signed-in user', () => {
        const dispatch = jest.fn();

        employeeWiring.mapDispatchToProps(dispatch).fetchUser();

        expect(userActions.fetchUser).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_FETCH_USER' });
    });
});

describe('Dashboard tabs — which panel is mounted', () => {
    const renderTabs = (level) => {
        mockAuth.level = level;
        const ref = React.createRef();
        const fetchDashboardAnnouncementList = jest.fn();
        const utils = render(
            <DashboardTabs
                ref={ref}
                user={{ id: 7 }}
                departmentAnnouncement={{ list: [] }}
                fetchDashboardAnnouncementList={fetchDashboardAnnouncementList}
            />,
        );
        return { ...utils, ref, fetchDashboardAnnouncementList };
    };

    test('a privileged level opens on the Summary panel and mounts only that panel', () => {
        const { getByTestId, queryByTestId, container } = renderTabs('HR');

        expect(container.querySelector('[data-default-tab]'))
            .toHaveAttribute('data-default-tab', 'evox-summary');
        expect(getByTestId('summary-panel')).toBeInTheDocument();
        expect(queryByTestId('announcements-panel')).toBeNull();
        expect(queryByTestId('engagement-panel')).toBeNull();
    });

    test('an ordinary employee opens on Announcements and is offered no Summary tab', () => {
        const { getByTestId, queryByTestId, container } = renderTabs('Employee');

        expect(container.querySelector('[data-default-tab]'))
            .toHaveAttribute('data-default-tab', 'all-announcements');
        expect(getByTestId('announcements-panel')).toBeInTheDocument();
        expect(queryByTestId('summary-panel')).toBeNull();
    });

    test('switching to Engagements mounts that panel and unmounts the Summary panel', () => {
        const { ref, getByTestId, queryByTestId } = renderTabs('HR');

        act(() => { ref.current.onTabSelect('engagement'); });

        expect(getByTestId('engagement-panel')).toBeInTheDocument();
        expect(queryByTestId('summary-panel')).toBeNull();
    });

    test('switching to Job Opening mounts only the jobs panel', () => {
        const { ref, getByTestId, queryByTestId } = renderTabs('Employee');

        act(() => { ref.current.onTabSelect('job-openings'); });

        expect(getByTestId('jobs-panel')).toBeInTheDocument();
        expect(queryByTestId('announcements-panel')).toBeNull();
        expect(queryByTestId('policies-panel')).toBeNull();
    });

    test('switching to Eastvantage Policies mounts only the policies panel', () => {
        const { ref, getByTestId, queryByTestId } = renderTabs('Employee');

        act(() => { ref.current.onTabSelect('policies-download'); });

        expect(getByTestId('policies-panel')).toBeInTheDocument();
        expect(queryByTestId('jobs-panel')).toBeNull();
    });

    test('choosing an announcement category refetches the list for that category', () => {
        const { ref, fetchDashboardAnnouncementList } = renderTabs('Employee');

        act(() => { ref.current.handleSelect('hr-announcements'); });

        expect(fetchDashboardAnnouncementList).toHaveBeenCalledWith({ category: 'hr-announcements' });
    });

    test('the tab strip reads the user and announcement slices and can refetch by category', () => {
        const dispatch = jest.fn();
        const state = { user: { id: 7 }, departmentAnnouncement: { list: [] } };

        expect(tabsWiring.mapStateToProps(state)).toEqual({
            user: state.user, departmentAnnouncement: state.departmentAnnouncement,
        });

        tabsWiring.mapDispatchToProps(dispatch).fetchDashboardAnnouncementList({ category: 'all' });

        expect(announcementActions.fetchDashboardAnnouncementList)
            .toHaveBeenCalledWith({ category: 'all' });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'THUNK_DASHBOARD_ANNOUNCEMENTS', data: { category: 'all' },
        });
    });
});

describe('Announcements panel — the list and its links', () => {
    const announcement = (overrides = {}) => ({
        id: 1,
        title: 'Town hall',
        headline: 'Join us on Friday',
        category: 'hr',
        Department_name: 'HR',
        release_date: '2020-01-15',
        thumbnail: null,
        on_link: 0,
        link: null,
        ...overrides,
    });

    const renderPanel = ({
        department,
        depAnnouncementlist = [],
        isDepartmentAnnouncementListLoaded = true,
        hideShowMore = false,
    } = {}) => {
        const ref = React.createRef();
        const getDashboardOverall = jest.fn();
        const clearDepartmentAnnouncementListInstance = jest.fn();
        const utils = render(
            <AnnouncementsList
                ref={ref}
                user={{ id: 7 }}
                department={department}
                departmentAnnouncement={{
                    isDepartmentAnnouncementListLoaded, depAnnouncementlist, hideShowMore,
                }}
                getDashboardOverall={getDashboardOverall}
                clearDepartmentAnnouncementListInstance={clearDepartmentAnnouncementListInstance}
                fetchDepartmentListWithAnnouncements={jest.fn()}
                fetchDashboardAnnouncementList={jest.fn()}
                incrementDashboardAnnouncementList={jest.fn()}
            />,
        );
        return { ...utils, ref, getDashboardOverall, clearDepartmentAnnouncementListInstance };
    };

    test('the panel clears the cached list and asks for the announcements page as it mounts', async () => {
        const { getDashboardOverall, clearDepartmentAnnouncementListInstance } = renderPanel({
            department: [],
        });

        // The mount sequence awaits the cache clear, so the fetch lands on the next microtask.
        await act(() => Promise.resolve());

        expect(clearDepartmentAnnouncementListInstance).toHaveBeenCalledTimes(1);
        expect(getDashboardOverall).toHaveBeenCalledWith(3);
    });

    test('the department selector is replaced by the loading placeholder until the list arrives', () => {
        const { getByTestId, container } = renderPanel({ department: undefined });

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(container.querySelector('select[name="department_id"]')).toBeNull();
    });

    test('once the department list arrives the selector offers All plus one option per department', () => {
        const { container } = renderPanel({
            department: [{ Id: 11, Name: 'HR' }, { Id: 22, Name: 'IT' }],
        });

        const options = container.querySelectorAll('select[name="department_id"] option');
        expect(options).toHaveLength(3);
        expect(options[0].getAttribute('label')).toBe('All');
        expect(options[1]).toHaveTextContent('HR');
        expect(options[2]).toHaveTextContent('IT');
    });

    test('choosing a department clears the cached list and refetches it for that department', () => {
        const { container, getDashboardOverall, clearDepartmentAnnouncementListInstance } = renderPanel({
            department: [{ Id: 11, Name: 'HR' }],
        });

        fireEvent.change(container.querySelector('select[name="department_id"]'), {
            target: { value: '11' },
        });

        expect(clearDepartmentAnnouncementListInstance).toHaveBeenCalledTimes(2); // mount + change
        expect(getDashboardOverall).toHaveBeenLastCalledWith(3, { dep_id: '11' });
    });

    test('choosing a category refetches the announcements page for that category', () => {
        const { ref, getDashboardOverall } = renderPanel({ department: [] });

        act(() => { ref.current.handleSelect('hr-announcements'); });

        expect(getDashboardOverall).toHaveBeenLastCalledWith(3, { category: 'hr-announcements' });
    });

    test('Show More asks for the next page and moves the page counter on', () => {
        const { ref, getDashboardOverall, getByText } = renderPanel({
            department: [],
            depAnnouncementlist: [announcement()],
        });

        fireEvent.click(getByText('Show More'));

        expect(getDashboardOverall).toHaveBeenLastCalledWith(3, { page: 3, dep_id: null });
        expect(ref.current.state.filters.page).toBe(4);
    });

    test('when nothing more remains the panel says so instead of offering Show More', () => {
        const { getByText, queryByText } = renderPanel({
            department: [],
            depAnnouncementlist: [announcement()],
            hideShowMore: true,
        });

        expect(getByText('No More Announcements to Show')).toBeInTheDocument();
        expect(queryByText('Show More')).toBeNull();
    });

    test('an empty list says there are no announcements', () => {
        const { getByText } = renderPanel({ department: [], depAnnouncementlist: [] });

        expect(getByText('No Announcements.')).toBeInTheDocument();
    });

    test('a list that has not loaded yet shows the loading placeholder in place of the cards', () => {
        const { getAllByTestId } = renderPanel({
            department: [],
            isDepartmentAnnouncementListLoaded: false,
        });

        expect(getAllByTestId('page-loading').length).toBeGreaterThan(0);
    });

    test('more than a page of announcements is still rendered one card per announcement', () => {
        const { container } = renderPanel({
            department: [],
            depAnnouncementlist: Array.from({ length: 7 }, (item, index) => announcement({
                id: index + 1, title: 'Notice ' + (index + 1),
            })),
        });

        expect(container.querySelectorAll('.announcement-list-item')).toHaveLength(7);
    });

    test('an announcement linking out to an absolute URL keeps that URL', () => {
        const { container } = renderPanel({
            department: [],
            depAnnouncementlist: [announcement({ on_link: 1, link: 'https://intranet.example/news' })],
        });

        expect(container.querySelector('a').getAttribute('href'))
            .toBe('https://intranet.example/news');
    });

    test('an announcement linking out to a bare host is prefixed with http://', () => {
        const { container } = renderPanel({
            department: [],
            depAnnouncementlist: [announcement({ on_link: 1, link: 'intranet.example/news' })],
        });

        expect(container.querySelector('a').getAttribute('href'))
            .toBe('http://intranet.example/news');
    });

    test('an announcement with no outward link opens the in-app announcement page', () => {
        const { container } = renderPanel({
            department: [],
            depAnnouncementlist: [announcement({ id: 55, on_link: 0 })],
        });

        expect(container.querySelector('a').getAttribute('href')).toBe('/x/announcement_page55');
    });

    test('the panel reads the user, announcement and department slices', () => {
        const state = {
            user: { id: 7 },
            departmentAnnouncement: { depAnnouncementlist: [] },
            lookup: { department: [{ Id: 11, Name: 'HR' }] },
        };

        expect(announcementsWiring.mapStateToProps(state)).toEqual({
            user: state.user,
            departmentAnnouncement: state.departmentAnnouncement,
            department: state.lookup.department,
        });
    });

    test('the panel can load the department list, clear the cache, refetch and page onwards', () => {
        const dispatch = jest.fn();
        const props = announcementsWiring.mapDispatchToProps(dispatch);

        props.fetchDepartmentListWithAnnouncements();
        props.clearDepartmentAnnouncementListInstance();
        props.fetchDashboardAnnouncementList({ category: 'all' });
        props.incrementDashboardAnnouncementList({ page: 4 });
        props.getDashboardOverall(3, { dep_id: '11' });

        expect(lookupActions.fetchDepartmentListWithAnnouncements).toHaveBeenCalledTimes(1);
        expect(announcementActions.clearDepartmentAnnouncementListInstance).toHaveBeenCalledTimes(1);
        expect(announcementActions.fetchDashboardAnnouncementList).toHaveBeenCalledWith({ category: 'all' });
        expect(announcementActions.incrementDashboardAnnouncementList).toHaveBeenCalledWith({ page: 4 });
        expect(dashboardActions.getDashboardOverall).toHaveBeenCalledWith(3, { dep_id: '11' });
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'THUNK_DEPARTMENTS_WITH_ANNOUNCEMENTS' });
        expect(dispatch).toHaveBeenNthCalledWith(5, {
            type: 'THUNK_OVERALL', page_type: 3, params: { dep_id: '11' },
        });
    });
});

describe('Notification centre — the unknown tag and the store wiring', () => {
    const emptyCentre = {
        requestsForApproval: [], requestStatus: [], announcements: [],
        celebrations: [], missedDtr: [], profilePhotos: [],
    };

    test('asking for a tag the centre does not know produces an empty list', () => {
        const ref = React.createRef();
        render(
            <NotificationMenu
                ref={ref}
                user={{ id: 7 }}
                notificationCenter={emptyCentre}
                approval={1}
                announcement={0}
                celebration={0}
                missingdtr={0}
                alldata={1}
                settings={{}}
                getMyNotifications={jest.fn()}
            />,
        );

        act(() => { ref.current.mergeNotifications('no-such-tag', emptyCentre); });

        expect(ref.current.state.notificaion_list).toEqual([]);
    });

    test('a known tag does produce the matching entries', () => {
        const ref = React.createRef();
        render(
            <NotificationMenu
                ref={ref}
                user={{ id: 7 }}
                notificationCenter={emptyCentre}
                approval={1}
                announcement={0}
                celebration={0}
                missingdtr={0}
                alldata={1}
                settings={{}}
                getMyNotifications={jest.fn()}
            />,
        );

        act(() => {
            ref.current.mergeNotifications('announcements', {
                ...emptyCentre,
                announcements: [{
                    id: 9, title: 'Town hall', description: 'Friday',
                    timestamp: '01/15/2020 09:00:00', announcementId: 55,
                }],
            });
        });

        expect(ref.current.state.notificaion_list).toHaveLength(1);
        expect(ref.current.state.notificaion_list[0].type).toBe('announcement');
        expect(ref.current.state.notificaion_list[0].announcementId).toBe(55);
    });

    test('the bell reads the user, the notification centre and every unread counter', () => {
        const state = {
            user: { id: 7 },
            dashboard: {
                my_notifications: emptyCentre,
                approval: 2, announcement: 1, celebration: 0, missingdtr: 3, alldata: 6,
            },
            settings: { profile_picture: null },
        };

        expect(notificationWiring.mapStateToProps(state)).toEqual({
            user: state.user,
            notificationCenter: emptyCentre,
            approval: 2,
            announcement: 1,
            celebration: 0,
            missingdtr: 3,
            alldata: 6,
            settings: state.settings,
        });
    });

    test('the bell can refetch the signed-in user\'s notifications', () => {
        const dispatch = jest.fn();

        notificationWiring.mapDispatchToProps(dispatch).getMyNotifications(7);

        expect(dashboardActions.getMyNotifications).toHaveBeenCalledWith(7);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_MY_NOTIFICATIONS', id: 7 });
    });
});
