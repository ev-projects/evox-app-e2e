/**
 * evoxtest_AdminScheduleWiringDeep3.test.js
 *
 * SOURCES UNDER TEST (redux wiring only — the mapStateToProps / mapDispatchToProps
 * closures at the foot of each file):
 *   container/Admin/AdminAnnouncementsList/AdminAnnouncementsList.js
 *   container/Admin/AssignFeature/AssignFeature.js
 *   container/Admin/GenerateDate/GenerateDate.js
 *   container/Admin/PayrollCutoff/PayrollCutoff.js
 *   container/Admin/PayrollCutoff/PayrollCutoffForm.js
 *   container/Admin/RegisterUser/RegisterUser.js
 *   container/Admin/AssignSubDepartment/AssignSubDepartment.js
 *   container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers.js
 *   container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors.js
 *   container/Admin/DepartmentList/DepartmentList.js
 *   container/Admin/SyncBhrLeaves|SyncBiometrics|SyncUTCAdjustment|SyncUserUpdates
 *   container/Schedule/TemplateList|TemplateEdit|TemplateCreate
 *   container/Schedule/ScheduleAssign|ScheduleAssignDepartment|ScheduleInfo
 *   container/OpsSchedule/OpsScheduleList|OpsScheduleForm
 *   container/DepartmentAnnouncements/DepartmentAnnouncementsForm|DepartmentAnnouncementsList|AnnouncementsPage
 *
 * MENU PATHS: Admin -> (Announcements / Assign Feature / Generate DTR Date / Payroll
 *   Cutoff / Register User / Assign Sub-Department / Assign Department Handlers /
 *   Assign Employee Supervisors / Department List / Sync BHR Leaves / Sync Biometrics /
 *   Sync UTC Adjustment / Sync User Updates);
 *   Schedule -> Template List / Assign Schedule / Schedule Info;
 *   OPS Schedule -> List / Form; Announcements -> My Department Announcements / Page.
 *
 * WHY THIS SUITE EXISTS: every other suite in this repo neutralises redux with
 * `connect: () => (Component) => Component`, so the two closures each container passes
 * to connect() are never executed and never counted. Here connect is mocked to *capture*
 * them instead of discarding them, so the state->props contract and the
 * prop->action-creator contract can both be asserted directly. Each action module is
 * replaced by identifiable creators so a mis-wired prop (wrong creator, dropped or
 * re-ordered argument) fails the test rather than passing silently.
 *
 * FINDINGS: none. Two shadowed-key oddities are documented inline and are behaviourally
 * inert — see 'AdminAnnouncementsList' and 'PayrollCutoff' below.
 */

import '@testing-library/jest-dom/extend-expect';

// Identifiable stand-ins for the real thunk creators. Named with the `mock` prefix so
// babel-plugin-jest-hoist allows the reference from inside the jest.mock factories.
function mockActionModule(names) {
    const mod = {};
    names.forEach((name) => {
        mod[name] = (...args) => ({ type: 'ACTION/' + name, args });
    });
    return mod;
}

let capturedMsp = null;
let capturedMdp = null;

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (msp, mdp) => (Component) => {
        Component.__msp = msp;
        Component.__mdp = mdp;
        return Component;
    },
}));

// --- action modules -------------------------------------------------------
jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () =>
    mockActionModule([
        'fetchDepartmentAnnouncementList', 'deleteDepartmentAnnouncement',
        'clearDepartmentAnnouncementListInstance', 'fetchMyHandleAnnouncementList',
        'createDepartmentAnnouncement', 'fetchDepartmentAnnouncementStrict',
        'updateDepartmentAnnouncement', 'clearDepartmentAnnouncementInstance',
        'fetchDashboardAnnouncementList',
    ]));
jest.mock('../../store/actions/lookup/lookupListActions', () =>
    mockActionModule([
        'fetchDepartmentListWithAnnouncements', 'fetchUserList', 'fetchRoleList',
        'fetchFeaturesList', 'fetchDepartmentList', 'fetchAllSubDepartment',
        'fetchSubDepartmentHandledList', 'assignSubDepartment',
        'fetchDepartmentHandlersList', 'fetchDepartmentUsersList',
    ]));
