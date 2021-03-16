/**
 *  This serves as the container of the Global Variables that would be used all through out the app.
 *  All the static data that are not too often to change should be stored here.
 */

global.login_url = "/login";
global.base_url = "/app/";
global.dpa_url = "/app/dpa";
global.dashboard_url = "/app/Dashboard";
global.template_add = "/app/schedule/";
global.template_list = "/app/schedule/template/";
global.schedule_assign_department = "/app/schedule/assign/department";
global.schedule_assign_user = "/app/schedule/assign/user/";
global.daily_time_record_view = "/app/dtr/";
global.personal_information = "/app/profile/PersonalInformation/";
global.job_information = "/app/profile/JobInformation/";
global.payroll_cutoff = "/app/admin/PayrollCutoff/";
global.assign_department_handlers = "/app/admin/AssignDepartmentHandlers/";
global.assign_employee_supervisors = "/app/admin/AssignEmployeeSupervisors/";
global.assign_role= "/app/admin/AssignRole/";
global.register_user= "/app/admin/RegisterUser/";

global.overtime = "/app/request/Overtime/";
global.work_from_home = "/app/request/WorkFromHome/";
global.alter_log = "/app/request/AlterLog/";
global.change_schedule = "/app/request/ChangeSchedule/";
global.rest_day_work = "/app/request/RestDayWork/";

global.my_request = "/app/account/MyRequests";

global.invalid_token_response = [
    'token_expired',
    'token_invalid',
    'token_absent'
];

/**
 *  Input all additional Global Variables above.
 */
