<?php

use Illuminate\Support\Facades\Config;

if (! function_exists('get_constant')) {   
    /**
     * This function returns the Constant being tried to access.
     *
     * @param  string key
     * 
     * @return string|array
     */
    function get_constant($key=null) {
        return ( !is_null($key) ) ? Config::get('constants.'.$key) : Config::get('constants');
    }
}

if (! function_exists('get_imploded_constant')) {   
    /**
     * This function returns the Imploded Constant being tried to access.
     *
     * @param  string key
     * 
     * @return array|string
     */
    function get_imploded_constant($key) {
        $var = get_constant($key);
        return ( is_array($var) )? implode(',', $var) : $var;
    }
}
