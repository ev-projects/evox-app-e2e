<?php

namespace App\Console\Commands;
use Carbon\Carbon;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use Illuminate\Console\Command;


class syncEvoxAlterLog extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_evox_alterlog';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Evox Alter Log Request to New Evox';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(AlterLogRepositoryInterface $alter_log,
                                DrupalEvoxRepositoryInterface $drupal_evox,
                                DtrRepositoryInterface $dtr)
    {
        $this->drupal_evox = $drupal_evox;
        $this->alter_log        = $alter_log;
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
            //  Fetch the Current Day that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            $start_datetime = Carbon::yesterday()->format('Y-m-d');
            $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d');
            
            $drupal_evox_alter_log_array = $this->drupal_evox->get_alter_log( $start_datetime, $end_datetime );
            
            $to_compute_items = $this->alter_log->apply_drupal_evox_data_to_alter_log( $drupal_evox_alter_log_array );

            if( count($to_compute_items) > 0 ){
                
                foreach( $to_compute_items as $alter_log ){

                    // Fetch the DTR instance from the Overtime
                    $dtr = $alter_log->dtr()->first();

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
