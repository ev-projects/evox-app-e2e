<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Carbon\Carbon;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use Exception;
use Illuminate\Http\JsonResponse;

class syncEvoxDtr extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_evox_dtr';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Evox DTR Request to New Evox';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(DrupalEvoxRepositoryInterface $drupal_evox,
                                DtrRepositoryInterface $dtr)
    {
        $this->dtr = $dtr;
        $this->drupal_evox = $drupal_evox;
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
            
            // Fetch the current date
            $start_datetime = Carbon::yesterday()->format('Y-m-d H:i:s');
            $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d H:i:s');
            
            $drupal_evox_dtr_array = $this->drupal_evox->get_dtr( $start_datetime, $end_datetime );

            $result = $this->dtr->apply_drupal_evox_data_to_dtr( $drupal_evox_dtr_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
