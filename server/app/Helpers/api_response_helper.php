<?php

use Illuminate\Http\JsonResponse;

if (! function_exists('success_response')) {  
    /**
     * This function formats the Success Response being sent by the API
     *
     * @param  string|array message
     * @param  string|array content
     * @param  string http_code
     * @return Symfony\Component\HttpFoundation\Response formatted_message;
     */
    function success_response($message, $content = array(),  $http_code = JsonResponse::HTTP_OK) {
        return response()->json( ['message' => $message, 'content' => $content], $http_code);
    }
}


if (! function_exists('error_response')) {  
    /**
     * This function formats the Error Response being sent by the API
     *
     * @param  string|array message
     * @param  string|array|Exception content
     * @param  string error_code
     * @return Symfony\Component\HttpFoundation\Response formatted_message;
     */
    function error_response($message, $content = array(), $error_code = JsonResponse::HTTP_BAD_REQUEST) {
        # Check if the instance is an Exception and if yes, gets the message from it.
        $content = ( $content instanceof Exception ) ? $content->getMessage() : $content;
        return response()->json(['error' => ['message' => $message, 'content' => $content]], $error_code);
    }
}