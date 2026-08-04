<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for HrController::{announcements,getAnnouncement} arms. Menu=HR Page=Hr.
 *
 * SKIPPED arms:
 *  (none in this file — both read methods are linear/no try-catch)
 *
 * FINDINGS:
 *  // FINDING: getAnnouncement($id) does ChangeLogs::find($id)->toArray() with NO null guard. A missing id makes find()
 *             return null, so null->toArray() raises a \Error (Throwable, not Exception) -> uncaught 500. The method has
 *             no try/catch at all, so there is no graceful not-found path. Reality (500) is asserted below.
 *  // NOTE: announcements() calls ChangeLogs::with('user')->get() — an unbounded read of the whole change_log table.
 *          It is read-only (no write), so it is exercised as a load; nothing is mutated.
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

    public function test_announcements__load__success__ok_200()
    {
        // Only arm: read all announcements + success_response (200 {message,content}).
        $response = $this->getJson('/api/hr/announcements/all');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    // ------------------------------------------------------------ getAnnouncement()

    public function test_getAnnouncement__load__found__ok_200()
    {
        // Found arm: pull a real existing id from the list endpoint, then fetch it -> 200.
        $list = $this->getJson('/api/hr/announcements/all')->json('content');

        if (empty($list) || ! isset($list[0]['id'])) {
            $this->markTestSkipped('No change_log rows available to exercise the found arm.');
        }

        $id = $list[0]['id'];

        $response = $this->getJson('/api/hr/announcements/' . $id);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_getAnnouncement__load__not_found__uncaught_500()
    {
        // FINDING: missing-id -> ChangeLogs::find() returns null -> null->toArray() -> \Error -> uncaught 500.
        // There is no try/catch and no null guard, so the ONLY observable outcome for a bad id is a 500.
        $response = $this->getJson('/api/hr/announcements/999999999');

        $response->assertStatus(500);
    }
}
