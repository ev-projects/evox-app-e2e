<?php

namespace App\Modules\User\Http\Controllers;

use Exception;
use Illuminate\Support\Facades\Redis;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Modules\User\Models\User;
use App\Modules\User\Models\LoginLog;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Modules\User\Resources\UserProfileResource;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Resources\PayrollCutoffResource;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use Tymon\JWTAuth\Facades\JWTAuth;
class AuthController extends Controller
{
    protected $payroll_cutoff;
    protected $bhr;
    

    public function __construct(PayrollCutoffRepositoryInterface $payroll_cutoff,
                                BhrRepositoryInterface $bhr){
        $this->payroll_cutoff = $payroll_cutoff;
        $this->bhr = $bhr;
    }
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
            $credIsEmail = false;
            // Validate if the User Inputted is an E-mail. If yes, Check on the E-mail field. If not, default is the User.
            if( filter_var(request('username'), FILTER_VALIDATE_EMAIL) ) {
                $credIsEmail = true;
                $credentials = array(
                    'email' => request('username'),
                    'password' => request('password')
                );
            }
            if ($credIsEmail) {
                if (!User::where('email', $credentials['email'])->exists()) {
                    return error_response( trans('messages.user_email_not_found'), [], JsonResponse::HTTP_NOT_FOUND);
                }
            } else {
                if (!User::where('username', $credentials['username'])->exists()) {
                    return error_response( trans('messages.user_name_not_found'), [], JsonResponse::HTTP_NOT_FOUND);
                }
            }

            // Attempt to check the Credentials. If credentials not found, return User Not Found.
            if (!$token = auth()->attempt($credentials)) {
                return error_response( trans('messages.user_password_incorrect'), [], JsonResponse::HTTP_NOT_FOUND);
            }

            // Attempt to check if the User is active. If not active, return User not active.
            if ( ! auth()->user()->is_active ) {
                if ( Carbon::today() > Carbon::parse(auth()->user()->termination_date)->addDay() ) {
                    return error_response( trans('messages.user_not_active'), [], JsonResponse::HTTP_NOT_FOUND);
                }  
            }

            log_activity( trans('messages.login') );
            // $token1 = JWTAuth::getToken();
            // dd($token);
            // Set the User that was fetched into Session
            $result = [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => auth()->factory()->getTTL() * 60
            ];
            
            
            $result = $this->get_default_payload( $result );
            $userid = $result["user"]["id"];
            // Redis::del('team_birthday_anniversary'.date('Y-m-d').$userid);
            // Redis::del('my_team_request_list:user_id:'.$userid);
            // Redis::del('my_request_list'.$userid);
            // Redis::del('getChangeLogs'.$userid);
            // Redis::del('get_announcements_dashboard');
            // Redis::del('get_tommorow_leave_list'.date('Y-m-d').$userid);
            // Redis::del('get_today_leave_list'.date('Y-m-d').$userid);
            // Redis::del('get_dashboard_holidays'.date('Y-m-d').$userid);
            // Redis::del('user_id'.$userid);

            // Redis::del(Redis::keys($userid.':*'));
            // Redis::del(Redis::keys('laravel_cache:*'));

            Redis::set($result["user"]["id"].':userid',  $result["user"]["id"],"EX",3600);
          
            log_to_file('info', 'Success', [], 'user');
            return success_response( trans('messages.login_success'), $result );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Get a JWT via given credentials.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function loginMobile(Request $request){
        try {

            // Get the Credentials inputted by the User.
            $credentials = request(['username', 'password']);
            $credIsEmail = false;
            // Validate if the User Inputted is an E-mail. If yes, Check on the E-mail field. If not, default is the User.
            if( filter_var(request('username'), FILTER_VALIDATE_EMAIL) ) {
                $credIsEmail = true;
                $credentials = array(
                    'email' => request('username'),
                    'password' => request('password')
                );
            }
            if ($credIsEmail) {
                if (!User::where('email', $credentials['email'])->exists()) {
                    return error_response( trans('messages.user_email_not_found'), [], JsonResponse::HTTP_NOT_FOUND);
                }
            } else {
                if (!User::where('username', $credentials['username'])->exists()) {
                    return error_response( trans('messages.user_name_not_found'), [], JsonResponse::HTTP_NOT_FOUND);
                }
            }

            // Attempt to check the Credentials. If credentials not found, return User Not Found.
            if (!$token = auth()->attempt($credentials)) {
                return error_response( trans('messages.user_password_incorrect'), [], JsonResponse::HTTP_NOT_FOUND);
            }

            // Attempt to check if the User is active. If not active, return User not active.
            if ( ! auth()->user()->is_active ) {
                if ( Carbon::today()> Carbon::parse(auth()->user()->termination_date)->addDay() ) {
                    return error_response( trans('messages.user_not_active'), [], JsonResponse::HTTP_NOT_FOUND);
                }
            }

            // Log the date, time and user_id upon login (mobile version)
            $loginLog = new LoginLog;
            $loginLog->user_id      = auth()->user()->id;
            $loginLog->date_time    = Carbon::now();
            $loginLog->save();

            log_activity( trans('messages.login') );

            // Set the User that was fetched into Session
            $result = [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => auth()->factory()->getTTL() * 60
            ];
           

            $result = $this->get_default_payload( $result );
        
            log_to_file('info', 'Success', [], 'user');
            return success_response( trans('messages.login_success'), $result );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Get a Authenticate Client using the Access Token from Google Login.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function authenticateClient(User $user){   
        try {

            $user = auth()->user();
            auth()->logout();
           
           
            // Attempt to check the Credentials. If credentials not found, return User Not Found.
            if (!$token = auth()->login($user)) {
                return error_response( trans('messages.user_not_found'), [], JsonResponse::HTTP_NOT_FOUND);
            }

            // Attempt to check if the User is active. If not active, return User not active.
            if ( ! auth()->user()->is_active ) {
                if ( Carbon::today()> Carbon::parse(auth()->user()->termination_date)->addDay() ) {
                    return error_response( trans('messages.user_not_active'), [], JsonResponse::HTTP_NOT_FOUND);
                }
               
            }

            log_activity( trans('messages.login') );


            // Set the User that was fetched into Session
            $result = [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => auth()->factory()->getTTL() * 60
            ];

            $result = $this->get_default_payload( $result );
          
            log_to_file('info', 'Success', [], 'user');
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

            log_to_file('info', 'Success', true, 'user');
            $user = auth()->user();
            Redis::del(Redis::keys('laravel_cache:*'));
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

            $result = $this->get_default_payload( [] );

            log_to_file('info', 'Success', [], 'user');
            
            return success_response( trans('messages.payload_success'), $result );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    private function get_default_payload( $result ){
        
        $result['user'] = new UserProfileResource( auth()->user() );

        $result['payload'] = auth()->payload();

        $result['constant'] = get_constant();

        $bhr_details = $this->bhr->get_user( auth()->user()->bhr_num ? auth()->user()->bhr_num : '');

        $result['settings'] = [
            'current_payroll_cutoff'  => new PayrollCutoffResource($this->payroll_cutoff->get_payroll_cutoff()),
            'profile_picture' => $this->bhr->get_profile_picture( auth()->user()->bhr_num ),
            'country' =>  $bhr_details ? $bhr_details->country : ''
        ];
        

        return $result;
    }
    
}