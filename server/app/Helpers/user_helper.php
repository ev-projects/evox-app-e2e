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
     * @return App\Modules\User\Models\User
     */
    function is_under_supervisee( $user_id ) 
    {
        try {
            return auth()->user()->supervisee()->findOrFail( $user_id ) ? true : false;

        }catch(Exception $e){
            
            throw new Exception( trans('messages.user_not_under_supervisee') );
        }
    }
}
