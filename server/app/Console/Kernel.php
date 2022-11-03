<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     *
     * @var array
     */
    protected $commands = [
       //..
    ];

    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {   
        # Run Generate Weekly DTR every Saturday @ 5PM.
        // $schedule->call('App\Modules\Cron\Http\Controllers\CronController@generate_weekly_dtr')->cron('0 19 * * SAT'); 

        # Run Sync Realtime Biometrics every 3 minutes.
        // $schedule->call('App\Modules\Cron\Http\Controllers\CronController@sync_realtime_biometrics')->cron('*/3 * * * *'); 

        # Run function to send supervisors about list of employees that have no schedule assigned to them.
        $schedule->call('App\Modules\Cron\Http\Controllers\CronController@weekly_email_supervisor_notification')->cron('30 7 * * 6'); 
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
