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

    'BHR_USER_SYNC_FIELDS' => [
        'employeeNumber',
        'firstName',
        'middleName',
        'lastName',
        'department',
        'bestEmail',
        'dateOfBirth',
        'nickname',
        'status',
        'hireDate',
        'terminationDate',
        'employmentHistoryStatus',
        'supervisorEId'
    ],
    
    'BHR_USER_TABLE' => [
        'employee_status'    =>  'employmentStatus', 
        'job_info'  =>  'jobInfo'
    ],

    'BHR_USER_FIELDS' => [
        'employeeNumber',
        'firstName',
        'lastName',
        'fullname1',
        'nickname',
        'dateOfBirth',
        'gender',
        'maritalStatus',
        'department',
        'supervisor',
        'employmentHistoryStatus',
        'jobTitle',
        'mobilePhone',
        'customSSS',
        'customTIN',
        'customPhilhealth',
        'customHDMF',
        'customBankaccount',
        'homePhone',
        'hireDate',
        'address1',
        'address2',
        'city',
        'state',
        'zipcode',
        'bestEmail',
        'status'
    ],

    'BHR_USER_PERSONAL' => [
        'mobilePhone',
        'jobTitle'
    ],

    'BHR_USER_EMPLOYMENT_STATUS' => [
        'terminated'    =>  'Terminated', 
    ],

    'USER_ROLES' => [
        'employee'    =>  'employee', 
        'supervisor'  =>  'supervisor',
        'admin'       =>  'admin',
        'client'      =>  'client',
    ],

    'REGISTERED_USER' => 'Registered User',

    'DEFAULT_PASSWORD'  => '{ev2010}',


    
    'EASTVANTAGE_DEV_EMAIL' => 'eastvantage.dev@gmail.com',


    'BCC_EMAIL_ADDRESS' => [
        'eastvantage.dev@gmail.com'
    ],

    'BCC_EMAIL_ADDRESS_FOR_NON_PROD' => [
        'aaron.colina@eastvantage.com',
        'carmela.garcia@eastvantage.com',
        'mel.ugaddan@eastvantage.com'
    ],    

    'LEAVE_REQUEST_STATUS' => [
        'requested', 
        'approved', 
        'denied', 
        'canceled'
    ],

    'REQUEST_TABLES' => [
        'overtimes', 
        'alter_logs', 
        'rest_day_works',
        'change_schedules'
    ],

    'REQUEST_TYPES' => [
        'overtime' => 'overtime', 
        'alter_log' => 'alter_log', 
        'rest_day_work' => 'rest_day_work', 
        'change_schedule' => 'change_schedule',
        'work_from_home' => 'work_from_home'
    ],

    'REQUEST_STATUS' => [
        'approved' => 'approved', 
        'declined' => 'declined', 
        'pending' => 'pending', 
        'canceled' => 'canceled'
    ],

    'REQUEST_TYPE' => [
        'all' => 'all', 
        'alteration' => 'alteration', 
        'overtime' => 'overtime', 
        'rest_day_work' => 'rest_day_work',
        'change_schedule' => 'change_schedule'
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
        "on_leave" => "vl_sl",
        "vacation_leave" => "vl",
        "sick_leave" => "sl",
        "unpaid_leave" => "ul",
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

    'DTR_TYPE' => [
        "regular" => "reg",
        "rest_day" => "rd",
        "holiday" => [
            "legal" => "lh",
            "double_legal" => "dlh",
            "special" => "sh",
            "double_special" => "dsh",
            "special_legal" => "slh"
        ]
    ],

    'DTR_SUMMARY_COLUMN' => [
        "rd" => "Rest Day",
        "lh" => "Legal Holiday",
        "dlh" => "Double Legal Holiday",
        "sh" => "Special Holiday",
        "dsh" => "Double Special Holiday",
        "slh" => "Special and Legal Holiday"
    ],

    'DTR_SOURCE_TYPE_TAGGING' => [
        "default" => "default",
        "temporary" => "temporary",
        "change_schedule" => "change_schedule",
        "rest_day_work" => "rest_day_work",
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

    'TIMESTAMP' => [
        "minute"        => 60,
        "hour"          => 3600,
        "eight_hours"   => 28800,
        "day"           => 86400,
    ],

    'LOG_START' => ' [ CALL START ] ',
    'LOG_END' => ' [ CALL END ] ',
    'LOG_QUEUED' => ' [ QUEUED ] ',
    'LOG_SENT_SUCCESS'   => ' Sent Successfuly To: ',
    'LOG_ROLLBACK' => ' Rolling back all the Previous Transactions... ',
    'LOG_GAP' => '##################################################################################',
];
