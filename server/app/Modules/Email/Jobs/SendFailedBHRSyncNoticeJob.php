<?php

namespace App\Modules\Email\Jobs;

use App\Modules\Email\Mail\FailedBHRSyncNoticeEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use Exception;

class SendFailedBHRSyncNoticeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $user;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($user)
    {
        $this->user = $user;
        //log_to_file('info', "New SendFailedBHRSyncNoticeJob", [$user,  __FUNCTION__], "emails");
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            Mail::send( new FailedBHRSyncNoticeEmail( $this->user ) );
        } catch (Exception $e) {
            error_log($e->getMessage());
            log_error($e, 'emails');
            throw $e;
        }
    }
}
