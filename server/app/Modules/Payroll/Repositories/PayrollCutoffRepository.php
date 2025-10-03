<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Request\Resources\AlterLogResource;

use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;

use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Payroll\Resources\PayrollCutoffResource;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\EvoxIndiaPayrollCutoff;

class PayrollCutoffRepository implements PayrollCutoffRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function __construct(){

    }



    /**
     *  Gets the Payroll Cutoff. Gets the current date's scope if there's no date parameter.
     * @param string $date
     * @return PayrollCutoff $payroll_cutoff
     */
    public function get_payroll_cutoff( string $date = null )
    {
        try {
            $payroll_cutoff = null;

            // If $date is not initialized, use the Current Date today.
            if( !is_valid( $date ) ) {
                $date = Carbon::now()->format('Y-m-d');
            }
            
            // Fetches the First Payroll Cutoff that scopes the Date given.
            $payroll_cutoff = PayrollCutoff::whereRaw("( start_date <= '".$date."' AND  end_date >= '".$date."')")
                                            ->first();

            // If the recently fetched Payroll Cutoff is Null (Which is non existent), just fetch the Latest Payroll Cutoff via End Date.
            if( !is_valid( $payroll_cutoff ) ) {
                $payroll_cutoff = PayrollCutoff::orderBy('end_date', 'desc')
                                                ->first();
            }
            return $payroll_cutoff;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }
    
    /**
     *  Responsible for fetching the sorted Payroll Cutoff List for specific User
     * 
     * @return array $result;
     */
    public function get_filter_for_dtr( $user_id )
    {
        try {
            $result = [];

            $user = get_authenticated_user( $user_id );
            // $user = User::find(3153);
            if ($user->country_id === 1 || $user->country_id === 4) {
                // Gets all the Payroll Cutoff of India and Morocco
                $india_cutoff_collection = EvoxIndiaPayrollCutoff::get();

                foreach($india_cutoff_collection as $india_cutoff) {
                    $year = Carbon::parse($india_cutoff->End_Date)->format('Y');
                    $month = Carbon::parse($india_cutoff->End_Date)->format('m');
                    $month_label = Carbon::parse($india_cutoff->End_Date)->format('F');

                    $result[ $year ][ $month ]['label'] = $month_label;
                    $restructured_cutoff = [
                        'id' => $india_cutoff->Id,
                        'start_date' => $india_cutoff->Start_Date,
                        'end_date' => $india_cutoff->End_Date,
                        'month' => str_pad((string) $india_cutoff->Cutoff_Month, 2, '0', STR_PAD_LEFT),
                        'month_label' => $month_label,
                        'name' => $month_label . ' ' . $year,
                        'year' => (string) $india_cutoff->Cutoff_Year
                    ];
                    $result[ $year ][ $month ]['data'][$india_cutoff->Id] = $restructured_cutoff;
                }
            } else {
                // Gets all the Payroll Cutoff that started after the User's Date Hired
                $payroll_cutoff_collection = PayrollCutoff::whereRaw("( end_date >= '". $user->date_hired ."' )")->get();

                foreach( $payroll_cutoff_collection as $payroll_cutoff ) {
                    $year = Carbon::parse($payroll_cutoff->end_date)->format('Y');
                    $month = Carbon::parse($payroll_cutoff->end_date)->format('m');

                    $result[ $year ][ $month ]['label'] = Carbon::parse($payroll_cutoff->end_date)->format('F');
                    $result[ $year ][ $month ]['data'][$payroll_cutoff->id] = new PayrollCutoffResource($payroll_cutoff);
                }
            }

            log_to_file('info', 'Success', [$result]);
            return $result;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
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