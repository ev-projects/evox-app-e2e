<?php

namespace App\Modules\Email\Mail;

use App\Modules\Request\Models\AlterLog;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\App;
use App\Modules\User\Models\User;

class ForgotPasswordRequestEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $temporary_password;
    public $site_link;
    
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct( User $user, $temporary_password )
    {   
        # Declare the variables to be used for this Email
        $this->user                 = $user;
        $this->temporary_password   = $temporary_password;
        $this->site_link            = env('FRONT_END_URL');

        # If the App is on Production, send on the actual recepient email
        if( App::environment('production') ) {
            $this->to( $user->email );
            
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
        $this->subject( "Forgot Password" )
             ->markdown('emails.forgot-password-request');

        return $this;
    }
}
