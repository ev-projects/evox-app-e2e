<?php

namespace App\Modules\Email\Jobs;

use App\Modules\Email\Mail\OvertimeRequestEmail;
use App\Modules\Request\Models\Overtime;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use Exception;

class SendOvertimeRequestEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $overtime;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(Overtime $overtime)
    {
        $this->overtime = $overtime;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            foreach( $this->overtime->user()->first()->user_handlers()->get() as $recepient ){
                if(
                    !( $recepient->hasRole( get_constant('USER_ROLES.admin'))
                    ||
                    $recepient->hasRole( get_constant('USER_ROLES.hr'))
                    ||
                    $recepient->hasRole( get_constant('USER_ROLES.payroll')))
                ){
                    Mail::send( new OvertimeRequestEmail( $recepient, $this->overtime ) );
                
                    log_to_file( 'info', get_constant('LOG_SENT_SUCCESS').$recepient->email, [$this->overtime], "emails");
                }
            
            }
            // $recepient  = $this->overtime->user()->first()->direct_supervisor();
            // error_log( $recepient->id);
            // if(is_valid($recepient)){
            //     Mail::send( new OvertimeRequestEmail( $recepient, $this->overtime ) );
                
            //     log_to_file( 'info', get_constant('LOG_SENT_SUCCESS').$recepient->email, [$this->overtime], "emails");
            // }

            
        } catch (Exception $e) {
            error_log($e->getMessage());
            log_error($e, 'emails');
            throw $e;
        }
    }
}
