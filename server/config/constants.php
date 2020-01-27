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

    'HTTP_STATUS_CODE' => [
        // 200s
        'SUCCESS' => 200,

        // 400s
        'BAD_REQUEST' => 400,
        'UNAUTHORIZED' => 401,
        'FORBIDDEN' => 403,
        'NOT_FOUND' => 404,

        // 500s
        'INTERNAL_ERROR' => 500,
        'BAD_GATEWAY' => 502,
        'SERVICE_UNAVAILABLE' => 503,
    ],


];
