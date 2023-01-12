<?php

namespace App\Jobs;

// use App\Modules\Email\Mail\RestDayWorkRequestEmail;

use Exception;
use Illuminate\Bus\Queueable;

use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use App\Modules\User\Repositories\UserRepository;

class AssignAllUserToAdminJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;


    protected $id;
    protected $request;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($id ,$request)
    { 
        $this->id =$id ;
        $this->request= $request;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle( UserRepository $user)
    {
        try {
            
            $user->adminRoleConditions( $this->id ,$this->request);


        } catch (Exception $e) {

            log_error($e, 'emails');
            throw $e;
        }
    }
}
