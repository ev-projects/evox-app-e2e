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

    'LEAVE_REQUEST_STATUS' => ['requested', 'approved', 'denied', 'canceled'],
    
    'LOG_START' => ' [ CALL START ] ',
    'LOG_END' => ' [ CALL END ] ',
    'LOG_ROLLBACK' => ' Rolling back all the Previous Transactions... ',
    'LOG_GAP' => '##################################################################################',
];
