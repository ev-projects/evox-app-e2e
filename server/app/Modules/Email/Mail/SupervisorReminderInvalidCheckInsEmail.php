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

class SupervisorReminderInvalidCheckInsEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;


    public $supervisor_id;
    public $invalid_check_ins;
    
    
    /**
     * Create a new message instance.
     *
     * @return void
     */
    // public function __construct( User $recepient, RestDayWork $rest_day_work )
    public function __construct( $supervisor_id, $invalid_check_ins )
    {   
        # Declare the variables to be used for this Email
        $this->supervisor_id     = $supervisor_id; // the supervisor
        $this->invalid_check_ins = $invalid_check_ins;
        #print_r(($this->department_requests));

        // # If the App is on Production, send on the actual recepient email
        // if( App::environment('production') ) {
        //     $this->to($supervisor->email );
            
        // # If the App is NOT in Production, send on the email on Eastvantage Dev Eamil
        // } else {
        //     $this->to( get_constant('EASTVANTAGE_DEV_EMAIL') );
        // }
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $supervisor = User::find($this->supervisor_id);

        if (App::environment('production')) {
            $this->to($supervisor->email);
            $this->bcc(get_constant('BCC_EMAIL_ADDRESS'));
        } else {
            $this->to(get_constant('EASTVANTAGE_DEV_EMAIL'));
            $this->bcc(get_constant('BCC_EMAIL_ADDRESS_FOR_NON_PROD'));
        }

        return $this->subject("Reminder for Employees with Invalid Check-ins")
                    ->markdown('emails.reminders.invalid-check-ins-reminder', [
                        'supervisor' => $supervisor,
                        'invalid_check_ins' => $this->invalid_check_ins
                    ]);
        // try {
        // # Send on BCC Email Address depending on the App environment
        // if( App::environment('production') ) {
        //     $this->bcc( get_constant('BCC_EMAIL_ADDRESS') );
        // } else {
        //     $this->bcc( get_constant('BCC_EMAIL_ADDRESS_FOR_NON_PROD') );
        // }
        
        // $this->subject( "Reminder for Employees with Invalid Check-ins" )
        //      ->markdown('emails.reminders.invalid-check-ins-reminder');
             
        // } catch (Exception $e) {
        //     error_log($e->getMessage());
        // }

        // return $this;
    }
}
