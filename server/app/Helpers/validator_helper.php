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
