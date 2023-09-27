<?php

namespace App\Modules\Email\Jobs;

use App\Modules\Email\Mail\RestDayWorkRequestEmail;
use App\Modules\Request\Models\RestDayWork;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use Exception;

class SendRestDayWorkRequestEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $rest_day_work;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(RestDayWork $rest_day_work)
    {
        $this->rest_day_work = $rest_day_work;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            foreach( $this->rest_day_work->user()->first()->user_handlers()->get() as $recepient ){
                if(!$recepient->hasRole( get_constant('USER_ROLES.admin'))
                ||
                !$recepient->hasRole( get_constant('USER_ROLES.hr'))
                ||
                !$recepient->hasRole( get_constant('USER_ROLES.payroll'))
            ){
                    Mail::send( new RestDayWorkRequestEmail( $recepient, $this->rest_day_work ) );

                    log_to_file( 'info', get_constant('LOG_SENT_SUCCESS').$recepient->email, [$this->rest_day_work], "emails");
                }
               
            }
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            throw $e;
        }
    }
}
