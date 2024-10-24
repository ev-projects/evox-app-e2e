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
            print_r(["Yesterday", $dt_since->toDateTimeString()]);
            $dt_res = call_sp("EH_SP_Bhr_To_Evox_Sync_Logs", [null, null, null, 2]);
            if ((count($dt_res) > 0) and (count($dt_res[0]) > 0)) {
                #print_r(["Last Date Res", $dt_res[0][0]]);
                if (!empty($dt_res[0][0]->UDV_Sync_Date)) {
                    $dt_since = Carbon::createFromFormat("Y-m-d H:i:s", $dt_res[0][0]->UDV_Sync_Date);
                    print_r(["Last Date Synced", $dt_since->toDateTimeString()]);
                }
            }
            $since_date_to_sync = $dt_since->toAtomString();
            #print_r(["Last Timestamp Synced", $since_date_to_sync]);
            /*if (Cache::has('user_since_date_sync_ts')) {
                $user_since_date_sync_ts = Cache::get('user_since_date_sync_ts');
                $dt_since = Carbon::createFromTimestamp($user_since_date_sync_ts);
            } else {
                $user_since_date_sync_ts = $dt_since->getTimestamp();
            }*/

            log_to_file('info', 'SINCE DATE DEFAULT', [$since_date_to_sync, __FUNCTION__], "sync_bhr_user");

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
            #print_r(["BHR NUMBERS", $bhr_user_number_array]);
            #Fetched last updated BHR Numbers
            #log_to_file('info', "BHR NUM", $bhr_user_number_array, "sync_bhr_user");

            $failed_bhr_num =  call_sp("EH_SP_User_Logs", [0, null])[0];
            #print_r(["FAILED BHR NUMBERS", $failed_bhr_num]);
            foreach ($failed_bhr_num as $fbhr_num) {
                $bhr_user_number_array["$fbhr_num->bhr_num"] = "$fbhr_num->bhr_num";
            }
            #print_r(["MERGED BHR NUMBERS", $bhr_user_number_array]);
            #Merged with failed BHR Number
            #log_to_file('info', "Merged BHR NUM", $bhr_user_number_array, "sync_bhr_user");

            # 2.
            # Iterate the actual BHR User Numbers array
            foreach ($bhr_user_number_array as $bhr_user_number) {
                print_r(["To Be Synced", $bhr_user_number]);
                try {

                    // Fetch the User if it's already existing in the System
                    // $user = $this->user->show_via_bhr_number($bhr_user_number);

                    # Fetch the BHr User Details
                    $bhr_user = $this->bhr->get_user($bhr_user_number, true);
                    if (is_valid($bhr_user)) {
                        #print_r(["Fetched User", $bhr_user]);
                        $bhr_status = $bhr_user->status == "Active" ? 1 : 0;
			$hire_date = $bhr_user->hireDate == "0000-00-00" ? null : $bhr_user->hireDate;
			$termination_date = $bhr_user->terminationDate == "0000-00-00" ? null : $bhr_user->terminationDate;
                        $SUP_id = $bhr_user->supervisorEId == null ? null : $bhr_user->supervisorEId;
                        // error_log($bhr_user);
                        // dd($bhr_user);
                        /*print_r(["Call Param", [
                            $bhr_user->bestEmail,
                            $bhr_user->employeeNumber,
                            $bhr_user->id,
                            generate_username($bhr_user),
                            Hash::make(get_constant('DEFAULT_PASSWORD')),
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
                            (new Carbon($bhr_user->lastChanged))->toDateTimeString()
                        ]]);*/
                        $result =  call_sp(
                            "EH_SP_User_sync",
                            [
                                $bhr_user->bestEmail,
                                $bhr_user->employeeNumber,
                                $bhr_user->id,
                                generate_username($bhr_user),
                                Hash::make(get_constant('DEFAULT_PASSWORD')),
                                $bhr_user->firstName,
                                $bhr_user->middleName,
                                $bhr_user->lastName,
                                $bhr_user->nickname,
                                $bhr_user->employmentHistoryStatus,
                                $hire_date,
                                $bhr_status,
                                $bhr_user->jobTitle,
                                $bhr_user->country,
                                $bhr_user->dateOfBirth == "0000-00-00" ? null : $bhr_user->dateOfBirth,
                                $termination_date,
                                $bhr_user->department,
                                $bhr_user->mobilePhone,
                                $SUP_id,
                                $bhr_user->division,
                                (new Carbon($bhr_user->lastChanged))->toDateTimeString()
                            ]
                        );
                        #print_r(["User Res", $result]);
                        print_r(["User Synced", $bhr_user_number]);

                        // $result = DB::select('call EH_SP_User_sync("'.$bhr_user->bestEmail.'", '.$bhr_user->employeeNumber.'
                        //     ,'.$bhr_user->id.', "'.generate_username( $bhr_user ).'","'.Hash::make( get_constant('DEFAULT_PASSWORD') ).'"
                        //     ,"'.$bhr_user->firstName.'", "'.$bhr_user->middleName.'"
                        //     ,"'.$bhr_user->lastName.'", "'.$bhr_user->nickname.'","'.$bhr_user->employmentHistoryStatus.'", "'.$bhr_user->hireDate.'"
                        //     ,'.$bhr_status.', "'.$bhr_user->jobTitle.'","'.$bhr_user->country.'", "'.$bhr_user->dateOfBirth.'"
                        //     ,"'. $termination_date.'", "'.$bhr_user->department.'","'.$bhr_user->mobilePhone.'", '.$SUP_id.',"'.$bhr_user->division.'")');    

                        $dt_current = (new Carbon($bhr_user->lastChanged));
                        $res_current = call_sp("EH_SP_Bhr_To_Evox_Sync_Logs", [$bhr_user_number, $dt_current->toDateTimeString(), 1, 1]);
                        #print_r(["Current Synced", $res_current]);
                        print_r(["Current Date Synced", $dt_current->toDateTimeString()]);
                        print_r(["Current Timestamp Synced", $dt_current->getTimestamp()]);
                        /*$new_timestamp = (new Carbon($bhr_user->lastChanged))->getTimestamp();
                        if ($new_timestamp > $user_since_date_sync_ts) {
                            $user_since_date_sync_ts = $new_timestamp;
                            Cache::put('user_since_date_sync_ts', $user_since_date_sync_ts, 80);
                            log_to_file('info', "NEW START TIME", [$user_since_date_sync_ts,  __FUNCTION__], "sync_bhr_user");
                        }*/
                        log_to_file('info', "SYNC SUCCESS", [$bhr_user_number, $bhr_user->lastChanged,  __FUNCTION__], "sync_bhr_user");

                        print_r("\n");
                        print_r("\n");
                        print_r("END OF ITEM");
                        print_r("\n");
                        print_r("\n");
                    }
                } catch (Exception $e) {
print_r($e->getMessage());
                    log_to_file('info', 'SYNC ERROR' . [$bhr_user_number, $e, __FUNCTION__], "sync_bhr_user");

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
