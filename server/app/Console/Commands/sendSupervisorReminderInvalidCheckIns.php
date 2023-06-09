<?php

namespace App\Console\Commands;

use Exception;

use Carbon\Carbon;

use Illuminate\Console\Command;
use Illuminate\Http\JsonResponse;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class sendSupervisorReminderInvalidCheckIns extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'send_supervisor_reminder_invalid_check_ins';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send Supervisor Reminder of their employee invalid check ins';

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
            #print_r($supervisor_collection);
            foreach ($supervisor_collection as $u) {
                $check_ins_collection = $this->user->get_users_under_supervisee_active_with_invalid_check_ins($u->id);
                #print_r(count($check_ins_collection)."\n");
                if (count($check_ins_collection) > 0) {
                    $list_of_check_in_reminders = [$u, $check_ins_collection];
                    $this->email->sendSupervisorReminderInvalidCheckInsEmail($list_of_check_in_reminders);
                }
            }
       
        } catch(Exception $e){
            error_log($e->getMessage());
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
