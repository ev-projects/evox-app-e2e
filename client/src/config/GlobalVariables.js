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
    profile                         :  "/app/profile/",
    my_request                      :  "/app/account/MyRequests",
    ev_learning                      :  "/app/EVLearning",

    // Request Links
    overtime                        :  "/app/request/Overtime/",
    alter_log                       :  "/app/request/AlterLog/",
    change_schedule                 :  "/app/request/ChangeSchedule/",
    rest_day_work                   :  "/app/request/RestDayWork/",
    work_from_home                  :  "/app/request/WorkFromHome/",

    // Team Links
    manage_teams                    :  "/app/team/Manage",
    dpa_list                        :  "/app/team/DPAList",
    employee_list                   :  "/app/team/MyTeamList",
    my_team_requests                :  "/app/team/MyTeamRequests",
    team_list                       :  "/app/team/TeamList",
    dtr_summary                     :  "/app/team/DtrSummary",
    dtr_logs                        :  "/app/team/DtrLogs", 
    team_schedule                   :  "/app/team/Schedule", 

    // Schedule Links
    template_add                    :  "/app/schedule/",
    template_list                   :  "/app/schedule/template/",
    schedule_assign_department      :  "/app/schedule/assign/department",
    schedule_assign_user            :  "/app/schedule/assign/user/",

    // Admin Links
    payroll_cutoff                  :  "/app/admin/PayrollCutoff/",
    assign_department_handlers      :  "/app/admin/AssignDepartmentHandlers/",
    assign_employee_supervisors     :  "/app/admin/AssignEmployeeSupervisors/",
    sync_biometrics                 :  "/app/admin/SyncBiometrics/",
    sync_bhr_leaves                 :  "/app/admin/SyncBhrLeaves/",
    sync_bhr_user_updates           :  "/app/admin/SyncUserUpdates/",
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
