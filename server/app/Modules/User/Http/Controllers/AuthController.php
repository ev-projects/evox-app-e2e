<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\User\Resources\UserProfileResource;
use Exception;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    /**
     * Create a new AuthController instance.
     *
     * @return void
     */

    /**
     * Get a JWT via given credentials.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request){   
        try {

            // Get the Credentials inputted by the User.
            $credentials = request(['username', 'password']);

            // Validate if the User Inputted is an E-mail. If yes, Check on the E-mail field. If not, default is the User.
            if( filter_var(request('username'), FILTER_VALIDATE_EMAIL) ) {
                $credentials = array(
                    'email' => request('username'),
                    'password' => request('password')
                );
            }

            // Attempt to check the Credentials. If credentials not found, return User Not Found.
            if (!$token = auth()->attempt($credentials)) {
                return error_response( trans('messages.user_not_found'), [], JsonResponse::HTTP_NOT_FOUND);
            }

            log_activity( trans('messages.login') );

            // Set the User that was fetched into Session
            $result = [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => auth()->factory()->getTTL() * 60,
                'user' => new UserProfileResource( auth()->user() ),
                'payload' => auth()->payload(),
                'constant' => get_constant()
            ];

            log_to_file('info', 'Success', $result);
            return success_response( trans('messages.login_success'), $result );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Log the user out (Invalidates the token).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(){
        try {
            log_activity( trans('messages.logout') );

            log_to_file('info', 'Success', true);

            auth()->logout();

            return success_response( trans('messages.logout_success') );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Returns the Customized Payload
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function payload(Request $request){   
        try {
            log_activity( trans('messages.payload') );

            $result = [
                'user' => new UserProfileResource( auth()->user() ),
                'payload' => auth()->payload(),
                'constant' => get_constant()
            ];

            log_to_file('info', 'Success', $result);
            
            return success_response( trans('messages.payload_success'), $result );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
    
}