<?php

namespace App\Modules\Email\Jobs;

// use App\Modules\Email\Mail\RestDayWorkRequestEmail;

use App\Modules\Email\Mail\SupervisorReminderInvalidCheckInsEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use Exception;

class SendSupervisorReminderInvalidCheckInsEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

  
    // protected $reminder;
    protected $supervisor_id;
    protected $invalid_checkin_ids;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($supervisor_id, $invalid_checkin_ids)
    { 
        // $this->reminder = $reminder;
        $this->supervisor_id = $supervisor_id;
        $this->invalid_checkin_ids = $invalid_checkin_ids;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            $supervisor = User::find($this->supervisor_id);
            $invalid_check_ins = User::whereIn('emp_num', $this->invalid_checkin_ids)->get()->toArray();
            // Mail::send( new SupervisorReminderInvalidCheckInsEmail( $supervisor, $invalid_check_ins ) );
            Mail::to($supervisor->email)
                ->queue(new SupervisorReminderInvalidCheckInsEmail(
                    $supervisor->id,   // only ID
                    $invalid_check_ins // safe array
                ));           
        } catch (Exception $e) {
            error_log($e->getMessage());
            log_error($e, 'emails');
            throw $e;
        }
    }
}
