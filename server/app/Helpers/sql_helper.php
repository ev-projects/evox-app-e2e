<?php
use Carbon\Carbon;

if (! function_exists('check_column_exist')) {   
    /**
     * 
     *
     */
    function check_column_exist( $column1 , $column2 , $rest_day = "sched.rest_days"){
        try {
            return "IF( " . $column1 . " is not null and LOCATE(LOWER(SUBSTRING(DAYNAME(table1.date),1, 3)), ".$rest_day." )=0, " . $column2 . " , null )";
        }catch(Exception $e){
            throw $e;
        }
    }
}




if (! function_exists('get_seven_succeeding_days')) {   
    /**
     * 
     *
     */
    function get_succeeding_days( $date , $days) 
    {
        try {
            $start = new Carbon($date);
            $end = new Carbon($date);
            $end ->addDays( $days );

            $stack = [];
            $date = $start;

            while ($date <= $end) {
                $stack[] = "'" . $date->format("Y-m-d") . "'" ;
                $date->addDays(1);
            }
            return $stack;
        }catch(Exception $e){
            throw $e;
        }
    }
}



if (! function_exists('check_column_exist')) {   
    /**
     * 
     *
     */
    function check_column_exist( $column1 , $column2 , $rest_day = "sched.rest_days"){
        try {
            return "IF( " . $column1 . " is not null and LOCATE(LOWER(SUBSTRING(DAYNAME(table1.date),1, 3)), ".$rest_day." )=0, " . $column2 . " , null )";
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('check_column_end_datetime')) {   
    /**
     * 
     *
     */
    function check_column_end_datetime( $start_datetime , $end_datetime){
        return "IF( " . $start_datetime  . " > " . $end_datetime  . " , " . $end_datetime  . "  + (3600*24) , " . $end_datetime  . " ) ";
    }
}

if (! function_exists('check_column_start_flexy_time')) {   
    /**
     * 
     *
     */
    function check_column_start_flexy_time( $start_datetime, $end_datetime , $start_flexy_datetime){
        return "IF( " . $start_datetime  . " > " . $start_flexy_datetime  . " OR " . $end_datetime  . " > " . $start_flexy_datetime  . ", " . $start_flexy_datetime  . "  + (3600*24) , " . $start_flexy_datetime  . " ) ";
    }
}

if (! function_exists('check_column_end_flexy_time')) {   
    /**
     * 
     *
     */
    function check_column_end_flexy_time( $start_datetime , $start_flexy_datetime , $end_datetime , $end_flexy_datetime){
        return "IF( " . $start_datetime  . " > " . $end_flexy_datetime  . "  OR " . $start_flexy_datetime  . " > " . $end_flexy_datetime   . "  OR " . $end_datetime  . " > " . $end_flexy_datetime  . ", " . $end_flexy_datetime  . "  + (3600*24) , " . $end_flexy_datetime  . " ) ";
    }
}


if (! function_exists('check_if_restday')) {   
    /**
     * This function parses date to a text format ( Month day, Year)
     *
     */
    function check_if_restday( $date , $rest_days){
        return "IF(LOCATE(LOWER(SUBSTRING(DAYNAME(".$date."),1, 3)), ".$rest_days.")>0,1,0)";
    }
}





