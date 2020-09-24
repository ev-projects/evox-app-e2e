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
    'user_not_found' => 'Sorry, Unrecognized Username or Password',
    
    'login' => 'Login',
    'login_success' => 'Logged in successfully!',

    'logout' => 'Logout',
    'logout_success' => 'Logged out successful!',
    
    'payload' => 'Payload',
    'payload_success' => 'Payload successfully loaded!',

    'user_not_authorized' => 'The User/Property of the User being accessed is not Authorized.',
    'user_not_under_supervisee' => 'The User/Property of the User being accessed is not under your Supervisee.',
    'user_instance_invalid' => 'The User instance is invalid.',


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

    'quickpunch_in_success' => 'Log In Successful',
    'quickpunch_out_success' => 'Log Out Successful',

    'request_attempt' => 'Request List Attempt',
    'request_attempt_success' => 'The Alteration Request is now updated!',
        
    /**
     *  Schedule Forms
     */
    // 'name' => ''
    // 'source_type' => ''
    // 'schedule_type' => ''
    // 'valid_from' => ''
    // 'valid_to' => ''
    // 'work_days' => ''


];