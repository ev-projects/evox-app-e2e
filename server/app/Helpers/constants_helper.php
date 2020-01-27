<?php

use Illuminate\Support\Facades\Config;

if (! function_exists('get_constant')) {   
    /**
     * This function returns the Constant being tried to access.
     *
     * @param  String key
     * @return Config::get('key');
     */
    function get_constant($key) {
        return Config::get('constants.'.$key);
    }
}


if (! function_exists('get_http_code')) {   
    /**
     * This function returns the HTTP Status Code being accessed from the Constants
     *
     * @param  String HTTP Name
     * @return Config::get('key');
     */
    function get_http_code($http_status_name) {
        return get_constant("HTTP_STATUS_CODE.".$http_status_name);
    }
}