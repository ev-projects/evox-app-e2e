<?php

if (! function_exists('is_valid')) {   
    /**
     * This function checks if the 'var' is not empty and Null.
     *
     * @param  variable var
     * @return bool
     */
    function is_valid( $var ) 
    {
        try {
            // return ( !empty( $var ) && !is_null( $var ) ) ? true : false;
            return ( (is_numeric( $var ) || (!is_numeric( $var ) && !empty( $var ))) && !is_null( $var ) ) ? true : false;
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('clean')) {   
    /**
     * This function cleans the parameter string
     *
     * @param  variable string
     * @return bool
     */
    function clean($string) {
        $string = str_replace(' ', '', $string); // Replaces all spaces with hyphens.
    
        return preg_replace('/[^A-Za-z0-9\-]/', '', $string); // Removes special chars.
    }
}



if (! function_exists('clean_number')) {   
    /**
     * This function cleans the parameter number and sets it to 2 decimal places and remove trailing zeros.
     *
     * @param  number
     * @return float
     */
    function clean_number($number, $precision = 2) {
        return round($number, $precision) + 0;
    }
}




