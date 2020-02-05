<?php

namespace App\Http\Middleware;

use Closure;
use Auth;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next, $permission)
    {
        if (! $request->user()->getDirectPermissions()->contains('name', $permission) ) {
           abort(403, "No permission to do this action.");
        }
    
        return $next($request);
    }
}
