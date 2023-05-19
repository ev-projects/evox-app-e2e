<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use Exception;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class syncBhrHolidays extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_bhr_holidays';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'This Command sync Holiday from BHR';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(BhrRepositoryInterface $bhr, 
                                PayrollCutoffRepositoryInterface $payroll_cutoff,
                                DtrRepositoryInterface $dtr)
    {
        $this->payroll_cutoff = $payroll_cutoff;
        $this->dtr = $dtr;
        $this->bhr = $bhr;
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
            
            // Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
 
            $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();
            $start_date = $payroll_cutoff->start_date;
            $end_date =  Carbon::now()->addMonth(3)->format("Y-m-d");


            
            // Sync the Holidays from BHr to EVOX within the Payroll Cutoff as Date Range.
            $this->bhr->sync_holidays( $start_date, $end_date );

            // Binding of the Holidays within the Date Range to the DTR within the Date Range.
            $result = $this->dtr->bind_holidays_to_dtr( $start_date, $end_date );
            error_log("succ");
            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrResource::collection($result),
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            error_log($e->getMessage());
            log_to_file( 'info', $e->getMessage(), [], "cron_errors");
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
