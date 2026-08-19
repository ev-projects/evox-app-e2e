/**
 * EVOX — Jest: the application route table
 *
 * Sources under test:
 *   src/config/RouteList.js
 *
 * Menu path: global — RouteList is what turns a URL into a screen, and what decides whether the
 *            header and sidebar chrome is visible at all.
 *
 * Coverage before this file: RouteList.js 0% statements / 0% branches / 0% functions — nothing
 *   had ever mounted it, because it imports roughly a hundred screens.
 *
 * Rules asserted here (both arms of every conditional):
 *   - The header/sidebar chrome is displayed once the signed-in user's name has arrived and is
 *     hidden while it has not.
 *   - "/" and the login path both land on the login screen; the e-mail approval and password
 *     recovery paths are served outside the authenticated shell.
 *   - Every other path falls through to the authenticated container, where the dashboard path
 *     mounts the Dashboard and an unknown path mounts Page Not Found.
 *   - The DPA route serves the India form to a user whose country is India — whatever the casing
 *     — and the standard form to everyone else, including a user whose country has not loaded.
 *   - Screens are handed the level list and feature list that gate them (checked on the DTR
 *     punch list, the HR certificate of employment and the multi-login alter-log form).
 *   - mapStateToProps hands the route table the user and settings slices.
 *
 * Determinism: no timers, no dates, no network. Every screen is replaced by a stub that records
 * the level/feature props it was handed, so the route table itself is what is under test; the
 * router is the real react-router driven by an explicit MemoryRouter entry.
 */

import React from 'react';
import { render, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        global.__routeWiring = { mapStateToProps, mapDispatchToProps };
        return Component;
    },
}));

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) + '/' });

// Every screen the route table mounts, replaced by a stub that reports which screen it is and
// which level/feature gate it was handed. jest.doMock (not jest.mock) so the list can be driven
// from an array rather than a hundred literal calls.
const mockScreens = [
    '../../../components/Template/Header',
    '../../../components/Template/Sidebar',
    '../../../components/Template/Footer',
    '../../../services/API',
    '../../../container/Login',
    '../../../container/AuthenticateClient',
    '../../../container/EmailNotFound',
    '../../../container/Dashboard',
    '../../../container/Schedule/TemplateCreate',
    '../../../container/Schedule/ScheduleAssign',
    '../../../container/Schedule/ScheduleInfo',
    '../../../container/Schedule/TemplateEdit',
    '../../../container/Schedule/TemplateList',
    '../../../container/Schedule/ScheduleAssignDepartment',
    '../../../container/PageNotFound',
    '../../../container/DailyTimeRecord',
    '../../../container/DailyTimeRecordIndiaMorocco',
    '../../../container/DailyTimeRecordPuncher',
    '../../../container/DtrPunch',
    '../../../container/EVLearning/EVLearning',
    '../../../container/ElSecureCoding/ElSecureCoding',
    '../../../container/OpsSchedule',
    '../../../container/OpsSchedule/OpsScheduleForm',
    '../../../container/OpsSchedule/OpsScheduleList',
    '../../../container/Request/AlterLog',
    '../../../container/Request/AlterLogPunch',
    '../../../container/Request/ChangeSchedule',
    '../../../container/Request/Overtime',
    '../../../container/Request/RestDayWork',
    '../../../container/Request/WorkFromHome',
    '../../../container/Request/COE/COE',
    '../../../container/Request/COEHR/COEHR',
    '../../../container/MyTeam/MyTeamRequests',
    '../../../container/MyTeam/MyTeamSchedule',
    '../../../container/MyTeam/MyTeamRequests/MyTeamAllRequest',
    '../../../container/MyTeam/DtrSummaryNew',
    '../../../container/MyTeam/DtrConflictReport',
    '../../../container/MyTeam/DtrLogs',
    '../../../container/MyTeam/DPAList',
    '../../../container/MyTeam/EmployeeList',
    '../../../container/MyTeam/ManageTeams',
    '../../../container/MyTeam/OverallRequest',
    '../../../container/MyTeam/DtrMultiLogsSummary',
    '../../../container/MyRequests/MyRequests',
    '../../../container/MyRequestsDispute/MyRequestsDispute',
    '../../../container/MyOverallRequest/MyOverallRequest',
    '../../../container/Admin/PayrollCutoff',
    '../../../container/Admin/AssignDepartmentHandlers',
    '../../../container/Admin/AssignEmployeeSupervisors',
    '../../../container/Admin/AssignSubDepartment',
    '../../../container/Admin/SyncBhrLeaves',
    '../../../container/Admin/SyncUTCAdjustment',
    '../../../container/Admin/SyncUserUpdates',
    '../../../container/Admin/AssignFeature',
    '../../../container/Admin/AdminAnnouncementsList',
    '../../../container/Admin/RegisterUser',
    '../../../container/Admin/GenerateDate',
    '../../../container/Admin/SyncBiometrics/SyncBiometrics',
    '../../../container/Admin/DepartmentList',
    '../../../container/Admin/JobOpeningsUpdate/JobOpeningsUpdate',
    '../../../container/Profile',
    '../../../container/Profile/JobInformation',
    '../../../container/Profile/PersonalInformation',
    '../../../container/Profile/TimeOff',
    '../../../container/RequestEmailApproval',
    '../../../container/ForgotPasswordRequest',
    '../../../container/DPAForm',
    '../../../container/DPAFormIndia',
    '../../../container/Report/TeamAttendanceSummary/TeamAttendanceSummary',
    '../../../container/Report/HRTeamAttendanceSummary',
    '../../../container/DepartmentAnnouncements/DepartmentAnnouncementsList',
    '../../../container/DepartmentAnnouncements/DepartmentAnnouncementsForm',
    '../../../container/DepartmentAnnouncements/AnnouncementsPage',
    '../../../components/DateReport/ViewReport',
    '../../../components/DateReport/ViewReportMorocco',
    '../../../components/PayrollDispute/DisputeForm',
    '../../../components/PayrollDispute/DisputeReport',
    '../../../components/PoliciesDocument/PoliciesDocumentUpload',
    '../../../components/PoliciesDocument/PoliciesDocumentDownload',
    '../../../components/PoliciesDocument/UploadedDocumentList',
    '../../../components/NeoReport/NeoOnboarding',
    '../../../components/NeoReport/NeoSubmissions',
    '../../../components/NeoReport/NeoDetails',
    '../../../components/AssetManagementForm/AssetManagementForm',
    '../../../components/AssetManagementForm/AssetReport/AssetReport',
    '../../../components/FreshService/FreshServiceForm',
    '../../../components/FreshService/FreshServiceTickets',
];

