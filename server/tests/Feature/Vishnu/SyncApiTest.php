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
 * Intentionally dropped (confirmed 2026-08-13):
 *   /api/sync_users_hris, /api/sync_timeoff_allocation,
 *   /api/sync_timeoff_allocation_new, /api/sync_timeoff_allocation_fail_sync
 *   SyncController HRIS sync operations were removed by design from this branch.
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

    // ─── Intentionally dropped — SyncController HRIS sync operations ─────────
    // The following routes were removed by design from this branch (confirmed 2026-08-13).
    // Tests remain as placeholders; activate if routes are reinstated.

    /** @test */
    public function test_sync_users_hris_without_api_key_returns_401()
    {
        $this->markTestSkipped('[BY-DESIGN] POST /api/sync_users_hris — SyncController HRIS sync operations permanently removed from the application. Route returns 404.');
    }

    /** @test */
    public function test_sync_users_hris_with_api_key_missing_body_returns_not_500()
    {
        $this->markTestSkipped('[BY-DESIGN] POST /api/sync_users_hris — SyncController HRIS sync operations permanently removed from the application. Route returns 404.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_without_api_key_returns_401()
    {
        $this->markTestSkipped('[BY-DESIGN] POST /api/sync_timeoff_allocation — SyncController HRIS sync operations permanently removed from the application. Route returns 404.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_with_api_key_is_reachable()
    {
        $this->markTestSkipped('[BY-DESIGN] POST /api/sync_timeoff_allocation — SyncController HRIS sync operations permanently removed from the application. Route returns 404.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_new_without_api_key_returns_401()
    {
        $this->markTestSkipped('[BY-DESIGN] POST /api/sync_timeoff_allocation_new — SyncController HRIS sync operations permanently removed from the application. Route returns 404.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_new_with_api_key_is_reachable()
    {
        $this->markTestSkipped('[BY-DESIGN] POST /api/sync_timeoff_allocation_new — SyncController HRIS sync operations permanently removed from the application. Route returns 404.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_without_api_key_returns_401()
    {
        $this->markTestSkipped('[BY-DESIGN] POST /api/sync_timeoff_allocation_fail_sync — SyncController HRIS sync operations permanently removed from the application. Route returns 404.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_with_api_key_is_reachable()
    {
        $this->markTestSkipped('[BY-DESIGN] POST /api/sync_timeoff_allocation_fail_sync — SyncController HRIS sync operations permanently removed from the application. Route returns 404.');
    }
}