jest.mock('../../store/actions/admin/assignRoleActions', () =>
    mockActionModule(['fetchUser', 'fetchUserFeatures', 'assignLevelFeatures']));
jest.mock('../../store/actions/dtr/dtrLogsAction', () =>
    mockActionModule(['fetchDtrLogs', 'exportDtrLogs']));
jest.mock('../../store/actions/admin/generateDtrDateActions', () =>
    mockActionModule(['generateDtrDate']));
jest.mock('../../store/actions/admin/registerUserActions', () =>
    mockActionModule(['registerUser']));
jest.mock('../../store/actions/admin/assignEmployeeSupervisorsActions', () =>
    mockActionModule(['assignEmployeeSupervisorsActions']));
jest.mock('../../store/actions/admin/assignDepartmentHandlersActions', () =>
    mockActionModule(['assignDepartmentHandlers']));
jest.mock('../../store/actions/admin/departmentListActions', () =>
    mockActionModule(['fetchDepartmentList', 'deleteDepartment', 'updateDepartmentScheduleStatus']));
jest.mock('../../store/actions/admin/syncActions', () =>
    mockActionModule(['syncBhrLeaves', 'syncBiometrics', 'syncUTCAdjusetment', 'syncBhrUsers']));
jest.mock('../../store/actions/admin/payrollCutoffActions', () =>
    mockActionModule([
        'addPayrollCutoff', 'updatePayrollCutoff', 'deletePayrollCutoff', 'fetchPayrollCutoff',
        'fetchPayrollCutoffList', 'clearPayrollCutoffInstance', 'clearPayrollCutoffListInstance',
    ]));
jest.mock('../../store/actions/redirectActions', () => mockActionModule(['setRedirect']));
jest.mock('../../store/actions/scheduleActions', () =>
    mockActionModule([
        'listTemplate', 'deleteSchedule', 'updateSchedule', 'getTemplateSchedule',
        'addTemplateSchedule', 'scheduleAssign', 'getDefaultSchedule', 'getScheduleInfo',
    ]));
jest.mock('../../store/actions/userActions', () => mockActionModule(['getUserInfo']));
jest.mock('../../store/actions/opsschedule/opsScheduleActions', () =>
    mockActionModule([
        'fetchOpsSchedulesList', 'deleteOpsSchedule', 'fetchOpsSchedule',
        'addOpsSchedule', 'updateOpsSchedule', 'clearOpsScheduleInstance',
    ]));

// --- heavy third-party children (module load only; nothing is rendered here) ---
jest.mock('@tinymce/tinymce-react', () => ({ Editor: () => null }));
jest.mock('react-joyride', () => ({
    __esModule: true, default: () => null, ACTIONS: {}, EVENTS: {}, STATUS: {},
}));
jest.mock('react-data-table-component', () => ({ __esModule: true, default: () => null }));
jest.mock('react-multi-select-component', () => ({ __esModule: true, default: () => null }));
jest.mock('react-select', () => ({ __esModule: true, default: () => null }));

