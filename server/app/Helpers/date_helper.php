<?php

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Collection;

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
     * @param  boolean is_complete_date_format
     * @return time time
     */
    function seconds_to_time( $seconds = 0, $is_complete_date_format=false ) 
    {
        try {
            $date_format = ( $is_complete_date_format ) ? "H:i:s" : "H:i";
            return date($date_format, strtotime('today') + $seconds);
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

if (! function_exists('timestamp_to_date')) {   
    /**
     * This function returns a converted Timestamp to Date
     *
     * @param  timestamp timestamp
     * @return datetime
     */
    function timestamp_to_date( $timestamp ) 
    {
        try {
            return ( is_valid( $timestamp ) ) ? date('Y-m-d', $timestamp) : null;
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
                        get_constant("TIMESTAMP.day") * $days
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

if (! function_exists('subtract_days_from_timestamp')) {   
    /**
     * This function subtracts a specific amount of Days on a Timestamp.
     *
     * @param  date|timestamp $date
     * @param  int $days 
     * @return timestamp
     */
    function subtract_days_from_timestamp( $date, $days ) 
    {
        try {
            return ( ( !is_int($date)      ? strtotime($date) : $date ) - 
                        get_constant("TIMESTAMP.day") * $days
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


if (! function_exists('get_month_date_range')) {   
    /**
     * This function gets the Month Date range with their specific Start Day and End Day of the Month (Considering the Start and End date parameter in the condition.)
     *
     * @param  date $start_date
     * @param  date $end_date
     * @return Collection $date_range
     */
    function get_month_date_range( $start_date, $end_date ) 
    {
        try {
            $date_range = new Collection;

            # Gets all the Month between the Date Range.
            foreach ( CarbonPeriod::create($start_date, '1 month', $end_date)->toArray() as $month){

                # Sets the First and Last Day of the Iteration Month
                $first_day = Carbon::parse($month)->startOfMonth();
                $last_day = Carbon::parse($month)->endOfMonth();

                # If the Iteration Month is the same as the Date Range's Start Date, replace First Day's Data with Start Date
                if( $first_day->format('m') == Carbon::parse($start_date)->format('m') ) {
                    $first_day = Carbon::parse($start_date);

                # If the Iteration Month is the same as the Date Range's End Date, replace Last Day's Data with End Date
                } else if( $last_day->format('m') == Carbon::parse($end_date)->format('m') ) {
                    $last_day = Carbon::parse($end_date);
                }  

                # Push to Collection
                $date_range->push( (object) [
                    'year' => Carbon::parse($month)->format('Y'),
                    'month' => Carbon::parse($month)->format('m'),
                    'start_date' => $first_day->format('Y-m-d'),
                    'end_date' => $last_day->format('Y-m-d'),
                ]);
            }

            return $date_range;
        }catch(Exception $e){
            throw $e;
        }
    }
}