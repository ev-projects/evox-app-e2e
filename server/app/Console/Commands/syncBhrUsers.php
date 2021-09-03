<?php

namespace App\Console\Commands;

use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use Carbon\Carbon;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;

class syncBhrUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
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
    public function __construct(BhrRepositoryInterface $bhr,
                                UserRepositoryInterface $user,
                                ScheduleRepositoryInterface $schedule,
                                DtrRepositoryInterface $dtr )
    {
        $this->bhr = $bhr;
        $this->user = $user;
        $this->schedule = $schedule;
        $this->dtr = $dtr;

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

            /**
             *  Steps:
             *  1. Fetch all the list User's BHR Number which was changed yesterday
             *  2. Iterate ever User and check if it's for Insert/Update (generate Department if existing)
             *  3. Every iteration, save the Supervisor ID x User ID
             *  4. After iteration, insert the Supervisor ID x User ID on the matrix table.
             * 
             */
            $user_supervisor_pivot_array = [];
        
            // Use the date yesterday.
            $since_date_to_sync = Carbon::today()->subDays(1)->format('Y-m-d') . 'T00:00:00-00:00';

            # 1.
            # Fetches all the recently changed BHr Users ( grouped by Inserted and Updated )
            if($this->argument('all') == 'all'){
                // Get all active users from BHR
                $bhr_user_number_array = collect($this->bhr->get_all_bhr_user_numbers());
                
                // Get all Users from EVOX which is originally synced from BHr (including inactive users)
                $user_number_array = User::whereNotNull('bhr_num')->pluck('bhr_num');

                // Merge both of the list to get the final list of users to merge.
                $bhr_user_number_array = $bhr_user_number_array->merge( $user_number_array );
            }else{
                $bhr_user_number_array = $this->bhr->get_changed_users( $since_date_to_sync );
            }

            # 2.
            # Iterate the actual BHR User Numbers array
            foreach( $bhr_user_number_array as $bhr_user_number ){

                try{

                    // Fetch the User if it's already existing in the System
                    $user = $this->user->show_via_bhr_number( $bhr_user_number );
                    
                    # Fetch the BHr User Details
                    $bhr_user = $this->bhr->get_user( $bhr_user_number, true );
                    
                    # If the User is existing in EVOX, Proceed on Updating the BHR User Instance
                    if( is_valid( $user ) ){
                        $user = $this->user->update_bhr_user_to_evox( $user, $bhr_user );
                        
                    # If the User is not existing in EVOX, Proceed on Inserting the BHR User Instance
                    } else {
                        $user = $this->user->insert_bhr_user_to_evox( $bhr_user );

                        if( is_valid( $user ) ) {

                            # Fetch the Department of the User.
                            $department =  $user->department()->first();

                            # Added generating of Schedule for the newly inserted user using the User's department default schedule
                            if( is_valid( $department ) ) {

                                $schedule = $department->defaultSchedule()->first();
                                $this->schedule->copy_schedule_to_user( $schedule, $user );
                                
                            }

                            # Checks if the Date Hired is less than or equal to the nearest saturday date.
                            $nearest_saturday_date = Carbon::now()->next( Carbon::SATURDAY );
                            if( Carbon::parse( $user->date_hired )->lte( $nearest_saturday_date ) ){

                                # Generate DTR from the Date Hired up to the Saturday of this week.
                                $date_array = generate_date_array($user->date_hired, $nearest_saturday_date );
                                $this->dtr->generate_dtr( (new Collection())->add($user) , $date_array );
                            }
                        }
                    }


                    # 3.
                    if( is_valid( $user ) ) {
                        $user_supervisor_pivot_array[ $bhr_user->supervisorEId ][] = $user->id;
                    }
                     
                } catch (Exception $e) {
                    log_to_file( 'info', '[RECORD ERROR: BHRID - '. $bhr_user_number. ' ' . __FUNCTION__ , [], "sync_bhr_user");
                    continue;
                }
            }

            # 4
            $apply_user_supervisor_pivot_result = $this->user->apply_user_supervisor_pivot( $user_supervisor_pivot_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $apply_user_supervisor_pivot_result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            log_to_file( 'info', $e->getMessage(), [], "cron_errors");
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
