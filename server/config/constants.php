<?php
/*
|--------------------------------------------------------------------------
| Defining Constants
|--------------------------------------------------------------------------
|
| This option contains the list of contants that 
| would be used all through out the application.
|
*/
return [

    /*
    |--------------------------------------------------------------------------
    | Status Code Returns
    |--------------------------------------------------------------------------
    |
    | Contains the list of status codes that would 
    | be used in front-end development.
    |
    */

    'DAYS' => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],

    'LEAVE_REQUEST_STATUS' => [
        'requested', 
        'approved', 
        'denied', 
        'canceled'
    ],

    'UNPAID_LEAVE_TYPES' => [
        "Unpaid Leave",
        "Work from home",
        "MGC Unpaid Call Out Days"
    ],


    'PAYROLL_NIGHT_DIFF_TIME' => [
        "start" => "22:00",
        "end" => "06:00",
    ],
    

    'PAYROLL_ITEMS' => [
        "late" => "late" ,
        "undertime" => "undertime" ,
        "night_diff" => "night_diff" ,
        "overtime" => "overtime",
        "overtime_night_diff" => "overtime_night_diff",
        "rendered_hours" => "rendered_hours"
    ],

    'PAYROLL_ITEM_TAGS' => [
        "regular" => "regular",
        "overlapped" => "overlapped",
        "underlapped" => "underlapped",
    ],


    'OVERTIME_TYPE' => [
        "pre" => "pre_overtime",
        "post" => "post_overtime"
    ],



    'ATTENDANCE_STATUS' => [
        "absent"    => "Absent",
        "present"   => "Present",
        "rest_day"  => "Rest Day"
    ],
    
    'TIMESTAMP' => [
        "minute"        => 60,
        "hour"          => 3600,
        "eight_hours"   => 28800,
        "day"           => 86400,
    ],

    
    'LOG_START' => ' [ CALL START ] ',
    'LOG_END' => ' [ CALL END ] ',
    'LOG_ROLLBACK' => ' Rolling back all the Previous Transactions... ',
    'LOG_GAP' => '##################################################################################',
];
