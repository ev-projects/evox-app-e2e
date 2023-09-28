<?php

use Monolog\Handler\StreamHandler;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Log Channel
    |--------------------------------------------------------------------------
    |
    | This option defines the default log channel that gets used when writing
    | messages to the logs. The name specified in this option should match
    | one of the channels defined in the "channels" configuration array.
    |
    */

    'default' => env('LOG_CHANNEL', 'stack'),

    /*
    |--------------------------------------------------------------------------
    | Log Channels
    |--------------------------------------------------------------------------
    |
    | Here you may configure the log channels for your application. Out of
    | the box, Laravel uses the Monolog PHP logging library. This gives
    | you a variety of powerful log handlers / formatters to utilize.
    |
    | Available Drivers: "single", "daily", "slack", "syslog",
    |                    "errorlog", "monolog",
    |                    "custom", "stack"
    |
    */

    'channels' => [
        'stack' => [
            'driver' => 'stack',
            'channels' => ['single'],
        ],

        'single' => [
            'driver' => 'single',
            'path' => storage_path('logs/laravel.log'),
            'level' => 'debug',
            'days' => 10,
            'permission' => 0666,
        ],

        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => 'debug',
            'days' => 7,
            'permission' => 0666,
        ],

        'slack' => [
            'driver' => 'slack',
            'url' => env('LOG_SLACK_WEBHOOK_URL'),
            'username' => 'Laravel Log',
            'emoji' => ':boom:',
            'level' => 'critical',
        ],

        'stderr' => [
            'driver' => 'monolog',
            'handler' => StreamHandler::class,
            'with' => [
                'stream' => 'php://stderr',
            ],
        ],

        'syslog' => [
            'driver' => 'syslog',
            'level' => 'debug',
        ],

        'errorlog' => [
            'driver' => 'errorlog',
            'level' => 'debug',
        ],

        // Custom Logging Channels

        'user_sync' => [
            'driver' => 'daily',
            'path' => storage_path('logs/user_sync.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'bhr_leaves' => [
            'driver' => 'daily',
            'path' => storage_path('logs/bhr_leaves.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'dtr_leaves' => [
            'driver' => 'daily',
            'path' => storage_path('logs/dtr_leaves.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'user_profile' => [
            'driver' => 'daily',
            'path' => storage_path('logs/user_profile.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'bhrlog' => [
            'driver' => 'daily',
            'path' => storage_path('logs/bhr.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'coelog' => [
            'driver' => 'daily',
            'path' => storage_path('logs/coe.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'biometrics' => [
            'driver' => 'daily',
            'path' => storage_path('logs/biometrics.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'dtr' => [
            'driver' => 'daily',
            'path' => storage_path('logs/dtr.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'punch' => [
            'driver' => 'daily',
            'path' => storage_path('logs/punch.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'dtr_computation' => [
            'driver' => 'daily',
            'path' => storage_path('logs/dtr_computation.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'dtr_summary' => [
            'driver' => 'daily',
            'path' => storage_path('logs/dtr_summary.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'request' => [
            'driver' => 'daily',
            'path' => storage_path('logs/request.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'assign' => [
            'driver' => 'daily',
            'path' => storage_path('logs/assign.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'user' => [
            'driver' => 'daily',
            'path' => storage_path('logs/user.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],
        
        'sync_bhr_user' => [
            'driver' => 'daily',
            'path' => storage_path('logs/sync_bhr_user.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'emails' => [
            'driver' => 'daily',
            'path' => storage_path('logs/emails.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'team' => [
            'driver' => 'daily',
            'path' => storage_path('logs/team.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'drupal_migration' => [
            'driver' => 'daily',
            'path' => storage_path('logs/drupal_migration.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'cron_errors' => [
            'driver' => 'daily',
            'path' => storage_path('logs/cron_errors.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],

        'summary_errors' => [
            'driver' => 'daily',
            'path' => storage_path('logs/summary_errors.log'),
            'level' => 'debug',
            'days' => 90,
            'permission' => 0666,
        ],


    ],

];
