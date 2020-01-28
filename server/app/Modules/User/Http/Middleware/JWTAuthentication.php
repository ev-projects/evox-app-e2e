<?php

namespace App\Modules\User\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
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
                return response()->json( error_response('user_not_found'), JsonResponse::HTTP_NOT_FOUND );
            }

            # If the token is expired, this exception will handle it.
        } catch (TokenExpiredException $e) {
            return response()->json( error_response('token_expired'), JsonResponse::HTTP_UNAUTHORIZED );

            # If the token is invalid, this exception will handle it.
        } catch (TokenInvalidException $e) {
            return response()->json( error_response('token_invalid'), JsonResponse::HTTP_UNAUTHORIZED );

            # If first 2 exceptions are not met, this exception will handle it by default.
        } catch (JWTException $e) {
            return response()->json( error_response('token_absent'), JsonResponse::HTTP_UNAUTHORIZED );
        }

        return $next($request);
    }
}
