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
     */
    public function store(array $data){
        DB::beginTransaction();
        try {

            $schedule = new Schedule;
            $schedule->name = $data['name'];
            $schedule->source_type = $data['source_type'];
            $schedule->schedule_type = $data['schedule_type'];
            $schedule->rest_days = get_rest_days( $data['work_days'] );
            $schedule->save();

            $this->save_schedule_details( $schedule, $data['schedule_details'] );
            $this->save_schedule_policies( $schedule, $data['schedule_policies'] );
            
            DB::commit();
            log_to_file('info', 'Success', [$schedule]);
            return $schedule;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file('critical', 'Error', [$e]);
            throw $e;
        }
    }

    /**
     *  Responsible for Updating the Schedule and it's Details and Policies. 
     */
    public function update(array $data, $id){
        DB::beginTransaction();
        try {

            $schedule = Schedule::findOrFail($id);
            $schedule->name = $data['name'];
            $schedule->source_type = $data['source_type'];
            $schedule->schedule_type = $data['schedule_type'];
            $schedule->rest_days = get_rest_days( $data['work_days'] );
            $schedule->save();

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
            log_to_file('critical', 'Error', [$e]);
            throw $e;
        }
    }

    /**
     *  Responsible for Soft-Deleting the Schedule and removing the rows of Schedule Details & Policies from Database
     */
    public function destroy($id){
        DB::beginTransaction();
        try {

            $schedule = Schedule::findOrFail($id);
            $schedule->schedule_details()->delete();
            $schedule->schedule_policies()->delete();
            $schedule->delete();

            DB::commit();
            log_to_file('info', 'Success', [$schedule]);
            return true;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file('critical', 'Error', [$e]);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching the Schedule with the ID given.
     */
    public function show($id){
        try {
            return Schedule::findOrFail($id);
        } catch (Exception $e) {
            throw $e;
        }
    }


    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################

    /**
     *  Responsible for saving the Schedule Details that was submitted.
     */
    protected function save_schedule_details(Schedule $schedule, $schedule_details){
        DB::beginTransaction();
        try{
            $schedule_details_array = [];

            # Saving of Schedule Details
            foreach( $schedule_details as $day => $details ){
                $schedule_details_array[ $day ] = new ScheduleDetail();
                $schedule_details_array[ $day ]->day               = $day;
                $schedule_details_array[ $day ]->start_time        = time_to_seconds($details['start_time']);
                $schedule_details_array[ $day ]->end_time          = time_to_seconds($details['end_time']);
                $schedule_details_array[ $day ]->start_flexy_time  = time_to_seconds($details['start_flexy_time']);
                $schedule_details_array[ $day ]->end_flexy_time    = time_to_seconds($details['end_flexy_time']);
                $schedule_details_array[ $day ]->break_time        = time_to_seconds($details['break_time']);
            }

            $schedule->schedule_details()->saveMany( $schedule_details_array );
            
            DB::commit();
            log_to_file('info', 'Success', [$schedule]);
            return true;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file('critical', 'Error', [$e]);
            throw $e;
        }
    }

    /**
     *  Responsible for saving the Schedule Policies that was submitted.
     */
    protected function save_schedule_policies(Schedule $schedule, $schedule_policies){
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
            log_to_file('info', 'Success', [$schedule]);
            return true;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file('critical', 'Error', [$e]);
            throw $e;
        }
    }

}