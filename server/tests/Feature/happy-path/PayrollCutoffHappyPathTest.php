<?php
// HAPPY-PATH test — Payroll Cutoff Create. Uses a far-future date range (2030) that is
// well past the latest existing cutoff in the staging dump (max end_date confirmed
// 2026-04-15, nothing at/after 2030), so unique_payroll_cutoff's overlap check can never
// false-reject this. DatabaseTransactions rolls back — safe on the disposable DB.
// See matrices/payroll-cutoff.md.

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PayrollCutoffHappyPathTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestIncomplete('no user available in test DB');
        }
    }

    /** @test */
    public function creates_a_payroll_cutoff_in_a_non_overlapping_future_window()
    {
        $payload = [
            'name' => 'HappyPath Cutoff ' . time(),
            'start_date' => '2030-01-01',
            'end_date' => '2030-01-31',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('payroll_cutoffs', [
            'start_date' => '2030-01-01',
            'end_date' => '2030-01-31',
        ]);
    }
}
