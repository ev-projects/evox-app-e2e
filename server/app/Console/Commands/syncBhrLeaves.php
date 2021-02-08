<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollRepository;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use Exception;
use Illuminate\Http\JsonResponse;

class syncBhrLeaves extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_bhr_leaves';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Leaves from Bamboo HR';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(DtrRepositoryInterface $dtr,
                                PayrollRepository $payroll,
                                BhrRepositoryInterface $bhr)
    {
        $this->bhr = $bhr;
        $this->dtr = $dtr;
        $this->payroll = $payroll;
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
            $payroll_cutoff = $this->payroll->get_payroll_cutoff();
            $start_date = $payroll_cutoff->start_date;
            $end_date = $payroll_cutoff->end_date;

            // Fetch the Leaves from BHr within the Payroll Cutoff as Date Range.
            $bhr_leaves_array = $this->bhr->get_leaves( $start_date, $end_date );
            
            // Binding of the Leaves fetched from BHr within the Date Range to the DTR within the Date Range.
            $result = $this->dtr->bind_leaves_to_dtr( $bhr_leaves_array );

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
