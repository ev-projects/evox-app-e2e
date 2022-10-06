/**
 *  This serves as the container of the Global Variables that would be used all through out the app.
 *  All the static data that are not too often to change should be stored here.
 */

 global.links = {

    // Outside Links
    login                           :  "/login",
    authenticate_client             :  "/authenticate-client",
    email_not_found                 :  "/email-not-found",
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
    ops_schedule                      :  "/app/OpsSchedule",

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
    weekly_team_schedule            :  "/app/team/WeeklyTeamSchedule", 
    my_team_schedule                :  "/app/team/MyTeamSchedule", 
    monthly_team_schedule           :  "/app/team/MonthlyTeamSchedule", 
    custom_team_schedule            :  "/app/team/CustomTeamSchedule", 
    daily_team_schedule             :  "/app/team/DailyTeamSchedule", 
    // Schedule Links
    template_add                    :  "/app/schedule/",
    template_list                   :  "/app/schedule/template/",
    schedule_assign_department      :  "/app/schedule/assign/department",
    schedule_assign_user            :  "/app/schedule/assign/user/",

    // Report Links
    team_attendance_summary         :  "/app/report/TeamAttendanceSummary/",
    KPIReport                       :  "/app/report/KPIReport/",

    // Admin Links
    payroll_cutoff                  :  "/app/admin/PayrollCutoff/",
    assign_department_handlers      :  "/app/admin/AssignDepartmentHandlers/",
    assign_employees_client          :  "/app/admin/AssignClientHandlers/",
    assign_employee_supervisors     :  "/app/admin/AssignEmployeeSupervisors/",
    sync_biometrics                 :  "/app/admin/SyncBiometrics/",
    sync_bhr_leaves                 :  "/app/admin/SyncBhrLeaves/",
    sync_bhr_user_updates           :  "/app/admin/SyncUserUpdates/",
    assign_role_permission          :  "/app/admin/AssignRolePermission/",
    register_user                   :  "/app/admin/RegisterUser/",

    // Performance Measure
    kpi_upload                      :  "/app/performance/KpiUpload",
    generate_date                   :  "/app/admin/GenerateDate/",
};

global.invalid_token_response = [
    'token_expired',
    'token_invalid',
    'token_absent'
];

/**
 *  Input all additional Global Variables above.
 */