const AdminAnnouncementsList = require('../../container/Admin/AdminAnnouncementsList/AdminAnnouncementsList').default;
const AssignFeature = require('../../container/Admin/AssignFeature/AssignFeature').default;
const GenerateDate = require('../../container/Admin/GenerateDate/GenerateDate').default;
const PayrollCutoff = require('../../container/Admin/PayrollCutoff/PayrollCutoff').default;
const PayrollCutoffForm = require('../../container/Admin/PayrollCutoff/PayrollCutoffForm').default;
const RegisterUser = require('../../container/Admin/RegisterUser/RegisterUser').default;
const AssignSubDepartment = require('../../container/Admin/AssignSubDepartment/AssignSubDepartment').default;
const AssignDepartmentHandlers = require('../../container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers').default;
const AssignEmployeeSupervisors = require('../../container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors').default;
const DepartmentList = require('../../container/Admin/DepartmentList/DepartmentList').default;
const SyncBhrLeaves = require('../../container/Admin/SyncBhrLeaves/SyncBhrLeaves').default;
const SyncBiometrics = require('../../container/Admin/SyncBiometrics/SyncBiometrics').default;
const SyncUTCAdjustment = require('../../container/Admin/SyncUTCAdjustment/SyncUTCAdjustment').default;
const SyncUserUpdates = require('../../container/Admin/SyncUserUpdates/SyncUserUpdates').default;
const TemplateList = require('../../container/Schedule/TemplateList/TemplateList').default;
const TemplateEdit = require('../../container/Schedule/TemplateEdit/TemplateEdit').default;
const TemplateCreate = require('../../container/Schedule/TemplateCreate/TemplateCreate').default;
const ScheduleAssign = require('../../container/Schedule/ScheduleAssign/ScheduleAssign').default;
const ScheduleAssignDepartment = require('../../container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment').default;
const ScheduleInfo = require('../../container/Schedule/ScheduleInfo/ScheduleInfo').default;
const OpsScheduleList = require('../../container/OpsSchedule/OpsScheduleList/OpsScheduleList').default;
const OpsScheduleForm = require('../../container/OpsSchedule/OpsScheduleForm/OpsScheduleForm').default;
const DepartmentAnnouncementsForm = require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsForm/DepartmentAnnouncementsForm').default;
const DepartmentAnnouncementsList = require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsList/DepartmentAnnouncementsList').default;
const AnnouncementsPage = require('../../container/DepartmentAnnouncements/AnnouncementsPage/AnnouncementsPage').default;

// A full redux state tree with a distinct sentinel per slice, so a mapping that reads
// the wrong slice cannot accidentally produce the expected value.
const STATE = {
    user: 'S_user',
    constant: 'S_constant',
    settings: { current_payroll_cutoff: 'S_cutoff' },
    myTeamList: 'S_myTeamList',
    departmentList: 'S_departmentList',
    dtrLogs: 'S_dtrLogs',
    sync: 'S_sync',
    lookup: {
        department: 'S_lookup_department',
        employee: 'S_lookup_employee',
        roles: 'S_lookup_roles',
        features: 'S_lookup_features',
        supervisor: 'S_lookup_supervisor',
        client: 'S_lookup_client',
        department_users: 'S_lookup_department_users',
        department_handlers: 'S_lookup_department_handlers',
        sub_departments_handled: 'S_lookup_sub_handled',
        sub_departments_list: 'S_lookup_sub_list',
    },
    assignRole: {
        userLists: 'S_ar_userLists', isUserListLoaded: 'S_ar_isUserListLoaded',
        userRole: 'S_ar_userRole', userPermission: 'S_ar_userPermission',
        userLevel: 'S_ar_userLevel', userFeatures: 'S_ar_userFeatures',
        isUserRolesPermissionsLoaded: 'S_ar_isRPLoaded',
    },
    registerUser: { isSuccessful: 'S_ru_isSuccessful' },
    payrollCutoff: {
        isInstanceLoaded: 'S_pc_isInstanceLoaded', isListInstanceLoaded: 'S_pc_isListLoaded',
        instance: 'S_pc_instance', listInstance: 'S_pc_listInstance',
    },
    schedule: {
        isScheduleLoaded: 'S_sched_isScheduleLoaded', templateList: 'S_sched_templateList',
        defaultSchedule: 'S_sched_defaultSchedule', templateData: 'S_sched_templateData',
        userInfo: 'S_sched_userInfo',
    },
    opsSchedule: { instance: 'S_ops_instance', isInstanceLoaded: 'S_ops_isInstanceLoaded' },
    departmentAnnouncement: {
        instance: 'S_da_instance', isInstanceLoaded: 'S_da_isInstanceLoaded',
    },
};

/** Asserts the container's state->props contract exactly (no extra, no missing keys). */
function expectStateMapping(Component, expected) {
    capturedMsp = Component.__msp;
    expect(typeof capturedMsp).toBe('function');
    expect(capturedMsp(STATE)).toEqual(expected);
}

/**
 * Asserts each dispatch prop forwards to the named creator with the arguments it was
 * given, in order. `cases` = [[propName, argsArray, creatorName], ...]. Also asserts the
 * prop set is exactly the cases listed, so a newly wired prop must be covered here.
 */
