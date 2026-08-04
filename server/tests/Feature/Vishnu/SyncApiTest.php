<?php

/**
 * EVOX Sync API Tests — Vishnu Padmanabhan
 *
 * CORRECTED 2026-07-29 — original file assumed routes that do not exist in this branch.
 *
 * Routes that actually exist (under CronController, prefix /api/cron/):
 *   GET /api/cron/sync_users    — middleware: jwtauth, auth.apikey
 *   GET /api/cron/sync_holidays — middleware: jwtauth, auth.apikey
 *   GET /api/cron/sync_leaves   — middleware: jwtauth, auth.apikey
 *
 * Routes that do NOT exist (SyncController.php not implemented in this branch):
 *   /api/sync_users_hris, /api/sync_timeoff_allocation,
 *   /api/sync_timeoff_allocation_new, /api/sync_timeoff_allocation_fail_sync
 *   → BUG-082: SyncController never implemented; tests skipped.
 *
 * Controller-logic tests for the 3 existing cron routes are already covered
 * by tests/Feature/Api/CronApiTest.php (with correct BHR IoC mock).
 * This file retains only the auth-enforcement (Pattern B) coverage.
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class SyncApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];
    }

    // ─── Pattern B — JWT enforcement on Cron routes ───────────────────────────
    // Routes require jwtauth + auth.apikey. Missing JWT → 401 (token_absent).

    /** @test */
    public function test_sync_users_without_token_returns_401()
    {
        $response = $this->getJson('/api/cron/sync_users', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_sync_holidays_without_token_returns_401()
    {
        $response = $this->getJson('/api/cron/sync_holidays', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_sync_leaves_without_token_returns_401()
    {
        $response = $this->getJson('/api/cron/sync_leaves', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Controller-logic tests deferred to CronApiTest ──────────────────────
    // tests/Feature/Api/CronApiTest.php covers these routes with the correct
    // BHR IoC mock (evoxtest_BhrMock). Duplicate coverage here is skipped to
    // avoid running the BHR sync without the IoC mock in place.

    /** @test */
    public function test_sync_users_controller_logic_covered_by_cron_api_test()
    {
        $this->markTestIncomplete('Controller-logic coverage for /api/cron/sync_users is in CronApiTest.php (with BHR IoC mock).');
    }

    /** @test */
    public function test_sync_holidays_controller_logic_covered_by_cron_api_test()
    {
        $this->markTestIncomplete('Controller-logic coverage for /api/cron/sync_holidays is in CronApiTest.php (with BHR IoC mock).');
    }

    /** @test */
    public function test_sync_leaves_controller_logic_covered_by_cron_api_test()
    {
        $this->markTestIncomplete('Controller-logic coverage for /api/cron/sync_leaves is in CronApiTest.php (with BHR IoC mock).');
    }

    // ─── BUG-082 — SyncController not implemented ────────────────────────────
    // The following routes do not exist in any module's api.php in this branch.
    // SyncController.php was not found under server/app/.
    // Tests are skipped pending route implementation by the dev team.

    /** @test */
    public function test_sync_users_hris_without_api_key_returns_401()
    {
        $this->markTestIncomplete('BUG-082: /api/sync_users_hris route not implemented — SyncController.php does not exist in this branch.');
    }

    /** @test */
    public function test_sync_users_hris_with_api_key_missing_body_returns_not_500()
    {
        $this->markTestIncomplete('BUG-082: /api/sync_users_hris route not implemented — SyncController.php does not exist in this branch.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_without_api_key_returns_401()
    {
        $this->markTestIncomplete('BUG-082: /api/sync_timeoff_allocation route not implemented — SyncController.php does not exist in this branch.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_with_api_key_is_reachable()
    {
        $this->markTestIncomplete('BUG-082: /api/sync_timeoff_allocation route not implemented — SyncController.php does not exist in this branch.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_new_without_api_key_returns_401()
    {
        $this->markTestIncomplete('BUG-082: /api/sync_timeoff_allocation_new route not implemented — SyncController.php does not exist in this branch.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_new_with_api_key_is_reachable()
    {
        $this->markTestIncomplete('BUG-082: /api/sync_timeoff_allocation_new route not implemented — SyncController.php does not exist in this branch.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_without_api_key_returns_401()
    {
        $this->markTestIncomplete('BUG-082: /api/sync_timeoff_allocation_fail_sync route not implemented — SyncController.php does not exist in this branch.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_with_api_key_is_reachable()
    {
        $this->markTestIncomplete('BUG-082: /api/sync_timeoff_allocation_fail_sync route not implemented — SyncController.php does not exist in this branch.');
    }
}
