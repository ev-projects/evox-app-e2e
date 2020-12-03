<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\Payroll\Repositories\PayrollRepository;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Resources\DtrResource;
use Exception;
use Illuminate\Http\JsonResponse;

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
    public function __construct(PayrollRepository $payroll,DtrRepositoryInterface $dtr)
    {
        $this->payroll = $payroll;
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
            
            // Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
 
            $payroll_cutoff = $this->payroll->get_payroll_cutoff();
            $start_date = $payroll_cutoff->start_date;
            $end_date = $payroll_cutoff->end_date;


            
            // Sync the Holidays from BHr to EVOX within the Payroll Cutoff as Date Range.
            $this->bhr->sync_holidays( $start_date, $end_date );

            // Binding of the Holidays within the Date Range to the DTR within the Date Range.
            $result = $this->dtr->bind_holidays_to_dtr( $start_date, $end_date );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrResource::collection($result),
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