function expectDispatchMapping(Component, cases) {
    capturedMdp = Component.__mdp;
    expect(typeof capturedMdp).toBe('function');
    const dispatch = jest.fn();
    const props = capturedMdp(dispatch);
    expect(Object.keys(props).sort()).toEqual(cases.map((c) => c[0]).sort());
    cases.forEach(([prop, args, creator]) => {
        dispatch.mockClear();
        props[prop](...args);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'ACTION/' + creator, args });
    });
}

describe('Admin -> Announcements list: redux wiring', () => {
    test('the page reads the announcement, settings, department and employee slices', () => {
        expectStateMapping(AdminAnnouncementsList, {
            departmentAnnouncement: STATE.departmentAnnouncement,
            settings: STATE.settings,
            department: 'S_lookup_department',
            employee: 'S_lookup_employee',
        });
    });

    // The mapDispatchToProps object literal declares `fetchDepartmentAnnouncementList`
    // twice (once arity-0, once arity-1). The second declaration wins, so the filter
    // form's params always reach the creator; the arity-0 mount call passes undefined,
    // which the creator defaults to null. Behaviourally inert, hence no finding.
    test('filter, delete and the mount-time fetches dispatch their own creators with their arguments', () => {
        expectDispatchMapping(AdminAnnouncementsList, [
            ['fetchUserList', ['employee', { page: 'all' }], 'fetchUserList'],
            ['fetchDepartmentListWithAnnouncements', [], 'fetchDepartmentListWithAnnouncements'],
            ['clearDepartmentAnnouncementListInstance', [], 'clearDepartmentAnnouncementListInstance'],
            ['fetchDepartmentAnnouncementList', [{ status: 'ongoing' }], 'fetchDepartmentAnnouncementList'],
            ['deleteDepartmentAnnouncement', [77], 'deleteDepartmentAnnouncement'],
        ]);
    });
});

describe('Admin -> Assign Feature: redux wiring', () => {
    test('the page reads the assignRole slice for the user list and the lookup slice for roles and features', () => {
        expectStateMapping(AssignFeature, {
            userLists: 'S_ar_userLists',
            isUserListLoaded: 'S_ar_isUserListLoaded',
            roles: 'S_lookup_roles',
            features: 'S_lookup_features',
            userRole: 'S_ar_userRole',
            userPermission: 'S_ar_userPermission',
            userLevel: 'S_ar_userLevel',
            userFeatures: 'S_ar_userFeatures',
            isUserRolesPermissionsLoaded: 'S_ar_isRPLoaded',
        });
    });

    test('name search, user select and assign dispatch fetchUser, fetchUserFeatures and assignLevelFeatures', () => {
        expectDispatchMapping(AssignFeature, [
            ['fetchUser', ['Gar'], 'fetchUser'],
            ['fetchRoleList', [], 'fetchRoleList'],
            ['fetchFeaturesList', [], 'fetchFeaturesList'],
            ['fetchUserFeatures', [12], 'fetchUserFeatures'],
            ['assignLevelFeatures', [12, { features: ['dtr'] }], 'assignLevelFeatures'],
        ]);
    });
});

describe('Admin -> Generate DTR Date: redux wiring', () => {
    test('the page reads the dtrLogs, settings and employee-lookup slices', () => {
        expectStateMapping(GenerateDate, {
            dtrLogs: 'S_dtrLogs', settings: STATE.settings, employee: 'S_lookup_employee',
        });
    });

    test('generate dispatches generateDtrDate with the built payload and the employee list is fetched with page:all', () => {
        expectDispatchMapping(GenerateDate, [
            ['fetchDtrLogs', [{ page: 2 }], 'fetchDtrLogs'],
            ['exportDtrLogs', [{ page: 2 }], 'exportDtrLogs'],
            ['fetchUserList', ['employee', { page: 'all' }], 'fetchUserList'],
            ['generateDtrDate', [{ start_date: '2026-06-01', end_date: '2026-06-15', ids: [] }], 'generateDtrDate'],
        ]);
    });
});

