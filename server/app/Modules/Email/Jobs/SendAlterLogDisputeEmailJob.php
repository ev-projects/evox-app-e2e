<?php

namespace App\Modules\Email\Jobs;

use App\Modules\Email\Mail\AlterLogDisputeEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use Exception;

class SendAlterLogDisputeEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $request;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(array $request)
    {
        $this->request = $request;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            // foreach( $this->alter_log->user()->first()->user_handlers()->get() as $recepient ){
            //     if(
            //         !( $recepient->hasRole( get_constant('USER_ROLES.admin'))
            //         ||
            //         $recepient->hasRole( get_constant('USER_ROLES.hr'))
            //         ||
            //         $recepient->hasRole( get_constant('USER_ROLES.payroll')))
            //     ){
            //         Mail::send( new AlterLogRequestEmail( $recepient, $this->alter_log ) );

            //         log_to_file( 'info', get_constant('LOG_SENT_SUCCESS').$recepient->email, [$this->alter_log], "emails");
            //     }

            $user_sender = User::find($this->request['user_id']);
            $recepient  = $user_sender->direct_supervisor();

            if (is_valid($recepient)) {
                Mail::send(new AlterLogDisputeEmail($recepient, $this->request));

                log_to_file('info', get_constant('LOG_SENT_SUCCESS') . $recepient->email, [$this->request], "emails");
            }

            // }

        } catch (Exception $e) {

            log_error($e, 'emails');
            throw $e;
        }
    }
}