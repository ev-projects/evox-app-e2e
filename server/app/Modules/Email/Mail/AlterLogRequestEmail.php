<?php

namespace App\Modules\Email\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\App;
use Illuminate\Queue\SerializesModels;
use App\Modules\Request\Models\AlterLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Modules\Department\Models\EvoxDepartment;

class AlterLogRequestEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $alter_log;
    public $recepient;
    public $user;
    public $department;
    public $approval_link;
    
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct( User $recepient, AlterLog $alter_log )
    {   
        # Declare the variables to be used for this Email
        $this->recepient     = $recepient;
        $this->alter_log     = $alter_log;
        $this->user          = $alter_log->user()->first();
        $this->department    = EvoxDepartment::where("Id", $this->user->department_id)->first();
        $this->approval_link = env('FRONT_END_URL') . 'request/approval/'.parse_request_to_hash_code( $this->alter_log, $this->recepient );

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
            $this->bcc( get_constant('BCC_EMAIL_ADDRESS') );
        } else {
            $this->bcc( get_constant('BCC_EMAIL_ADDRESS_FOR_NON_PROD') );
        }
        
        $this->subject( "Request for " . slug_to_text( get_constant('REQUEST_TYPES.alter_log') ) )
             ->markdown('emails.alter-log-request');

        return $this;
    }
}
