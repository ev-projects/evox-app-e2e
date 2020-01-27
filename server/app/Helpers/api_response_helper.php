<?php

// if (! function_exists('success_response')) {  
//     /**
//      * This function formats the Success Response being sent by the API
//      *
//      * @param  String 
//      * @return Array formatted_message;
//      */
//     function success_response($message) {
//         return ['message' => $message];
//     }
// }


if (! function_exists('error_response')) {  
    /**
     * This function formats the Error Response being sent by the API
     *
     * @param  String message
     * @return Array formatted_message;
     */
    function error_response($message) {
        return ['error' => ['message' => $message]];
    }
}