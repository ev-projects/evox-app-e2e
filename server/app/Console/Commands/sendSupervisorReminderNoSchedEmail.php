<?php

namespace App\Console\Commands;

use Exception;

use Carbon\Carbon;

use Illuminate\Console\Command;
use Illuminate\Http\JsonResponse;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class sendSupervisorReminderNoSchedEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'send_supervisor_reminder_no_sched';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'send Supervisor Reminder of their employees(list) with no shcedule Email';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(EmailRepositoryInterface $email, 
                                UserRepositoryInterface $user)
    {
        $this->email = $email; 
        $this->user = $user;

        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        try {
            
            $supervisor_collection = $this->user->get_all_supervisors();

            $list_of_reminders = [];
            $i = 0;
            foreach ($supervisor_collection as $supervisor){
                
                $employee_list = $this->user->get_users_under_supervisee_active_with_no_schedule( $supervisor);

                $list_of_reminders[$i] = [  $supervisor,
                                            $employee_list ];

                if($employee_list->isNotEmpty() && is_valid($employee_list)){
                    //note: keep the invoking of sendSupervisorReminderNoSchedEmail() per array to in which having the 
                    // payload not go above the allowed max packets in mySql
                    $this->email->sendSupervisorReminderNoSchedEmail($list_of_reminders[$i]);
                }
                
                $i = $i +1 ;
                
            }

       
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
