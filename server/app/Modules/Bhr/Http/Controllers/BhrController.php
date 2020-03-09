<?php

namespace App\Modules\Bhr\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollRepository;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;

class BhrController extends Controller
{
    protected $bhr;
    protected $payroll;

    public function __construct(BhrRepositoryInterface $bhr, PayrollRepository $payroll){
        $this->bhr = $bhr;
        $this->payroll = $payroll;
    }


    /**
     * Generates the Weekly DTR for all the Employees
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_holidays(){
        try {
            $payroll_cutoff = $this->payroll->get_payroll_cutoff();

            
            return success_response(
                trans('messages.sync_holidays_success'), 
                $this->bhr->sync_holidays( $payroll_cutoff->start_date, $payroll_cutoff->end_date ),
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


}
