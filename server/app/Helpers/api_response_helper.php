<?php

if (! function_exists('success_response')) {  
    /**
     * This function formats the Success Response being sent by the API
     *
     * @param  string|array message
     * @param  array data
     * @param  string http_code
     * @return Symfony\Component\HttpFoundation\Response formatted_message;
     */
    function success_response($message, $data = array(),  $http_code = 200) {
        return response()->json( ['message' => $message, 'content' => $data], $http_code);
    }
}


if (! function_exists('error_response')) {  
    /**
     * This function formats the Error Response being sent by the API
     *
     * @param  string|array message
     * @param  array data
     * @param  string error_code
     * @return Symfony\Component\HttpFoundation\Response formatted_message;
     */
    function error_response($message, $data = array(), $error_code = 404) {
        return response()->json(['error' => ['message' => $message, 'content' => $data]], $error_code);
    }
}