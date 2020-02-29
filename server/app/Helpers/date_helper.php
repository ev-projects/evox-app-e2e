<?php

use Carbon\Carbon;
use Carbon\CarbonPeriod;

if (! function_exists('generate_date_array')) {   
    /**
     * This function generates the Date Range between 2 dates.
     *
     * @param  Carbon|string $first_date
     * @param  Carbon|string|int $second_date_or_number_of_days
     * @return array $date_array
     */
    function generate_date_array( $first_date, $second_date_or_number_of_days ) 
    {
        try {
            $date_array = [];
            foreach ( CarbonPeriod::create($first_date, $second_date_or_number_of_days)->toArray() as $key => $value){
                $date_array[] = $value->format('Y-m-d');
            }
            return $date_array;
        }catch(Exception $e){
            throw $e;
        }
    }
}



if (! function_exists('get_day_from_date')) {   
    /**
     * This function gets the first three letter of the Day of the Date specified.
     *
     * @param  string $date
     * @return string
     */
    function get_day_from_date( $date ) 
    {
        try {
            return ( is_valid( $date ) ) ? strtolower(Carbon::parse($date)->format('D')) : null;
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
            return ( is_valid( $time ) ) ? strtotime($time) - strtotime('today') : null;
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
            return ( is_valid( $seconds ) ) ? date('H:i', strtotime('today') + $seconds) : null;
        }catch(Exception $e){
            throw $e;
        }
    }
}



if (! function_exists('datetime_to_timestamp')) {   
    /**
     * This function returns a converted Datetime to Timestamp 
     *
     * @param  datetime datetime
     * @return timestamp
     */
    function datetime_to_timestamp( $datetime ) 
    {
        try {
            return ( is_valid( $datetime ) ) ? strtotime($datetime) : null;
        }catch(Exception $e){
            throw $e;
        }
    }
}



if (! function_exists('timestamp_to_datetime')) {   
    /**
     * This function returns a converted Timestamp to Datetime
     *
     * @param  timestamp timestamp
     * @return datetime
     */
    function timestamp_to_datetime( $timestamp ) 
    {
        try {
            return ( is_valid( $timestamp ) ) ? date('Y-m-d H:i:s', $timestamp) : null;
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('merge_date_and_time')) {   
    /**
     * This function returns a Merged Date and Time variable.
     *
     * @param  date|timestamp $date
     * @param  time|timestamp $time
     * @return timestamp
     */
    function merge_date_and_time( $date, $time ) 
    {
        try {
            return ( ( !is_int($date)      ? strtotime($date) : $date ) + 
                     ( !is_int($time)      ? strtotime($time) : $time )
                    );
        }catch(Exception $e){
            throw $e;
        }
    }
}



if (! function_exists('add_days_to_timestamp')) {   
    /**
     * This function adds a specific amount of Days on a Timestamp.
     *
     * @param  date|timestamp $date
     * @param  int $days 
     * @return timestamp
     */
    function add_days_to_timestamp( $date, $days ) 
    {
        try {
            return ( ( !is_int($date)      ? strtotime($date) : $date ) + 
                        (3600*24) * $days
                    );
        }catch(Exception $e){
            throw $e;
        }
    }
}

if (! function_exists('add_time_to_timestamp')) {   
    /**
     * This function adds a specific amount of Time on a Timestamp.
     *
     * @param  date|timestamp $timestamp
     * @param  time|timestamp $time  (Format = H:i:s)
     * @return timestamp
     */
    function add_time_to_timestamp( $timestamp, $time ) 
    {
        try {
            return ( ( !is_int($timestamp)      ? strtotime($timestamp) : $timestamp ) + 
                     ( !is_int($time)           ? time_to_seconds($time) : $time )
                    );
        }catch(Exception $e){
            throw $e;
        }
    }
}

if (! function_exists('subtract_time_from_timestamp')) {   
    /**
     * This function subtracts a specific amount of Time on a Timestamp.
     *
     * @param  date|timestamp $timestamp
     * @param  time|timestamp $time  (Format = H:i:s)
     * @return timestamp
     */
    function subtract_time_from_timestamp( $timestamp, $time ) 
    {
        try {
            return ( ( !is_int($timestamp)      ? strtotime($timestamp) : $timestamp ) - 
                     ( !is_int($time)           ? time_to_seconds($time) : $time )
                    );
        }catch(Exception $e){
            throw $e;
        }
    }
}