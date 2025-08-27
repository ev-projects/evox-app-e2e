<?php

namespace App\Modules\Email\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\App;
use Illuminate\Queue\SerializesModels;
use App\Modules\Request\Models\RestDayWork;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Models\EvoxSubDepartment;

class RestDayWorkDisputeEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $request;
    public $recepient;
    public $user;
    public $department;
    public $approval_link;
    
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct( User $recepient, array $request )
    {   
        # Declare the variables to be used for this Email
        $this->recepient     = $recepient;
        $this->request       = $request;
        $this->user          = User::find($this->request['user_id']);
        $this->department    = EvoxSubDepartment::where("Id", $this->user->SubDepartmentID)->first();
        //$this->approval_link = env('FRONT_END_URL') . 'request/approval/'.parse_request_to_hash_code( $this->rest_day_work, $this->recepient );
        $this->approval_link = env('FRONT_END_URL') . 'app/payrolldisputeview/';

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
        
        $this->subject( "Payroll Dispute for " . slug_to_text( get_constant('REQUEST_TYPES.rest_day_work') ) )
             ->markdown('emails.rest-day-work-dispute');

        return $this;
    }
}