describe('Admin -> Payroll Cutoff: redux wiring', () => {
    test('the list page reads user, constant and the four payrollCutoff keys', () => {
        expectStateMapping(PayrollCutoff, {
            user: 'S_user', constant: 'S_constant',
            isInstanceLoaded: 'S_pc_isInstanceLoaded', isListInstanceLoaded: 'S_pc_isListLoaded',
            instance: 'S_pc_instance', listInstance: 'S_pc_listInstance',
        });
    });

    // PayrollCutoff imports addPayrollCutoff/updatePayrollCutoff but wires neither; the
    // create and edit dispatches live on the child PayrollCutoffForm (asserted below).
    test('the list page dispatches fetch, delete, clear and redirect only', () => {
        expectDispatchMapping(PayrollCutoff, [
            ['fetchPayrollCutoff', [3], 'fetchPayrollCutoff'],
            ['fetchPayrollCutoffList', [], 'fetchPayrollCutoffList'],
            ['deletePayrollCutoff', [3], 'deletePayrollCutoff'],
            ['clearPayrollCutoffInstance', [], 'clearPayrollCutoffInstance'],
            ['clearPayrollCutoffListInstance', [], 'clearPayrollCutoffListInstance'],
            ['setRedirect', ['/app/admin/payroll-cutoff'], 'setRedirect'],
        ]);
    });

    test('the cutoff form reads constant plus the payrollCutoff instance keys but not the user slice', () => {
        expectStateMapping(PayrollCutoffForm, {
            constant: 'S_constant',
            isInstanceLoaded: 'S_pc_isInstanceLoaded', isListInstanceLoaded: 'S_pc_isListLoaded',
            instance: 'S_pc_instance', listInstance: 'S_pc_listInstance',
        });
    });

    test('the cutoff form dispatches add with the payload and update with id first then payload', () => {
        expectDispatchMapping(PayrollCutoffForm, [
            ['addPayrollCutoff', [{ name: 'Jun 1-15' }], 'addPayrollCutoff'],
            ['updatePayrollCutoff', [9, { name: 'Jun 1-15' }], 'updatePayrollCutoff'],
            ['fetchPayrollCutoffList', [], 'fetchPayrollCutoffList'],
            ['clearPayrollCutoffListInstance', [], 'clearPayrollCutoffListInstance'],
        ]);
    });
});

describe('Admin -> Register User: redux wiring', () => {
    test('the page reads the department and role lookups plus the registration result flag', () => {
        expectStateMapping(RegisterUser, {
            department: 'S_lookup_department', roles: 'S_lookup_roles',
            isSuccessful: 'S_ru_isSuccessful',
        });
    });

    test('registering dispatches registerUser with the assembled form data', () => {
        expectDispatchMapping(RegisterUser, [
            ['fetchDepartmentList', [], 'fetchDepartmentList'],
            ['fetchRoleList', [], 'fetchRoleList'],
            ['registerUser', [{ roles: ['client'], departments_handled: [5] }], 'registerUser'],
        ]);
    });
});

describe('Admin -> Assign Sub-Department: redux wiring', () => {
    test('the page reads the department, supervisor, department-users, team and sub-department lookups', () => {
        expectStateMapping(AssignSubDepartment, {
            department: 'S_lookup_department', supervisor: 'S_lookup_supervisor',
            department_users: 'S_lookup_department_users', myTeamList: 'S_myTeamList',
            sub_departments_handled: 'S_lookup_sub_handled',
            sub_departments_list: 'S_lookup_sub_list',
        });
    });

    test('assigning dispatches assignSubDepartment with the supervisor id first then the payload', () => {
        expectDispatchMapping(AssignSubDepartment, [
            ['fetchUserList', ['supervisor', { page: 'all' }], 'fetchUserList'],
            ['fetchDepartmentList', [], 'fetchDepartmentList'],
            ['fetchAllSubDepartment', [], 'fetchAllSubDepartment'],
            ['assignSubDepartment', [7, { user_id: [21] }], 'assignSubDepartment'],
            ['fetchSubDepartmentHandledList', [7], 'fetchSubDepartmentHandledList'],
        ]);
    });
});

