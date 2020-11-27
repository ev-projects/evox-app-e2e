<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Carbon\Carbon;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;

class syncEvoxChangeSchedule extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_evox_changeschedule';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Evox Change of Schedule Request to New Evox';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(    DrupalEvoxRepositoryInterface $drupal_evox,
                                    ChangeScheduleRepositoryInterface $change_schedule,
                                    DtrRepositoryInterface $dtr)
    {
        $this->drupal_evox = $drupal_evox;
        $this->change_schedule  = $change_schedule;
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
   
            $start_datetime = Carbon::yesterday()->format('Y-m-d');
            $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d');
    
      
            $drupal_evox_default_schedule_array = $this->drupal_evox->get_change_schedule( $start_datetime, $end_datetime );

            $to_compute_items = $this->change_schedule->apply_drupal_evox_data_to_change_schedule( $drupal_evox_change_of_schedule );

            if( count($to_compute_items) > 0 ){
                
                foreach( $to_compute_items as $change_of_schedule ){

                    // Fetch the DTR instance from the Overtime
                    $dtr = $change_of_schedule->dtr()->first();

                    // Compute only if the DTR is existing.
                    if( $dtr != null ) {
                        $this->dtr->compute_payroll_items( $dtr );
                    }
                }
            }

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $to_compute_items
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
