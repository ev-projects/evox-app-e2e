<?php

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use App\Rules\ValidBreakTime;

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
            return array_values(array_diff( get_constant('WORK_DAYS'), $work_days));
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
            return array_values(array_diff( get_constant('WORK_DAYS'), $rest_days));
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('time_to_seconds')) {   
    /**
     * This function returns a converted Time to Seconds
     *
     * @param  time time
     * @return timestamp seconds;
     */
    function time_to_seconds($time) 
    {
        try {
            return strtotime($time) - strtotime('today');
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('time_to_seconds_array')) {   
    /**
     * This function returns a an Array of converted Time to Seconds
     *
     * @param  array(timestamp) array_of_time
     * @return array(timestamp) array_of_seconds
     */
    function time_to_seconds_array( $array_of_time ) 
    {
        try {
            foreach( $array_of_time as $key => $time ){
                if (preg_match("/^(?:2[0-3]|[01][0-9]):[0-5][0-9]$/", $time)) {
                    $array_of_time[$key] = time_to_seconds( $time );
                }
            }
            return $array_of_time;
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('seconds_to_time')) {   
    /**
     * This function returns a converted Seconds to Time
     *
     * @param  timestamp seconds
     * @return time time
     */
    function seconds_to_time( $seconds ) 
    {
        try {
            return date('H:i', strtotime('today') + $seconds);
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('seconds_to_time_array')) {   
    /**
     * This function returns an array of converted Seconds to Time
     *
     * @param  array(timestamp) array_of_seconds
     * @return array(timestamp) array_of_time
     */
    function seconds_to_time_array( $array_of_seconds ) 
    {
        try {
            foreach( $array_of_seconds as $key => $seconds ){
                $array_of_seconds[$key] = seconds_to_time( $seconds );
            }
            return $array_of_seconds;
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('seconds_to_time_object')) {   
    /**
     * This function returns an array of converted Seconds to Time
     *
     * @param  object(timestamp) object_of_seconds
     * @return object(timestamp) object_of_seconds_of_time
     */
    function seconds_to_time_object( $object_of_seconds ) 
    {
        try {
            foreach( $object_of_seconds as $object ){
                $object_of_seconds->$object = seconds_to_time( $object );
            }
            return $object_of_seconds;
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
                        
                        // Generate a Default Format: [{source_type}]  - {Full Name} ({id})
                        // Enter code here......
                    }
                }
            }
            return $schedule_name;
        }catch(Exception $e){
            throw $e;
        }
    }
}
