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


    /**
     *  Schedule 
     */
    'create_schedule|_attempt' => 'Create Schedule Attempt',
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
     *  Schedule Forms
     */
    // 'name' => ''
    // 'source_type' => ''
    // 'schedule_type' => ''
    // 'valid_from' => ''
    // 'valid_to' => ''
    // 'work_days' => ''


];