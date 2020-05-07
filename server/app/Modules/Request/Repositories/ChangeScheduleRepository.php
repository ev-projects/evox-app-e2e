<?php 

namespace App\Modules\Request\Repositories;

use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Resources\ChangeScheduleResource;
use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ChangeScheduleRepository implements ChangeScheduleRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function __construct(){

    }


    /**
     *  Responsible for Storing the ChangeSchedule Request
     * @param array (ChangeSchedule Post Variables) $data
     * @return ChangeSchedule $ChangeSchedule
     */
    public function store(array $data)
    {

        DB::beginTransaction();
        try {   


            $changeschedule = new ChangeSchedule();

            $changeschedule->user_id      = auth()->user()->id;
            $changeschedule->schedule_id  = $data['schedule_id'] ;
            $changeschedule->valid_from  = $data['valid_from'] ;
            $changeschedule->valid_to  = $data['valid_to'] ;
            $changeschedule->employee_note  = $data['employee_note'] ;
            $changeschedule->approver_note  = ( isset( $data['approver_note'] ) && is_valid( $data['approver_note'] ) ) ? $data['approver_note'] : null;
            $changeschedule->updated_by   = auth()->user()->id;
            $changeschedule->created_by   = auth()->user()->id;
            $changeschedule->save();
            
            DB::commit();
            log_to_file('info', 'Success', [$changeschedule]);
            return $changeschedule;
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }



    }


    /**
     *  Responsible for Updating the ChangeSchedule Request 
     * @param array (ChangeSchedule Post Variables) $data
     * @param $id
     * @return ChangeSchedule $ChangeSchedule
     */
    public function update(array $data, $id)
    {
        return "update";
    }


    /**
     *  Responsible for Soft-Deleting the ChangeSchedule Request from Database
     * @param $id
     * @return bool
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {

            $changeschedule = ChangeSchedule::findOrFail($id);
            
            if( get_authenticated_user( $changeschedule->user_id ) ) {

                $changeschedule->updated_by = auth()->user()->id;

                $changeschedule->update();

                $changeschedule->delete();

                DB::commit();
                log_to_file('info', 'Success', [$changeschedule]);
                return true;

            }

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the ChangeSchedule Request with the ID given.
     * @param $id
     * @return ChangeSchedule $ChangeSchedule
     */
    public function find($id)
    {
        try {
            $changeschedule = ChangeSchedule::find($id);

            log_to_file('info', 'Success', [$changeschedule]);
            return $changeschedule;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the Overtime Requests with the given Parameters.
     * @param array $parameter
     * @return Collection $overtime_collection
     */
    public function where(array $parameter)
    {
        return "where";
    }


    /**
     *  Responsible for updating the Request's Details and Approving the Change Schedule Request with the ID given
     * @param array $data
     * @param $id
     * @return Change Schedule $changeschedule
     */
    public function approve($id)
    {
        try {
            
            $changeschedule = ChangeSchedule::findOrFail($id);
            $changeschedule->approve();

            return $changeschedule;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for updating the Request's Details and Declining the Change Schedule Request with the ID given
     * @param array $data
     * @param $id
     * @return ChangeSchedule $ChangeSchedule
     */
    public function decline( $id)
    {
        try {
            
            $changeschedule = ChangeSchedule::findOrFail($id);
            $changeschedule->decline();

            return $changeschedule;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Declining the ChangeSchedule Request with the ID given
     * @param array $data
     * @param $id
     * @return ChangeSchedule $ChangeSchedule
     */
    public function pending( $id )
    {
        try {
            
            $changeschedule = ChangeSchedule::findOrFail($id);
            $changeschedule->pending();

            return $ChangeSchedule;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Declining the ChangeSchedule Request with the ID given
     * @param array $data
     * @param $id
     * @return ChangeSchedule $ChangeSchedule
     */
    public function cancel( $id )
    {
        try {
            
            $changeschedule = ChangeSchedule::findOrFail($id);
            $changeschedule->cancel();

            return $changeschedule;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }







}