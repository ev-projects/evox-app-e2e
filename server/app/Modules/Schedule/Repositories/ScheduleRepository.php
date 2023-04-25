<?php 

namespace App\Modules\Schedule\Repositories;

use Exception;
use Carbon\Carbon;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Model;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Department\Models\Department;
use App\Modules\Schedule\Models\ScheduleDetail;
use App\Modules\Schedule\Models\SchedulePolicy;

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
            $schedule->updated_by       = ( isset( $data['bind_id'] ) && is_valid( $data['bind_id'] ) ) ? $data['bind_id'] : auth()->user()->id ;
            $schedule->created_by       = ( isset( $data['bind_id'] ) && is_valid( $data['bind_id'] ) ) ? $data['bind_id'] : auth()->user()->id ;
            $schedule                   = $this->set_schedule_valid_date($schedule, $data);
            $schedule->save();

            $this->save_schedule_details( $schedule, $data['schedule_details'] );
            $this->save_schedule_policies( $schedule, $data['schedule_policies'] );
            $this->save_schedule_holiday_policies( $schedule, $data['schedule_policies'] );
            
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
     * @param Schedule (Schedule Instance/ ID String ) $id_or_schedule
     * @return Schedule $schedule
     */
    public function update(array $data, $id_or_schedule){
        DB::beginTransaction();
        try {
       
            
            $schedule =   ( $id_or_schedule instanceof Schedule ) ? $id_or_schedule : Schedule::findOrFail($id_or_schedule);

            $schedule->name             = ( isset( $data['name'] ) && is_valid( $data['name'] ) ) ? $data['name'] : $schedule->name;    # Reuse the Schedule Name if no new input was found.

            # Disabled the saving of Bind To and Bind ID since we dont need to update the bindings during update functions.
            // $schedule->bind_to          = ( isset( $data['bind_to'] ) && is_valid( $data['bind_to'] ) ) ? $data['bind_to'] : null;
            // $schedule->bind_id          = ( isset( $data['bind_id'] ) && is_valid( $data['bind_id'] ) ) ? $data['bind_id'] : null;

            $schedule->source_type      = ( isset( $data['source_type'] ) && is_valid( $data['source_type'] ) ) ? $data['source_type'] : null;
            $schedule->schedule_type    = ( isset( $data['schedule_type'] ) && is_valid( $data['schedule_type'] ) ) ? $data['schedule_type'] : null;
            $schedule->rest_days        = get_rest_days( $data['work_days'] );
            $schedule->updated_by       = auth()->user()->id;
            $schedule                   = $this->set_schedule_valid_date($schedule, $data);
            $schedule->update();
            
            # Deleting the Details and Policies before inserting the new one.
           
            // if($data["method"] != "approval"){
            $schedule->schedule_details()->delete();
            $schedule->schedule_policies()->delete();
            $this->save_schedule_details( $schedule, $data['schedule_details'] );
            $this->save_schedule_policies( $schedule, $data['schedule_policies'] );
            $this->save_schedule_holiday_policies( $schedule, $data['schedule_policies'] );
            // }
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
                $user = get_authenticated_user( $data['bind_id'] );
                
                $schedule = $this->assign_to_user( $data, $user );

            # If the Bind To is pointed for Department.
            } elseif( $data['bind_to'] == 'department' ) {

                # Gets the Department from the Bind ID..
                $department = Department::findOrFail(  $data['bind_id']);
                
                $schedule = $this->assign_to_department( $data, $department );
            }

            return $schedule;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Fetching Template Schedules
     * @return Collection $schedule_collection (Schedule)
     * 
     */
    public function get_template_schedules(){
        try {
            $schedule_collection = Schedule::select('id', 'name', 'schedule_type')
                                            ->where('source_type', 'template')
                                            ->orderBy('name', 'asc')
                                            ->get();
            return $schedule_collection;
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

            // dump("test");
            // dump($schedule);
            // dump($schedule_details);
           
            # Saving of the Filtered Schedule Details
            foreach( $this->filter_schedule_details($schedule, $schedule_details) as $day => $details ){
       
                $schedule_details_array[ $day ] = new ScheduleDetail();
                $schedule_details_array[ $day ]->day               = $day;
                $schedule_details_array[ $day ]->start_time        = ( is_numeric($details['start_time']) ? $details['start_time'] : time_to_seconds($details['start_time'], true, "subtract") );
                $schedule_details_array[ $day ]->end_time          = ( is_numeric($details['end_time']) ? $details['end_time'] : time_to_seconds($details['end_time'], true, "subtract") );
                $schedule_details_array[ $day ]->break_time        = ( is_numeric($details['break_time']) ? $details['break_time'] : time_to_seconds($details['break_time']) );

                # For Flexible Schedule
                if($schedule['schedule_type']=="flexible"){
                    $schedule_details_array[ $day ]->start_flexy_time  = ( is_numeric($details['start_flexy_time']) ? $details['start_flexy_time'] : time_to_seconds($details['start_flexy_time'], true, "subtract") );
                    $schedule_details_array[ $day ]->end_flexy_time    = ( is_numeric($details['end_flexy_time']) ? $details['end_flexy_time'] : time_to_seconds($details['end_flexy_time'], true, "subtract") );

                # Check if the start flexy and end flexy is existing since it's optional
                }elseif($schedule['schedule_type']=="customize"){
                    if( isset( $details['start_flexy_time'] ) && isset( $details['end_flexy_time'] ) ){
                        $schedule_details_array[ $day ]->start_flexy_time  = ( is_numeric($details['start_flexy_time']) ? $details['start_flexy_time'] : time_to_seconds($details['start_flexy_time'], true, "subtract") );
                        $schedule_details_array[ $day ]->end_flexy_time  = ( is_numeric($details['end_flexy_time']) ? $details['end_flexy_time'] : time_to_seconds($details['end_flexy_time'], true, "subtract") );
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

                if( in_array( $policy, get_constant('SCHEDULE_POLICIES') ) ) {
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
     *  Responsible for saving the Schedule Holiday Policies that was submitted.
     * @param Schedule $schedule
     * @param array (schedule_policies Post Variables) $schedule_policies
     * @return bool
     */
    protected function save_schedule_holiday_policies(Schedule $schedule, array $schedule_policies){
        DB::beginTransaction();
        try{
            $schedule_policies_array = [];

            # Saving of Schedule Policy
            foreach( $schedule_policies as $policy => $value ){

                if( in_array( $policy, get_constant('SCHEDULE_HOLIDAY_POLICIES') ) ) {
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
     * @param User $user
     * @return Schedule $schedule
     */
    protected function assign_to_user( array $data, User $user){
        try{

            # If Source Type is 'default' and the User has an existing Default Schedule, update the Schedule
            if ( $data['source_type'] == 'default' && $user->defaultSchedule()->count() > 0 ) {
                
                $schedule_id = $user->defaultSchedule()->first()->id;
                $schedule = $this->update( $data , $schedule_id );
                log_to_file( 'info', ucfirst($data['source_type']).' Schedule UPDATED', [$schedule->getAttributes()], "assign");

            # If Source Type is 'temporary' and the User has an existing From & To Temporary Schedule, retrieve it and Update that Schedule
            } else if ( $data['source_type'] == 'temporary' 
                &&  $user->temporarySchedules()->where([
                        ['valid_from', $data['valid_from']],
                        ['valid_to', $data['valid_to']]
                    ])->count() > 0) {

                $schedule_id =  $user->temporarySchedules()->where([
                                    ['valid_from', $data['valid_from']],
                                    ['valid_to', $data['valid_to']]
                                ])->first()->id;

                $schedule = $this->update( $data , $schedule_id );
                log_to_file( 'info', ucfirst($data['source_type']).' Schedule UPDATED', [$schedule->getAttributes()], "assign");
    
            # If not existing, Insert the new Schedule
            } else {
                $schedule = $this->store( $data );
                log_to_file( 'info', ucfirst($data['source_type']).' Schedule INSERTED', [$schedule->getAttributes()], "assign");
            }
            
            return $schedule;
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     *  Responsible for Assigning the Schedule for a Department.
     * @param array (schedule Post Variables) $data
     * @param Department $department
     * @return Schedule $schedule
     */
    protected function assign_to_department( array $data, Department $department){
        try{
            
            # If the Department has an existing Default Schedule, update the Schedule
            if ( $department->defaultSchedule()->count() > 0 ) {
                
                $schedule = $department->defaultSchedule()->first();

                if( is_valid( $data['action'] ) ) {

                    switch( $data['action'] ){

                        // Update the Schedule Holiday Policy only ( allow_legal_holiday, allow_special_holiday )
                        case "assign_schedule_holiday_policy":
                            $schedule->schedule_policies()->whereIn('policy', get_constant('SCHEDULE_HOLIDAY_POLICIES'))->delete();
                            $this->save_schedule_holiday_policies( $schedule, $data['schedule_policies'] );
                            break;
                            
                        // Update the Schedule Policy only ( allow_late, allow_undertime, allow_nightdiff )
                        case "assign_schedule_policy":
                            $schedule->schedule_policies()->whereIn('policy', get_constant('SCHEDULE_POLICIES'))->delete();
                            $this->save_schedule_policies( $schedule, $data['schedule_policies'] );
                            break;
    
                        // Update the whole schedule and its Schedule Details and Policies
                        default:
                            $schedule = $this->update( $data , $schedule->id);
                            break;
                            
                    }
                } else {
                    $schedule = $this->update( $data , $schedule->id);
                }

                log_to_file( 'info', ucfirst($data['source_type']).' Schedule UPDATED '.( is_valid( $data['action'] ) ? ' [Action:'.$data['action'].']' : '' ), [$schedule->getAttributes()], "assign");

            # If not existing, Insert the new Schedule
            } else {
                $schedule = $this->store( $data );
                log_to_file( 'info', ucfirst($data['source_type']).' Schedule INSERTED', [$schedule->getAttributes()], "assign");
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




    /**
     *  Responsible for Replicating an existing Schedule and apply it to a specific user.
     * @param Schedule|null $schedule
     * @param User $user
     * 
     * @return array $to_compute_items
     */
    public function copy_schedule_to_user( $schedule, User $user ) {

        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "assign");

            $new_schedule = null;

            if( is_valid( $schedule ) ) {
            

                // Replicate the Schedule parameter into a new Schedule and change the bindings and names specifically for the user.
                $new_schedule = $schedule->replicate();
                $new_schedule->bind_to =  'user';
                $new_schedule->bind_id =  $user->id;
                $new_schedule->name =  generate_schedule_name( $new_schedule->toArray() );
                $new_schedule->save();



                // Iterate the Schedule Details into a new Schedule details and change the schedule ID with the newly generated Schedule
                foreach( $schedule->schedule_details()->get() as $schedule_detail ){
                    $new_schedule_detail = $schedule_detail->replicate();
                    $new_schedule_detail->schedule_id = $new_schedule->id;
                    $new_schedule_detail->save();
                }

                // Iterate the Schedule Policy into a new Schedule details and change the schedule ID with the newly generated Schedule
                foreach( $schedule->schedule_policies()->get() as $schedule_policy ){
                    $new_schedule_policy = $schedule_policy->replicate();
                    $new_schedule_policy->schedule_id = $new_schedule->id;
                    $new_schedule_policy->save();
                }
            }
            // Create Default Schedule for user if the department does not have a set schedule for user to be based on
            else{
              
                $source_type =  get_constant('DTR_SOURCE_TYPE_TAGGING')['default'];

                $new_schedule = new Schedule();
                $new_schedule->bind_to =  'user';
                $new_schedule->bind_id =  $user->id;
                $new_schedule->name =  '['.strtoupper( $source_type) . '] - '. $user->getFullName() . ' ('. $user->id .')';
                $new_schedule->source_type = get_constant('DEFAULT_SCHEDULE')['source_type']; 
                $new_schedule->schedule_type = get_constant('DEFAULT_SCHEDULE')['schedule_type']; 
                $new_schedule->rest_days = array_values(array_diff( get_constant('DAYS'), get_constant('DEFAULT_SCHEDULE')['work_days'] ));
                $new_schedule->updated_by = get_constant('DEFAULT_SCHEDULE')['updated_by']; 
                $new_schedule->created_by = get_constant('DEFAULT_SCHEDULE')['created_by']; 
                $new_schedule->valid_from = Carbon::now()->toDateString(); 
                $new_schedule->save();
            
                $insertedpolicy = SchedulePolicy::insert([
                    [
                        'schedule_id'           => $new_schedule->id, 
                        'policy'                => 'allow_late',
                        'value'                 => 1
                    ],
                    [
                        'schedule_id'           => $new_schedule->id, 
                        'policy'                => 'allow_night_diff',
                        'value'                 => 0
                    ],
                    [
                        'schedule_id'           => $new_schedule->id, 
                        'policy'                => 'allow_undertime',
                        'value'                 => 1
                    ],
                ]);
                
                $inserteddetails =ScheduleDetail::insert([
                        [
                        'schedule_id'           => $new_schedule->id, 
                        'day'                   => get_constant('DEFAULT_SCHEDULE_DETAILS')['day'],
                        'start_time'            => get_constant('DEFAULT_SCHEDULE_DETAILS')['start_time'],
                        'end_time'              => get_constant('DEFAULT_SCHEDULE_DETAILS')['end_time'],
                        'break_time'            => get_constant('DEFAULT_SCHEDULE_DETAILS')['break_time'],
                        ]
                    ],
                );
             
            }
            
            DB::commit();

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "assign");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "assign");
            return $new_schedule;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "assign");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "assign");
            log_error($e);
            throw $e;
        }
    }




    /**
     *  Responsible for replicating the Schedule Holiday Policies of the Schedule and apply it to a specific user.
     * @param Schedule $schedule
     * @param Schedule $schedule_to_copy
     * 
     * @return Schedule $schedule
     */
    public function replicate_schedule_holiday_policy(Schedule $schedule, Schedule $schedule_to_copy) {

        DB::beginTransaction();
        try {

            log_to_file('info', get_constant('LOG_START') . __FUNCTION__ , [], "assign");
            if( is_valid( $schedule ) && is_valid( $schedule_to_copy )) {

                $schedule_policies  = $schedule_to_copy
                    ->schedule_policies()
                    ->pluck('value','policy')
                    ->toArray();
                # Deleting the Schedule Holiday Policies before inserting the new one.
                $schedule->schedule_policies()->whereIn('policy', get_constant('SCHEDULE_HOLIDAY_POLICIES'))->delete();

                # Insert the new Schedule Holiday Policies
                $this->save_schedule_holiday_policies( $schedule, $schedule_policies );
            }
            
            DB::commit();

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "assign");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "assign");
            return $schedule;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "assign");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "assign");
            log_error($e);
            throw $e;
        }
    }
    




    /**
     *  Responsible for replicating the details of the Schedule and apply it to a specific user.
     * @param Schedule $schedule
     * @param Schedule $schedule_to_copy
     * 
     * @return Schedule $schedule
     */
    public function replicate_schedule_policy(Schedule $schedule, Schedule $schedule_to_copy) {

        DB::beginTransaction();
        try {

            log_to_file('info', get_constant('LOG_START') . __FUNCTION__ , [], "assign");
            if( is_valid( $schedule ) && is_valid( $schedule_to_copy )) {

                $schedule_policies  = $schedule_to_copy
                    ->schedule_policies()
                    ->pluck('value','policy')
                    ->toArray();

                # Deleting the Schedule Policies before inserting the new one.
                $schedule->schedule_policies()->whereIn('policy', get_constant('SCHEDULE_POLICIES'))->delete();

                # Insert the new Schedule Holiday Policies
                $this->save_schedule_policies( $schedule, $schedule_policies );
                
            }
            
            DB::commit();

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "assign");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "assign");
            return $schedule;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "assign");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "assign");
            log_error($e);
            throw $e;
        }
    }




    /**
     *  Responsible for replicating the details of the Schedule and apply it to a specific user.
     * @param Schedule $schedule
     * @param Schedule $schedule_to_copy
     * 
     * @return Schedule $schedule
     */
    public function replicate_schedule(Schedule $schedule, Schedule $schedule_to_copy) {

        DB::beginTransaction();
        try {
         
            log_to_file('info', get_constant('LOG_START') . __FUNCTION__ , [], "assign");
            if( is_valid( $schedule ) && is_valid( $schedule_to_copy )) {

                $schedule_details = $schedule_to_copy
                    ->schedule_details()
                    ->get()
                    ->mapWithKeys(function ($schedule_detail) {
                        return [ $schedule_detail['day'] => $schedule_detail ]; 
                    })
                ->toArray();

                $schedule_policies  = $schedule_to_copy
                    ->schedule_policies()
                    ->pluck('value','policy')
                    ->toArray();

                $schedule->schedule_type = $schedule_to_copy->schedule_type;
                $schedule->valid_from = $schedule_to_copy->valid_from;
                $schedule->valid_to = $schedule_to_copy->valid_to;
                $schedule->rest_days = $schedule_to_copy->rest_days;
                $schedule->update();

                # Deleting the Details and Policies before inserting the new one.
                $schedule->schedule_details()->delete();
                $schedule->schedule_policies()->delete();

                $this->save_schedule_details( $schedule, $schedule_details );
                $this->save_schedule_policies( $schedule, $schedule_policies );
                $this->save_schedule_holiday_policies( $schedule, $schedule_policies );
                
            }
            
            DB::commit();

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "assign");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "assign");
            return $schedule;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "assign");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "assign");
            log_error($e);
            throw $e;
        }
    }


    




    /**
     *  Responsible for Applying the newly fetched Drupal Default Schedule to EVOX
     * @param array $drupal_evox_default_schedule_array
     * 
     * @return array $to_compute_items
     */
    public function  apply_drupal_evox_data_to_default_schedule( array $drupal_evox_default_schedule_array ) {

        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "drupal_migration");
            
            $result = [];

            // Iterates the Array fetched from the Drupal Database
            foreach( $drupal_evox_default_schedule_array as $drupal_evox_default_schedule) {

                // Fetch the User via the emp_num field of the User
                $user = User::where(['emp_num' => $drupal_evox_default_schedule->emp_num])->first();

                // Checks if the user is existing
                if( is_valid( $user ) ) {
                    
                    // Construct the Data to be inserted as Schedule
                    $data = $this->parse_drupal_evox_schedule( $drupal_evox_default_schedule, $user, 'default' );
                    
                    // Assign the Default Schedule to the User
                    $schedule = $this->assign_to_user( $data, $user);
                    log_to_file( 'info', 'Default Schedule UPDATED/INSERTED', [$schedule->getAttributes()], "drupal_migration");

                    $result[] = $schedule;

                } else {
                    log_to_file( 'info', 'User not existing', [$drupal_evox_default_schedule], "drupal_migration");
                    $users_not_existing[$drupal_evox_default_schedule->emp_num] = $drupal_evox_default_schedule->emp_num;
                }
                
            }
            
            DB::commit();

            if( count( $users_not_existing ) > 0 ){
                log_to_file( 'info', 'Employee Numbers that does not exist"', [$users_not_existing], "drupal_migration");
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            log_error($e);
            throw $e;
        }
    }




    /**
     *  Responsible for Applying the newly fetched Drupal Temporary Schedule to EVOX
     * @param array $drupal_evox_temporary_schedule_array
     * 
     * @return array $to_compute_items
     */
    public function  apply_drupal_evox_data_to_temporary_schedule( array $drupal_evox_temporary_schedule_array ) {

        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "drupal_migration");
            
            $result = [];

            // Iterates the Array fetched from the Drupal Database
            foreach( $drupal_evox_temporary_schedule_array as $drupal_evox_temporary_schedule) {
                
                // Fetch the User via the emp_num field of the User
                $user = User::where(['emp_num' => $drupal_evox_temporary_schedule->emp_num])->first();

                // Checks if the user is existing
                if( is_valid( $user ) ) {

                    // Construct the Data to be inserted as Schedule
                    $data = $this->parse_drupal_evox_schedule( $drupal_evox_temporary_schedule, $user, 'temporary'  );

                    // Assign the Temporary Schedule to the User
                    $schedule = $this->assign_to_user( $data, $user);
                    log_to_file( 'info', 'Temporary Schedule UPDATED/INSERTED', [$schedule->getAttributes()], "drupal_migration");

                    $result[] = $schedule;

                } else {
                    log_to_file( 'info', 'User not existing', [$drupal_evox_temporary_schedule], "drupal_migration");
                    $users_not_existing[$drupal_evox_temporary_schedule->emp_num] = $drupal_evox_temporary_schedule->emp_num;
                }
                
            }
            
            DB::commit();

            if( count( $users_not_existing ) > 0 ){
                log_to_file( 'info', 'Employee Numbers that does not exist"', [$users_not_existing], "drupal_migration");
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            log_error($e);
            throw $e;
        }
    }






    /**
     *  Responsible for parsing the Drupal Schedule to a $data variable that is being accepted by the update/store/assign_to_employee value
     * @param object $drupal_evox_schedule
     * 
     * @return array $data
     */
    private function parse_drupal_evox_schedule( $drupal_evox_schedule, $user, $source_type ){
  
        // Construct the Data to be inserted as Schedule
        $data = [
            'bind_to'           => 'user',
            'bind_id'           => $user->id,
            'source_type'       => $source_type,
            'schedule_type'     => $drupal_evox_schedule->schedule_type,
            'valid_from'        => $drupal_evox_schedule->valid_from,
            'valid_to'          => $drupal_evox_schedule->valid_to ?? null,
            'work_days'         => explode(',', $drupal_evox_schedule->work_days),
            'schedule_policies' => [
                'allow_undertime'   => $drupal_evox_schedule->allow_undertime,
                'allow_late'        => $drupal_evox_schedule->allow_late,
                'allow_night_diff'  => $drupal_evox_schedule->allow_night_diff,
            ]
        ];

        // Construct the Schedule Detail 
        switch( $drupal_evox_schedule->schedule_type ){
            case "standard":
                $data['schedule_details'] = [
                    'all' => [
                        'start_time'    => $drupal_evox_schedule->standard_start_time,
                        'end_time'      => $drupal_evox_schedule->standard_end_time,
                        'break_time'    => $drupal_evox_schedule->standard_break_time,
                    ]
                ];
                break;
            case "flexible":
                $data['schedule_details'] = [
                    'all' => [
                        'start_time'          => $drupal_evox_schedule->flexy_start_time,
                        'end_time'            => $drupal_evox_schedule->flexy_end_time,
                        'start_flexy_time'    => $drupal_evox_schedule->flexy_start_flexy_time,
                        'end_flexy_time'      => $drupal_evox_schedule->flexy_end_flexy_time,
                        'break_time'          => $drupal_evox_schedule->flexy_break_time,
                    ]
                ];
                break;
            case "customize":
                $customized_schedule_details = [];
                foreach( explode(',', $drupal_evox_schedule->work_days) as $work_day){
                        $customized_schedule_details[$work_day] = [
                        'start_time'          => $drupal_evox_schedule->{$work_day.'_start_time'},
                        'end_time'            => $drupal_evox_schedule->{$work_day.'_end_time'},
                        'start_flexy_time'    => $drupal_evox_schedule->{$work_day.'_start_flexy_time'},
                        'end_flexy_time'      => $drupal_evox_schedule->{$work_day.'_end_flexy_time'},
                        'break_time'          => $drupal_evox_schedule->{$work_day.'_break_time'}
                    ];
                }
                $data['schedule_details'] = $customized_schedule_details;
                break;
        }

        return $data;
    }

}