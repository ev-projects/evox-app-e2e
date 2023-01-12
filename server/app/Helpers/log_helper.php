<?php

use Illuminate\Support\Facades\Log;
use App\Classes\EvoxActivityLogger;

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
            evox_activity()->useLog('activity')
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

if (!function_exists('evox_activity')) {
    
    function evox_activity(string $logName = null): EvoxActivityLogger
    {
        $defaultLogName = config('laravel-activitylog.default_log_name');

        return app(EvoxActivityLogger::class)->useLog($logName ?? $defaultLogName);
    }
}

if (! function_exists('log_to_file')) {   
    /**
     * Logs the specific message and type into the Laravel.log file
     * - Most likely the PHP errors would be logged here.
     *
     * @param  string type (emergency|alert|critical|error|warning|notice|info|debug)
     * @param  string message
     * @param  array|object|string data (Optional)
     * @param  string channel (Optional)
     * @return void
     */
    function log_to_file( $type, $message, $data=array(), $channel="") {
        try{    
            // If the previous caller is the log_error, get the higher stack for logging.
            $log_stack_index = ( debug_backtrace()[1]['function'] == 'log_error' ) ? 2 : 1;

            // Checks if the caller is the Log Helper
            $log_header = debug_backtrace()[ $log_stack_index ]['function'];
            if( isset( debug_backtrace()[ $log_stack_index ]['class'] ) ) {
                $last_word = explode("\\", debug_backtrace()[ $log_stack_index ]['class']);
                $log_header = array_pop($last_word) . ' -> ' . debug_backtrace()[ $log_stack_index ]['function'];
            }
            
            $user_id = ( auth()->user() != null )? '[UserID #: '.auth()->user()->id.']' : "";

            if( in_array( $type, array( 'emergency', 'alert','critical','error','warning','notice','info','debug') ) ) {

                if( ! is_valid( $channel ) ) {
                    Log::$type($user_id.'['. $log_header .']['.$message.']', (array) $data);
                } else {
                    Log::channel( $channel )->$type($user_id.'['. $log_header .']['.$message.']', (array) $data);
                }

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
     * @param  string channel (Optional) 
     * @return void
     */
    function log_error( $error, $channel="" ) {
        try{
            log_to_file('critical', 'Error', [$error], $channel);
        }catch(Exception $e){
            throw $e;
        }
    }
}



