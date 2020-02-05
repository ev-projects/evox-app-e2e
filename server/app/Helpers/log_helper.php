<?php


use Illuminate\Support\Facades\Log;

if (! function_exists('log_to_file')) {   
    /**
     * Logs the specific message and type into the Laravel.log file
     *
     * @param  string type (emergency|alert|critical|error|warning|notice|info|debug)
     * @param  string message
     * @param  array|object|string data
     * @return time time
     */
    function log_to_file( $type, $message, $data=array()) {
        try{
            $last_word = explode("\\", debug_backtrace()[1]['class']);
            $last_word = array_pop($last_word);
            if( in_array( $type, array( 'emergency', 'alert','critical','error','warning','notice','info','debug') ) ) {
                Log::$type('['.$last_word . ' -> '. debug_backtrace()[1]['function'] .']['.$message.']', $data);
            }
        }catch(Exception $e){
            throw $e;
        }
    }
}
