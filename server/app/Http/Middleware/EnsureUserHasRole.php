<?php

namespace App\Http\Middleware;

use Closure;
use Exception;

class EnsureUserHasRole 
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next, $role)
    {
        // If the role has no Admin privileges, throw an exception to not allow the user to register
        if( ! $request->user()->hasRole( get_constant('USER_ROLES.admin') )  ) {
            return error_response( trans('messages.role_not_allowed') );
        }

        return $next($request);
    }
}
