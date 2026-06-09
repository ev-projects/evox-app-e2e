<?php

namespace App\Modules\User\Http\Controllers;

use Exception;

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
use App\Modules\User\Models\UtcTimelog;
use App\Modules\User\Resources\CountryResource;
use App\CodeOfConductForms;
use App\EvoxIndiaPayrollCutoff;
use App\PopupFlags;

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
            if (empty($credentials['username']) || empty($credentials['password'])) {
                return error_response(
                    trans('messages.validation_error'),
                    [],
                    JsonResponse::HTTP_UNPROCESSABLE_ENTITY
                );
            }
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
                return error_response( trans('messages.user_password_incorrect'), [], JsonResponse::HTTP_UNAUTHORIZED);
            }

            // Attempt to check if the User is active. If not active, return User not active.
            if ( ! auth()->user()->is_active ) {
                if ( Carbon::today()> Carbon::parse(auth()->user()->termination_date)->addDay() ) {
                    return error_response( trans('messages.user_not_active'), [], JsonResponse::HTTP_NOT_FOUND);
                }
               
            }

            log_activity( trans('messages.login') );

            // Set the User that was fetched into Session
            $sess_id = session()->getId();
            $result = [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => auth()->factory()->getTTL() * 60,
                'session_id' => $sess_id
            ];

            $result = $this->get_default_payload( $result );

            log_to_audit_trail(['action' => 'Login', 'description' => 'has logged in', 'user_id' => auth()->user()->id, 'session_id' => $sess_id, 'type' => 1]);

            log_to_file('info', 'Success', [], 'user');
            return success_response( trans('messages.login_success'), $result );
        } catch(Exception $e){
            dd($e);
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
            if (empty($credentials['username']) || empty($credentials['password'])) {
                return error_response(
                    trans('messages.validation_error'),
                    [],
                    JsonResponse::HTTP_UNPROCESSABLE_ENTITY
                );
            }
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
     * Authenticate User via MS Account.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function authenticateMSClient(Request $request){   
        try {
            $tenant_id = config('services.microsoft.tenant_id');
            $client_id = config('services.microsoft.client_id');
            $client_secret = config('services.microsoft.client_secret');
            $redirect_uri = config('services.microsoft.redirect');
            $scope = 'User.Read';
            $code = $request->code;
            $grant_type = "authorization_code";
            $token_request = ms_get_access_token($tenant_id, array(
                'client_id' => $client_id,
                'scope' => $scope,
                'code' => $code,
                'redirect_uri' => $redirect_uri,
                'grant_type' => $grant_type,
                'client_secret' => $client_secret
            ));

            if (!$token_request or !isset($token_request->access_token)) {
                return error_response( "Microsoft login failed, please try again. 1", [], 403);
            }

            $me = ms_call_api($token_request->access_token, 'GET', 'me');

            if (!$me) {
                return error_response( "Microsoft login failed, please try again. 2", [], JsonResponse::HTTP_NOT_FOUND);
            }
            
            $user = User::where('email', $me->mail)->first();
            if (!$user) {
                return error_response( trans('messages.user_email_not_found'), [], JsonResponse::HTTP_NOT_FOUND);
            }
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

            //$result = $this->get_default_payload( $result );

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

            log_to_audit_trail(['action' => 'Logout', 'description' => 'has logged out', 'user_id' => auth()->user()->id, 'session_id' => request()->session_id, 'type' => 1]);

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
        // dd(UtcTimelog::where('id','!=',"0"));

        // Get the latest Payroll Cutoff of India and Morocco
        $india_latest_cutoff = EvoxIndiaPayrollCutoff::orderBy('End_Date', 'desc')->first();
        if ($india_latest_cutoff) {
            $year = Carbon::parse($india_latest_cutoff->End_Date)->format('Y');
            $month_label = Carbon::parse($india_latest_cutoff->End_Date)->format('F');

            $current_payroll_cutoff_in_mar = [
                'id' => $india_latest_cutoff->Id,
                'start_date' => $india_latest_cutoff->Start_Date,
                'end_date' => $india_latest_cutoff->End_Date,
                'month' => str_pad((string) $india_latest_cutoff->Cutoff_Month, 2, '0', STR_PAD_LEFT),
                'month_label' => $month_label,
                'name' => $month_label . ' ' . $year,
                'year' => (string) $india_latest_cutoff->Cutoff_Year
            ];
        } else {
            $current_payroll_cutoff_in_mar = [];
        }

        // Get the latest Payroll Cutoff of Philippines
        $current_payroll_cutoff_ph = new PayrollCutoffResource($this->payroll_cutoff->get_payroll_cutoff());

        $result['settings'] = [
            'current_payroll_cutoff_in_mar'  => $current_payroll_cutoff_in_mar,
            'current_payroll_cutoff_ph'  => $current_payroll_cutoff_ph,
            'current_payroll_cutoff'  => (auth()->user()->country_id === 1 || auth()->user()->country_id === 4) ? $current_payroll_cutoff_in_mar : $current_payroll_cutoff_ph,
            'profile_picture' => $this->bhr->get_profile_picture( auth()->user()->bhr_num ),
            // 'country' =>  $bhr_details ? $bhr_details->country : '',
            'country' =>  auth()->user()->country_id == 2 ? "philippines" : '',
            'countries' => CountryResource::collection(UtcTimelog::orderBy('country_name')->get() ),
            // 'request_payroll_cutoff' => call_sp('EV_SP_Validate_Request_Payroll_Period', [auth()->user()->id, null])[0][0],
            'hr_list' => call_sp('EV_SP_Get_HR_Users', [])[0],
            'coc_forms' => CodeOfConductForms::where('country_id', auth()->user()->country_id)->orderBy('form_no', 'asc')->get(),
            'popup_flags' => PopupFlags::pluck('status', 'key')->map(fn ($status) => (bool) $status),
        ];
        

        return $result;
    }
    
}