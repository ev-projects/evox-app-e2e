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
    function time_to_seconds($time, $with_offset = false, $offset_operation = "add" ) 
    {
        try {
                if(Auth::user() && Auth::user()->country_timezone_to_offset() != null && $with_offset){
                    if($offset_operation == "add"){
                        return ( is_valid( $time ) ) ? strtotime($time) - strtotime('today') + string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): null;
                    }else if($offset_operation == "subtract"){
                        return ( is_valid( $time ) ) ? strtotime($time) - strtotime('today') - string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): null;
                    }
                    else{
                        return ( is_valid( $time ) ) ? strtotime($time) - strtotime('today') : null;
                    }
                }
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
    function seconds_to_time( $seconds = 0, $is_complete_date_format=false, $with_offset = false) 
    {
        try {
            # If the Seconds are less than equal the Timestamp of a Day (86,400), format by default proceedure.
            if( $seconds <= get_constant('TIMESTAMP.day') ) {
                
                $date_format = ( $is_complete_date_format ) ? "H:i:s" : "H:i";
                if(Auth::user() && Auth::user()->country_timezone_to_offset() != null && $with_offset ){
                    return date($date_format, strtotime('today') + $seconds + string_offset_to_seconds(Auth::user()->country_timezone_to_offset()));
                }
                //DEFAULT OUTPUT
                return date($date_format, strtotime('today') + $seconds);
                
            # If the Seconds are greater than the Timestamp of the Day (86,400), Format the Time in another way.
            } else {
                
                $separator = ':';
                $end_seconds =( $is_complete_date_format ) ? $separator . ($seconds%60) : '';
                if(Auth::user() && Auth::user()->country_timezone_to_offset() != null && $with_offset){
                    return sprintf("%02d%s%02d", floor($seconds/3600), $separator, ($seconds + string_offset_to_seconds(Auth::user()->country_timezone_to_offset())/60)%60) . $end_seconds;
                }

                //DEFAULT OUTPUT
                return sprintf("%02d%s%02d", floor($seconds/3600), $separator, ($seconds/60)%60) . $end_seconds;
            }
        }catch(Exception $e){
            throw $e;
        }
    }
}



if (! function_exists('seconds_to_time_POV')) {   
    /**
     * This function returns a converted Seconds to Time
     *
     * @param  timestamp seconds
     * @param  boolean is_complete_date_format
     * @return time time
     */
    function seconds_to_time_POV( $seconds = 0, $is_complete_date_format=false, $with_offset = false, $user) 
    {
      
        try {
            # If the Seconds are less than equal the Timestamp of a Day (86,400), format by default proceedure.
            if( $seconds <= get_constant('TIMESTAMP.day') ) {
                
                $date_format = ( $is_complete_date_format ) ? "H:i:s" : "H:i";
                if($user && $user->country_timezone_to_offset() != null && $with_offset ){
                    return date($date_format, strtotime('today') + $seconds + string_offset_to_seconds($user->country_timezone_to_offset()));
                }
                //DEFAULT OUTPUT
                return date($date_format, strtotime('today') + $seconds);
                
            # If the Seconds are greater than the Timestamp of the Day (86,400), Format the Time in another way.
            } else {
                
                $separator = ':';
                $end_seconds =( $is_complete_date_format ) ? $separator . ($seconds%60) : '';
                if($user && $user->country_timezone_to_offset() != null && $with_offset){
                    return sprintf("%02d%s%02d", floor($seconds/3600), $separator, ($seconds + string_offset_to_seconds($user->country_timezone_to_offset())/60)%60) . $end_seconds;
                }

                //DEFAULT OUTPUT
                return sprintf("%02d%s%02d", floor($seconds/3600), $separator, ($seconds/60)%60) . $end_seconds;
            }
        }catch(Exception $e){
            throw $e;
        }
    }
}






if (! function_exists('seconds_to_hour')) {   
    /**
     * This function returns a converted Seconds to Time
     *
     * @param  timestamp seconds

     */
    function seconds_to_hour( $seconds = 0 ) 
    {
        try {
            return clean_number($seconds/3600);
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



// if (! function_exists('timestamp_to_datetime')) {   
//     /**
//      * This function returns a converted Timestamp to Datetime
//      *
//      * @param  timestamp timestamp
//      * @return datetime
//      */
//     function timestamp_to_datetime( $timestamp ) 
//     {
//         try {
//             return ( is_valid( $timestamp ) ) ? date('Y-m-d H:i:s', $timestamp) : null;
//         }catch(Exception $e){
//             throw $e;
//         }
//     }
// }

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
        //    if(Auth::user() && Auth::user()->timezone != null){
            // return ( is_valid( $timestamp ) ) ?  Carbon::createFromTimestamp( $timestamp )->setTimezone(Auth::user()->timezone)->format('Y-m-d H:i:s') : null;
            
        //    }
           
        if(Auth::user() && Auth::user()->country_timezone_to_offset() != null){
            
            return ( is_valid( $timestamp ) ) ? date('Y-m-d H:i:s', $timestamp+ string_offset_to_seconds(Auth::user()->country_timezone_to_offset())) : null;
        }
            return ( is_valid( $timestamp ) ) ? date('Y-m-d H:i:s', $timestamp) : null;
        }catch(Exception $e){
            throw $e;
        }
    }
}

if (! function_exists('timestamp_to_datetime_old')) {   
    /**
     * This function returns a converted Timestamp to Datetime
     *
     * @param  timestamp timestamp
     * @return datetime
     */
    function timestamp_to_datetime_old( $timestamp ) 
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


if (! function_exists('timestamp_to_time')) {   
    /**
     * This function returns a converted Timestamp to Time
     *
     * @param  timestamp timestamp
     * @return datetime
     */
    function timestamp_to_time( $timestamp ) 
    {
        try {
            return ( is_valid( $timestamp ) ) ? date('H:i:s', $timestamp) : null;
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
            $month_range = [];

            # Gets all the Year-Month between the Date Range.
            foreach( CarbonPeriod::create($start_date, $end_date)->toArray() as $date ) {
                $month_range[ $date->format('Y-m') ] = $date->format('Y-m');
            }

            # Iterate the Year-Month detected between the Date Range.
            foreach ( $month_range as $month){

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



if (! function_exists('date_to_text')) {   
    /**
     * This function parses date to a text format ( Month day, Year)
     *
     * @param  date $date
     * @return Carbon Formatted string
     */
    function date_to_text( $date, $format = 'F d, Y' ) 
    {
        try {
            return Carbon::parse($date)->format($format);
        }catch(Exception $e){
            throw $e;
        }
    }
}

if (! function_exists('string_offset_to_seconds')) {    
    /**
     * This function parses offsets to a seconds format INT
     *
     * @param  date $date
     * @return Carbon Formatted string
     */
    function string_offset_to_seconds($offset) 
    {
        try {
            if(is_string($offset)){
                //clean spaces
                $offset_sign = str_replace(' ', '', $offset); 

                //+00:00 to just 00:00
                $time = trim( $offset, $offset_sign[0]); 


                $seconds = strtotime("1970-01-01". $time.":00". " UTC");

                return $offset_sign[0] == "+"?$seconds: $seconds*-1;
            } 
            else 
            {
                return 0;
            }
        }catch(Exception $e){
            dd($e);
            // throw $e;
        }
    }
}