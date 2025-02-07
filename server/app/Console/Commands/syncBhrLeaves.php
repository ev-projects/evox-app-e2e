<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use Exception;
use Illuminate\Http\JsonResponse;
use App\Modules\Cron\Http\Controllers\CronController;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class syncBhrLeaves extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_bhr_leaves {country_code} {--cutoff-id=}';

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
                                PayrollCutoffRepositoryInterface $payroll_cutoff,
                                BhrRepositoryInterface $bhr)
    {
        $this->bhr = $bhr;
        $this->dtr = $dtr;
        $this->payroll_cutoff = $payroll_cutoff;
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        #die('Do nothing for now');
        try {
            $country_codes = ['IN', 'PH', 'BU', 'MA', 'BE'];
            $country_code = $this->argument('country_code');
            if (!in_array($country_code, $country_codes)) {
                throw new Exception("Country code parameter \"{$country_code}\" is invalid, it should be one of the following (". implode(", ", $country_codes) .").");
            }
            $country_id = null;
            $cutoff_id = $this->option('cutoff-id');
            if (empty($cutoff_id) or $cutoff_id == null) {
                $cutoff_id == null;
            }
            $start_date = null;
            $end_date = null;
            switch ($country_code) {
                case "IN":
                    $country_id = 1;
                    $payroll_cutoff = call_sp("SP_Payroll_Cutoff_IND", [$cutoff_id])[0];
                    if (count($payroll_cutoff) > 0) {
                        $payroll_cutoff = $payroll_cutoff[0];
                        $start_date = $payroll_cutoff->Start_Date;
                        $end_date = $payroll_cutoff->End_Date;
                    } else {
                        throw new Exception("Could not find Payroll Cut-off for {$country_code} with ID {$cutoff}");
                    }
                    break;
                case "MA":
                    $country_id = 4;
                    $payroll_cutoff = call_sp("SP_Payroll_Cutoff_IND", [$cutoff_id])[0];
                    if (count($payroll_cutoff) > 0) {
                        $payroll_cutoff = $payroll_cutoff[0];
                        $start_date = $payroll_cutoff->Start_Date;
                        $end_date = $payroll_cutoff->End_Date;
                    } else {
                        throw new Exception("Could not find Payroll Cut-off for {$country_code} with ID {$cutoff}");
                    }
                    break;
                case "BU":
                    $country_id = 3;
                    if($cutoff_id == null){
                        $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();
                    } else {
                        $payroll_cutoff = $this->payroll_cutoff->find(intval($cutoff_id));
                        if (!is_valid($payroll_cutoff)) {
                            throw new Exception("Could not find Payroll Cut-off for {$country_code} with ID {$cutoff}");
                        }
                    }
                    $start_date = $payroll_cutoff->start_date;
                    $end_date = $payroll_cutoff->end_date;
                    break;
                case "BE":
                    $country_id = 5;
                    if($cutoff_id == null){
                        $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();
                    } else {
                        $payroll_cutoff = $this->payroll_cutoff->find(intval($cutoff_id));
                        if (!is_valid($payroll_cutoff)) {
                            throw new Exception("Could not find Payroll Cut-off for {$country_code} with ID {$cutoff}");
                        }
                    }
                    $start_date = $payroll_cutoff->start_date;
                    $end_date = $payroll_cutoff->end_date;
                    break;
                default://PH
                    $country_id = 2;
                    if($cutoff_id == null){
                        $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();
                    } else {
                        $payroll_cutoff = $this->payroll_cutoff->find(intval($cutoff_id));
                        if (!is_valid($payroll_cutoff)) {
                            throw new Exception("Could not find Payroll Cut-off for {$country_code} with ID {$cutoff}");
                        }
                    }
                    $start_date = $payroll_cutoff->start_date;
                    $end_date = $payroll_cutoff->end_date;
                    break;
            }

            if ($start_date == null or $end_date == null) {
                log_to_file( 'info', "Payroll Cut-off dates are required", [$country_code, $start_date, $end_date], "dtr_leaves");
                exit();
            }

            #dd($country_code, $start_date, $end_date);

            log_to_file( 'info', "Payroll Cut-off", [$country_code, $start_date, $end_date], "dtr_leaves");

            // Fetch the Leaves from BHr within the Payroll Cutoff as Date Range.
            $bhr_leaves_array = $this->bhr->get_leaves( $start_date, $end_date );

            // Sort leaves based on lastChanged field
            // usort($bhr_leaves_array, function($a, $b) {
            //     return $a->status->lastChanged <=> $b->status->lastChanged;
            // });

            // Binding of the Leaves fetched from BHr within the Date Range to the DTR within the Date Range.
            $result = $this->dtr->bind_leaves_to_dtr( $bhr_leaves_array, $country_id );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            print_r($e->getMessage());
            log_to_file( 'info', $e->getMessage(), [], "dtr_leaves");
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