describe('Admin -> Assign Department Handlers: redux wiring', () => {
    test('the page reads the department, handlers, supervisor and client lookups', () => {
        expectStateMapping(AssignDepartmentHandlers, {
            department: 'S_lookup_department',
            department_handlers: 'S_lookup_department_handlers',
            supervisor: 'S_lookup_supervisor',
            client: 'S_lookup_client',
        });
    });

    test('assigning dispatches assignDepartmentHandlers with the department id first then the payload', () => {
        expectDispatchMapping(AssignDepartmentHandlers, [
            ['fetchUserList', ['supervisor', { page: 'all' }], 'fetchUserList'],
            ['fetchDepartmentList', [], 'fetchDepartmentList'],
            ['fetchDepartmentHandlersList', [5], 'fetchDepartmentHandlersList'],
            ['assignDepartmentHandlers', [5, { user_id: [21, 22] }], 'assignDepartmentHandlers'],
        ]);
    });
});

describe('Admin -> Assign Employee Supervisors: redux wiring', () => {
    test('the page reads the department, supervisor and department-users lookups only', () => {
        expectStateMapping(AssignEmployeeSupervisors, {
            department: 'S_lookup_department', supervisor: 'S_lookup_supervisor',
            department_users: 'S_lookup_department_users',
        });
    });

    test('assigning dispatches assignEmployeeSupervisorsActions with the supervisor id first then the payload', () => {
        expectDispatchMapping(AssignEmployeeSupervisors, [
            ['fetchUserList', ['supervisor', { page: 'all' }], 'fetchUserList'],
            ['fetchDepartmentList', [], 'fetchDepartmentList'],
            ['fetchDepartmentUsersList', [5], 'fetchDepartmentUsersList'],
            ['assignEmployeeSupervisorsActions', [7, { user_id: [21] }], 'assignEmployeeSupervisorsActions'],
        ]);
    });
});

describe('Admin -> Department List: redux wiring', () => {
    test('the page reads only the departmentList slice', () => {
        expectStateMapping(DepartmentList, { departmentList: 'S_departmentList' });
    });

    test('soft delete dispatches deleteDepartment and the multi-login switch dispatches the status update with id and form data', () => {
        expectDispatchMapping(DepartmentList, [
            ['fetchDepartmentList', [], 'fetchDepartmentList'],
            ['deleteDepartment', [5], 'deleteDepartment'],
            ['updateDepartmentScheduleStatus', [5, { current_status: true }], 'updateDepartmentScheduleStatus'],
        ]);
    });
});

describe('Admin -> Sync pages: redux wiring', () => {
    test.each([
        ['Sync BHR Leaves', SyncBhrLeaves, 'syncBhrLeaves'],
        ['Sync Biometrics', SyncBiometrics, 'syncBiometrics'],
        ['Sync UTC Adjustment', SyncUTCAdjustment, 'syncUTCAdjusetment'],
        ['Sync User Updates', SyncUserUpdates, 'syncBhrUsers'],
    ])('%s reads the sync and settings slices', (_name, Component) => {
        expectStateMapping(Component, { sync: 'S_sync', settings: STATE.settings });
    });

    test.each([
        ['Sync BHR Leaves', SyncBhrLeaves, 'syncBhrLeaves'],
        ['Sync Biometrics', SyncBiometrics, 'syncBiometrics'],
        ['Sync UTC Adjustment', SyncUTCAdjustment, 'syncUTCAdjusetment'],
        ['Sync User Updates', SyncUserUpdates, 'syncBhrUsers'],
    ])('%s submits through its own single sync creator', (_name, Component, creator) => {
        expectDispatchMapping(Component, [
            [creator, [{ valid_from: '2026-06-01' }], creator],
        ]);
    });
});

