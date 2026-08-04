<?php
/**
 * THE call_sp() TEST SEAM (2026-07-28) — run REAL repo/controller code, fake ONLY the stored
 * procedure boundary. No app-code change needed.
 *
 * How it works: call_sp() is a GLOBAL function and every app call site invokes it UNQUALIFIED
 * from inside a namespace. PHP resolves unqualified function calls namespace-first, so defining
 * Tests-owned `call_sp()` functions inside those namespaces intercepts every call made FROM them.
 * Default behavior is PASSTHROUGH to the real global \call_sp() — loading this file changes
 * NOTHING until a test calls CallSpFake::activate().
 *
 * Usage in a test:
 *   require_once __DIR__ . '/../Support/CallSpFake.php';   // adjust depth
 *   protected function setUp(): void { parent::setUp(); \Tests\Support\CallSpFake::activate(); }
 *   protected function tearDown(): void { \Tests\Support\CallSpFake::reset(); parent::tearDown(); }
 *   \Tests\Support\CallSpFake::fake('InsertOrUpdateLeaves', [[]]);      // canned result
 *   ... run real repo method ...
 *   $calls = \Tests\Support\CallSpFake::callsFor('InsertOrUpdateLeaves'); // assert on captured params
 *
 * When ACTIVE: a faked SP returns its canned result (or callable result) and records the call;
 * an UNFAKED SP throws RuntimeException — fail fast, the DB is NEVER touched. This kills the
 * BUG-078/079 hang class for seam-based tests entirely.
 *
 * LIMITATION: calls made FROM the global namespace (app/Helpers/user_helper.php) bypass the seam —
 * global-to-global calls cannot be shadowed. Tests exercising those helpers must fake at a higher
 * level or stay on the exclusion list until the closeCursor() app fix lands.
 */

namespace Tests\Support {

    class CallSpFake
    {
        private static $active = false;
        private static $fakes = [];
        private static $calls = [];

        /** Turn interception ON for this test (reset() turns it off). */
        public static function activate(): void
        {
            self::$active = true;
        }

        /** Register a canned result (array) or a callable(params, isExecute) for an SP name. */
        public static function fake(string $procName, $resultOrCallable): void
        {
            self::$fakes[$procName] = $resultOrCallable;
        }

        /** Full reset — passthrough behavior restored, fakes and call log cleared. */
        public static function reset(): void
        {
            self::$active = false;
            self::$fakes = [];
            self::$calls = [];
        }

        /** All recorded calls: ['proc' =>, 'params' =>, 'isExecute' =>] in call order. */
        public static function calls(): array
        {
            return self::$calls;
        }

        /** Recorded calls for one SP. */
        public static function callsFor(string $procName): array
        {
            return array_values(array_filter(self::$calls, function ($c) use ($procName) {
                return $c['proc'] === $procName;
            }));
        }

        /** The interceptor every namespace shadow delegates to. */
        public static function dispatch($procName, $parameters = null, $isExecute = false)
        {
            if (!self::$active) {
                return \call_sp($procName, $parameters, $isExecute);   // passthrough — real helper
            }
            self::$calls[] = ['proc' => $procName, 'params' => $parameters, 'isExecute' => $isExecute];
            if (!array_key_exists($procName, self::$fakes)) {
                throw new \RuntimeException(
                    "CallSpFake: unfaked stored procedure '$procName' called while seam active. " .
                    "Register it with CallSpFake::fake('$procName', ...) — the DB is never touched in seam mode."
                );
            }
            $fake = self::$fakes[$procName];
            if (is_callable($fake)) return $fake($parameters, $isExecute);
            if ($isExecute) return true;
            return $fake;
        }
    }
}

/* ── namespace shadows: one call_sp() per app namespace that invokes it (13 total) ─────────── */

namespace App\Console\Commands {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Http\Controllers {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\Coe\Repositories {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\Department\Http\Controllers {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\Payroll\Http\Controllers {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\Payroll\Repositories {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\Report\Http\Controllers {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\Report\Repositories {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\Request\Http\Controllers {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\Request\Repositories {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\User\Http\Controllers {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\User\Models {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
namespace App\Modules\User\Repositories {
    if (!function_exists(__NAMESPACE__ . '\\call_sp')) {
        function call_sp($p, $a = null, $e = false) { return \Tests\Support\CallSpFake::dispatch($p, $a, $e); }
    }
}
