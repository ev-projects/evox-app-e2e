<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\User\Resources\UserProfileResource;
use App\Modules\User\Models\Permission;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Config;

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

            // Set the User that was fetched into Session
            return success_response(
                trans('messages.login_success'), 
                [
                    'access_token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth()->factory()->getTTL() * 60,
                    'user' => $this->formattedUserData(),
                    'payload' => auth()->payload(),
                ]
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), [], JsonResponse::HTTP_BAD_REQUEST);
        }
    }


    /**
     * Log the user out (Invalidates the token).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(){
        try {
            auth()->logout();
            return success_response( trans('messages.logout_success') );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), [], JsonResponse::HTTP_BAD_REQUEST);
        }
    }


    /**
     * Returns the Customized Payload
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function payload(Request $request){   
        try {
            return success_response(
                trans('messages.payload_success'), 
                [
                    'user' => $this->formattedUserData(),
                    'payload' => auth()->payload(),
                ]
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), [], JsonResponse::HTTP_BAD_REQUEST);
        }
    }

    /**
     *  Returns the Formatted User and Permission Resource
     */
    protected function formattedUserData(){
        return new UserProfileResource(auth()->user());
    }
}