<?php

use App\Rules\ValidBreakTime;
use App\Modules\User\Models\User;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Models\EvoxDepartment;

if (! function_exists('create_work_day_rule')) {   
    /**
     * This function returns an Array that is consisted of the rules that must be implemented on the Work Day parameter.
     * @param  String work_day
     * @return array|null;
     */
    function create_work_day_rule($work_day) 
    {
        try {
            return [
                'schedule_details.'.$work_day.'.start_time'         => 'required|date_format:H:i',
                'schedule_details.'.$work_day.'.end_time'           => 'required|date_format:H:i',
                'schedule_details.'.$work_day.'.start_flexy_time'   => 'required_if:schedule_type,flexible|required_with:'.'schedule_details.'.$work_day.'.end_flexy_time'.'|date_format:H:i',
                'schedule_details.'.$work_day.'.end_flexy_time'     => 'required_if:schedule_type,flexible|required_with:'.'schedule_details.'.$work_day.'.start_flexy_time'.'|date_format:H:i',
                'schedule_details.'.$work_day.'.break_time'         => ['required', 'date_format:H:i', new ValidBreakTime],
            ];
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('get_rest_days')) {   
    /**
     * This function returns an Array that is consisted of the Rest Days
     *
     * @param  Array work_days
     * @return array|null;
     */
    function get_rest_days($work_days) 
    {
        try {
            return array_values(array_diff( get_constant('DAYS'), $work_days));
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('get_work_days')) {   
    /**
     * This function returns an Array that is consisted of the Work Days
     *
     * @param  Array work_days
     * @return array|null;
     */
    function get_work_days($rest_days) 
    {
        try {
            return array_values(array_diff( get_constant('DAYS'), $rest_days));
        }catch(Exception $e){
            throw $e;
        }
    }
}

##############################################################################################


if (! function_exists('generate_schedule_name')) {   
    /**
     * This function returns an array of converted Seconds to Time
     *
     * @param  array data (POST Variables)
     * @return string name
     */
    function generate_schedule_name( array $data ) 
    {
        try {
            $schedule_name = 'Schedule';
            
            // If the Source Type and the Schedule Type is set, generate the Schedule Name.
            if( isset( $data['source_type'] ) && isset( $data['schedule_type'] ) ){

                // Default format is {source_type} - {schedule_type}
                $schedule_name = '['.strtoupper($data['source_type']) . '] - ' . strtoupper($data['schedule_type']);

                if( $data['bind_to'] == 'user' ) {

                    // If the Source Type is 'default'/'template' and it's binded to the 'user' :
                    if( in_array( $data['source_type'], array('default', 'temporary') ) ) {

                        $employee = User::findOrFail( $data['bind_id'] );

                        // Generate a Default Format: [{source_type}]  - {Full Name} ({id})
                        $schedule_name = '['.strtoupper($data['source_type']) . '] - '. $employee->getFullName() . ' ('. $employee->id .')';
                    }
                    
                } else if( $data['bind_to'] == 'department' ) {

                    // If the Source Type is 'default' and it's binded to the 'department':
                    if( in_array( $data['source_type'], array('default') ) ) {
                        
                        // $department = Department::findOrFail( $data['bind_id'] );
                        $department = EvoxDepartment::where("Id", $data['bind_id']->department_id)->first();

                        // Generate a Default Format: [{source_type}]  - {Department Name} ({id})
                        $schedule_name = '['.strtoupper($data['source_type']) . '] - '. $department->Name . ' ('. $department->Id .')';
                    }
                }
            }
            return $schedule_name;
        }catch(Exception $e){
            throw $e;
        }
    }
}
