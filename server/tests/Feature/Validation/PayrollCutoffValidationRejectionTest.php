<?php
// Validation REJECTION tests — Payroll Cutoff. Every case sends INVALID data and asserts
// the FormRequest blocks it (422). A rejected request writes NOTHING, so this is safe on
// the live-dump DB. Uses withoutMiddleware() to bypass the JWT/apiKey auth gate so the
// request reaches PayrollCutoffRequest validation. The overlap-rejection test only reads
// an existing row (no write) before the (blocked) POST.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\PayrollCutoff;

class PayrollCutoffValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

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

    private function postCutoff(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload);
    }

    // Far-future dates so an otherwise-valid base payload wouldn't collide with real data
    // (not that any base() call here reaches a write — every test asserts 422).
    private function base(array $override = [])
    {
        return array_merge([
            'name'       => 'Test Cutoff',
            'start_date' => '2040-01-01',
            'end_date'   => '2040-01-15',
        ], $override);
    }

    /** @test */ public function rejects_missing_start_date()
    { $p = $this->base(); unset($p['start_date']); $this->postCutoff($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_end_date()
    { $p = $this->base(); unset($p['end_date']); $this->postCutoff($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_start_date_format()
    { $this->postCutoff($this->base(['start_date' => '01/01/2040']))->assertStatus(422); }

    /** @test */ public function rejects_end_date_before_start_date()
    {
        $this->postCutoff($this->base([
            'start_date' => '2040-06-30',
            'end_date'   => '2040-06-01',
        ]))->assertStatus(422);
    }

    /** @test */ public function rejects_overlong_name()
    { $this->postCutoff($this->base(['name' => str_repeat('x', 256)]))->assertStatus(422); }

    /**
     * TC-OVERLAP: submitting a start_date that matches an existing payroll_cutoffs row's
     * start_date must be rejected by the `unique_payroll_cutoff` custom validator. We only
     * SELECT an existing row (no write) before the POST, which is itself blocked.
     * @test
     */
    public function rejects_overlapping_date_range()
    {
        $existing = PayrollCutoff::whereNull('deleted_at')->first();
        if (!$existing) {
            $this->markTestIncomplete('no existing payroll_cutoffs row to collide with');
        }

        $payload = $this->base([
            'start_date' => $existing->start_date,
            'end_date'   => date('Y-m-d', strtotime($existing->start_date . ' +90 days')),
        ]);

        $this->postCutoff($payload)->assertStatus(422);
    }
}
