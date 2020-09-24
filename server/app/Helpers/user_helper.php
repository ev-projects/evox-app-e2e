<?php

if (! function_exists('get_authenticated_user')) {   
    /**
     * This function gets the Authenticated User from the $user_id Parameter. It's either fetch the user logged in or the user logged in's supervisee.
     *
     * @param  int $user_id
     * @return App\Modules\User\Models\User
     */
    function get_authenticated_user( $user_id ) 
    {
        try {
            
            # If the User being requested is the current user being logged in, fetch the current User Instance.
            if( auth()->user()->id == $user_id ) {
               return auth()->user();

            # If not, fetch the User Instance from the currently logged in's supervisee list.
            } else {
               return auth()->user()->supervisee()->findOrFail( $user_id );
            }

        }catch(Exception $e){
            
            throw new Exception( trans('messages.user_not_authorized') );
        }
    }
}


if (! function_exists('is_under_supervisee')) {   
    /**
     * This function checks if the $user_id is Under the Logged-In's User Supervisee.
     *
     * @param  int $user_id
     * @param  bool $force_to_fail
     * @return App\Modules\User\Models\User
     */
    function is_under_supervisee( $user_id, $force_to_fail = true ) 
    {
        try {
            if( $force_to_fail ) {
                return auth()->user()->supervisee()->findOrFail( $user_id ) ? true : false;
            } else {
                return auth()->user()->supervisee()->find( $user_id ) ? true : false;
            }

        }catch(Exception $e){
            
            throw new Exception( trans('messages.user_not_under_supervisee') );
        }
    }
}


if (! function_exists('generate_username')) {   
    /**
     * This function checks if the $user_id is Under the Logged-In's User Supervisee.
     *
     * @param  object $bhr_user
     * @return string $username
     */
    function generate_username( $bhr_user ) 
    {
        try {
           if( $bhr_user->employeeNumber != null &&
                $bhr_user->firstName != null &&
                $bhr_user->lastName != null ){
                    return clean(substr(strtolower($bhr_user->firstName), 0, 1) . strtolower($bhr_user->lastName) . $bhr_user->employeeNumber);
                }

        }catch(Exception $e){
            
            throw new Exception( trans('messages.user_instance_invalid') );
        }
    }
}
