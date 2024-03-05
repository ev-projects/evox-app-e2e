<?php

namespace App\Console\Commands;

use Exception;
use Carbon\Carbon;
use Illuminate\Console\Command;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use App\Modules\User\Models\UtcTimelog;
use Illuminate\Database\Eloquent\Collection;
use SebastianBergmann\ResourceOperations\generate;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;

class syncBhrUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    // protected $signature = 'sync_bhr_users:send {all?}';
    protected $signature = 'sync_bhr_users:send {all?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync BHR Users. Updating existing users and inserting new users.';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(
        BhrRepositoryInterface $bhr,
        UserRepositoryInterface $user,
        ScheduleRepositoryInterface $schedule,
        DtrRepositoryInterface $dtr,
        EmailRepositoryInterface $email
    ) {
        $this->bhr = $bhr;
        $this->user = $user;
        $this->schedule = $schedule;
        $this->dtr = $dtr;
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
        try {
            
            $dt_since = Carbon::today()->subDays(1);
            if (Cache::has('user_since_date_sync_ts')) {
                $user_since_date_sync_ts = Cache::get('user_since_date_sync_ts');
                $dt_since = Carbon::createFromTimestamp($user_since_date_sync_ts)->subMinute(1);
            } else {
                $user_since_date_sync_ts = $dt_since->getTimestamp();
            }

            $since_date_to_sync = $dt_since->toAtomString();

            log_to_file('info', '[SINCE DATE DEFAULT ' . $since_date_to_sync . ']' . __FUNCTION__, [], "sync_bhr_user");

            # 1.
            # Fetches all the recently changed BHr Users ( grouped by Inserted and Updated )
            if ($this->argument('all') == 'all') {
                // Get all active users from BHR
                $bhr_user_number_array = collect($this->bhr->get_all_bhr_user_numbers());

                // Get all Users from EVOX which is originally synced from BHr (including inactive users)
                $user_number_array = User::whereNotNull('bhr_num')->pluck('bhr_num');

                // Merge both of the list to get the final list of users to merge.
                $bhr_user_number_array = $bhr_user_number_array->merge($user_number_array);
            } else {
                $bhr_user_number_array = $this->bhr->get_changed_users($since_date_to_sync);
            }

            # 2.
            # Iterate the actual BHR User Numbers array
            foreach ($bhr_user_number_array as $bhr_user_number) {

                try {

                    // Fetch the User if it's already existing in the System
                    // $user = $this->user->show_via_bhr_number($bhr_user_number);

                    # Fetch the BHr User Details
                    $bhr_user = $this->bhr->get_user($bhr_user_number, true);
                    if(is_valid($bhr_user)){

                    $bhr_status = $bhr_user->status == "Active"? 1: 0;
                    $termination_date = $bhr_user->terminationDate == "0000-00-00"? null: $bhr_user->terminationDate ;
                    $SUP_id = $bhr_user->supervisorEId == null? null: $bhr_user->supervisorEId ;

                    // error_log($bhr_user);
                    // dd($bhr_user);

                    $result =  call_sp("EH_SP_User_sync", 
                        [
                            $bhr_user->bestEmail, 
                            $bhr_user->employeeNumber,
                            $bhr_user->id,
                            generate_username( $bhr_user ),
                            Hash::make( get_constant('DEFAULT_PASSWORD') ),
                            $bhr_user->firstName,
                            $bhr_user->middleName,
                            $bhr_user->lastName,
                            $bhr_user->nickname,
                            $bhr_user->employmentHistoryStatus,
                            $bhr_user->hireDate,
                            $bhr_status,
                            $bhr_user->jobTitle,
                            $bhr_user->country,
                            $bhr_user->dateOfBirth,
                            $termination_date,
                            $bhr_user->department,
                            $bhr_user->mobilePhone,
                            $SUP_id,
                            $bhr_user->division,
                    
                
                ]);
                
                    // $result = DB::select('call EH_SP_User_sync("'.$bhr_user->bestEmail.'", '.$bhr_user->employeeNumber.'
                    //     ,'.$bhr_user->id.', "'.generate_username( $bhr_user ).'","'.Hash::make( get_constant('DEFAULT_PASSWORD') ).'"
                    //     ,"'.$bhr_user->firstName.'", "'.$bhr_user->middleName.'"
                    //     ,"'.$bhr_user->lastName.'", "'.$bhr_user->nickname.'","'.$bhr_user->employmentHistoryStatus.'", "'.$bhr_user->hireDate.'"
                    //     ,'.$bhr_status.', "'.$bhr_user->jobTitle.'","'.$bhr_user->country.'", "'.$bhr_user->dateOfBirth.'"
                    //     ,"'. $termination_date.'", "'.$bhr_user->department.'","'.$bhr_user->mobilePhone.'", '.$SUP_id.',"'.$bhr_user->division.'")');    

                        if(!isset($result)){
                            break;
                        }

                            $new_timestamp = (new Carbon($bhr_user->lastChanged))->getTimestamp();
                            if ($new_timestamp > $user_since_date_sync_ts) {
                                $user_since_date_sync_ts = $new_timestamp;
                                Cache::put('user_since_date_sync_ts', $user_since_date_sync_ts, 80);
                                log_to_file('info', '[NEW START DATE ' . $bhr_user->lastChanged. ']' . __FUNCTION__, [], "sync_bhr_user");
                            }
                        }
                } catch (Exception $e) {
                    log_to_file('info', '[RECORD ERROR: BHRID - ' . $bhr_user_number . ' ' . __FUNCTION__, [$e], "sync_bhr_user");

                    break;
                    // continue; // break if SP ERROR
                }
            }
            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                [],
                JsonResponse::HTTP_CREATED
            );
        } catch (Exception $e) {
            log_to_file('info', $e->getMessage(), [], "cron_errors");
            return error_response(trans('messages.error_default'), $e);
        }
    }
}