describe('Schedule -> Templates: redux wiring', () => {
    test('the template list spreads the whole schedule slice into props', () => {
        expectStateMapping(TemplateList, { ...STATE.schedule });
    });

    test('the template list dispatches listTemplate on mount and deleteSchedule with the template id', () => {
        expectDispatchMapping(TemplateList, [
            ['listTemplate', [], 'listTemplate'],
            ['deleteSchedule', [4], 'deleteSchedule'],
        ]);
    });

    test('template edit exposes the schedule slice as `template`', () => {
        expectStateMapping(TemplateEdit, { template: STATE.schedule });
    });

    test('template edit dispatches updateSchedule with payload first then schedule id, and loads a template by id and type', () => {
        expectDispatchMapping(TemplateEdit, [
            ['updateSchedule', [{ name: 'Mid shift' }, 4], 'updateSchedule'],
            ['getTemplateSchedule', [4, 'Template'], 'getTemplateSchedule'],
        ]);
    });

    test('template create reads only the logged-in user', () => {
        expectStateMapping(TemplateCreate, { user: 'S_user' });
    });

    test('template create dispatches addTemplateSchedule with the payload', () => {
        expectDispatchMapping(TemplateCreate, [
            ['addTemplateSchedule', [{ name: 'Night shift' }], 'addTemplateSchedule'],
        ]);
    });
});

describe('Schedule -> Assign and Info: redux wiring', () => {
    test('assign-to-employee reads the reload flag, template list, default schedule, template data and viewed user info', () => {
        expectStateMapping(ScheduleAssign, {
            page_reloaded: 'S_sched_isScheduleLoaded',
            template_list: 'S_sched_templateList',
            default_schedule: 'S_sched_defaultSchedule',
            template_data: 'S_sched_templateData',
            user_info: 'S_sched_userInfo',
        });
    });

    test('assign-to-employee dispatches scheduleAssign, getDefaultSchedule(bind_to, bind_id) and getUserInfo(id)', () => {
        expectDispatchMapping(ScheduleAssign, [
            ['listTemplate', [], 'listTemplate'],
            ['getUserInfo', [21], 'getUserInfo'],
            ['scheduleAssign', [{ bind_to: 'user' }], 'scheduleAssign'],
            ['getDefaultSchedule', ['user', 21], 'getDefaultSchedule'],
            ['getTemplateSchedule', [4, 'Default'], 'getTemplateSchedule'],
        ]);
    });

    // The department variant deliberately omits user_info/getUserInfo: a department has
    // no single owner whose timezone offset could be contrasted.
    test('assign-to-department reads the same schedule keys but no viewed user info', () => {
        expectStateMapping(ScheduleAssignDepartment, {
            page_reloaded: 'S_sched_isScheduleLoaded',
            template_list: 'S_sched_templateList',
            default_schedule: 'S_sched_defaultSchedule',
            template_data: 'S_sched_templateData',
        });
    });

    test('assign-to-department dispatches the schedule creators without getUserInfo', () => {
        expectDispatchMapping(ScheduleAssignDepartment, [
            ['listTemplate', [], 'listTemplate'],
            ['scheduleAssign', [{ bind_to: 'department' }], 'scheduleAssign'],
            ['getDefaultSchedule', ['department', 5], 'getDefaultSchedule'],
            ['getTemplateSchedule', [4, 'Default'], 'getTemplateSchedule'],
        ]);
    });

    test('schedule info reads the same five schedule keys as assign-to-employee', () => {
        expectStateMapping(ScheduleInfo, {
            page_reloaded: 'S_sched_isScheduleLoaded',
            template_list: 'S_sched_templateList',
            default_schedule: 'S_sched_defaultSchedule',
            template_data: 'S_sched_templateData',
            user_info: 'S_sched_userInfo',
        });
    });

    test('schedule info loads through getScheduleInfo(bind_to, bind_id, schedule_id) rather than getDefaultSchedule', () => {
        expectDispatchMapping(ScheduleInfo, [
            ['listTemplate', [], 'listTemplate'],
            ['getUserInfo', [21], 'getUserInfo'],
            ['scheduleAssign', [{ bind_to: 'user' }], 'scheduleAssign'],
            ['getScheduleInfo', ['user', 21, 88], 'getScheduleInfo'],
            ['getTemplateSchedule', [4, 'Default'], 'getTemplateSchedule'],
        ]);
    });
});

