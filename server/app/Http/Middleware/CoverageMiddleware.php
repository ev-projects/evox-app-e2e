<?php

namespace App\Http\Middleware;

use Closure;

class CoverageMiddleware
{
    public function handle($request, Closure $next)
    {
        if (!env('COVERAGE_ENABLED', false)) {
            return $next($request);
        }

        // Ensure pcov exists
        if (!function_exists('pcov\start')) {
            return $next($request);
        }

        \pcov\start();

        try {
            $response = $next($request);
        } finally {
            \pcov\stop();

            $data = \pcov\collect();

            \pcov\clear();

            $dir = storage_path('coverage');

            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }

            $path = $request->path();
            $safePath = str_replace('/', '_', $path);
            $file = $safePath . '_' . uniqid('e2e_', true) . '.json';

            file_put_contents(
                storage_path('coverage/' . $file),
                json_encode($data)
            );
        }

        return $response;
    }
}