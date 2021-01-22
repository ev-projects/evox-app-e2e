<?php

namespace App\Modules\Email\Mail;

use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Resources\ChangeScheduleResource;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\App;
use App\Modules\User\Models\User;

class ChangeScheduleRequestEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $change_schedule;
    public $schedule;
    public $schedule_details;
    public $recepient;
    public $user;
    public $department;
    public $approval_link;
    
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct( User $recepient, ChangeSchedule $change_schedule )
    {   
        # Declare the variables to be used for this Email
        $this->recepient        = $recepient;
        $this->change_schedule  = new ChangeScheduleResource($change_schedule);
        $this->user             = $this->change_schedule->user()->first();
        $this->schedule         = $this->change_schedule->schedule()->first();

        foreach( $this->schedule->schedule_details()->get() as $schedule_detail){
            $this->schedule_details[ $schedule_detail->day ] = $schedule_detail->getFormattedDetail();
        }
        
        $this->department       = $this->user->department()->first();
        $this->approval_link    = env('FRONT_END_URL') . 'request/approval/'.parse_request_to_hash_code( $this->change_schedule, $this->recepient );

        # If the App is on Production, send on the actual recepient email
        if( App::environment('production') ) {
            $this->to( $recepient->email );
            
        # If the App is NOT in Production, send on the email on Eastvantage Dev Eamil
        } else {
            $this->to( get_constant('EASTVANTAGE_DEV_EMAIL') );
        }
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {

        # Send on BCC Email Address depending on the App environment
        if( App::environment('production') ) {
            $this->cc( get_constant('BCC_EMAIL_ADDRESS') );
        } else {
            $this->cc( get_constant('BCC_EMAIL_ADDRESS_FOR_NON_PROD') );
        }
        
        $this->subject( "Request for " . slug_to_text( get_constant('REQUEST_TYPES.change_schedule') ) )
             ->markdown('emails.change-schedule-request');

        return $this;
    }
}
