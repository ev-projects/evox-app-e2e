<?php

namespace App\Modules\Email\Jobs;

use App\Modules\Email\Mail\ForgotPasswordRequestEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use Exception;

class SendForgotPasswordRequestEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $user;
    protected $temporary_password;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(User $user, $temporary_password)
    {
        $this->user = $user;
        $this->temporary_password = $temporary_password;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            Mail::send( new ForgotPasswordRequestEmail( $this->user, $this->temporary_password ) );
            
            log_to_file( 'info', get_constant('LOG_SENT_SUCCESS').$this->user->email, ['forgot_password_request'], "emails");
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            throw $e;
        }
    }
}
