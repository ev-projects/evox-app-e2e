<?php

use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;

if (! function_exists('parse_emp_num_for_biometrics')) {   
    /**
     * This function adds the 2 trailing Character "20" since it's the data for the Biometrics.
     *
     * @param  string $emp_num
     * @param  string
     */
    function parse_emp_num_for_biometrics( $emp_num ) 
    {
        try {
            return "20" . $emp_num;
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('parse_emp_num_for_evox')) {   
    /**
     * This function removes the 2 trailing Character "20" since it's the data for EVOX.
     *
     * @param  string $emp_num
     * @param  string
     */
    function parse_emp_num_for_evox( $emp_num ) 
    {
        try {
            return substr($emp_num, 2);
        }catch(Exception $e){
            throw $e;
        }
    }
}



if (! function_exists('text_to_slug')) {   
    /**
     * This function parses the given string into a slug human-readable format.
     *
     * @param  string $string
     * @param  string
     */
    function text_to_slug( $string ) 
    {
        try {
            return preg_replace('/\s+/', '_', strtolower($string));
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('slug_to_text')) {   
    /**
     * This function parses the given slug to string readable format
     *
     * @param  string $string
     * @param  string
     */
    function slug_to_text( $string ) 
    {
        try {
            return ucwords(str_replace("_", " ",$string));
        }catch(Exception $e){
            throw $e;
        }
    }
}



if (! function_exists('parse_request_to_hash_code')) {   
    /**
     * This function parses the given Request to a hashed string code of requests' table, request id, and user ID of the approver
     *
     * @param  (Overtime|RestDayWork|AlterLog|ChangeSchedule) $request
     * @param   User $recepient
     * @return  string
     */
    function parse_request_to_hash_code( $request, $recepient ) 
    {
        try {
            return encrypt( $request->getTable().'|'.$request->id.'|'.$recepient->id);
        }catch(Exception $e){
            throw $e;
        }
    }
}

if (! function_exists('parse_hash_code_to_request_detail_array')) {   
    /**
     * This function parses the given Hash Code to a the request detail array
     *
     * @param  (Overtime|RestDayWork|AlterLog|ChangeSchedule) $request
     * @return  string
     */
    function parse_hash_code_to_request_detail_array( $hash_code ) 
    {   
        try {
            return explode('|', decrypt( $hash_code ));;
        }catch(Exception $e){
            throw $e;
        }
    }
}

