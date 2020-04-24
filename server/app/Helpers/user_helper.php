<?php

if (! function_exists('get_authenticated_user')) {   
    /**
     * This function gets the Authenticated User from the $user_id Parameter. It's either fetch the user logged in or the user logged in's supervisee.
     *
     * @param  int $user_id
     * @return User
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
            throw $e;
        }
    }
}
