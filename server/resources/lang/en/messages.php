<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Messages Lines
    |--------------------------------------------------------------------------
    |
    | The contents of this files are the list of Messages 
    | that we send back to the API caller as a response.
    |
    */
    
    /**
     *  General Terms
     */
    'error_default' => 'Sorry, something went wrong.',
    'token_expired'  => 'Session time-out. Please re-login.',
    'token_invalid'  => 'Session time-out. Please re-login.',
    'token_absent'  => 'Session time-out. Please re-login.',

    /**
     *  User Authentication
     */
    'user_email_not_found' => 'Sorry, looks like you entered the wrong email address. Kindly ask the HR which email address is registered on your profile.',
    'user_name_not_found' => 'Sorry, looks like you entered the wrong username. You may try using your registred email address to login.',
    'user_password_incorrect' => 'Sorry, looks like you entered the wrong password. If your password doesn\'t work, you may use the "Forgot Password?" feature to get a new temporary password on your registered email address.',
    'user_not_found' => 'Sorry, Unrecognized Username or Password.',
    'user_not_active' => 'Sorry, your account is suspended. Please email helpdesk@eastvantage.com to activate your account.',
    
    'login' => 'Login',
    'login_success' => 'Successfully Login!',

    'logout' => 'Logout',
    'logout_success' => 'Successfully Logout!',

    'session_expire' => 'Session Expired',
    'session_expire_message' => 'You have been logged out due to inactivity.',
    
    'payload' => 'Payload',
    'payload_success' => 'Payload successfully loaded!',

    'forgot_password_request_attempt' => 'Attempting to request for Forgot Password Assistance',
    'forgot_password_request_success' => 'Password successfully reset. Please check your e-mail for further instructions.',

    'user_not_authorized' => 'The User/Property of the User being accessed is not Authorized.',
    'user_not_under_supervisee' => 'The User/Property of the User being accessed is not under your Supervisee.',
    'user_instance_invalid' => 'The User instance is invalid.',

    'change_password_attempt'    => 'Attempt to change password',
    'change_password_success'    => 'Successfully changed the password!',

    'tick_dpa_attempt'    => 'Attempt to tick the DPA of the User',
    'tick_dpa_success'    => 'Thank you for watching the video! ',

    'register_user_attempt'    => 'Attempt to Register a User',
    'register_user_success'    => 'Successfully registered a User!',

    'role_not_allowed'          => 'No specific role to do this action!',
    'permission_not_allowed'    => "No permission to do this action!",
    


    /**
     *  Team Creation
     */
    'store_team_success' => 'Successfully created a team!',
    'update_team_success' => 'Successfully updated the team!',
    'destroy_team_success' => 'Successfully deleted the team!',


    /**
     *  User Assigning
     */
    'user_assign_roles_permissions_attempt' => 'Attempt for Assigning the Roles and Permissions to the User',
    'user_assign_roles_permissions_success' => 'Successfully Assign the Roles and Permissions to the User!',

   'user_assign_employees_attempt' => 'Attempt for Assigning the Employees to the Supervisor',
   'user_assign_employees_success' => 'Successfully Assigned the Employees to the Supervisor!',

    /**
     *  List User Roles
     */
    'list_role_attempt' => 'Attempt for Listing the Users base on Role',
    'list_role_success' => 'Successfully shown all the Users base on Role!',

    /**
     *  Profile
     */
    'show_profile_success' => 'Successfully shown the Profile Information!',
    'current_password_not_match' => 'The password does not match on your current password!',
    'update_user_profile_attempt' => 'Attempt to update user profile...',
    'update_user_profile_success' => 'Successfully updated the profile!',

    


    /**
     *  Department
     */
    'all_department_success' => 'Successfully fetched all Department!',
    'find_department_success' => 'Successfully found a Department!',
    'soft_delete_department_success' => 'Successfully Soft Deleted a Department and Employees under Department!',
    'department_assign_handlers_attempt' => 'Attempt for Assigning of Department Handlers',
    'department_assign_handlers_success' => 'Successfully Assigned Department Handlers!',

    /**
     *  Schedule 
     */
    'create_schedule_attempt' => 'Create Schedule Attempt',
    'create_schedule_success' => 'A new schedule is now created!',

    'update_schedule_attempt' => 'Update Schedule Attempt',
    'update_schedule_success' => 'The schedule is now updated!',
    'update_schedule_not_auth' => 'The schedule is not authorized to be updated!',

    'delete_schedule_attempt' => 'Delete Schedule Attempt',
    'delete_schedule_success' => 'The schedule is now deleted!',
    'delete_schedule_not_auth' => 'The schedule is not authorized to be deleted!',

    'show_schedule_attempt' => 'Show Schedule Attempt',
    'show_schedule_success' => 'The schedule is now shown!',

    'assign_schedule_attempt' => 'Assign Schedule Attempt',
    'assign_schedule_success' => 'Schedule successfully updated!',


    /**
     *  Request 
     */
    'create_overtime_attempt' => 'Create Overtime Request Attempt',
    'create_overtime_success' => 'A new Overtime Request is now created!',

    'update_overtime_attempt' => 'Update Overtime Request Attempt',
    'update_overtime_success' => 'The Overtime Request is now updated!',

    'delete_overtime_attempt' => 'Delete Overtime Request Attempt',
    'delete_overtime_success' => 'The Overtime Request is now deleted!',

    'find_overtime_success' => 'The Overtime Request is now shown!',

    'approve_overtime_attempt' => 'Approving of Overtime Request Attempt',
    'approve_overtime_success' => 'The Overtime Request is now Approved!',

    'decline_overtime_attempt' => 'Declining of Overtime Request Attempt',
    'decline_overtime_success' => 'The Overtime Request is now Declined!',

    'pending_overtime_attempt' => 'Setting to Pending of Overtime Request Attempt',
    'pending_overtime_success' => 'The Overtime Request is now set to Pending!',

    'cancel_overtime_attempt' => 'Canceling of Overtime Request Attempt',
    'cancel_overtime_success' => 'The Overtime Request is now Canceled!',



    
    'create_change_schedule_attempt' => 'Create Change Schedule Request Attempt',
    'create_change_schedule_success' => 'A new Change Schedule Request is now created!',

    'update_change_schedule_attempt' => 'Update Change Schedule Request Attempt',
    'update_change_schedule_success' => 'The Change Schedule Request is now updated!',

    'delete_change_schedule_attempt' => 'Delete Change Schedule Request Attempt',
    'delete_change_schedule_success' => 'The Change Schedule Request is now deleted!',

    'find_change_schedule_success' => 'The Change Schedule Request is now shown!',

    'approve_change_schedule_attempt' => 'Approving of Change Schedule Request Attempt',
    'approve_change_schedule_success' => 'The Change Schedule Request is now Approved!',

    'decline_change_schedule_attempt' => 'Declining of Change Schedule Request Attempt',
    'decline_change_schedule_success' => 'The Change Schedule Request is now Declined!',

    'pending_change_schedule_attempt' => 'Setting to Pending of Change Schedule Request Attempt',
    'pending_change_schedule_success' => 'The Change Schedule Request is now set to Pending!',

    'cancel_change_schedule_attempt' => 'Canceling of Change Schedule Request Attempt',
    'cancel_change_schedule_success' => 'The Change Schedule Request is now Canceled!',
        



    'create_alter_log_attempt' => 'Create Alteration Request Attempt',
    'create_alter_log_success' => 'A new Alteration Request is now created!',

    'update_alter_log_attempt' => 'Update Alteration Request Attempt',
    'update_alter_log_success' => 'The Alteration Request is now updated!',

    'delete_alter_log_attempt' => 'Delete Alteration Request Attempt',
    'delete_alter_log_success' => 'The Alteration Request is now deleted!',

    'find_alter_log_success' => 'The Alteration Request is now shown!',

    'approve_alter_log_attempt' => 'Approving of Alteration Request Attempt',
    'approve_alter_log_success' => 'The Alteration Request is now Approved!',

    'decline_alter_log_attempt' => 'Declining of Alteration Request Attempt',
    'decline_alter_log_success' => 'The Alteration Request is now Declined!',

    'pending_alter_log_attempt' => 'Setting to Pending of Alteration Request Attempt',
    'pending_alter_log_success' => 'The Alteration Request is now set to Pending!',

    'cancel_alter_log_attempt' => 'Canceling of Alteration Request Attempt',
    'cancel_alter_log_success' => 'The Alteration Request is now Canceled!',



    
    'create_rest_day_work_attempt' => 'Create Rest Day Work Request Attempt',
    'create_rest_day_work_success' => 'A new Rest Day Work Request is now created!',

    'update_rest_day_work_attempt' => 'Update Rest Day Work Request Attempt',
    'update_rest_day_work_success' => 'The Rest Day Work Request is now updated!',

    'delete_rest_day_work_attempt' => 'Delete Rest Day Work Request Attempt',
    'delete_rest_day_work_success' => 'The Rest Day Work Request is now deleted!',

    'find_rest_day_work_success' => 'The Rest Day Work Request is now shown!',

    'approve_rest_day_work_attempt' => 'Approving of Rest Day Work Request Attempt',
    'approve_rest_day_work_success' => 'The Rest Day Work Request is now Approved!',

    'decline_rest_day_work_attempt' => 'Declining of Rest Day Work Request Attempt',
    'decline_rest_day_work_success' => 'The Rest Day Work Request is now Declined!',

    'pending_rest_day_work_attempt' => 'Setting to Pending of Rest Day Work Request Attempt',
    'pending_rest_day_work_success' => 'The Rest Day Work Request is now set to Pending!',

    'cancel_rest_day_work_attempt' => 'Canceling of Rest Day Work Request Attempt',
    'cancel_rest_day_work_success' => 'The Rest Day Work Request is now Canceled!',

    'change_request_status_attempt' => 'Change Request Status from E-mail Attempt',
    'change_request_status_success' => 'Change Request Status from E-mail Success',
    
    'bulk_request_change_status_attempt' => 'Bulk Request Change Status Attempt',
    'bulk_request_update' => 'Requests are now updated',
    

    'quickpunch_in_success' => 'Successfully clocked in!',
    'quickpunch_out_success' => 'Successfully clocked out!',

    'request_display_attempt' => 'Request List Attempt',
    'request_number_display_attempt' => 'Request Number List Attempt',
    'request_display_success' => 'List of Request are now displayed',


    
    /**
     *  Payroll Cutoff  
     */
    'create_payroll_cutoff_attempt' => 'Create Payroll Cutoff Attempt',
    'create_payroll_cutoff_success' => 'A new Payroll Cutoff is now created!',

    'update_payroll_cutoff_attempt' => 'Update Payroll Cutoff Attempt',
    'update_payroll_cutoff_success' => 'The Payroll Cutoff is now updated!',

    'delete_payroll_cutoff_attempt' => 'Delete Payroll Cutoff Attempt',
    'delete_payroll_cutoff_success' => 'The Payroll Cutoff is now deleted!',

    'find_payroll_cutoff_success' => 'The Payroll Cutoff is now shown!',
    
    'all_payroll_cutoff_success' => 'All the Payroll Cutoff is now shown!',
    

    'bulk_request_update' => 'Requests are now updated',


    /**
     *  User Messages 
     */
    'get_user_info_success' => 'User Info is now displayed',
    
    /**
     *  Schedule Forms
     */
    // 'name' => ''
    // 'source_type' => ''
    // 'schedule_type' => ''
    // 'valid_from' => ''
    // 'valid_to' => ''
    // 'work_days' => ''

    /**
     *  Change Logs
     */
    'create_change_log_attempt' => 'Create Change Log Attempt',
    'create_change_log_success' => 'A new change log is now created!',
    'fetch_change_log_success' => 'List of all change logs',



    /**
     * Department Announcements
     */

     'create_department_announcement_attempt' => 'Create Department Announcement Attempt',
     'create_department_announcement_success' => 'A new Department Announcement is now created!',
     'update_department_announcement_attempt' => 'Update Department Announcement Attempt',
     'update_department_announcement_success' => 'A  Department Announcement has been updated!',
     'delete_department_announcement_attempt' => 'Deleting Department Announcement Attempt',
     'delete_department_announcement_success' => 'Deleted an Department Announcement',
    //  'fetchdepartment_announcement_success' => 'List of all change logs',
    /**
     *  HR Announcement
     */
    'create_hr_announcement_attempt' => 'Create HR Announcement Attempt.',
    'create_hr_announcement_success' => 'A new HR Announcement is now created!',
    'fetch_hr_announcements_success' => 'List of all HR Announcements.',
    'delete_hr_announcement_attempt' => 'Delete HR Announcement Cutoff Attempt',
    'delete_hr_announcement_success' => 'The HR Announcement is now deleted!',
    'fetch_hr_announcement_success' => 'Get Announcement.',
    'update_hr_announcement_attempt' => 'Update HR Announcement Attempt.',
    'update_hr_announcement_success' => 'Update HR Announcement success.',
];