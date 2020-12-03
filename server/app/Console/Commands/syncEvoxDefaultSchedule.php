<?php

namespace App\Console\Commands;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use Illuminate\Console\Command;
use Exception;
use Illuminate\Http\JsonResponse;

class syncEvoxDefaultSchedule extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_evox_default_schedule';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Evox Default Schedule to New Evox';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(    DrupalEvoxRepositoryInterface $drupal_evox,
                                    ScheduleRepositoryInterface $schedule)
    {
        $this->schedule  = $schedule;
        $this->drupal_evox  = $drupal_evox;
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
            # tag as not initial syncing
            $is_initial_sync  = false;

            // Fetch the Drupal Default Schedule Data
            $drupal_evox_default_schedule_array = $this->drupal_evox->get_default_schedule( $is_initial_sync );

            // Apply the Drupal Default Schedule Data to EVOX 
            $schedule_collection = $this->schedule->apply_drupal_evox_data_to_default_schedule( $drupal_evox_default_schedule_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $schedule_collection,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
