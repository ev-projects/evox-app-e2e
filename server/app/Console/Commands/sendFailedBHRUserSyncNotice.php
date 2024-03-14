<?php

namespace App\Console\Commands;

use App\Modules\Email\Repositories\EmailRepositoryInterface;
use Exception;
use Illuminate\Console\Command;

class sendFailedBHRUserSyncNotice extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'send_failed_bhr_sync_notice';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send email notice to HR team for users that failed to sync to EVOX.';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(EmailRepositoryInterface $email)
    {
        $this->email = $email;
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        $failed_bhr_users =  call_sp("EH_SP_User_Logs", [1, null])[0];
        foreach($failed_bhr_users as $user) {
            try {
                $this->email->sendFailedBHRUserSyncNotice($user);
                //least priority
                $failed_bhr_users =  call_sp("EH_SP_User_Logs", [1, $user->id])[0];
            } catch (Exception $e) { }
        }
    }
}
