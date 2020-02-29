<?php

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


