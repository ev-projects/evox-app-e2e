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
    dtr_punchlist                   :  "/app/dtr_punch_list/",
    dtr_punch_history               :  "/app/punch_history/",
    dtr_logs                        :  "/app/dtr_logs/",
    profile                         :  "/app/profile/",
    my_request                      :  "/app/account/MyRequests",
    my_overall_request              :  "/app/account/MyOverallRequests",
    ev_learning                     :  "/app/EVLearning",
    ops_schedule                    :  "/app/OpsSchedule",

    // Request Links
    overtime                        :  "/app/request/Overtime/",
    alter_log                       :  "/app/request/AlterLog/",
    change_schedule                 :  "/app/request/ChangeSchedule/",
    rest_day_work                   :  "/app/request/RestDayWork/",
    work_from_home                  :  "/app/request/WorkFromHome/",
    coe                             :  "/app/request/CertificateOfEmployment/",
    alter_log_punch                 :  "/app/request/AlterLogPunch/",

    // Team Links
    manage_teams                    :  "/app/team/Manage",
    dpa_list                        :  "/app/team/DPAList",
    employee_list                   :  "/app/team/MyTeamList",
    my_team_requests                :  "/app/team/MyTeamRequests",
    my_team_all_requests            :  "/app/team/MyTeamAllRequests",
    overallrequest                :    "/app/team/overallrequest",
    team_list                       :  "/app/team/TeamList",
    dtr_summary                     :  "/app/team/DtrSummary",
    dtr_multi_logs_summary          :  "/app/team/DtrMultiLogsSummary",
    dtr_conflict                    :  "/app/team/DtrConflict",
    dtr_summary_new                 :  "/app/team/DtrSummaryTemp",
    dtr_logs                        :  "/app/team/DtrLogs", 
    weekly_team_schedule            :  "/app/team/WeeklyTeamSchedule", 
    my_team_schedule                :  "/app/team/MyTeamSchedule", 
    monthly_team_schedule           :  "/app/team/MonthlyTeamSchedule", 
    custom_team_schedule            :  "/app/team/CustomTeamSchedule", 
    daily_team_schedule             :  "/app/team/DailyTeamSchedule", 

    department_announcement_list    :  "/app/team/DepartmentAnnouncementList/",
    department_announcement_form    :  "/app/team/DepartmentAnouncement/",
    announcement_page               :  "/app/team/Anouncement/Page/",

    // Schedule Links
    template_add                    :  "/app/schedule/",
    template_list                   :  "/app/schedule/template/",
    schedule_assign_department      :  "/app/schedule/assign/department",
    schedule_assign_user            :  "/app/schedule/assign/user/",
    schedule_assign_user            :  "/app/schedule/assign/user/",

    // Report Links
    team_attendance_summary         :  "/app/report/TeamAttendanceSummary/",
    hr_team_attendance_summary         :  "/app/report/HRTeamAttendanceSummary/",
    KPIReport                       :  "/app/report/KPIReport/",

    // Admin Links
    payroll_cutoff                  :  "/app/admin/PayrollCutoff/",
    assign_department_handlers      :  "/app/admin/AssignDepartmentHandlers/",
    assign_employees_client          :  "/app/admin/AssignClientHandlers/",
    assign_employee_supervisors     :  "/app/admin/AssignEmployeeSupervisors/",
    assign_sub_department           :  "/app/admin/AssignSubDepartment/",
    sync_biometrics                 :  "/app/admin/SyncBiometrics/",
    sync_bhr_leaves                 :  "/app/admin/SyncBhrLeaves/",
    sync_utc_adjustment             : "/app/admin/SyncUTCAdjustment/",
    sync_bhr_user_updates           :  "/app/admin/SyncUserUpdates/",
    assign_role_permission          :  "/app/admin/AssignRolePermission/",
    assign_feature          :  "/app/admin/AssignFeature/",
    register_user                   :  "/app/admin/RegisterUser/",
    manage_change_logs              :  "/app/admin/ManageChangeLogs/",

    department_list                 :  "/app/admin/DepartmentList/",
    admin_announcement_list         :  "/app/admin/AnnouncementList/",
    admin_import_careers            :  "/app/admin/CareersImport/",


    // Performance Measure
    kpi_upload                      :  "/app/performance/KpiUpload",
    generate_date                   :  "/app/admin/GenerateDate/",

    // HR Links
    manage_hr_announcements         : "/app/hr/ManageHrAnnouncements/",
    post_hr_announcements           : "/app/hr/PostHrAnnouncements/",

    meeting_calander                :  "/app/calander/",
    room_master                     :  "/app/createroom/",
    room_list                       :  "/app/Roomlist/",
    booked_list                     :  "/app/Bookedlist/",
    meetingroom_approval            :  "/app/roomapproval/",
    location_master                 :  "/app/createlocation/",
    location_list                   :  "/app/locationlist/",
    job_referal                     :  "/app/referjob/",
    requirement_list                :  "/app/requirement/",

    // OPS Links
    ops_schedule_form               :  "/app/ops/ManageOpsSchedules/",
    ops_schedule_list               :  "/app/ops/ManageOpsSchedulesList/",
   
};

global.invalid_token_response = [
    'token_expired',
    'token_invalid',
    'token_absent'
];

/**
 *  Input all additional Global Variables above.
 */
