<?php

use Illuminate\Support\Facades\Config;

if (! function_exists('get_constant')) {   
    /**
     * This function returns the Constant being tried to access.
     *
     * @param  string key
     * @return string|array;
     */
    function get_constant($key) {
        return Config::get('constants.'.$key);
    }
}