mockScreens.forEach((mockPath) => {
    jest.doMock(mockPath, () => {
        const ReactStub = require('react');
        const name = mockPath.split('/').pop();
        const Stub = (props) => ReactStub.createElement('div', {
            'data-testid': 'screen-' + name,
            'data-level': JSON.stringify(props.level === undefined ? null : props.level),
            'data-feature': JSON.stringify(props.feature === undefined ? null : props.feature),
        });
        return { __esModule: true, default: Stub, [name]: Stub };
    });
});

// The real ProtectedRoute is connected and wraps withRouter; the route *table* is what is under
// test here, so the guard is reduced to a plain path-matching Route.
jest.doMock('../../../config/ProtectedRoutes', () => {
    const ReactStub = require('react');
    const { Route } = require('react-router-dom');
    return {
        __esModule: true,
        default: ({ path, exact, children }) => ReactStub.createElement(
            Route, { path, exact }, children,
        ),
    };
});

const RoutesList = require('../../../config/RouteList').default;
const routeWiring = global.__routeWiring;

const signedIn = { id: 7, first_name: 'Ana', last_name: 'Cruz' };

const renderAt = (path, { user = signedIn, settings = { country: 'Philippines' } } = {}) => render(
    <MemoryRouter initialEntries={[path]}>
        <RoutesList user={user} settings={settings} />
    </MemoryRouter>,
);

describe('RouteList — the header and sidebar chrome', () => {
    test('the chrome is displayed once the signed-in user\'s name has arrived', () => {
        const { container, getByTestId } = renderAt('/x/dashboard/');

        expect(getByTestId('screen-Header')).toBeInTheDocument();
        expect(container.firstChild.firstChild).toHaveStyle('display: block');
    });

    test('the chrome is hidden while the user has no name yet', () => {
        const { container } = renderAt('/x/dashboard/', { user: { id: 7, first_name: null } });

        expect(container.firstChild.firstChild).toHaveStyle('display: none');
    });

    test('the chrome is hidden for an anonymous visitor on the login page', () => {
        const { container } = renderAt('/x/login/', { user: {} });

        expect(container.firstChild.firstChild).toHaveStyle('display: none');
    });
});

describe('RouteList — the unauthenticated routes', () => {
    test('the site root serves the login screen', () => {
        const { getByTestId } = renderAt('/', { user: {} });

        expect(getByTestId('screen-Login')).toBeInTheDocument();
    });

    test('the login path also serves the login screen', () => {
        const { getByTestId } = renderAt('/x/login/', { user: {} });

        expect(getByTestId('screen-Login')).toBeInTheDocument();
    });

    test('an e-mail approval link serves the approval screen, outside the authenticated shell', () => {
        const { getByTestId, queryByTestId } = renderAt('/x/request_approval/ABC123/approved');

        expect(getByTestId('screen-RequestEmailApproval')).toBeInTheDocument();
        expect(queryByTestId('screen-Dashboard')).toBeNull();
        expect(queryByTestId('screen-PageNotFound')).toBeNull();
    });

    test('the password recovery path serves the forgot-password screen', () => {
        const { getByTestId } = renderAt('/x/recover_password/');

        expect(getByTestId('screen-ForgotPasswordRequest')).toBeInTheDocument();
    });
});

