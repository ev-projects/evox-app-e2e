<?php 

namespace App\Modules\Coe\Repositories;

use App\Modules\Coe\Models\COE;
use Exception;


use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class COERepository implements COERepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function __construct(){

    }

    /**
     *  Responsible for fetching all the Departments
     * 
     * @return Collection $coe_collection
     */
    public function all()
    {
        try {
            $coe_collection = COE::where('user_id', auth()->user()->id)->orderBy('created_at', 'asc')->get();
            log_to_file('info', 'Success', [$coe_collection]);
            return $coe_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching the COE with the ID given.
     *  @param $id
     *  @return COE $coe
     */
    public function create($user_id, $purpose_index, $show_compensation, $employee)
    {
        try {
            // $c = "AHAHA1,234.56789Hello";
            // echo floatval(preg_replace("/[^0-9.]/", "", $c)) . "<br>";
            $address = "{$employee['address1']} {$employee['address2']} {$employee['city']}, {$employee['state']} {$employee['zipcode']} {$employee['country']}";
            /*
            "4500.4" => Rice Allowance Company pays,                DMB
            "4527.4" => Actual Medical Assistance Company pays,     DMB
            "4526.4" => Laundry Allowance Company pays,             DMB
            "4529.4" => Medical Allowance (DMB) Company pays,       DMB
            "4525.4" => Clothing Allowance Company pays,            DMB
            "4200.2" => Transportation Allowance (non-taxable) Coverage,    OTHER
            */
            $de_minimis = str_to_float($employee['4206.4']);
            if ($de_minimis <= 0) {
                $de_minimis = 0;
                $de_minimis += str_to_float($employee['4500.4']);
                $de_minimis += str_to_float($employee['4527.4']);
                $de_minimis += str_to_float($employee['4526.4']);
                $de_minimis += str_to_float($employee['4529.4']);
                $de_minimis += str_to_float($employee['4525.4']);
            }
            $salaryPattern = '!\d+\.*\d*!';
            preg_match_all($salaryPattern, $employee['payRate'], $payRates);
            $payRate = $employee['payRate'];
            if ((count($payRates) > 0) && (count($payRates[0]) > 0)) {
                $payRate = preg_replace($salaryPattern, number_format(floatval($payRates[0][0]), 2), $payRate);
            }
            $coe = COE::create([
                'user_id' => $user_id,
                'purpose_index' => $purpose_index,
                'full_name' => $employee['fullName2'],
                'address' => $address,
                'hire_date' => $employee['hireDate'],
                'position' => $employee['jobTitle'],
                'basic_pay' => $payRate,
                'de_minimis' => $de_minimis,
                'de_minimis_currency_code' => $employee['4206.7'],
                'other_allowance' => str_to_float($employee['4200.2']),
                'other_allowance_currency_code' => '',
                'show_compensation' => $show_compensation,
            ]);
            return $coe;

        } catch (Exception $e) {
            log_error($e, 'coelog');
            throw $e;
        }
    }
    
    /**
     *  Responsible for fetching the COE with the ID given.
     *  @param $id
     *  @return COE $coe
     */
    public function find($id)
    {
        try {
            $coe = COE::find($id);
            log_to_file('info', 'Success', [$coe]);
            return $coe;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }
}