<?php

/**
 * Item 7 — BhrRepository concrete coverage WITHOUT hitting the live BHR API.
 *
 * ┌─ How the interception works ────────────────────────────────────────────────┐
 * │ BhrRepository calls bhr_api_call() without a namespace prefix.              │
 * │ PHP resolves unqualified function calls by checking the current namespace    │
 * │ FIRST, then falling back to the global function.                             │
 * │                                                                              │
 * │ Namespace block 1 (below) defines bhr_api_call() inside                     │
 * │ App\Modules\Bhr\Repositories BEFORE any repository method runs.             │
 * │ PHP picks it up instead of the global one → no live API call, no OOM.       │
 * │                                                                              │
 * │ The real BhrRepository methods still execute in full, so Xdebug records     │
 * │ coverage on BhrRepository.php (the app file in the whitelist).              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * The existing evoxtest_BhrMock.php is UNTOUCHED — it mocks the interface for
 * cron/sync tests and is unrelated to this concrete-class approach.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Block 1 — define bhr_api_call() in BhrRepository's own namespace
// ═══════════════════════════════════════════════════════════════════════════════
namespace App\Modules\Bhr\Repositories {

    if (!function_exists(__NAMESPACE__ . '\\bhr_api_call')) {

        /**
         * Namespace-scoped shadow of the global bhr_api_call() helper.
         * PHP resolves unqualified calls from BhrRepository here first.
         * Delegates to the static responder in the test class below.
         */
        function bhr_api_call($method, $endpoint, $data = [], $withLog = true, $country = null)
        {
            return \Tests\Feature\evoxtest_BhrRepositoryConcreteTest::fakeApiResponse($endpoint);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Block 2 — test class
// ═══════════════════════════════════════════════════════════════════════════════
namespace Tests\Feature {

    use Tests\TestCase;
    use Illuminate\Foundation\Testing\DatabaseTransactions;
    use Illuminate\Database\Eloquent\Collection;
    use App\Modules\Bhr\Repositories\BhrRepository;
    use App\Modules\User\Models\User;

    class evoxtest_BhrRepositoryConcreteTest extends TestCase
    {
        use DatabaseTransactions;

        private BhrRepository $repo;
        private User $employee;   // Glenn Macasarte — bhr_num=43284, id=1593

        protected function setUp(): void
        {
            parent::setUp();
            $this->repo     = new BhrRepository();   // no constructor params
            $this->employee = User::findOrFail(1593);
        }

        // ─── Fake BHR API responder ──────────────────────────────────────────
        //
        // Called by the namespace-level bhr_api_call() shim above.
        // Routes by endpoint prefix/substring and returns shapes that match
        // what each BhrRepository method expects to receive.
        // ─────────────────────────────────────────────────────────────────────

        /**
         * @return mixed   (PHP 7.4 — no mixed return type, doc-only)
         */
        public static function fakeApiResponse(string $endpoint)
        {
            // employees/changed?since=... → {employees:[{id,lastChanged}]}
            if (strpos($endpoint, 'employees/changed') === 0) {
                return (object) [
                    'employees' => [
                        (object) [
                            'id'          => '42734',
                            'lastChanged' => '2026-01-01T12:00:00+0000',
                        ],
                    ],
                ];
            }

            // employees/directory → {employees:[{id}]}
            if ($endpoint === 'employees/directory') {
                return (object) [
                    'employees' => [(object) ['id' => '42734']],
                ];
            }

            // employees/{id}/photo/medium → binary string (is_string branch in get_profile_picture)
            if (strpos($endpoint, '/photo/') !== false) {
                return 'fake_photo_bytes';
            }

            // employees/{id}/time_off/calculator → leave credits
            if (strpos($endpoint, '/time_off/calculator') !== false) {
                return (object) ['timeOffPolicies' => []];
            }

            // employees/{id}/tables/{field} → job information
            if (strpos($endpoint, '/tables/') !== false) {
                return (object) ['rows' => []];
            }

            // employees/{id}?fields=... → user object
            if (strpos($endpoint, 'employees/') === 0) {
                return (object) [
                    'id'        => '42734',
                    'firstName' => 'E2E',
                    'lastName'  => 'TestUser',
                    'workEmail' => 'e2e.test@evox.com',
                ];
            }

            // reports/{id}?format=... → report object
            if (strpos($endpoint, 'reports/') === 0) {
                return (object) ['title' => 'E2E Report', 'rows' => []];
            }

            // time_off/whos_out → null  (?? [] in get_holidays → empty → no holidays inserted)
            // time_off/requests → null  (returned directly by get_leaves)
            return null;
        }

        // ─── get_changed_users ────────────────────────────────────────────────

        public function test_get_changed_users_returns_sorted_bhr_num_array()
        {
            $result = $this->repo->get_changed_users('2026-01-01T00:00:00+0000');
            $this->assertIsArray($result);
            $this->assertArrayHasKey('42734', $result);
            $this->assertEquals('42734', $result['42734']);
        }

        // ─── get_all_bhr_user_numbers ─────────────────────────────────────────

        public function test_get_all_bhr_user_numbers_returns_collection()
        {
            $result = $this->repo->get_all_bhr_user_numbers();
            $this->assertInstanceOf(Collection::class, $result);
            $this->assertTrue($result->contains('42734'));
        }

        // ─── get_user ─────────────────────────────────────────────────────────

        public function test_get_user_returns_user_object()
        {
            $result = $this->repo->get_user('42734');
            $this->assertIsObject($result);
        }

        public function test_get_user_for_sync_flag_returns_object()
        {
            // $for_sync=true → different BHR_USER_SYNC_FIELDS constant used
            $result = $this->repo->get_user('42734', true);
            $this->assertIsObject($result);
        }

        // ─── get_profile_picture ──────────────────────────────────────────────

        public function test_get_profile_picture_valid_bhr_num_returns_base64()
        {
            $result = $this->repo->get_profile_picture('42734');
            $this->assertIsString($result);
            // Fake returned 'fake_photo_bytes' → base64_encode applied
            $this->assertEquals(base64_encode('fake_photo_bytes'), $result);
        }

        public function test_get_profile_picture_null_bhr_num_returns_null()
        {
            // is_valid(null) → false → logs 'No Valid BHR Number' → returns null
            $result = $this->repo->get_profile_picture(null);
            $this->assertNull($result);
        }

        // ─── get_user_bhr_field ───────────────────────────────────────────────

        public function test_get_user_bhr_field_returns_object()
        {
            $result = $this->repo->get_user_bhr_field('42734', 'BHR_USER_PERSONAL');
            $this->assertIsObject($result);
        }

        public function test_get_user_bhr_field_with_additional_fields()
        {
            // additional_fields appended to the fields string
            $result = $this->repo->get_user_bhr_field('42734', '', ['customField1']);
            $this->assertIsObject($result);
        }

        public function test_get_user_bhr_field_null_bhr_num_returns_null()
        {
            $result = $this->repo->get_user_bhr_field(null);
            $this->assertNull($result);
        }

        // ─── get_user_job_information ─────────────────────────────────────────

        public function test_get_user_job_information_returns_object()
        {
            $result = $this->repo->get_user_job_information('42734', 'jobInformation');
            $this->assertIsObject($result);
        }

        public function test_get_user_job_information_null_bhr_num_returns_null()
        {
            $result = $this->repo->get_user_job_information(null, 'jobInformation');
            $this->assertNull($result);
        }

        // ─── get_report ───────────────────────────────────────────────────────

        public function test_get_report_valid_id_returns_object()
        {
            $result = $this->repo->get_report('12345');
            $this->assertIsObject($result);
        }

        public function test_get_report_empty_id_returns_empty_array()
        {
            // is_valid('') → false → skips API call → returns $result=[]
            $result = $this->repo->get_report('');
            $this->assertEquals([], $result);
        }

        // ─── get_leave_credits ────────────────────────────────────────────────

        public function test_get_leave_credits_returns_object()
        {
            // endpoint contains '/time_off/calculator' → fake returns (object)[]
            $result = $this->repo->get_leave_credits('42734', '2026-03-31');
            $this->assertIsObject($result);
        }

        // ─── get_holidays ─────────────────────────────────────────────────────

        public function test_get_holidays_iterates_all_five_regions_returns_empty()
        {
            // Fake returns null for time_off/whos_out → ?? [] → no holidays collected
            // The 5-region foreach loop (PHL, IND, BUL, MAR, BEL) still executes
            $result = $this->repo->get_holidays('2026-03-01', '2026-03-31');
            $this->assertIsArray($result);
            $this->assertEmpty($result);
        }

        // ─── get_leaves ───────────────────────────────────────────────────────

        public function test_get_leaves_without_user_returns_fake_null()
        {
            // Fake returns null for time_off/requests → returned directly
            $result = $this->repo->get_leaves('2026-03-01', '2026-03-31');
            $this->assertNull($result);
        }

        public function test_get_leaves_with_user_appends_employee_id_param()
        {
            // User bhr_num appended → '&employeeId=43284'
            $result = $this->repo->get_leaves('2026-03-01', '2026-03-31', $this->employee);
            $this->assertNull($result);
        }

        // ─── sync_holidays ────────────────────────────────────────────────────

        /**
         * sync_holidays() calls get_holidays() internally → bhr_api_call is intercepted
         * → 0 holidays collected → DB::beginTransaction + DB::commit still execute
         * → returns empty Collection.
         * DatabaseTransactions rolls back if any Holiday was somehow inserted.
         */
        public function test_sync_holidays_returns_empty_holiday_collection()
        {
            $result = $this->repo->sync_holidays('2026-03-01', '2026-03-31');
            $this->assertInstanceOf(Collection::class, $result);
            $this->assertTrue($result->isEmpty());
        }
    }
}
