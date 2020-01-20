<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\User\Resource\UserProfile;
use App\Modules\User\Models\Permission;
use Illuminate\Support\Facades\Config;

class AuthController extends Controller
{
    /**
     * Create a new AuthController instance.
     *
     * @return void
     */
    // public function __construct()
    // {
    //     $this->middleware('auth:api', ['except' => ['login']]);
    // }

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
            return response()->json(['error' => 'user_not_found'], Config::get('constants.HTTP_STATUS_CODE.400.NOT_FOUND'));
        }

        // Set the User that was fetched into Session
        return $this->respondWithToken($token);
    }

    /**
     * Get the authenticated User.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function me(){

        return response()->json($this->formattedUserData());
    }

    /**
     * Log the user out (Invalidate the token).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(){

        auth()->logout();
        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Refresh a token.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function refresh(){

        return $this->respondWithToken(auth()->refresh());
    }


    /**
     * Returns the Customized Payload
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function payload(Request $request){   
        
        return response()->json([
            'user' => $this->formattedUserData(),
            'payload' => auth()->payload(),
        ]);
    }

    /**
     * Get the token array structure.
     *
     * @param  string $token
     *
     * @return \Illuminate\Http\JsonResponse
     */
    protected function respondWithToken($token){   

        return response()->json(
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
     *  Returns the Formatted User and Permission Resource
     */
    protected function formattedUserData(){
        return new UserProfile(auth()->user());
    }
}
