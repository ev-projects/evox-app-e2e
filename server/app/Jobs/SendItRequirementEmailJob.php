<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use Exception;

class SendItRequirementEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    protected $array1;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($array1)
    {
        $this->array1 = $array1;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
        Mail::send('mail', $this->array1  , function ($message)
            {
                $message->to('helpdesk@eastvantage.com', 'HelpDesk')
                    ->subject('IT Requirement for Upcoming Meeting');
                $message->from('evox@eastvantage.com', 'Evox');
            });
        } catch (Exception $e) {

            log_error($e, 'emails');
            throw $e;
        }
    }
}
