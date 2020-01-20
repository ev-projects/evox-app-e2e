<?php

namespace App\Modules\User\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Config;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Facades\JWTAuth;

/**
 * 
 *  Handles all the JWT related validation for tokens and other things.
 * 
 */
class JWTAuthentication
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        try {
            if (!$user = JWTAuth::parseToken()->authenticate()) {
                return response()->json(['error' => 'user_not_found'], Config::get('constants.HTTP_STATUS_CODE.400.NOT_FOUND'));
            }

            # If the token is expired, this exception will handle it.
        } catch (TokenExpiredException $e) {
            return response()->json(['error' => 'token_expired'], Config::get('constants.HTTP_STATUS_CODE.400.UNAUTHORIZED'));

            # If the token is invalid, this exception will handle it.
        } catch (TokenInvalidException $e) {
            return response()->json(['error' => 'token_invalid'], Config::get('constants.HTTP_STATUS_CODE.400.UNAUTHORIZED'));

            # If first 2 exceptions are not met, this exception will handle it by default.
        } catch (JWTException $e) {
            return response()->json(['error' => 'token_absent'], Config::get('constants.HTTP_STATUS_CODE.400.UNAUTHORIZED'));
        }

        return $next($request);
    }
}
