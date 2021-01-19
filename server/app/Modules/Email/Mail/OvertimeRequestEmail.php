<?php

namespace App\Modules\Email\Mail;

use App\Modules\Request\Models\Overtime;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\App;
use App\Modules\User\Models\User;

class OvertimeRequestEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $overtime;
    public $recepient;
    public $user;
    public $department;
    public $approval_link;
    
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct( User $recepient, Overtime $overtime )
    {   
        # Declare the variables to be used for this Email
        $this->recepient     = $recepient;
        $this->overtime      = $overtime;
        $this->user          = $overtime->user()->first();
        $this->department    = $this->user->department()->first();
        $this->approval_link = env('FRONT_END_URL') . 'request/approval/'.parse_request_to_hash_code( $this->overtime, $this->recepient );

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
        
        $this->subject( "Request for " . slug_to_text( $this->overtime->type ) )
             ->markdown('emails.overtime-request');

        return $this;
    }
}
