<?php
/**
 * THE bhr_api_call() TEST SEAM (2026-07-31) — sibling of CallSpFake: run REAL BhrRepository code,
 * fake ONLY the BambooHR HTTP boundary. bhr_api_call() is a global helper invoked UNQUALIFIED from
 * App\Modules\Bhr\Repositories (the only app caller), so a Tests-owned namespace shadow intercepts
 * every call. Default = PASSTHROUGH; a test opts in with BhrApiFake::activate(). While active,
 * unmatched endpoints throw — no network I/O can ever slip through.
 *
 * Usage:
 *   require_once __DIR__ . '/../Support/BhrApiFake.php';
 *   BhrApiFake::activate();
 *   BhrApiFake::fake('employees/changed', (object)['employees' => [...]]);      // substring match
 *   BhrApiFake::fake('whos_out', function ($method, $endpoint, $data, $json, $country) {...});
 *   ... run real repo ...  BhrApiFake::callsFor('employees/changed') ...
 *   BhrApiFake::reset();   // in tearDown, ALWAYS
 */

namespace Tests\Support {

    class BhrApiFake
    {
        private static $active = false;
        private static $fakes = [];   // [substring => result|callable] in registration order
        private static $calls = [];

        public static function activate(): void
        {
            self::$active = true;
        }

        /** Register a canned result or callable($method,$endpoint,$data,$json,$country) for endpoints containing $needle. */
        public static function fake(string $needle, $resultOrCallable): void
        {
            self::$fakes[$needle] = $resultOrCallable;
        }

        public static function reset(): void
        {
            self::$active = false;
            self::$fakes = [];
            self::$calls = [];
        }

        public static function calls(): array
        {
            return self::$calls;
        }

        public static function callsFor(string $needle): array
        {
            return array_values(array_filter(self::$calls, function ($c) use ($needle) {
                return strpos($c['endpoint'], $needle) !== false;
            }));
        }

        public static function dispatch($method, $endpoint, $data, $json, $country)
        {
            if (!self::$active) {
                return \bhr_api_call($method, $endpoint, $data, $json, $country);
            }
            self::$calls[] = [
                'method' => $method, 'endpoint' => $endpoint,
                'data' => $data, 'json' => $json, 'country' => $country,
            ];
            foreach (self::$fakes as $needle => $fake) {
                if (strpos($endpoint, $needle) !== false) {
                    return is_callable($fake) ? $fake($method, $endpoint, $data, $json, $country) : $fake;
                }
            }
            throw new \RuntimeException(
                "BhrApiFake: unfaked BHR endpoint '$endpoint' called while seam active. " .
                "Register it with BhrApiFake::fake('<substring>', ...) — no HTTP in seam mode."
            );
        }
    }
}

/* ── namespace shadow: the only app namespace that calls bhr_api_call() unqualified ────────── */

namespace App\Modules\Bhr\Repositories {
    if (!function_exists(__NAMESPACE__ . '\\bhr_api_call')) {
        function bhr_api_call($method = 'GET', $api_endpoint = '', $data = array(), $send_as_json = false, $country = "default")
        {
            return \Tests\Support\BhrApiFake::dispatch($method, $api_endpoint, $data, $send_as_json, $country);
        }
    }
}
