<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;

class syncEvoxOvertime extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_evox_overtime';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Evox Overtime to New Evox';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(DrupalEvoxRepositoryInterface $drupal_evox,
                                OvertimeRepositoryInterface $overtime,
                                DtrRepositoryInterface $dtr)
    {
        $this->drupal_evox = $drupal_evox;
        $this->dtr = $dtr;
        $this->overtime = $overtime;

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
            
            // Fetch yesterday record
                $start_datetime = Carbon::yesterday()->format('Y-m-d H:i:s');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d H:i:s');
            

            // Fetch the Drupal Overtime Data
            $drupal_evox_overtime_array = $this->drupal_evox->get_overtime( $start_datetime, $end_datetime);

            // Apply the Drupal Overtime Data to EVOX 
            $to_compute_items = $this->overtime->apply_drupal_evox_data_to_overtime( $drupal_evox_overtime_array );

            // Iterate the to-be-computed Overtime Instance
            if( count($to_compute_items) > 0 ){
                
                foreach( $to_compute_items as $overtime ){

                    // Fetch the DTR instance from the Overtime
                    $dtr = $overtime->dtr()->first();

                    // Compute only if the DTR is existing.
                    if( $dtr != null ) {
                        $this->dtr->compute_payroll_items( $dtr );
                    }
                }
            }

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $to_compute_items,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
