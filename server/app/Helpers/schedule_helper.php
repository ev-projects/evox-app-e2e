<?php

if (! function_exists('create_work_day_rule')) {   
    /**
     * This function returns an Array that is consisted of the rules that must be implemented on the Work Day parameter.
     *
     * @param  String work_day
     * @return array|null;
     */
    function create_work_day_rule($work_day) {
        return [
            'schedule_details.'.$work_day.'.start_time'         => 'required|date_format:H:i',
            'schedule_details.'.$work_day.'.end_time'           => 'required|date_format:H:i',
            'schedule_details.'.$work_day.'.start_flexy_time'   => 'required_if:schedule_type,flexible|required_if:schedule_type,customize|date_format:H:i',
            'schedule_details.'.$work_day.'.end_flexy_time'     => 'required_if:schedule_type,flexible|required_if:schedule_type,customize|date_format:H:i',
            'schedule_details.'.$work_day.'.break_time'         => 'required|date_format:H:i',
        ];
    }
}



if (! function_exists('get_rest_days')) {   
    /**
     * This function returns an Array that is consisted of the Rest Days
     *
     * @param  Array work_days
     * @return array|null;
     */
    function get_rest_days($work_days) {
        return array_values(array_diff( get_constant('WORK_DAYS'), $work_days));
    }
}



if (! function_exists('get_work_days')) {   
    /**
     * This function returns an Array that is consisted of the Work Days
     *
     * @param  Array work_days
     * @return array|null;
     */
    function get_work_days($rest_days) {
        return array_values(array_diff( get_constant('WORK_DAYS'), $rest_days));
    }
}





if (! function_exists('time_to_seconds')) {   
    /**
     * This function returns a converted Time to Seconds
     *
     * @param  time time
     * @return timestamp seconds;
     */
    function time_to_seconds($time) {
        return strtotime($time) - strtotime('today');
    }
}


if (! function_exists('time_to_seconds_array')) {   
    /**
     * This function returns a an Array of converted Time to Seconds
     *
     * @param  array(timestamp) array_of_time
     * @return array(timestamp) array_of_seconds
     */
    function time_to_seconds_array( $array_of_time ) {
        foreach( $array_of_time as $key => $time ){
            if (preg_match("/^(?:2[0-3]|[01][0-9]):[0-5][0-9]$/", $time)) {
                $array_of_time[$key] = time_to_seconds( $time );
            }
        }
        return $array_of_time;
    }
}


if (! function_exists('seconds_to_time')) {   
    /**
     * This function returns a converted Seconds to Time
     *
     * @param  timestamp seconds
     * @return time time
     */
    function seconds_to_time( $seconds ) {
        return date('H:i', strtotime('today') + $seconds);
    }
}


if (! function_exists('seconds_to_time_array')) {   
    /**
     * This function returns an array of converted Seconds to Time
     *
     * @param  array(timestamp) array_of_seconds
     * @return array(timestamp) array_of_time
     */
    function seconds_to_time_array( $array_of_seconds ) {
        foreach( $array_of_seconds as $key => $seconds ){
            $array_of_seconds[$key] = seconds_to_time( $seconds );
        }
        return $array_of_seconds;
    }
}

if (! function_exists('seconds_to_time_object')) {   
    /**
     * This function returns an array of converted Seconds to Time
     *
     * @param  object(timestamp) object_of_seconds
     * @return object(timestamp) object_of_seconds_of_time
     */
    function seconds_to_time_object( $object_of_seconds ) {
        dd($object_of_seconds);
        foreach( $object_of_seconds as $object ){
            $object_of_seconds->$object = seconds_to_time( $object );
        }
        return $object_of_seconds;
    }
}