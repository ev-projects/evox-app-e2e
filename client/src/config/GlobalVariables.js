/**
 *  This serves as the container of the Global Variables that would be used all through out the app.
 *  All the static data that are not too often to change should be stored here.
 */

global.login_url = "/login";
global.base_url = "/app/";
global.dashboard_url = "/app/Dashboard";
global.template_list_url = "/app/schedule/template/";
global.template_add = "/app/schedule/";
global.daily_time_record_view = "/app/dtr/";
global.profile_url = "/app/profile/";
global.default_schedule = "/app/schedule/assign/";
global.payroll_cutoff = "/app/admin/PayrollCutoff/";
global.assign_department_handlers = "/app/admin/AssignDepartmentHandlers/";
global.assign_employee_supervisors = "/app/admin/AssignEmployeeSupervisors/";

global.overtime = "/app/request/Overtime/";
global.work_from_home = "/app/request/WorkFromHome/";
global.alter_log = "/app/request/AlterLog/";
global.change_schedule = "/app/request/ChangeSchedule/";
global.rest_day_work = "/app/request/RestDayWork/";

global.invalid_token_response = [
    'token_expired',
    'token_invalid',
    'token_absent'
];

/**
 *  Input all additional Global Variables above.
 */
