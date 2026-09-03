<?php
/**
 * THE request_validity_checker() TEST SEAM — sibling of CallSpFake and BhrApiFake.
 *
 * WHY IT EXISTS
 * request_validity_checker() (app/Helpers/user_helper.php) decides whether a request's target date
 * still sits inside an open payroll period. It answers 2 for "the period is already closed — route
 * this through the payroll dispute automation instead of the normal approval". That 2 is the ONLY
 * way into the dispute arms of AlterLogController::approve() and its siblings.
 *
 * The helper reaches that answer through call_sp("EV_SP_Validate_Request_Payroll_Period", ...) — and
 * that call is made from the GLOBAL namespace to a GLOBAL function, which is precisely the case
 * CallSpFake documents as un-shadowable ("global-to-global calls cannot be shadowed"). So the dispute
 * arms have been unreachable and marked SKIPPED-SP since the branch-test suite was written.
 *
 * HOW IT WORKS
 * The APP calls request_validity_checker() UNQUALIFIED from inside a namespace, so PHP resolves it
 * namespace-first. Defining a Tests-owned function of that name inside the calling namespace
 * intercepts it — the same mechanism CallSpFake uses. Default behaviour is PASSTHROUGH to the real
 * global helper, so merely loading this file changes NOTHING until a test calls activate().
 *
 * Usage in a test:
 *   require_once __DIR__ . '/../../Support/RequestValidityFake.php';   // adjust depth
 *   \Tests\Support\RequestValidityFake::activate(2);      // "payroll period closed"
 *   ... run the real controller ...
 *   \Tests\Support\RequestValidityFake::calls();          // assert what it was asked about
 *   \Tests\Support\RequestValidityFake::reset();          // in tearDown, ALWAYS
 *
 * SAFETY: while active NO stored procedure runs, so the payroll-period validation SP is never
 * executed and the database is never touched by the check.
 *
 * CO-EXISTENCE: an older inline shadow of the same function lives in
 * Unit/Repositories/RequestControllerBulkBranchTest.php. Only one declaration can win and this one
 * does, so dispatch() reproduces that shadow's contract when this seam is inactive — see the note on
 * BULK_TEST below. Nothing in that test file is modified.
 */

namespace Tests\Support {

    class RequestValidityFake
    {
        private static $active = false;
        private static $result = null;
        private static $calls  = [];

        /** Turn interception ON and pin the answer (2 = payroll period closed -> dispute route). */
        public static function activate($result): void
        {
            self::$active = true;
            self::$result = $result;
        }

        /** Full reset — passthrough behaviour restored, answer and call log cleared. */
        public static function reset(): void
        {
            self::$active = false;
            self::$result = null;
            self::$calls  = [];
        }

        /** All recorded checks: ['user_id' =>, 'target_date' =>] in call order. */
        public static function calls(): array
        {
            return self::$calls;
        }

        /**
         * The pre-existing inline shadow this seam has to co-exist with.
         *
         * Unit/Repositories/RequestControllerBulkBranchTest.php declares its OWN shadow of
         * request_validity_checker() in the same namespace, guarded by function_exists(), and that
         * shadow unconditionally returns the test class's public static. Only ONE of the two
         * declarations can win: whichever file PHPUnit loads first. File_Iterator sorts by path, so
         * Requests/... loads before Unit/..., which means THIS seam wins in every full run — and the
         * older test would silently lose its shadow.
         *
         * Rather than edit that test (add-only rule), the inactive branch below reproduces exactly
         * what its shadow did, so its behaviour is unchanged whichever declaration is installed.
         */
        const BULK_TEST = 'Tests\Feature\BranchTests\Unit\Repositories\RequestControllerBulkBranchTest';

        /** The interceptor every namespace shadow delegates to. */
        public static function dispatch($user_id, $target_date)
        {
            if (self::$active) {
                self::$calls[] = ['user_id' => $user_id, 'target_date' => $target_date];

                return self::$result;
            }

            // Deferred to the older inline shadow's contract when that suite is loaded. Checked
            // without autoloading, so this costs nothing when the class is not part of the run.
            if (class_exists(self::BULK_TEST, false)) {
                $bulk = self::BULK_TEST;

                return $bulk::$validityResult;
            }

            return \request_validity_checker($user_id, $target_date);       // passthrough — real helper
        }
    }
}

/* ── namespace shadow: the app namespace whose controllers call the helper unqualified ────────── */

namespace App\Modules\Request\Http\Controllers {
    if (!function_exists(__NAMESPACE__ . '\\request_validity_checker')) {
        function request_validity_checker($user_id, $target_date)
        {
            return \Tests\Support\RequestValidityFake::dispatch($user_id, $target_date);
        }
    }
}
