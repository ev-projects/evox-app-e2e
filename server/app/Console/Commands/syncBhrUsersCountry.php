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
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\User\Models\UtcTimelog;

class syncBhrUsersCountry extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    // protected $signature = 'sync_bhr_users:send {all?}';
    protected $signature = 'sync_bhr_users_country';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync BHR Users Country. Updating existing users country id based on BHR Country.';
    protected $bhr;
    protected $user;
    protected $schedule;
    protected $dtr;
    protected $email;

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(BhrRepositoryInterface $bhr,
                                UserRepositoryInterface $user,
                                ScheduleRepositoryInterface $schedule,
                                DtrRepositoryInterface $dtr ,
                                EmailRepositoryInterface $email)
    {
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
    
            
                $bhr_user_number_array = collect($this->bhr->get_all_bhr_user_numbers());
                $user_number_array = User::whereNotNull('bhr_num')->pluck('bhr_num');
                $bhr_user_number_array = $bhr_user_number_array->merge( $user_number_array );
                $utc = UtcTimelog::all();
            foreach( $bhr_user_number_array as $bhr_user_number ){

                try{


                    $user = $this->user->show_via_bhr_number( $bhr_user_number );
                    $bhr_user = $this->bhr->get_user( $bhr_user_number);
                    
                    if( is_valid( $user ) && is_valid( $bhr_user ) ){
                        if($user->is_active == true ){
                            $user = $this->user->update_bhr_user_country_to_evox( $user, $bhr_user , $utc);    
                        }
                    } 


                } catch (Exception $e) {
                    log_to_file( 'info', '[RECORD ERROR: BHRID - '. $bhr_user_number. ' ' . __FUNCTION__ , [], "sync_bhr_country");
                    continue;
                }
            }




            
            
            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                null,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            log_to_file( 'info', $e->getMessage(), [], "sync_country_errors");
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
