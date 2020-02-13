
<?php

use Illuminate\Http\Request;

if (! function_exists('inhert_validation_rules')) {   
    /**
     * This function returns an Array of rules that was inherited on the specified Form Requests
     *
     * @param  Array (FormRequest) form_requests
     * @param  Request request
     * @return array|null;
     */
    function inhert_validation_rules( $form_requests, Request $request ) 
    {
        try {
            # Iterates the Rules of the declared Form Requests and merge it into one rule.
            $rules = [];
            foreach ($form_requests as $source) {
                $rules = array_merge(
                    $rules,
                    (new $source)->rules( $request )
                );
            }
            return $rules;
        }catch(Exception $e){
            throw $e;
        }
    }
}