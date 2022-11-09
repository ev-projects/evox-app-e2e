<?php

namespace App\Modules\Email\Jobs;

// use App\Modules\Email\Mail\RestDayWorkRequestEmail;

use App\Modules\Email\Mail\SupervisorReminderOfNewUserEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use Exception;

class SendSupervisorReminderOfNewUserEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

  
    protected $reminder;
    
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(Array $reminder)
    { 
        $this->reminder = $reminder;
       
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
           
                Mail::send( new SupervisorReminderOfNewUserEmail( $this->reminder ) );
 
            
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            throw $e;
        }
    }
}
