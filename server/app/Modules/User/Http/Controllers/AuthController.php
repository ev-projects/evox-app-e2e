<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\User\Resources\UserProfileResource;
use App\Modules\User\Models\Permission;
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
            return error_response('user_not_found', [], JsonResponse::HTTP_NOT_FOUND);
        }

        // Set the User that was fetched into Session
        return success_response(
            'login_success', 
            [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => auth()->factory()->getTTL() * 60,
                'user' => $this->formattedUserData(),
                'payload' => auth()->payload(),
            ]
        );
    }


    /**
     * Log the user out (Invalidates the token).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(){

        auth()->logout();
        return success_response('logout_success');
    }


    /**
     * Returns the Customized Payload
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function payload(Request $request){   
        
        return success_response(
            'payload_success', 
            [
                'message' => 'payload_success',
                'user' => $this->formattedUserData(),
                'payload' => auth()->payload(),
            ]
        );
    }

    /**
     *  Returns the Formatted User and Permission Resource
     */
    protected function formattedUserData(){
        return new UserProfileResource(auth()->user());
    }
}