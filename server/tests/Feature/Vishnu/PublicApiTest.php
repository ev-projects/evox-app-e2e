<?php

/**
 * EVOX Public API Tests — Vishnu Padmanabhan
 *
 * Tests for Careers and Changelogs endpoints.
 *
 * ⚠ BOTH MODULES CONFIRMED DEAD CODE (2026-07-30):
 *   BUG-065 — Careers module removed from this branch. No controller, no routes.
 *   BUG-064 — Changelogs module removed from this branch. No controller, no routes, no model.
 *
 * All tests are permanently skipped. Remove the markTestSkipped() call if the
 * module is re-implemented and the route is registered.
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PublicApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        $this->user = User::where('is_active', 1)
            ->whereNotNull('email')
            ->firstOrFail();
    }

    // ─── Careers: GET /api/careers/ ───────────────────────────────────────────

    /** @test */
    public function test_get_careers_is_publicly_accessible_without_jwt()
    {
        $this->markTestSkipped('BUG-065: Careers module removed — confirmed dead code (2026-07-30).');
    }

    /** @test */
    public function test_get_careers_returns_200_and_success_envelope_when_data_exists()
    {
        $this->markTestSkipped('BUG-065: Careers module removed — confirmed dead code (2026-07-30).');
    }

    /** @test */
    public function test_get_careers_does_not_return_500_in_normal_operation()
    {
        $this->markTestSkipped('BUG-065: Careers module removed — confirmed dead code (2026-07-30).');
    }

    /** @test */
    public function test_post_careers_without_parsedJobs_returns_error_not_500()
    {
        // SAFETY: CareersController::store() calls Careers::truncate() (DDL COMMIT) which
        // destroys the DatabaseTransactions savepoint and permanently wipes real data.
        // Additionally the module is confirmed removed (BUG-065).
        $this->markTestSkipped('BUG-065: Careers module removed — confirmed dead code (2026-07-30). Also unsafe: truncate() is DDL.');
    }

    /** @test */
    public function test_post_careers_is_reachable()
    {
        $this->markTestSkipped('BUG-065: Careers module removed — confirmed dead code (2026-07-30).');
    }

    // ─── Changelogs: GET /api/changelogs ─────────────────────────────────────

    /** @test */
    public function test_get_changelogs_is_publicly_accessible_without_jwt()
    {
        $this->markTestSkipped('BUG-064: Changelogs module removed — confirmed dead code (2026-07-30).');
    }

    /** @test */
    public function test_get_changelogs_returns_200_with_message_and_content()
    {
        $this->markTestSkipped('BUG-064: Changelogs module removed — confirmed dead code (2026-07-30).');
    }

    /** @test */
    public function test_get_changelogs_content_is_array()
    {
        $this->markTestSkipped('BUG-064: Changelogs module removed — confirmed dead code (2026-07-30).');
    }

    /** @test */
    public function test_get_changelogs_items_have_expected_shape_when_present()
    {
        $this->markTestSkipped('BUG-064: Changelogs module removed — confirmed dead code (2026-07-30).');
    }

    // ─── Changelogs: POST /api/changelogs ─────────────────────────────────────

    /** @test */
    public function test_post_changelogs_with_auth_creates_changelog_and_returns_200()
    {
        $this->markTestSkipped('BUG-064: Changelogs module removed — confirmed dead code (2026-07-30).');
    }

    /** @test */
    public function test_post_changelogs_without_auth_does_not_return_404()
    {
        $this->markTestSkipped('BUG-064: Changelogs module removed — confirmed dead code (2026-07-30).');
    }

    /** @test */
    public function test_post_changelogs_with_auth_is_reachable_and_not_404()
    {
        $this->markTestSkipped('BUG-064: Changelogs module removed — confirmed dead code (2026-07-30).');
    }
}
