<?php 

namespace App\Modules\User\Repositories;

use App\Modules\User\Models\User;
use DebugBar\DebugBar;
use Exception;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserRepository implements UserRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Responsible for Storing the User. 
     * @param array (Post Variables) $data
     * @return User $user
     */
    public function store(array $data){
        DB::beginTransaction();
        try {

            // Write Code
            DB::commit();
            log_to_file('info', 'Success', [ /**  Variable */]);
            return null;  /**  Variable */;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Updating the User 
     * @param array (Post Variables) $data
     * @param $emp_num
     * @return User $user
     */
    public function update(array $data, $emp_num){
        DB::beginTransaction();
        try {

            // Write Code
            DB::commit();
            log_to_file('info', 'Success', [ /**  Variable */]);
            return null;  /**  Variable */;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Soft-Deleting the User
     * @param $id
     * @return bool
     */
    public function destroy($id){
        DB::beginTransaction();
        try {

            // Write Code
            DB::commit();
            log_to_file('info', 'Success', [ /**  Variable */]);
            return null;  /**  Variable */;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching the User with the Employee Number given.
     * @param $emp_num
     * @return User $user
     */
    public function show($emp_num){
        try {
            $user = User::findOrFail($emp_num);
            log_to_file('info', 'Success', [$user]);
            return $user;
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
            /** If there's a logged-in User */
            if( auth()->user() ) {

                # Gets the Employee from the Logged-in User's Supervisee.
                $employee = auth()->user()->supervisee()->findOrFail( $data['emp_num'] );

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

                log_to_file('info', 'Success', [$schedule]);
                return $schedule;
            }
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
                $schedule_policies_array[ $policy ]             = new SchedulePolicy();
                $schedule_policies_array[ $policy ]->policy     = $policy;
                $schedule_policies_array[ $policy ]->value      = $value;
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