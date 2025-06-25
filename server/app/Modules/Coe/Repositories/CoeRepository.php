<?php 

namespace App\Modules\Coe\Repositories;

use App\Modules\Coe\Models\COE;
use App\Modules\Coe\Models\CoeBhrFields;
use App\Modules\Coe\Models\CoeBhrFieldValues;
use App\Modules\User\Models\User;
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
    public function create(User $user, $coe_bhr_fields, $request, $employee)
    {
        try {
            log_to_file( 'info', 'COE Template', call_sp("EV_SP_COE_Get_Template", [$employee['18'], $user->id, $employee['4455']]), "coelog");
            $sequence_number =  call_sp("EV_SP_COE_Generate_Sequence", [$employee['18']])[0][0]->GeneratedSequence;
            $coe_template = call_sp("EV_SP_COE_Get_Template", [$employee['18'], $user->id, $employee['4455']])[0][0];
            $reference_number ="COE-$user->emp_num-".$coe_template->template_code."-" .date('Ymd') . "-" . $sequence_number;
            // $c = "AHAHA1,234.56789Hello";
            // echo floatval(preg_replace("/[^0-9.]/", "", $c)) . "<br>";
            $address = "{$employee['address1']} {$employee['address2']} {$employee['city']}, {$employee['state']} {$employee['zipcode']} {$employee['country']}";
            /*
                <field id="4206.4" type="text">De minimis (non-taxable) - Company pays</field>
                <field id="4206.7" type="new_benefit">De minimis (non-taxable) - Company pays - Currency code</field>
                <field id="4539.4" type="text">Communication Allowance (Taxable) - Company pays</field>
                <field id="4539.7" type="new_benefit">Communication Allowance (Taxable) - Company pays - Currency code</field>
                <field id="4567.4" type="text">Flex Allowance - Company pays</field>
                <field id="4567.7" type="new_benefit">Flex Allowance - Company pays - Currency code</field>
                <field id="4431.4" type="text">Wellness Benefit - Company pays</field>
                <field id="4431.7" type="new_benefit">Wellness Benefit - Company pays - Currency code</field>
                <field id="4432.4" type="text">Benefit Allowance - Company pays</field>
                <field id="4432.7" type="new_benefit">Benefit Allowance - Company pays - Currency code</field>
                <field id="4411.4" type="text">Internet Allowance (Taxable) - Company pays</field>
                <field id="4411.7" type="new_benefit">Internet Allowance (Taxable) - Company pays - Currency code</field>
                <field id="4435.4" type="text">Reimbursable Allowance - Company pays</field>
                <field id="4435.7" type="new_benefit">Reimbursable Allowance - Company pays - Currency code</field>
                <field id="4200.4" type="text">Transportation Allowance (non-taxable) - Company pays</field>
                <field id="4200.7" type="new_benefit">Transportation Allowance (non-taxable) - Company pays - Currency code</field>

                <field id="4695.4" type="text">[MAR] Food Allowance - Company pays</field>
                <field id="4695.7" type="new_benefit">[MAR] Food Allowance - Company pays - Currency code</field>
                <field id="4710.4" type="text">[MAR] Representation Allowance - Company pays</field>
                <field id="4710.7" type="new_benefit">[MAR] Representation Allowance - Company pays - Currency code</field>
                <field id="4712.4" type="text">[MAR] Transportatlon Allowance - Company pays</field>
                <field id="4712.7" type="new_benefit">[MAR] Transportatlon Allowance - Company pays - Currency code</field>



                encrypt(str_to_float($employee['{bhr_field_id}'])."")
            */
            $salaryPattern = '!\d+\.*\d*!';
            preg_match_all($salaryPattern, $employee['payRate'], $payRates);
            $payRate = $employee['payRate'];
            if ((count($payRates) > 0) && (count($payRates[0]) > 0)) {
                $payRate = preg_replace($salaryPattern, number_format(floatval($payRates[0][0]), 2), $payRate);
            }
            $coe = COE::create([
                'user_id' => $user->id,
                'sequence_number' => $reference_number,
                'purpose_index' => $request->purpose_index,
                'purpose_note' => $request->purpose_note ? $request->purpose_note : '',
                'full_name' => $employee['fullname1'],
                'address' => encrypt($address),
                'hire_date' => $employee['hireDate'],
                'position' => $employee['jobTitle'],
                'basic_pay' => encrypt($payRate.""),
                'de_minimis' => "",
                'de_minimis_currency_code' => "",
                'other_allowance' => "",
                'other_allowance_currency_code' => '',
                'show_compensation' => $request->show_compensation,
            ]);
            //$de_minimis = str_to_float($employee['4206.4']);
            $allowances = [];
            foreach($coe_bhr_fields as $coef) {
                $fieldValue = str_to_float($employee[$coef->field_name]);
                $subFieldValue = '';
                if (($coef->subf_field_name) and (strlen($coef->subf_field_name) > 0)) {
                    $subFieldValue = $employee[$coef->subf_field_name];
                }
                if ($fieldValue > 0) {
                    $fieldValue = number_format($fieldValue, 2) . " " . $subFieldValue;
                    CoeBhrFieldValues::updateOrCreate(
                        ['coe_id' => $coe->id, 'coe_bhr_field_id' => $coef->id],
                        ['value' => encrypt($fieldValue)]
                    );
                    $allowances[] = ['label' => $coef->field_label, 'value' =>$fieldValue];
                }
            }
            //prepare for display
            $coe->address = decrypt($coe->address);
            $coe->basic_pay = decrypt($coe->basic_pay);
            return [$coe, $allowances, $coe_template];

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