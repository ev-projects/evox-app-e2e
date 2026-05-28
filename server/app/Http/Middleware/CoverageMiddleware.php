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

        if (!function_exists('xdebug_start_code_coverage')) {
            return $next($request);
        }

        if (function_exists('xdebug_stop_code_coverage')) {
            @xdebug_stop_code_coverage(true);
        }

        // Start lightweight coverage
        xdebug_start_code_coverage();

        try {
            return $next($request);

        } finally {

            $data = xdebug_get_code_coverage();

            xdebug_stop_code_coverage(true);

            // Keep only app code
            $appPath = base_path('app');

            $filtered = array_filter(
                $data,
                fn ($file) => str_starts_with($file, $appPath),
                ARRAY_FILTER_USE_KEY
            );

            $dir = storage_path('coverage');

            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }

            $safePath = str_replace('/', '_', $request->path());

            $file = $safePath . '_' . uniqid('e2e_', true) . '.json';

            file_put_contents(
                $dir . '/' . $file,
                json_encode($filtered, JSON_PRETTY_PRINT)
            );
        }
    }
}