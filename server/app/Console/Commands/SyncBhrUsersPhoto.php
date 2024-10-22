<?php

namespace App\Console\Commands;

use Exception;
use Carbon\Carbon;
use Illuminate\Console\Command;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class SyncBhrUsersPhoto extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:bhr_users_photo {all?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync BHR Users Photo. All existing users based on BHR ID.';
    protected $bhr;
    protected $user;
    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(BhrRepositoryInterface $bhr,
    UserRepositoryInterface $user)
    {
        $this->bhr = $bhr;
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
            if ($this->argument('all') == 'all') {
                $bhr_user_number_array = collect($this->bhr->get_all_bhr_user_numbers());
                foreach ($bhr_user_number_array as $bhr_user_number) {

                    print_r(["To Be Synced", $bhr_user_number]);
                    try {
                            
                    $profile_picture = $this->bhr->get_profile_picture($bhr_user_number);
                    $result =  call_sp(
                        "EV_Photo_Sync",
                        [
                            $bhr_user_number,
                            $profile_picture,
                            1
                        ]
                    );
                    log_to_file('info', "SYNC SUCCESS", [$bhr_user_number, $bhr_user_number,  __FUNCTION__], "sync_bhr_user_photo");

                    print_r("\n");
                    print_r("\n");
                    print_r("END OF ITEM");
                    print_r("\n");
                    print_r("\n");
                    } catch (Exception $e) {
                    log_to_file('info', 'SYNC ERROR' . [$bhr_user_number, $e, __FUNCTION__], "sync_bhr_user_photo");

                    break;
                    // continue; // break if SP ERROR
                    }
                };
            }else{
        
                    $result =  call_sp(
                        "EV_Photo_Sync",
                        [
                            null,
                            null,
                            2
                        ]
                    );
                    $bhr_user_number_array = $result[0];
                    foreach ($bhr_user_number_array as $bhr_user_number) {

                        print_r(["To Be Synced", $bhr_user_number->bhr_num]);
                        try {
                                
                        $profile_picture = $this->bhr->get_profile_picture($bhr_user_number->bhr_num) ;
                        $result =  call_sp(
                            "EV_Photo_Sync",
                            [
                                $bhr_user_number->bhr_num,
                                $profile_picture,
                                1
                            ]
                        );
                        log_to_file('info', "SYNC SUCCESS", [$bhr_user_number, $bhr_user_number,  __FUNCTION__], "sync_bhr_user_photo");
    
                        print_r("\n");
                        print_r("\n");
                        print_r("END OF ITEM");
                        print_r("\n");
                        print_r("\n");
                        } catch (Exception $e) {
                        log_to_file('info', 'SYNC ERROR' . [$bhr_user_number, $e, __FUNCTION__], "sync_bhr_user_photo");
    
                        break;
                        // continue; // break if SP ERROR
                        }
                    };
            }

        } catch (Exception $e) {
            log_to_file('info', $e->getMessage(), [], "cron_errors");
            return error_response(trans('messages.error_default'), $e);
        }
       
      
    }
}
