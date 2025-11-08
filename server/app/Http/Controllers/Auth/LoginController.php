<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Laravel\Socialite\Facades\Socialite;
use App\Modules\User\Models\User;
use GuzzleHttp\Client;
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
    /*public function redirectToMS(Request $request)
    {
        $tenant_id = env('MSGRAPH_TENANT_ID');
        $client_id = env('MSGRAPH_CLIENT_ID');
        $redirect_uri = urlencode(env('MSGRAPH_LANDING_URL'));
        $user_state = Str::random(30);
        $auth_url = "https://login.microsoftonline.com/{$tenant_id}/oauth2/v2.0/authorize?client_id={$client_id}&response_type=code&redirect_uri={$redirect_uri}&response_mode=query&scope=user.read&state={$user_state}";

        return redirect()->away($auth_url);
    }*/

    public function redirectToMS(Request $request)
    {
        $tenant_id = env('MSGRAPH_TENANT_ID');
        $client_id = env('MSGRAPH_CLIENT_ID');
        $redirect_uri = urlencode(env('MSGRAPH_LANDING_URL'));
        $user_state = Str::random(30);
        $auth_url = "https://login.microsoftonline.com/{$tenant_id}/oauth2/v2.0/authorize?client_id={$client_id}&response_type=code&redirect_uri={$redirect_uri}&response_mode=query&scope=user.read&state={$user_state}";

        return redirect()->away($auth_url);  // Redirect user to Microsoft OAuth
    }

    /*public function handleMSCallback()
    {
        try {
            dd((new MsGraph)->get('me'));
        } catch (\Exception $e) {
            return redirect()->away(env('FRONT_END_URL') . "login");
        }
        $existingUser = User::where('email', $user->email)->first();
        if($existingUser){
            
        } else {
            return redirect()->away(env('FRONT_END_URL') . "email-not-found");
        }
    }*/
    public function handleMSCallback(Request $request)
    {
        $code = $request->get('code');

        if (!$code) {
            return redirect()->away(env('FRONT_END_URL') . "login");
        }

        $tenant_id = env('MSGRAPH_TENANT_ID');
        $client_id = env('MSGRAPH_CLIENT_ID');
        $client_secret = env('MSGRAPH_CLIENT_SECRET');
        $redirect_uri = env('MSGRAPH_LANDING_URL');

        $client = new Client();

        try {
            // Step 1: Exchange code for access token
            $response = $client->post("https://login.microsoftonline.com/{$tenant_id}/oauth2/v2.0/token", [
                'form_params' => [
                    'grant_type' => 'authorization_code',
                    'client_id' => $client_id,
                    'client_secret' => $client_secret,
                    'code' => $code,
                    'redirect_uri' => $redirect_uri,
                ],
            ]);

            $tokenData = json_decode($response->getBody(), true);
            $accessToken = $tokenData['access_token'] ?? null;

            if (!$accessToken) {
                return redirect()->away(env('FRONT_END_URL') . "login");
            }

            // Step 2: Get user info
            $userResponse = $client->get('https://graph.microsoft.com/v1.0/me', [
                'headers' => [
                    'Authorization' => "Bearer {$accessToken}",
                    'Accept' => 'application/json',
                ],
            ]);

            $msUser = json_decode($userResponse->getBody(), true);

            $email = $msUser['mail'] ?? $msUser['userPrincipalName'];

            // Step 3: Check user in DB
            $existingUser = User::where('email', $email)->first();

            if (!$existingUser) {
                return redirect()->away(env('FRONT_END_URL') . "email-not-found");
            }

            // Step 4: Log the user in
            $token = JWTAuth::fromUser($existingUser);

            return redirect()->away(env('FRONT_END_URL') . "dashboard");

        } catch (\Exception $e) {
            // For debugging:
            // dd($e->getMessage());
            return redirect()->away(env('FRONT_END_URL') . "login");
        }
    }


    /*public function getToken(Request $request)
    {
        // \App\Modules\User\Http\Controllers\AuthController
        return Auth::user();
        return success_response('Test', [Auth::user()]);
    }*/
}
