<?php

use Illuminate\Support\Facades\Log;

if (! function_exists('log_activity')) {   
    /**
     * Logs the activity that's being executed and gets the Request Server details.
     * - The errors for backtracking of access, requests, and activities would be recorded here.
     *
     * @param  string message
     * @return void
     */
    function log_activity( $message ) {
        try{    
            activity()->useLog('activity')
                        ->withProperties([
                            'REMOTE_ADDR'           => request()->server('REMOTE_ADDR'),
                            'REMOTE_PORT'           => request()->server('REMOTE_PORT'),
                            'REQUEST_METHOD'        => request()->server('REQUEST_METHOD'),
                            'REQUEST_URI'           => request()->server('REQUEST_URI'),
                            'HTTP_USER_AGENT'       => request()->server('HTTP_USER_AGENT'),
                            // 'Parameters'        => request()->all()
                        ])
                        ->log($message);
        }catch(Exception $e){
            throw $e;
        }
    }
}

if (! function_exists('log_to_file')) {   
    /**
     * Logs the specific message and type into the Laravel.log file
     * - Most likely the PHP errors would be logged here.
     *
     * @param  string type (emergency|alert|critical|error|warning|notice|info|debug)
     * @param  string message
     * @param  array|object|string data
     * @return void
     */
    function log_to_file( $type, $message, $data=array()) {
        try{    
            // If the previous caller is the log_error, get the higher stack for logging.
            $log_stack_index = ( debug_backtrace()[1]['function'] == 'log_error' ) ? 2 : 1;

            // Checks if the caller is the Log Helper
            $log_header = debug_backtrace()[ $log_stack_index ]['function'];
            if( isset( debug_backtrace()[ $log_stack_index ]['class'] ) ) {
                $last_word = explode("\\", debug_backtrace()[ $log_stack_index ]['class']);
                $log_header = array_pop($last_word) . ' -> ' . debug_backtrace()[ $log_stack_index ]['function'];
            }
            
            $emp_num = ( auth()->user() != null )? '[Employee #: '.auth()->user()->emp_num.']' : "";

            if( in_array( $type, array( 'emergency', 'alert','critical','error','warning','notice','info','debug') ) ) {
                Log::$type($emp_num.'['. $log_header .']['.$message.']', (array) $data);

                // activity()->useLog($type)
                //             ->withProperties(['status' => $message])
                //             ->log($log_header);
            }
        }catch(Exception $e){
            throw $e;
        }
    }
}


if (! function_exists('log_error')) {   
    /**
     * Logs the error into laravel.log File
     *
     * @param  Exception error 
     * @return void
     */
    function log_error( $error ) {
        try{
            log_to_file('critical', 'Error', [$error]);
        }catch(Exception $e){
            throw $e;
        }
    }
}

