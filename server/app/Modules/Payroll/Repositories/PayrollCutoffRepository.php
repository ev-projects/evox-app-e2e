<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Request\Resources\AlterLogResource;

use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;

use App\Modules\Payroll\Repositories\DtrRepository;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PayrollCutoffRepository implements PayrollCutoffRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function __construct(){

    }


    
    /**
     *  Responsible for fetching all the Payroll Cutoff
     * 
     * @return Collection $payroll_cutoff_collection
     */
    public function all()
    {
        try {
            $payroll_cutoff_collection = PayrollCutoff::get();
            log_to_file('info', 'Success', [$payroll_cutoff_collection]);
            return $payroll_cutoff_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the Payroll Cutoff with the ID given.
     * @param $id
     * @return PayrollCutoff $payroll_cutoff
     */
    public function find($id)
    {
        try {
            $payroll_cutoff = PayrollCutoff::find($id);
            log_to_file('info', 'Success', [$payroll_cutoff]);
            return $payroll_cutoff;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Storing the Payroll Cutoff
     * @param array (Payroll Cutoff Post Variables) $data
     * @return PayrollCutoff $payroll_cutoff
     */
    public function store(array $data)
    {
        DB::beginTransaction();
        try {   
            $payroll_cutoff = new PayrollCutoff();
            $payroll_cutoff->name             = ( isset( $data['name'] ) && is_valid( $data['name'] ) ) ? $data['name'] : null;
            $payroll_cutoff->start_date       = ( isset( $data['start_date'] ) && is_valid( $data['start_date'] ) ) ? $data['start_date'] : null;
            $payroll_cutoff->end_date         = ( isset( $data['end_date'] ) && is_valid( $data['end_date'] ) ) ? $data['end_date'] : null;
            $payroll_cutoff->save();
            
            DB::commit();
            log_to_file('info', 'Success', [$payroll_cutoff]);
            return $payroll_cutoff;
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Updating the Payroll Cutoff Request 
     * @param array (Payroll Cutoff Post Variables) $data
     * @param PayrollCutoff (PayrollCutoff Instance/ ID String ) $id_or_payroll_cutoff
     * @return PayrollCutoff $payroll_cutoff
     */
    public function update(array $data, $id_or_payroll_cutoff)
    {   
        DB::beginTransaction();
        try {   
            
            $payroll_cutoff =   ( $id_or_payroll_cutoff instanceof PayrollCutoff ) ? $id_or_payroll_cutoff : PayrollCutoff::findOrFail($id_or_payroll_cutoff);
            
            $payroll_cutoff->name           = ( isset( $data['name'] ) && is_valid( $data['name'] ) ) ? $data['name'] : $payroll_cutoff->name;
            $payroll_cutoff->start_date     = ( isset( $data['start_date'] ) && is_valid( $data['start_date'] ) ) ? $data['start_date'] : $payroll_cutoff->start_date;
            $payroll_cutoff->end_date       = ( isset( $data['end_date'] ) && is_valid( $data['end_date'] ) ) ? $data['end_date'] : $payroll_cutoff->end_date;

            $payroll_cutoff->update();

            DB::commit();

            log_to_file('info', 'Success', [$payroll_cutoff]);
            return $payroll_cutoff;
            
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }


    }


    /**
     *  Responsible for Soft-Deleting the Payroll Cutoff from Database
     * @param $id
     * @return bool
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {

            $payroll_cutoff = PayrollCutoff::findOrFail($id);

            $payroll_cutoff->delete();

            DB::commit();
            log_to_file('info', 'Success', [$payroll_cutoff]);
            return true;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

}