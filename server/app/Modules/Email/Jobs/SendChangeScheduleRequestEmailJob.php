<?php

namespace App\Modules\Email\Jobs;

use App\Modules\Email\Mail\ChangeScheduleRequestEmail;
use App\Modules\Request\Models\ChangeSchedule;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use Exception;

class SendChangeScheduleRequestEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $change_schedule;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(ChangeSchedule $change_schedule)
    {
        $this->change_schedule = $change_schedule;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            foreach( $this->change_schedule->user()->first()->user_handlers()->get() as $recepient ){
                if(
                    !( $recepient->hasRole( get_constant('USER_ROLES.admin'))
                    ||
                    $recepient->hasRole( get_constant('USER_ROLES.hr'))
                    ||
                    $recepient->hasRole( get_constant('USER_ROLES.payroll')))
                ){
                    Mail::send( new ChangeScheduleRequestEmail( $recepient, $this->change_schedule ) );
                
                    log_to_file( 'info', get_constant('LOG_SENT_SUCCESS').$recepient->email, [$this->change_schedule], "emails");
                }
               
            }
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            throw $e;
        }
    }
}
