<?php 

namespace App\Modules\Request\Repositories;

use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Resources\ChangeScheduleResource;
use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;

use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\Payroll\Repositories\DtrRepository;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

use App\Modules\Schedule\Models\Schedule;

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
            $schedule = new ScheduleRepository();
            $schedule =  $schedule->store($data);
            $changeschedule = new ChangeSchedule();
            $changeschedule->user_id      = auth()->user()->id;
            $changeschedule->schedule_id  = $schedule->id ;
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
        DB::beginTransaction();
        try {   
            $change_schedule = ChangeSchedule::findOrFail($id);

            $schedule = new ScheduleRepository();
            $schedule->update($data,$change_schedule->schedule_id);

            $change_schedule->valid_from  =  ( isset( $data['valid_from'] ) && is_valid( $data['valid_from'] ) ) ? $data['valid_from'] : $change_schedule->valid_from ;
            $change_schedule->valid_to  = ( isset( $data['valid_to'] ) && is_valid( $data['valid_to'] ) ) ? $data['valid_to'] : $change_schedule->valid_to ;
            $change_schedule->employee_note  = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : $change_schedule->employee_note ;
            $change_schedule->approver_note  = ( isset( $data['approver_note'] ) && is_valid( $data['approver_note'] ) ) ? $data['approver_note'] : $change_schedule->approver_note ;
            $change_schedule->updated_by   = auth()->user()->id;
            $change_schedule->update();

            DB::commit();
            log_to_file('info', 'Success', [$change_schedule]);
            return $change_schedule;
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }


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
     *  Responsible for updating the Request's Details and Approving the Change Schedule Request with the ID given
     * @param array $data
     * @param $id
     * @return Change Schedule $changeschedule
     */
    public function approve(array $data, $id)
    {
        try {
            # Update the fields  and Apply schedule updates
            $change_schedule = $this->update($data, $id);
            $change_schedule->approve();

            # Apply the Schedule on the DTR
            $dtr = new DtrRepository();
            $dtr->apply_schedule_to_dtr($change_schedule->user_id,Schedule::findOrFail($change_schedule->schedule_id));

            return $change_schedule;
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
    public function decline($data, $id)
    {
        try {
            $changeschedule = ChangeSchedule::findOrFail($id);
            $change_schedule = $this->update($data, $id);
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
            
            $change_schedule = ChangeSchedule::findOrFail($id);
            $change_schedule->pending();

            return $change_schedule;

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
            
            $change_schedule = ChangeSchedule::findOrFail($id);
            $change_schedule->cancel();

            return $change_schedule;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }







}