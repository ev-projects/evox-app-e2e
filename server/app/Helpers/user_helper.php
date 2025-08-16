<?php

use App\Modules\User\Models\User;

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
$ne = 0;
            // If the current user has 'admin' role and 'full_access' privilege, always return true.
            if(  auth()->user()->roles()->pluck('name')->contains('admin') &&
                 auth()->user()->permissions()->pluck('name')->contains('full_access') ) {
               $ne = 1;
                 return User::findOrFail( $user_id ); 


            } 
            
            # If the User being requested is the current user being logged in, fetch the current User Instance.
            if( auth()->user()->id == $user_id ) {
               $ne = 2; return auth()->user(); 

            # If not, fetch the User Instance from the currently logged in's supervisee list.
           } else {
              // $ne = 3; return auth()->user()->users_handled()->findOrFail( $user_id );
              $user = User::findOrFail($user_id);
              $ne = 3; return auth()->user()->users_handled(null, null, $user->is_active)->findOrFail( $user_id );
            }

        }catch(Exception $e){
           
            throw new Exception( trans('messages.user_not_authorized') . $ne . $user_id);
        }
    }
}

if (! function_exists('ordinal')) {   
    /**
     * This function gets the the prefix of number
     *
     * @param  int $user_id
     * @return App\Modules\User\Models\User
     */
    function ordinal( $input_number ) 
    {
        $number = (string) $input_number;
        $last_digit = substr($number, -1);
        $second_last_digit = substr($number, -2, 1);
        $suffix = 'th';
        if ($second_last_digit != '1')
        {
          switch ($last_digit)
          {
            case '1':
              $suffix = 'st';
              break;
            case '2':
              $suffix = 'nd';
              break;
            case '3':
              $suffix = 'rd';
              break;
            default:
              break;
          }
        }
        if ((string) $number === '1') $suffix = 'st';
        return $number.$suffix;
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

            // If there's an API call which is not has an authenticated user, return false.
            if( !is_valid( auth()->user() )){
                return false;
            }
            $level_type = auth()->user()->level_type();
            // dd( $level_type, $level_type == "DivisionHead");
            if(   $level_type == "Admin" || $level_type == "DivisionHead" || $level_type == "Department Head") {
                return true;
            }
           
            if( $force_to_fail ) {
                $user_direct_sup =  User::findOrFail($user_id)->direct_supervisor_temp();
                if(!is_valid( $user_direct_sup)){
                    return false;
                }
                return auth()->user()->id ==  $user_direct_sup->id ? true : false;
                // return auth()->user()->users_handled()->findOrFail( $user_id ) ? true : false;
            } else {
                $user_direct_sup =  User::find($user_id)->direct_supervisor_temp();
                if(!is_valid( $user_direct_sup)){
                    return false;
                }
                return auth()->user()->id ==  $user_direct_sup->id ? true : false;
            }

        }catch(Exception $e){
            
            throw new Exception( trans('messages.user_not_under_supervisee') );
        }
    }
}


if (! function_exists('under_supervisee_id_list')) {   
    /**
     * This function return list of id under an employee
     *
     * @param  object user model
     * @return array id
     */
    function under_supervisee_id_list($list ) 
    {
        try {
            $user_list =array();
            foreach($list as $key => $user) {
                array_push($user_list,$user->id);
            }

            return $user_list;

        }catch(Exception $e){
            
            throw new Exception( trans('messages.error_default') );
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
