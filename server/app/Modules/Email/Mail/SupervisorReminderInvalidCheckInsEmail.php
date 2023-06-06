<?php

namespace App\Modules\Email\Mail;

use App\Modules\Request\Models\RestDayWork;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\App;
use App\Modules\User\Models\User;
use Exception;

class SupervisorReminderInvalidCheckInsEmail extends Mailable
{
    use Queueable, SerializesModels;


    public $recepient;
    public $invalid_check_ins;
    
    
    /**
     * Create a new message instance.
     *
     * @return void
     */
    // public function __construct( User $recepient, RestDayWork $rest_day_work )
    public function __construct( $reminder )
    {   
        # Declare the variables to be used for this Email
        $this->recepient     = $reminder[0]; // the supervisor
        $this->invalid_check_ins = $reminder[1];
        #print_r(($this->department_requests));

        # If the App is on Production, send on the actual recepient email
        if( App::environment('production') ) {
            $this->to($this->recepient->email );
            
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
        
        $this->subject( "Reminder for Employees with Invalid Check-ins" )
             ->markdown('emails.reminders.invalid-check-ins-reminder');
             
        } catch (Exception $e) {
            error_log($e->getMessage());
        }

        return $this;
    }
}
