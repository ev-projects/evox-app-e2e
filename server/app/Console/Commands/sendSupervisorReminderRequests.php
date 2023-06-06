<?php

namespace App\Console\Commands;

use Exception;

use Carbon\Carbon;

use Illuminate\Console\Command;
use Illuminate\Http\JsonResponse;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class sendSupervisorReminderRequests extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'send_supervisor_reminder_requests';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send Supervisor Reminder of their employees requests';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(EmailRepositoryInterface $email, 
                                PayrollCutoffRepositoryInterface $payroll_cutoff,
                                UserRepositoryInterface $user)
    {
        $this->email = $email; 
        $this->payroll_cutoff = $payroll_cutoff;
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
            $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();
            #print_r($payroll_cutoff);
            $start_date = $payroll_cutoff->start_date;
            $end_date = $payroll_cutoff->end_date;

            $supervisor_collection = $this->user->get_all_supervisors();
            #print_r($supervisor_collection);
            foreach ($supervisor_collection as $u) {
                $requests_collection = $this->user->get_users_under_supervisee_active_with_requests($start_date, $end_date, $u->id);
                if (count($requests_collection) > 0) {
                    $list_of_request_reminders = [$u, $requests_collection];
                    $this->email->sendSupervisorReminderRequestsEmail($list_of_request_reminders);
                }
                /*#print_r($u->getFullName()."\n");
                $departments_supervised = $u->departments_supervised()->get();
                #print_r(($departments_supervised));
                $department_requests = [];
                $i = 0;
                foreach($departments_supervised as $d) {
                    #print_r($d->getCompleteName()."\n");
                    $requests_collection = $this->user->get_users_under_supervisee_active_with_requests($start_date, $end_date, $u->id, $d->id);
                    if (count($requests_collection) > 0) {
                        #print_r($u->id.":".$d->id.":");
                        #print_r(count($requests_collection)."\n");
                        $department_requests[$i] = [$d, $requests_collection];
                        $i++;
                    }
                }
                if (count($department_requests) > 0) {
                    $list_of_request_reminders = [$u, $department_requests];
                    #print_r(($list_of_request_reminders));
                    $this->email->sendSupervisorReminderRequestsEmail($list_of_request_reminders);
                }*/
            }

       
        } catch(Exception $e){
            error_log($e->getMessage());
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
