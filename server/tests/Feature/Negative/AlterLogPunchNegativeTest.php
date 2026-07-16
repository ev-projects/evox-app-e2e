<?php
/**
 * NEGATIVE — Alter Log Punch (multi-punch). This form has NO FormRequest (finding A20) and its
 * approve() type-hints the base Request, not a FormRequest. Same commented-out approval permission.
 * Table: alter_log_punches_new. Safe: DatabaseTransactions + Mail/Queue faked.
 */
namespace Tests\Feature\Negative;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLogPunch;

class AlterLogPunchNegativeTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $employee;
    private User $supervisor;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->employee   = User::where('email', 'glenn.macasarte@eastvantage.com')->firstOrFail();
        $this->supervisor = User::where('email', 'gary.aure@eastvantage.com')->firstOrFail();
    }

    private function makePending(int $ownerId, string $status = 'pending')
    {
        try {
            return AlterLogPunch::create([
                'user_id'    => $ownerId,
                'date'       => now()->subDays(12)->toDateString(),
                'employee_note' => 'NEGATIVE-AUTOTEST',
                'status'     => $status,
                'created_by' => $ownerId,
            ]);
        } catch (\Throwable $e) {
            $this->markTestSkipped('alter_log_punches_new create failed (schema): ' . $e->getMessage());
        }
    }

    /** @test S5 — employee approves own punch alteration: not gated (A27 class) */
    public function self_approval_is_not_gated()
    {
        $this->withoutMiddleware();
        $p = $this->makePending($this->employee->id);
        $resp = $this->actingAs($this->employee)->putJson("/api/request/alter_log_punch/approve/{$p->id}", [
            'action' => 'approve', 'approver_note' => 'NEGATIVE-AUTOTEST',
        ], $this->apiKey);
        $this->assertNotEquals(403, $resp->status());
        $this->assertLessThan(500, $resp->status());
    }

    /** @test S6 — nonexistent id handled (404 or graceful, not 500) */
    public function approve_nonexistent_id_is_handled()
    {
        $this->withoutMiddleware();
        $resp = $this->actingAs($this->supervisor)->putJson('/api/request/alter_log_punch/approve/999999999', [
            'action' => 'approve',
        ], $this->apiKey);
        $this->assertContains($resp->status(), [404, 400, 200]);
    }
}
