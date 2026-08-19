/**
 * EVOX — Jest: the Sidebar menu gate
 *
 * Sources under test:
 *   src/components/Template/Sidebar/Sidebar.js
 *
 * Menu path: global — the left-hand navigation tree rendered on every signed-in page.
 *
 * Coverage before this file (Aug-8 run): Sidebar 3 uncovered functions, 10 uncovered branch
 *   arms. The existing role suite (branchtests/role/Sidebar.role.test.js) drives five whole
 *   roles and asserts the top-level menu groups; what was left open is the per-item gating
 *   inside those groups, the country switch on the DTR link, the pending-request counter, the
 *   two Attendance Summary click handlers and the store wiring.
 *
 * Rules asserted here (both arms of every conditional):
 *   - The Daily Time Record link points at the Philippine screen for a Philippine employee and
 *     at the India/Morocco screen for those two countries; an employee in any other country
 *     gets no DTR link at all, and neither does anyone without the dtr_access feature.
 *   - The two Multi Clock-in links appear together, only for a user holding multi_login.
 *   - Each Request Form entry is gated by its own feature flag, independently of the others.
 *   - Alter Punch Date needs BOTH request_alter_logs and multi_login; either one alone hides it.
 *   - Asset Management is hidden from DivisionHead, Client and Board and shown to everyone else.
 *   - My Team Request shows the pending count in brackets only when there is a non-zero count;
 *     zero and "not loaded yet" both render the bare label.
 *   - Attendance Summary routes HR to the HR report and a supervisor to the team report, and in
 *     both cases records "attendance" as the selected summary; a supervisor without
 *     view_attendance_report gets no Attendance Summary entry.
 *   - mapStateToProps passes a real pending count through and normalises a missing one to null;
 *     mapDispatchToProps dispatches the selected-summary action.
 *
 * Determinism: no timers, no dates, no network. Authenticator is replaced by a faithful
 * in-memory re-implementation driven by an explicit level + feature list per test.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

const mockAuth = { level: '', features: [] };

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        global.__sidebarWiring = { mapStateToProps, mapDispatchToProps };
        return Component;
    },
}));

jest.mock('react-router-dom', () => ({
    Link: ({ to, children, className }) => (
        <a className={className} href={String(to)}>{children}</a>
    ),
    useHistory: () => global.__history,
}));

jest.mock('../../../services/Authenticator', () => {
    const hasLevel = (level) => {
        if (level == null || level === '') return false;
        if (!mockAuth.level) return false;
        return Array.isArray(level) ? level.includes(mockAuth.level) : level === mockAuth.level;
    };
    const hasFeature = (feature) => {
        if (feature == null || feature === '') return false;
        const owned = mockAuth.features || [];
        return Array.isArray(feature) ? feature.some((f) => owned.includes(f)) : owned.includes(feature);
    };
    return {
        __esModule: true,
        default: {
            scanLevel: hasLevel,
            scanFeature: hasFeature,
            scanLevel_Feature: (level, feature) => hasLevel(level) && hasFeature(feature),
            checkRole: () => false,
            checkPermission: () => false,
            check: () => false,
        },
    };
});

jest.mock('../../../store/actions/report/reportActions', () => ({
    setSelectedAttendanceSummary: jest.fn((data) => ({ type: 'THUNK_SELECTED_SUMMARY', data })),
}));

jest.mock('../../../store/actions/userActions', () => ({
    logOut: jest.fn(() => ({ type: 'THUNK_LOGOUT' })),
}));

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const reportActions = require('../../../store/actions/report/reportActions');
const Sidebar = require('../../../components/Template/Sidebar/Sidebar').default;
const sidebarWiring = global.__sidebarWiring;

const renderSidebar = ({
    level = 'Employee',
    features = [],
    country = 'Philippines',
    pending = null,
    setSelectedAttendanceSummary = jest.fn(),
} = {}) => {
    mockAuth.level = level;
    mockAuth.features = features;
    global.__history = { push: jest.fn() };

    const utils = render(
        <Sidebar
            user={{ id: 7, first_name: 'Ana', last_name: 'Cruz', country }}
            settings={{ country, profile_picture: null }}
            selected_summary={null}
            my_team_pending_request={pending}
            setSelectedAttendanceSummary={setSelectedAttendanceSummary}
            logOut={jest.fn()}
        />,
    );

    return { ...utils, history: global.__history, setSelectedAttendanceSummary };
};

const hrefOf = (utils, label) => {
    const paragraph = utils.queryByText(label);
    return paragraph ? paragraph.closest('a').getAttribute('href') : null;
};

const ALL_STAFF = 'Department Head';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Sidebar — the Daily Time Record link follows the employee\'s country', () => {
    test('a Philippine employee is sent to the Philippine DTR screen', () => {
        const utils = renderSidebar({ features: ['dtr_access'], country: 'Philippines' });

        expect(hrefOf(utils, 'Daily Time Record')).toBe('/x/dtr7/');
    });

    test('an employee in India is sent to the India/Morocco DTR screen instead', () => {
        const utils = renderSidebar({ features: ['dtr_access'], country: 'India' });

        expect(hrefOf(utils, 'Daily Time Record')).toBe('/x/dtr_in_mar7/');
    });

    test('an employee in Morocco is sent to the same India/Morocco screen', () => {
        const utils = renderSidebar({ features: ['dtr_access'], country: 'Morocco' });

        expect(hrefOf(utils, 'Daily Time Record')).toBe('/x/dtr_in_mar7/');
    });

    test('an employee in a country with no DTR screen gets no DTR link at all', () => {
        const utils = renderSidebar({ features: ['dtr_access'], country: 'Belgium' });

        expect(utils.queryByText('Daily Time Record')).toBeNull();
    });

    test('an employee without dtr_access gets no DTR link even in the Philippines', () => {
        const utils = renderSidebar({ features: [], country: 'Philippines' });

        expect(utils.queryByText('Daily Time Record')).toBeNull();
    });
});

describe('Sidebar — the Multi Clock-in pair', () => {
    test('multi_login opens both the punch screen and its history, each on its own path', () => {
        const utils = renderSidebar({ features: ['multi_login'] });

        expect(hrefOf(utils, 'Multi Clock-in')).toBe('/x/dtr_punch_history');
        expect(hrefOf(utils, 'Multi Clock-in History')).toBe('/x/dtr_punchlist7/');
    });

    test('without multi_login neither punch link is offered', () => {
        const utils = renderSidebar({ features: ['dtr_access'] });

        expect(utils.queryByText('Multi Clock-in')).toBeNull();
        expect(utils.queryByText('Multi Clock-in History')).toBeNull();
    });
});

describe('Sidebar — the Request Form group is gated one entry at a time', () => {
    test('a user holding only request_overtime sees Overtime and none of the other forms', () => {
        const utils = renderSidebar({ features: ['request_overtime'] });

        expect(hrefOf(utils, 'Overtime')).toBe('/x/baserequest/Overtime/');
        expect(utils.queryByText('Rest Day Work')).toBeNull();
        expect(utils.queryByText('Change of Schedule')).toBeNull();
        expect(utils.queryByText('Certificate Of Employment')).toBeNull();
    });

    test('a user holding only request_rest_day_work sees Rest Day Work alone', () => {
        const utils = renderSidebar({ features: ['request_rest_day_work'] });

        expect(hrefOf(utils, 'Rest Day Work')).toBe('/x/baserequest/RestDayWork/');
        expect(utils.queryByText('Overtime')).toBeNull();
    });

    test('a user holding only request_change_schedule sees Change of Schedule alone', () => {
        const utils = renderSidebar({ features: ['request_change_schedule'] });

        expect(hrefOf(utils, 'Change of Schedule')).toBe('/x/baserequest/ChangeSchedule/');
        expect(utils.queryByText('Rest Day Work')).toBeNull();
    });

    test('a user holding only request_coe sees Certificate Of Employment alone', () => {
        const utils = renderSidebar({ features: ['request_coe'] });

        expect(hrefOf(utils, 'Certificate Of Employment'))
            .toBe('/x/baserequest/CertificateOfEmployment/');
        expect(utils.queryByText('Overtime')).toBeNull();
    });

    test('a Client sees no Request Form group at all', () => {
        const utils = renderSidebar({
            level: 'Client',
            features: ['request_overtime', 'request_rest_day_work'],
        });

        expect(utils.queryByText('Overtime')).toBeNull();
        expect(utils.queryByText('Rest Day Work')).toBeNull();
    });
});

describe('Sidebar — Alter Punch Date needs the alter-log form AND multi-login', () => {
    test('holding both features offers the Alter Punch Date form', () => {
        const utils = renderSidebar({ features: ['request_alter_logs', 'multi_login'] });

        expect(hrefOf(utils, 'Alter Punch Date')).toBe('/x/baserequest/AlterLogPunch/');
    });

    test('the alter-log feature on its own is not enough', () => {
        const utils = renderSidebar({ features: ['request_alter_logs'] });

        expect(utils.queryByText('Alter Punch Date')).toBeNull();
    });

    test('multi-login on its own is not enough either', () => {
        const utils = renderSidebar({ features: ['multi_login'] });

        expect(utils.queryByText('Alter Punch Date')).toBeNull();
    });
});

describe('Sidebar — Asset Management is withheld from the three read-only levels', () => {
    test.each(['DivisionHead', 'Client', 'Board'])('%s does not get Asset Management', (level) => {
        const utils = renderSidebar({ level });

        expect(utils.queryByText('Asset Management')).toBeNull();
    });

    test('an ordinary employee does get Asset Management', () => {
        const utils = renderSidebar({ level: 'Employee' });

        expect(hrefOf(utils, 'Asset Management')).toBe('/x/asset_management');
    });
});

describe('Sidebar — the pending count beside My Team Request', () => {
    const teamFeatures = ['manage_overtime_request'];

    test('a non-zero pending count is shown in brackets', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: teamFeatures, pending: 5 });

        expect(utils.getByText(/My Team Request\s+\(5\)/)).toBeInTheDocument();
    });

    test('a pending count of zero renders the bare label with no brackets', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: teamFeatures, pending: 0 });

        const label = utils.getByText(/My Team Request/);
        expect(label.textContent).not.toContain('(');
    });

    test('a count that has not been loaded yet also renders the bare label', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: teamFeatures, pending: null });

        const label = utils.getByText(/My Team Request/);
        expect(label.textContent).not.toContain('(');
    });

    test('without any team-request feature the entry is not rendered at all', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: [], pending: 5 });

        expect(utils.queryByText(/My Team Request/)).toBeNull();
    });
});

describe('Sidebar — the My Team group entries', () => {
    test('view_dtr_summary opens both the DTR Summary and the multi-clock-in summary', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: ['view_dtr_summary'] });

        expect(hrefOf(utils, 'DTR Summary')).toBe('/x/dtr_summary');
        expect(hrefOf(utils, 'DTR Multi-clock in Summary')).toBe('/x/dtr_multi_logs_summary');
    });

    test('view_dtr_logs opens the DTR Logs entry and nothing else in that group', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: ['view_dtr_logs'] });

        expect(hrefOf(utils, 'DTR Logs')).toBe('/x/dtr_logs');
        expect(utils.queryByText('DTR Summary')).toBeNull();
    });

    test('a supervisor with neither summary feature gets neither entry', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: ['view_employee_list'] });

        expect(utils.queryByText('DTR Summary')).toBeNull();
        expect(utils.queryByText('DTR Logs')).toBeNull();
    });
});

describe('Sidebar — the Attendance Summary entry routes by level', () => {
    test('HR is taken to the HR attendance report and the choice is recorded', () => {
        const setSelectedAttendanceSummary = jest.fn();
        const utils = renderSidebar({
            level: 'HR',
            features: ['view_attendance_report'],
            setSelectedAttendanceSummary,
        });

        fireEvent.click(utils.getByText('Attendance Summary').closest('a'));

        expect(utils.history.push).toHaveBeenCalledWith('/x/hr_team_attendance_summary');
        expect(setSelectedAttendanceSummary).toHaveBeenCalledWith('attendance');
    });

    test('a supervisor is taken to the team attendance report instead', () => {
        const setSelectedAttendanceSummary = jest.fn();
        const utils = renderSidebar({
            level: ALL_STAFF,
            features: ['view_attendance_report'],
            setSelectedAttendanceSummary,
        });

        fireEvent.click(utils.getByText('Attendance Summary').closest('a'));

        expect(utils.history.push).toHaveBeenCalledWith('/x/team_attendance_summary');
        expect(setSelectedAttendanceSummary).toHaveBeenCalledWith('attendance');
    });

    test('a supervisor without view_attendance_report gets no Attendance Summary entry', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: ['manage_department_schedules'] });

        expect(utils.queryByText('Attendance Summary')).toBeNull();
    });

    test('the whole Reports group is absent for a user holding none of its four features', () => {
        const utils = renderSidebar({ level: ALL_STAFF, features: ['view_dtr_logs'] });

        expect(utils.queryByText('Reports')).toBeNull();
    });

    test('manage_asset_reports alone is enough to open the Reports group with Asset Reports', () => {
        const utils = renderSidebar({ level: 'Payroll', features: ['manage_asset_reports'] });

        expect(hrefOf(utils, 'Asset Reports')).toBe('/x/asset_reports');
        expect(utils.queryByText('Attendance Summary')).toBeNull();
    });
});

describe('Sidebar — store wiring', () => {
    const baseState = {
        user: { id: 7 },
        settings: { country: 'Philippines' },
        report: { selected_summary: 'attendance' },
    };

    test('a loaded pending count is passed through to the menu', () => {
        const props = sidebarWiring.mapStateToProps({
            ...baseState,
            myTeamRequestList: { statusNumbers: { pending: 4 } },
        });

        expect(props.my_team_pending_request).toBe(4);
        expect(props.selected_summary).toBe('attendance');
        expect(props.user).toBe(baseState.user);
    });

    test('a zero pending count is normalised to null so the brackets are suppressed', () => {
        const props = sidebarWiring.mapStateToProps({
            ...baseState,
            myTeamRequestList: { statusNumbers: { pending: 0 } },
        });

        expect(props.my_team_pending_request).toBeNull();
    });

    test('a team-request slice that has not loaded yet also yields null', () => {
        const props = sidebarWiring.mapStateToProps({ ...baseState, myTeamRequestList: undefined });

        expect(props.my_team_pending_request).toBeNull();
    });

    test('choosing a summary dispatches the selected-summary action', () => {
        const dispatch = jest.fn();

        sidebarWiring.mapDispatchToProps(dispatch).setSelectedAttendanceSummary('attendance');

        expect(reportActions.setSelectedAttendanceSummary).toHaveBeenCalledWith('attendance');
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_SELECTED_SUMMARY', data: 'attendance' });
    });
});
