<?php 

namespace App\Modules\Schedule\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Models\ScheduleDetail;
use App\Modules\Schedule\Models\SchedulePolicy;

use App\Modules\User\Models\User;
use Exception;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleRepository implements ScheduleRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Responsible for Storing the Schedule and it's Details and Policies. 
     * @param array (schedule Post Variables) $data
     * @return Schedule $schedule
     */
    public function store(array $data){
        DB::beginTransaction();
        try {

            $schedule = new Schedule;

            /**  Check if there's a data for Name. If it's not valid, generate a Schedule Name base from the Data. */
                $schedule->name         = ( isset( $data['name'] ) && is_valid( $data['name'] ) ) ? $data['name'] : generate_schedule_name( $data );
            /** */

            $schedule->bind_to          = ( isset( $data['bind_to'] ) && is_valid( $data['bind_to'] ) ) ? $data['bind_to'] : null;
            $schedule->bind_id          = ( isset( $data['bind_id'] ) && is_valid( $data['bind_id'] ) ) ? $data['bind_id'] : null;

            $schedule->source_type      = ( isset( $data['source_type'] ) && is_valid( $data['source_type'] ) ) ? $data['source_type'] : null;
            $schedule->schedule_type    = ( isset( $data['schedule_type'] ) && is_valid( $data['schedule_type'] ) ) ? $data['schedule_type'] : null;
            $schedule->valid_from       = ( isset( $data['valid_from'] ) && is_valid( $data['valid_from'] ) ) ? $data['valid_from'] : null;
            $schedule->valid_to         = ( isset( $data['valid_to'] ) && is_valid( $data['valid_to'] ) ) ? $data['valid_to'] : null;
            $schedule->rest_days        = get_rest_days( $data['work_days'] );
            $schedule->updated_by       = auth()->user()->id;
            $schedule->created_by       = auth()->user()->id;
            $schedule                   = $this->set_schedule_valid_date($schedule, $data);
            $schedule->save();

            $this->save_schedule_details( $schedule, $data['schedule_details'] );
            $this->save_schedule_policies( $schedule, $data['schedule_policies'] );
            
            DB::commit();
            log_to_file('info', 'Success', [$schedule]);
            return $schedule;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Updating the Schedule and it's Details and Policies. 
     * @param array (schedule Post Variables) $data
     * @param $id
     * @return Schedule $schedule
     */
    public function update(array $data, $id){
        DB::beginTransaction();
        try {

            $schedule = Schedule::findOrFail($id);
            $schedule->name             = ( isset( $data['name'] ) && is_valid( $data['name'] ) ) ? $data['name'] : $schedule->name;    # Reuse the Schedule Name if no new input was found.

            $schedule->bind_to          = ( isset( $data['bind_to'] ) && is_valid( $data['bind_to'] ) ) ? $data['bind_to'] : null;
            $schedule->bind_id          = ( isset( $data['bind_id'] ) && is_valid( $data['bind_id'] ) ) ? $data['bind_id'] : null;

            $schedule->source_type      = ( isset( $data['source_type'] ) && is_valid( $data['source_type'] ) ) ? $data['source_type'] : null;
            $schedule->schedule_type    = ( isset( $data['schedule_type'] ) && is_valid( $data['schedule_type'] ) ) ? $data['schedule_type'] : null;
            $schedule->rest_days        = get_rest_days( $data['work_days'] );
            $schedule->updated_by       = auth()->user()->id;
            $schedule                   = $this->set_schedule_valid_date($schedule, $data);
            $schedule->update();
            
            # Deleting the Details and Policies before inserting the new one.
            $schedule->schedule_details()->delete();
            $schedule->schedule_policies()->delete();

            $this->save_schedule_details( $schedule, $data['schedule_details'] );
            $this->save_schedule_policies( $schedule, $data['schedule_policies'] );

            DB::commit();
            log_to_file('info', 'Success', [$schedule]);
            return $schedule;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Soft-Deleting the Schedule and removing the rows of Schedule Details & Policies from Database
     * @param $id
     * @return bool
     */
    public function destroy($id){
        DB::beginTransaction();
        try {
            $schedule = Schedule::findOrFail($id);

            $schedule->updated_by = auth()->user()->id;
            $schedule->update();

            $schedule->schedule_details()->delete();
            $schedule->schedule_policies()->delete();
            $schedule->delete();

            DB::commit();
            log_to_file('info', 'Success', [$schedule]);

            return true;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching the Schedule with the ID given.
     * @param $id
     * @return Schedule $schedule
     */
    public function show($id){
        try {
            $schedule = Schedule::findOrFail($id);
            log_to_file('info', 'Success', [$schedule]);
            return $schedule;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Creating/Updating of Schedule and Assigning it on a specific User.
     * @param array (schedule Post Variables) $data
     * @return Schedule $schedule
     * 
     */
    public function assign( array $data ){
        try {

            $schedule = null;

            # If the Bind To is pointed for User.
            if( $data['bind_to'] == 'user' ) {

                # Gets the Employee from the Logged-in User's Supervisee by Employee Number.
                $employee = auth()->user()->supervisee()->findOrFail( $data['bind_id'] );
                
                $schedule = $this->assign_to_employee( $data, $employee );
            }

            return $schedule;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################

    /**
     *  Responsible for saving the Schedule Details that was submitted.
     * @param Schedule $schedule
     * @param array (schedule_details Post Variables) $schedule_details
     * @return bool
     */
    protected function save_schedule_details(Schedule $schedule, array $schedule_details){
        DB::beginTransaction();
        try{
            $schedule_details_array = [];
            
            # Saving of the Filtered Schedule Details
            foreach( $this->filter_schedule_details($schedule, $schedule_details) as $day => $details ){
                $schedule_details_array[ $day ] = new ScheduleDetail();
                $schedule_details_array[ $day ]->day               = $day;
                $schedule_details_array[ $day ]->start_time        = time_to_seconds($details['start_time']);
                $schedule_details_array[ $day ]->end_time          = time_to_seconds($details['end_time']);
                $schedule_details_array[ $day ]->break_time        = time_to_seconds($details['break_time']);

                # For Flexible Schedule
                if($schedule['schedule_type']=="flexible"){
                    $schedule_details_array[ $day ]->start_flexy_time  = time_to_seconds($details['start_flexy_time']);
                    $schedule_details_array[ $day ]->end_flexy_time    = time_to_seconds($details['end_flexy_time']);

                # Check if the start flexy and end flexy is existing since it's optional
                }elseif($schedule['schedule_type']=="customize"){
                    if( isset( $details['start_flexy_time'] ) && isset( $details['end_flexy_time'] ) ){
                        $schedule_details_array[ $day ]->start_flexy_time  = time_to_seconds($details['start_flexy_time']);
                        $schedule_details_array[ $day ]->end_flexy_time  = time_to_seconds($details['end_flexy_time']);
                    }
                }
            }

            $schedule->schedule_details()->saveMany( $schedule_details_array );
            
            DB::commit();
            log_to_file('info', 'Success', [$schedule_details_array]);
            return true;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for saving the Schedule Policies that was submitted.
     * @param Schedule $schedule
     * @param array (schedule_policies Post Variables) $schedule_policies
     * @return bool
     */
    protected function save_schedule_policies(Schedule $schedule, array $schedule_policies){
        DB::beginTransaction();
        try{
            $schedule_policies_array = [];

            # Saving of Schedule Policy
            foreach( $schedule_policies as $policy => $value ){

                // Don't save if the value of the policy is 0.
                if( $value != 0 ) {
                    $schedule_policies_array[ $policy ]             = new SchedulePolicy();
                    $schedule_policies_array[ $policy ]->policy     = $policy;
                    $schedule_policies_array[ $policy ]->value      = $value;
                }
            }

            $schedule->schedule_policies()->saveMany( $schedule_policies_array );
            
            DB::commit();
            log_to_file('info', 'Success', [$schedule_policies_array]);
            return true;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Assigning the Schedule for a User.
     * @param array (schedule Post Variables) $data
     * @param Employee $employee
     * @return Schedule $schedule
     */
    protected function assign_to_employee( array $data, User $employee){
        try{

            # If Source Type is 'default' and the User has an existing Default Schedule, update the Schedule
            if ( $data['source_type'] == 'default' && $employee->defaultSchedule()->count() > 0 ) {
                
                $schedule_id = $employee->defaultSchedule()->first()->id;
                $schedule = $this->update( $data , $schedule_id );

            # If Source Type is 'temporary' and the User has an existing From & To Temporary Schedule, retrieve it and Update that Schedule
            } else if ( $data['source_type'] == 'temporary' 
                &&  $employee->temporarySchedules()->where([
                        ['valid_from', $data['valid_from']],
                        ['valid_to', $data['valid_to']]
                    ])->count() > 0) {

                $schedule_id =  $employee->temporarySchedules()->where([
                                    ['valid_from', $data['valid_from']],
                                    ['valid_to', $data['valid_to']]
                                ])->first()->id;

                $schedule = $this->update( $data , $schedule_id );
    
            # If not existing, Insert the new Schedule
            } else {
                $schedule = $this->store( $data );
            }
            
            return $schedule;
        } catch (Exception $e) {
            throw $e;
        }
    }
    ###############################################################################################
    ##################################### Validation functions #####################################
    ###############################################################################################

    /**
     *  Filters the valid Schedule Details base on the Schedule Type. 
     * @param Schedule $schedule
     * @param array (schedule_details Post Variables) $schedule_details
     * @return array $result
     */
    protected function filter_schedule_details(Schedule $schedule, array $schedule_details){
        $result = [];
        /*
        *   If the Schedule Type is Customize and the Day is within the Work days array, include the Schedule Details on the result array.
        *   If the Schedule Type is Standard/Flexible and the Day is 'all', include the Schedule Details on the result array.
        */
        foreach( $schedule_details as $day => $details ){
            if( ( $schedule->schedule_type == "customize" && in_array( $day, get_work_days( $schedule->rest_days ) ) ) 
                ||  
                ( in_array( $schedule->schedule_type, array( 'standard', 'flexible' ) ) && $day == 'all') ){
                    $result[ $day ] = $details;
            }
        }
        return $result;
    }

    /**
     *  Sets the Schedule's Valid From and To dates base from the Post Variables submitted.
     * @param Schedule $schedule
     * @param array (schedule Post Variables) $data
     * @return Schedule $schedule
     */
    protected function set_schedule_valid_date(Schedule $schedule, array $data){

        /** Saves the Valid From and To base on the Source Type */
        switch( $data['source_type'] ) {

            # For Template, No data needed for Valid From and To so manually setting it as a null.
            case 'template':
                $schedule->valid_from   = null;
                $schedule->valid_to     = null;
                break;

            # For Default, Valid From is the only one who needs a data.
            case 'default':
                $schedule->valid_from   = ( isset( $data['valid_from'] ) && is_valid( $data['valid_from'] ) ) ? $data['valid_from'] : null;
                $schedule->valid_to     = null;
                break;

            # For Temporary and Change Schedule, Valid From and To's data must be saved.
            case 'temporary':
            case 'change_schedule':
                    $schedule->valid_from  = ( isset( $data['valid_from'] ) && is_valid( $data['valid_from'] ) ) ? $data['valid_from'] : null;
                    $schedule->valid_to    = ( isset( $data['valid_to'] ) && is_valid( $data['valid_to'] ) ) ? $data['valid_to'] : null;
                break;
        }

        return $schedule;
    }


}