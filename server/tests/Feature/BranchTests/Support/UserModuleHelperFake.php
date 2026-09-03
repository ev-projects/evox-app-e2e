<?php
/**
 * USER-MODULE HELPER SEAM (2026-08-18) — the same namespace-shadow trick as Support/CallSpFake.php,
 * applied to the three remaining global helpers that wall off User-module branches:
 *
 *   ms_get_access_token() / ms_call_api()  — real Microsoft OAuth + Graph HTTP calls. EVERY branch of
 *                                            AuthController::authenticateMSClient() sits behind them,
 *                                            which is why that method was stuck at 45.71%.
 *   log_activity()                         — first statement of many UserController actions; the only
 *                                            statement inside their try{} that can throw before the
 *                                            method's real work starts, so it is the seam that reaches
 *                                            their catch arms (audit-log write failure in production).
 *   log_to_file()                          — same role inside UserRepository/ProfileRepository bodies.
 *
 * Mechanics (identical to CallSpFake): the app calls these UNQUALIFIED from inside a namespace, so PHP
 * resolves namespace-first and the Tests-owned copies below intercept. Default behaviour is PASSTHROUGH
 * to the real global function — loading this file changes NOTHING until a test calls activate(), and even
 * then log_activity/log_to_file still pass through unless explicitly armed to throw.
 *
 * The MS pair is different: once ACTIVE they NEVER reach the network. An un-stubbed MS call throws a
 * RuntimeException so a missing stub fails loudly instead of dialling login.microsoftonline.com.
 *
 * Usage:
 *   require_once __DIR__ . '/../Support/UserModuleHelperFake.php';   // adjust depth
 *   protected function setUp(): void    { parent::setUp(); UserModuleHelperFake::activate(); }
 *   protected function tearDown(): void { UserModuleHelperFake::reset(); parent::tearDown(); }
 */

namespace Tests\Support {

    class UserModuleHelperFake
    {
        private static $active = false;

        private static $msTokenSet = false;
        private static $msToken = null;
        private static $msTokenThrow = null;

        private static $msApiSet = false;
        private static $msApi = null;
        private static $msApiThrow = null;

        private static $logActivityThrow = null;
        private static $logToFileThrow = null;
        private static $logToFileNeedle = null;

        private static $calls = array();

        /** Turn interception ON for this test (reset() turns it off). */
        public static function activate()
        {
            self::$active = true;
        }

        /** Full reset — passthrough restored, stubs and call log cleared. */
        public static function reset()
        {
            self::$active = false;
            self::$msTokenSet = false;
            self::$msToken = null;
            self::$msTokenThrow = null;
            self::$msApiSet = false;
            self::$msApi = null;
            self::$msApiThrow = null;
            self::$logActivityThrow = null;
            self::$logToFileThrow = null;
            self::$logToFileNeedle = null;
            self::$calls = array();
        }

        /** Canned return for ms_get_access_token() — pass null to model a failed token exchange. */
        public static function msAccessToken($value)
        {
            self::$msTokenSet = true;
            self::$msToken = $value;
        }

        /** Make the token exchange itself blow up (network/Curl failure). */
        public static function msAccessTokenThrows(\Exception $e)
        {
            self::$msTokenSet = true;
            self::$msTokenThrow = $e;
        }

        /** Canned return for ms_call_api() — pass null to model a failed Graph read. */
        public static function msApiResult($value)
        {
            self::$msApiSet = true;
            self::$msApi = $value;
        }

        public static function msApiThrows(\Exception $e)
        {
            self::$msApiSet = true;
            self::$msApiThrow = $e;
        }

        /** Arm log_activity() to throw — reaches the catch arm of the controller action under test. */
        public static function failLogActivity(\Exception $e)
        {
            self::$logActivityThrow = $e;
        }

        /** Arm log_to_file() to throw for the first message containing $needle. */
        public static function failLogToFileWhenMessageContains($needle, \Exception $e)
        {
            self::$logToFileNeedle = $needle;
            self::$logToFileThrow = $e;
        }