describe('RouteList — the authenticated container', () => {
    test('the dashboard path mounts the Dashboard for every non-client level plus Client', () => {
        const { getByTestId } = renderAt('/x/dashboard/');

        const dashboard = getByTestId('screen-Dashboard');
        expect(JSON.parse(dashboard.getAttribute('data-level'))).toEqual([
            'Employee', 'SubDepartment Head', 'Department Head', 'DivisionHead',
            'Board', 'Admin', 'HR', 'Payroll', 'Client',
        ]);
    });

    test('a path that matches nothing mounts Page Not Found and no other screen', () => {
        const { getByTestId, queryByTestId } = renderAt('/x/no-such-page/');

        expect(getByTestId('screen-PageNotFound')).toBeInTheDocument();
        expect(queryByTestId('screen-Dashboard')).toBeNull();
    });

    test('the footer is part of the authenticated container', () => {
        const { getByTestId } = renderAt('/x/dashboard/');

        expect(getByTestId('screen-Footer')).toBeInTheDocument();
    });
});

describe('RouteList — the DPA form is chosen by the user\'s country', () => {
    test('a user in India gets the India DPA form', () => {
        const { getByTestId, queryByTestId } = renderAt('/x/dpa/', { settings: { country: 'India' } });

        expect(getByTestId('screen-DPAFormIndia')).toBeInTheDocument();
        expect(queryByTestId('screen-DPAForm')).toBeNull();
    });

    test('the country match ignores casing', () => {
        const { getByTestId } = renderAt('/x/dpa/', { settings: { country: 'india' } });

        expect(getByTestId('screen-DPAFormIndia')).toBeInTheDocument();
    });

    test('a user in the Philippines gets the standard DPA form', () => {
        const { getByTestId, queryByTestId } = renderAt('/x/dpa/', {
            settings: { country: 'Philippines' },
        });

        expect(getByTestId('screen-DPAForm')).toBeInTheDocument();
        expect(queryByTestId('screen-DPAFormIndia')).toBeNull();
    });

    test('a user whose country has not loaded yet gets the standard DPA form', () => {
        const { getByTestId, queryByTestId } = renderAt('/x/dpa/', { settings: {} });

        expect(getByTestId('screen-DPAForm')).toBeInTheDocument();
        expect(queryByTestId('screen-DPAFormIndia')).toBeNull();
    });
});

describe('RouteList — screens are handed their own level and feature gates', () => {
    test('the multi-login punch list is gated on both multi-login features', () => {
        const { getByTestId } = renderAt('/x/dtr_punchlist/7');

        const screen = getByTestId('screen-DailyTimeRecordPuncher');
        expect(JSON.parse(screen.getAttribute('data-feature')))
            .toEqual(['multi_login', 'view_multi_login']);
    });

    test('the punch history is gated on multi-login alone', () => {
        const { getByTestId } = renderAt('/x/dtr_punch_history/');

        expect(JSON.parse(getByTestId('screen-DtrPunch').getAttribute('data-feature')))
            .toEqual(['multi_login']);
    });

    test('the HR certificate of employment is restricted to Admin and HR', () => {
        const { getByTestId } = renderAt('/x/coe_hr/');

        const screen = getByTestId('screen-COEHR');
        expect(JSON.parse(screen.getAttribute('data-level'))).toEqual(['Admin', 'HR']);
        expect(JSON.parse(screen.getAttribute('data-feature'))).toEqual(['request_coe']);
    });

    test('the overtime request form is gated on the overtime feature and takes an optional id', () => {
        const withId = renderAt('/x/overtime/55');
        expect(JSON.parse(within(withId.container).getByTestId('screen-Overtime').getAttribute('data-feature')))
            .toEqual(['request_overtime']);

        const withoutId = renderAt('/x/overtime/');
        expect(within(withoutId.container).getByTestId('screen-Overtime')).toBeInTheDocument();
    });

    test('the policies download screen carries no level or feature gate of its own', () => {
        const { getByTestId } = renderAt('/x/policies_download/');

        const screen = getByTestId('screen-PoliciesDocumentDownload');
        expect(screen.getAttribute('data-level')).toBe('null');
        expect(screen.getAttribute('data-feature')).toBe('null');
    });
});

describe('RouteList — store wiring', () => {
    test('the route table reads the user and settings slices', () => {
        const state = {
            user: { id: 7, first_name: 'Ana' },
            settings: { country: 'India' },
            dashboard: { holidays: [] },
        };

        expect(routeWiring.mapStateToProps(state)).toEqual({
            user: state.user,
            settings: state.settings,
        });
    });

    test('the route table dispatches nothing of its own', () => {
        expect(routeWiring.mapDispatchToProps).toBeNull();
    });
});
