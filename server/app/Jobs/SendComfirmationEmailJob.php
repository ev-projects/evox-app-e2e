<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Mail;
use Exception;
class SendComfirmationEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    protected $array2;
    protected $requirementlist;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($array2, $requirementlist)
    {
        $this->array2 = $array2;
        $this->requirementlist = $requirementlist;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
     
        try{
            $data =  $this->requirementlist;
            $data1 =  $this->array2;
           if($data1["user_type"] == "User"){
            Mail::send('mail', $this->array2  , function ($message)use($data)
            {
                $message->to($data[0]->email, $data[0]->user_name)
                    ->subject('Confirmation of Meeting Room Booking');
                $message->from('evox@eastvantage.com', 'Evox');
            });
           }else{
            Mail::send('mail', $this->array2  , function ($message)use($data)
            {
                $message->to($data[0]->email, $data[0]->user_name)
                    ->subject('Meeting Room Booking Declined');
                $message->from('evox@eastvantage.com', 'Evox');
            });
           }
            
        }catch (Exception $e) {

            log_error($e, 'emails');
            throw $e;
        }
    }
}
