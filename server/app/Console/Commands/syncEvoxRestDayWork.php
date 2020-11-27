<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use Carbon\Carbon;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;

class syncEvoxRestDayWork extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_evox_restdaywork';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Evox Rest Day Work to New Evox';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(DrupalEvoxRepositoryInterface $drupal_evox,
                                RestDayWorkRepositoryInterface $rest_day_work,
                                DtrRepositoryInterface $dtr)
    {
        $this->drupal_evox = $drupal_evox;
        $this->rest_day_work    = $rest_day_work;
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
            
            // Fetch Yesterday Record
                $start_datetime = Carbon::yesterday()->format('Y-m-d');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d');
           
            $drupal_evox_rest_day_work_array = $this->drupal_evox->get_rest_day_work( $start_datetime, $end_datetime );

            $to_compute_items = $this->rest_day_work->apply_drupal_evox_data_to_rest_day_work( $drupal_evox_rest_day_work_array );

            if( count($to_compute_items) > 0 ){
                
                foreach( $to_compute_items as $rest_day_work ){

                    // Fetch the DTR instance from the Overtime
                    $dtr = $rest_day_work->dtr()->first();

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
