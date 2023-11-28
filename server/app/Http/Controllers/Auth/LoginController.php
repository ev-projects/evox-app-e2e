<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Laravel\Socialite\Facades\Socialite;
use App\Modules\User\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Facades\JWTAuth;
class LoginController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Login Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles authenticating users for the application and
    | redirecting them to your home screen. The controller uses a trait
    | to conveniently provide its functionality to your applications.
    |
    */

    use AuthenticatesUsers;

    /**
     * Where to redirect users after login.
     *
     * @var string
     */
    protected $redirectTo = '/home';

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('guest')->except('logout');
    }

    /**
    * Redirect the user to the Google authentication page.
    *
    * @return \Illuminate\Http\Response
    */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Obtain the user information from Google.
     *
     * @return \Illuminate\Http\Response
     */
    public function handleGoogleCallback()
    {
        try {
            $user = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect()->away(env('FRONT_END_URL') . "login");
        }
        // check if they're an existing user
        $existingUser = User::where('email', $user->email)->first();
        if($existingUser){
            // log them in
            $token = JWTAuth::fromUser($existingUser);
            $front_end_url = env('FRONT_END_URL') . "app/Dashboard";
            
            return redirect()->away(env('FRONT_END_URL') . "authenticate-client?token=$token");
            //return redirect("get-token?$token");
        } else {
            return redirect()->away(env('FRONT_END_URL') . "email-not-found");
        }
    }

    /**
    * Redirect the user to the Google authentication page.
    *
    * @return \Illuminate\Http\Response
    */
    public function redirectToMS(Request $request)
    {
        /*$msGraph = new MsGraph();
        return $msGraph->connect();*/
        $tenant_id = env('MSGRAPH_TENANT_ID');
        $client_id = env('MSGRAPH_CLIENT_ID');
        $redirect_uri = urlencode(env('MSGRAPH_LANDING_URL'));
        $user_state = Str::random(30);
        $auth_url = "https://login.microsoftonline.com/{$tenant_id}/oauth2/v2.0/authorize?client_id={$client_id}&response_type=code&redirect_uri={$redirect_uri}&response_mode=query&scope=user.read&state={$user_state}";

        return redirect()->away($auth_url);
    }

    public function handleMSCallback()
    {
        /*try {
            dd((new MsGraph)->get('me'));
        } catch (\Exception $e) {
            return redirect()->away(env('FRONT_END_URL') . "login");
        }
        $existingUser = User::where('email', $user->email)->first();
        if($existingUser){
            
        } else {
            return redirect()->away(env('FRONT_END_URL') . "email-not-found");
        }*/
    }

    /*public function getToken(Request $request)
    {
        // \App\Modules\User\Http\Controllers\AuthController
        return Auth::user();
        return success_response('Test', [Auth::user()]);
    }*/
}
