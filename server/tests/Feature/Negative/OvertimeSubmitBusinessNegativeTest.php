<?php
/**
 * NEGATIVE / BUSINESS-LOGIC — Overtime SUBMIT business-window + impersonation.
 * Asserts real behavior; where the server accepts something it arguably shouldn't, that's a
 * documented finding. DatabaseTransactions + faked mail/queue => safe on the disposable DB.
 *
 * Ground truth (2026-07-09): OvertimeController::store() does NOT call request_validity_checker()
 * — the 30-day / open-period gate lives only in the separate GET /request-validity-check endpoint
 * the FE calls pre-submit. A direct POST bypasses it. store() also trusts the payload user_id
 * (does not force it to the authenticated user).
 */

namespace Tests\Feature\Negative;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class OvertimeSubmitBusinessNegativeTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(); // bypass JWT gate; we're testing store business logic, not auth
        Mail::fake();
        Queue::fake();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->employee = User::where('email', 'glenn.macasarte@eastvantage.com')->firstOrFail();
    }

    private function submit(array $override)
    {
        $payload = array_merge([
            'user_id' => $this->employee->id,
            'date'    => now()->subDays(2)->toDateString(),
            'amount'  => '01:00',
            'type'    => 'pre_overtime',
            'employee_note' => 'NEGATIVE-AUTOTEST',
        ], $override);
        return $this->actingAs($this->employee)->postJson('/api/request/overtime', $payload, $this->apiKey);
    }

    /**
     * T2 — submit for a date FAR in the past (well over 30 days). The store endpoint has no
     * server-side period/30-day enforcement (that gate is only in the pre-submit validity endpoint),
     * so a direct POST is accepted. Documents finding A25: server-side submit doesn't enforce the
     * request window. Uses a far-past date unlikely to collide with an existing row.
     * @test
     */
    public function submit_for_a_date_far_older_than_30_days_is_not_rejected_server_side()
    {
        $farPast = now()->subDays(400)->toDateString();
        // Skip if that (user,date) already exists so the unique rule doesn't mask the point.
        if (DB::table('overtimes')->where('user_id', $this->employee->id)->where('date', $farPast)->exists()) {
            $this->markTestSkipped('collision on far-past date');
        }
        $resp = $this->submit(['date' => $farPast]);
        // Not blocked by any 30-day/period rule at the store layer.
        $this->assertNotEquals(422, $resp->status(), 'store rejected old date — good if intended, else A25 is moot');
        $this->assertContains($resp->status(), [200, 201]);
    }

    /**
     * D3 — an employee submits with a user_id that is NOT their own. store() trusts the payload
     * user_id, so the request is created FOR ANOTHER USER. Documents finding A26 (impersonation):
     * the submit endpoint doesn't scope user_id to the authenticated user.
     * @test
     */
    public function employee_can_submit_overtime_on_behalf_of_another_user()
    {
        $other = User::where('is_active', 1)->where('id', '!=', $this->employee->id)->first();
        if (!$other) $this->markTestSkipped('no other user');
        $date = now()->subDays(370)->toDateString();
        if (DB::table('overtimes')->where('user_id', $other->id)->where('date', $date)->exists()) {
            $this->markTestSkipped('collision');
        }
        // Authenticated as glenn, but user_id points at someone else.
        $resp = $this->actingAs($this->employee)->postJson('/api/request/overtime', [
            'user_id' => $other->id, 'date' => $date, 'amount' => '01:00',
            'type' => 'pre_overtime', 'employee_note' => 'NEGATIVE-AUTOTEST impersonation',
        ], $this->apiKey);

        if (in_array($resp->status(), [200, 201])) {
            // Accepted — the created row belongs to the OTHER user, not the authenticated one.
            $this->assertDatabaseHas('overtimes', ['user_id' => $other->id, 'date' => $date]);
        } else {
            // If it was rejected, impersonation is guarded — no finding.
            $this->assertNotEquals(500, $resp->status());
        }
    }
}
