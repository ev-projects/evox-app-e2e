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
     * @return ChangeSchedule $change_schedule
     */
    public function store(array $data)
    {
        DB::beginTransaction();
        try {   
            $schedule = new ScheduleRepository();
            $schedule =  $schedule->store($data);

            $change_schedule = new ChangeSchedule();
            $change_schedule->user_id        = auth()->user()->id;
            $change_schedule->schedule_id    = $schedule->id ;
            $change_schedule->valid_from     = ( isset( $data['valid_from'] ) && is_valid( $data['valid_from'] ) ) ? $data['valid_from'] : null ;
            $change_schedule->valid_to       = ( isset( $data['valid_to'] ) && is_valid( $data['valid_to'] ) ) ? $data['valid_to'] : null ;
            $change_schedule->employee_note  = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : null;
            $change_schedule->updated_by     = auth()->user()->id;
            $change_schedule->created_by     = auth()->user()->id;
            $change_schedule->save();
            
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
     *  Responsible for Updating the ChangeSchedule Request 
     * @param array (ChangeSchedule Post Variables) $data
     * @param ChangeSchedule (ChangeSchedule Instance/ ID String ) $id_or_change_schedule
     * @return ChangeSchedule $ChangeSchedule
     */
    public function update(array $data, $id_or_change_schedule)
    {   
        DB::beginTransaction();
        try {   
            
            $change_schedule =   ( $id_or_change_schedule instanceof ChangeSchedule ) ? $id_or_change_schedule : ChangeSchedule::findOrFail($id_or_change_schedule);
            
            // Authenticate the User first if valid for the Update
            if( get_authenticated_user( $change_schedule->user_id ) ) {

                $schedule = new ScheduleRepository();
                $schedule->update($data,$change_schedule->schedule_id);
    
                $change_schedule->valid_from     = ( isset( $data['valid_from'] ) && is_valid( $data['valid_from'] ) ) ? $data['valid_from'] : $change_schedule->valid_from ;
                $change_schedule->valid_to       = ( isset( $data['valid_to'] ) && is_valid( $data['valid_to'] ) ) ? $data['valid_to'] : $change_schedule->valid_to ;
                $change_schedule->employee_note  = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : $change_schedule->employee_note ;
                $change_schedule->approver_note  = ( isset( $data['approver_note'] ) && is_valid( $data['approver_note'] ) ) ? $data['approver_note'] : $change_schedule->approver_note ;
                $change_schedule->updated_by   = auth()->user()->id;
                $change_schedule->update();
    
                DB::commit();

                $change_schedule->pending();

                log_to_file('info', 'Success', [$change_schedule]);
                return $change_schedule;
            }
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

            $change_schedule = ChangeSchedule::findOrFail($id);
            
            if( get_authenticated_user( $change_schedule->user_id ) ) {

                $change_schedule->updated_by = auth()->user()->id;

                $change_schedule->update();

                $change_schedule->delete();

                DB::commit();
                log_to_file('info', 'Success', [$change_schedule]);
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
            $change_schedule = ChangeSchedule::find($id);

            if( get_authenticated_user( $change_schedule->user_id ) ) {
                
                log_to_file('info', 'Success', [$change_schedule]);
                return $change_schedule;
            }

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
        DB::beginTransaction();
        try {

            # Fetch the Change Schedule base on the ID
            $change_schedule = ChangeSchedule::findOrFail($id);

            // Authenticate the User first if the Change Schedule Submitter is under the user logged in's supervisee
            if( is_under_supervisee( $change_schedule->user_id ) ) {

                if(!empty($data)){
                    $this->update($data, $change_schedule);
                }

                $change_schedule->approve();
            }
            
            DB::commit();
            return $change_schedule;

        } catch (Exception $e) {
            DB::rollback();
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
        DB::beginTransaction();
        try {
            
            # Fetch the Change Schedule base on the ID
            $change_schedule = ChangeSchedule::findOrFail($id);

            // Authenticate the User first if the Change Schedule Submitter is under the user logged in's supervisee
            if( is_under_supervisee( $change_schedule->user_id ) ) {

                if(!empty($data)){
                    $this->update($data, $change_schedule);
                }

                $change_schedule->decline();
            }

            DB::commit();
            return $change_schedule;

        } catch (Exception $e) {
            DB::rollback();
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