        /** All recorded calls: ['fn' =>, 'args' =>] in call order. */
        public static function calls()
        {
            return self::$calls;
        }

        /** Recorded calls for one helper. */
        public static function callsFor($fn)
        {
            return array_values(array_filter(self::$calls, function ($c) use ($fn) {
                return $c['fn'] === $fn;
            }));
        }

        public static function dispatchMsToken($tenant_id, $data = array())
        {
            if (!self::$active) {
                return \ms_get_access_token($tenant_id, $data);
            }
            self::$calls[] = array('fn' => 'ms_get_access_token', 'args' => array($tenant_id, $data));

            if (!self::$msTokenSet) {
                throw new \RuntimeException(
                    'UserModuleHelperFake: ms_get_access_token() called with no stub registered. ' .
                    'Register one with UserModuleHelperFake::msAccessToken(...) — the network is never touched in seam mode.'
                );
            }
            if (self::$msTokenThrow !== null) {
                throw self::$msTokenThrow;
            }

            return self::$msToken;
        }

        public static function dispatchMsApi($access_token, $method, $api_endpoint, $data, $send_as_json)
        {
            if (!self::$active) {
                return \ms_call_api($access_token, $method, $api_endpoint, $data, $send_as_json);
            }
            self::$calls[] = array(
                'fn' => 'ms_call_api',
                'args' => array($access_token, $method, $api_endpoint, $data, $send_as_json),
            );

            if (!self::$msApiSet) {
                throw new \RuntimeException(
                    'UserModuleHelperFake: ms_call_api() called with no stub registered. ' .
                    'Register one with UserModuleHelperFake::msApiResult(...) — the network is never touched in seam mode.'
                );
            }
            if (self::$msApiThrow !== null) {
                throw self::$msApiThrow;
            }

            return self::$msApi;
        }

        public static function dispatchLogActivity($message)
        {
            if (!self::$active) {
                return \log_activity($message);
            }
            self::$calls[] = array('fn' => 'log_activity', 'args' => array($message));

            if (self::$logActivityThrow !== null) {
                throw self::$logActivityThrow;
            }

            return \log_activity($message);          // passthrough — the real audit write still runs
        }

        public static function dispatchLogToFile($type, $message, $data = array(), $channel = '')
        {
            if (!self::$active) {
                return \log_to_file($type, $message, $data, $channel);
            }
            self::$calls[] = array('fn' => 'log_to_file', 'args' => array($type, $message, $channel));

            if (self::$logToFileNeedle !== null
                && strpos((string) $message, self::$logToFileNeedle) !== false) {
                throw self::$logToFileThrow;
            }

            return \log_to_file($type, $message, $data, $channel);
        }
    }
}

/* ── namespace shadows ─────────────────────────────────────────────────────────────────────── */

namespace App\Modules\User\Http\Controllers {

    if (!function_exists(__NAMESPACE__ . '\\ms_get_access_token')) {
        function ms_get_access_token($tenant_id, $data = array())
        {
            return \Tests\Support\UserModuleHelperFake::dispatchMsToken($tenant_id, $data);
        }
    }

    if (!function_exists(__NAMESPACE__ . '\\ms_call_api')) {
        function ms_call_api($access_token, $method = 'GET', $api_endpoint = null, $data = array(), $send_as_json = false)
        {
            return \Tests\Support\UserModuleHelperFake::dispatchMsApi($access_token, $method, $api_endpoint, $data, $send_as_json);
        }
    }

    if (!function_exists(__NAMESPACE__ . '\\log_activity')) {
        function log_activity($message)
        {
            return \Tests\Support\UserModuleHelperFake::dispatchLogActivity($message);
        }
    }
}

namespace App\Modules\User\Repositories {

    if (!function_exists(__NAMESPACE__ . '\\log_to_file')) {
        function log_to_file($type, $message, $data = array(), $channel = "")
        {
            return \Tests\Support\UserModuleHelperFake::dispatchLogToFile($type, $message, $data, $channel);
        }
    }
}
