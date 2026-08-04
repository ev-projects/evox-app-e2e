<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for HrController::{announcements,getAnnouncement} arms. Menu=HR Page=Hr.
 *
 * SKIPPED arms:
 *  (none in this file — both read methods are linear/no try-catch)
 *
 * FINDINGS:
 *  // FINDING (PARTIALLY FIXED 2026-07-30): the class App\Modules\Changelogs\Models\ChangeLogs DOES NOT EXIST.
 *             announcements() now has catch(\Throwable $e) added — so the class-not-found \Error is caught -> 400.
 *             getAnnouncement($id) still has no try/catch -> class-not-found \Error -> uncaught -> 500 (unchanged).
 */

namespace Tests\Feature\BranchTests\HR\Hr;

use Mockery;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;

class HrLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        $this->user = User::where('is_active', 1)->first();
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------- announcements()

    /** @test */
    public function test_announcements__load__missing_model_class__uncaught_500()
    {
        // FINDING (FIXED 2026-07-30): announcements() now has catch(\Throwable $e) — catches the class-not-found
        // \Error (ChangeLogs model does not exist) -> error_response() -> 400.
        $response = $this->getJson('/api/hr/announcements/all');

        $response->assertStatus(400);
    }

    // ------------------------------------------------------------ getAnnouncement()

    public function test_getAnnouncement__load__missing_model_class__uncaught_500()
    {
        // FINDING: the "found" arm is unreachable — the list endpoint above also 500s (ChangeLogs class does
        // not exist), so there is no real id to fetch. getAnnouncement() itself references the same missing
        // ChangeLogs class, so any id (valid-looking or not) fails to autoload the class -> \Error -> uncaught 500.
        $response = $this->getJson('/api/hr/announcements/1');

        $response->assertStatus(500);
    }

    public function test_getAnnouncement__load__not_found__uncaught_500()
    {
        // FINDING: no try/catch. The missing ChangeLogs class makes ChangeLogs::find() fail to autoload ->
        // "Class not found" \Error -> uncaught 500. (Even if the class existed, find(bad_id)->toArray() on null
        // would also \Error.) The ONLY observable outcome for any id is 500.
        $response = $this->getJson('/api/hr/announcements/999999999');

        $response->assertStatus(500);
    }
}
