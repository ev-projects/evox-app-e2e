/**
 *  This serves as the container of the Global Variables that would be used all through out the app.
 *  All the static data that are not too often to change should be stored here.
 */

global.links = {

    // Outside Links
    login                           :  "/login",
    request_approval                :  "/request/approval/",
    recover_password                :  "/recover/password/",

    // General Links
    base                            :  "/app/",
    dpa                             :  "/app/dpa",
    dashboard                       :  "/app/Dashboard",

    // Employee Links
    dtr                             :  "/app/dtr/",
    personal_information            :  "/app/profile/PersonalInformation/",
    job_information                 :  "/app/profile/JobInformation/",
    my_request                      :  "/app/account/MyRequests",

    // Request Links
    overtime                        :  "/app/request/Overtime/",
    alter_log                       :  "/app/request/AlterLog/",
    change_schedule                 :  "/app/request/ChangeSchedule/",
    rest_day_work                   :  "/app/request/RestDayWork/",
    work_from_home                  :  "/app/request/WorkFromHome/",

    // Team Links
    dpa_list                        :  "/app/team/DPAList",
    my_team_list                    :  "/app/team/MyTeamList",
    my_team_requests                :  "/app/team/MyTeamRequests",
    dtr_summary                     :  "/app/team/DtrSummary",
    dtr_logs                        :  "/app/team/DtrLogs",

    // Schedule Links
    template_add                    :  "/app/schedule/",
    template_list                   :  "/app/schedule/template/",
    schedule_assign_department      :  "/app/schedule/assign/department",
    schedule_assign_user            :  "/app/schedule/assign/user/",

    // Admin Links
    payroll_cutoff                  :  "/app/admin/PayrollCutoff/",
    assign_department_handlers      :  "/app/admin/AssignDepartmentHandlers/",
    assign_employee_supervisors     :  "/app/admin/AssignEmployeeSupervisors/",
    assign_role                     :  "/app/admin/AssignRole/",
    register_user                   :  "/app/admin/RegisterUser/",
};

global.invalid_token_response = [
    'token_expired',
    'token_invalid',
    'token_absent'
];

/**
 *  Input all additional Global Variables above.
 */
