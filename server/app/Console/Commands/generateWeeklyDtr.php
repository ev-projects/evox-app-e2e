<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;

class generateWeeklyDtr extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'generate_weekly_dtr';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'This command generate weekly dtr';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(UserRepositoryInterface $user,
                                DtrRepositoryInterface $dtr)
    {
        $this->user = $user;
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
            $start_date =  new Carbon('first day of next month');
            $end_date = new Carbon('last day of next month');

            # Fetches all the Active Users
            $user_collection = $this->user->get_all_active_users();

            # Generates the Date Range that would be generated as DTR for each Active Employees
            $date_array = generate_date_array($start_date, $end_date );
            
            # Test Data for Debugging
            $date_array = generate_date_array( "2021-08-02", '2021-08-08' );
            
            $result = $this->dtr->generate_dtr( $user_collection, $date_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            log_to_file( 'info', $e->getMessage(), [], "cron_errors");
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