describe('OPS Schedule: redux wiring', () => {
    test('the list page reads settings, the opsSchedule slice as opsScheduleList, and constants', () => {
        expectStateMapping(OpsScheduleList, {
            settings: STATE.settings, opsScheduleList: STATE.opsSchedule, constant: 'S_constant',
        });
    });

    test('the list page dispatches the department-filtered fetch and the delete', () => {
        expectDispatchMapping(OpsScheduleList, [
            ['fetchOpsSchedulesList', ['5'], 'fetchOpsSchedulesList'],
            ['deleteOpsSchedule', [12], 'deleteOpsSchedule'],
        ]);
    });

    test('the form reads the opsSchedule instance, the user and settings', () => {
        expectStateMapping(OpsScheduleForm, {
            constant: 'S_constant', instance: 'S_ops_instance',
            isInstanceLoaded: 'S_ops_isInstanceLoaded', user: 'S_user', settings: STATE.settings,
        });
    });

    test('the form dispatches add with the payload and update with id first then payload', () => {
        expectDispatchMapping(OpsScheduleForm, [
            ['fetchOpsSchedule', [12], 'fetchOpsSchedule'],
            ['addOpsSchedule', [{ department_id: 5 }], 'addOpsSchedule'],
            ['updateOpsSchedule', [12, { department_id: 5 }], 'updateOpsSchedule'],
            ['setRedirect', ['/app/ops-schedule'], 'setRedirect'],
            ['clearOpsScheduleInstance', [], 'clearOpsScheduleInstance'],
        ]);
    });
});

describe('Announcements: redux wiring', () => {
    test('the department announcement form reads the department lookup, the announcement instance, the user and settings', () => {
        expectStateMapping(DepartmentAnnouncementsForm, {
            department: 'S_lookup_department', constant: 'S_constant',
            instance: 'S_da_instance', isInstanceLoaded: 'S_da_isInstanceLoaded',
            user: 'S_user', settings: STATE.settings,
        });
    });

    test('the form dispatches create with the payload and update with id first then payload', () => {
        expectDispatchMapping(DepartmentAnnouncementsForm, [
            ['fetchDepartmentList', [], 'fetchDepartmentList'],
            ['fetchDepartmentAnnouncementStrict', [77], 'fetchDepartmentAnnouncementStrict'],
            ['clearDepartmentAnnouncementInstance', [77], 'clearDepartmentAnnouncementInstance'],
            ['createDepartmentAnnouncement', [{ title: 'Town hall' }], 'createDepartmentAnnouncement'],
            ['updateDepartmentAnnouncement', [77, { title: 'Town hall' }], 'updateDepartmentAnnouncement'],
            ['setRedirect', ['/app/announcements'], 'setRedirect'],
        ]);
    });

    test('the my-department list reads only the departmentAnnouncement slice', () => {
        expectStateMapping(DepartmentAnnouncementsList, {
            departmentAnnouncement: STATE.departmentAnnouncement,
        });
    });

    // The list fetches through fetchMyHandleAnnouncementList (handled departments only),
    // not the admin-wide fetchDepartmentAnnouncementList.
    test('the my-department list fetches the handled-departments feed and deletes by id', () => {
        expectDispatchMapping(DepartmentAnnouncementsList, [
            ['clearDepartmentAnnouncementListInstance', [], 'clearDepartmentAnnouncementListInstance'],
            ['fetchMyHandleAnnouncementList', [], 'fetchMyHandleAnnouncementList'],
            ['deleteDepartmentAnnouncement', [77], 'deleteDepartmentAnnouncement'],
        ]);
    });

    test('the announcement page reads the strict instance plus the whole announcement slice for the sidebar', () => {
        expectStateMapping(AnnouncementsPage, {
            constant: 'S_constant', instance: 'S_da_instance',
            isInstanceLoaded: 'S_da_isInstanceLoaded', user: 'S_user',
            departmentAnnouncement: STATE.departmentAnnouncement,
        });
    });

    test('the announcement page fetches the dashboard feed, clears the list and loads one announcement by id', () => {
        expectDispatchMapping(AnnouncementsPage, [
            ['fetchDashboardAnnouncementList', [], 'fetchDashboardAnnouncementList'],
            ['clearDepartmentAnnouncementListInstance', [], 'clearDepartmentAnnouncementListInstance'],
            ['fetchDepartmentAnnouncementStrict', [77], 'fetchDepartmentAnnouncementStrict'],
            ['setRedirect', ['/app/announcements'], 'setRedirect'],
        ]);
    });
});
