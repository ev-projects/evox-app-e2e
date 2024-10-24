<?php

namespace  App\Modules\Email\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Exception;
use Illuminate\Support\Facades\App;

class FailedBHRSyncNoticeEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $recepient;
    public $user;
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct($user)
    {
        $this->user = $user;
        //log_to_file('info', "New FailedBHRSyncNoticeEmail", [$user,  __FUNCTION__], "emails");
        # If the App is on Production, send on the actual recepient email
        if( App::environment('production') ) {
            #$this->to($this->recepient->email );
            $this->to( get_constant('EASTVANTAGE_DEV_EMAIL') );
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
        try {
            # Send on BCC Email Address depending on the App environment
            if( App::environment('production') ) {
                $this->bcc( get_constant('BCC_EMAIL_ADDRESS') );
            } else {
                $this->bcc( get_constant('BCC_EMAIL_ADDRESS_FOR_NON_PROD') );
            }
            
            $this->subject( "BHR: Incomplete user data" )
                 ->markdown('emails.reminders.failed-bhr-user-sync');
                 
            } catch (Exception $e) {
                error_log($e->getMessage());
            }
    
            return $this;
    }
}
