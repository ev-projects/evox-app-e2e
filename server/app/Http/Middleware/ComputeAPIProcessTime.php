<?php

namespace App\Http\Middleware;

use Closure;

class ComputeAPIProcessTime
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
        $start_time = $this->microtime_float();
        $response = $next($request);
        $response_time = $this->microtime_float() - $start_time;
        //$response_time = $response_time;//round(, 2);
        $response->headers->set('X-Process-Time', $response_time . ' seconds');
        return $response;
    }

    private function microtime_float()
    {
        list($usec, $sec) = explode(" ", microtime());
        return ((float)$usec + (float)$sec);
    }
}
