<?php
// DEEPER validation — Payroll Cutoff DB-layer overlap rule (beyond the FormRequest
// datatype + basic-overlap tests already in PayrollCutoffValidationRejectionTest, which only
// exercises the "submitted start_date matches an existing row's start_date" branch). This file
// exercises two OTHER branches of the `unique_payroll_cutoff` custom validator
// (AppServiceProvider.php:54): the "submitted range CONTAINS an existing row" branch, and the
// UPDATE-path self-exclusion (`id <> route('id')`) against a DIFFERENT existing row (proving the
// exclusion is scoped to the row being edited, not overlap-detection in general). Zero writes —
// every case here is rejected by the FormRequest before PayrollCutoffRepository::store/update runs;
// only SELECTs are issued to find two existing rows to collide with.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class PayrollCutoffBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
    }

    /**
     * unique_payroll_cutoff's 4th OR-branch (AppServiceProvider.php:76-79): rejects when the
     * SUBMITTED range fully contains an existing row (existing.start_date >= submitted.start_date
     * AND existing.end_date <= submitted.end_date). Distinct from the "start_date collides"
     * branch already covered in PayrollCutoffValidationRejectionTest.
     * @test
     */
    public function rejects_range_containing_an_existing_cutoff()
    {
        $existing = DB::table('payroll_cutoffs')->whereNull('deleted_at')->orderBy('start_date')->first();
        if (!$existing) $this->markTestIncomplete('no existing payroll_cutoffs row to collide with');

        $resp = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', [
            'name'       => 'Containing Range Attempt',
            'start_date' => date('Y-m-d', strtotime($existing->start_date . ' -5 days')),
            'end_date'   => date('Y-m-d', strtotime($existing->end_date . ' +5 days')),
        ]);

        $resp->assertStatus(422);
    }

    /**
     * UPDATE-path self-exclusion check: `unique_payroll_cutoff` excludes `route('id')` from the
     * overlap query so a row can keep its own dates on save. Here we PUT to row A's id but submit
     * row B's start_date — the exclusion only removes row A, so row B is still found and the
     * request must still be rejected. Requires 2 distinct existing rows; needs no write since the
     * PUT is blocked by the FormRequest before PayrollCutoffRepository::update() runs.
     * @test
     */
    public function rejects_update_colliding_with_a_different_existing_cutoff()
    {
        $rows = DB::table('payroll_cutoffs')->whereNull('deleted_at')->orderBy('start_date')->limit(2)->get();
        if ($rows->count() < 2) {
            $this->markTestIncomplete('need at least 2 existing payroll_cutoffs rows to test cross-row exclusion');
        }
        [$rowA, $rowB] = [$rows[0], $rows[1]];

        $resp = $this->actingAs($this->user)->putJson('/api/payroll/cutoff/' . $rowA->id, [
            'name'       => 'Cross-Row Collision Attempt',
            'start_date' => $rowB->start_date,
            'end_date'   => date('Y-m-d', strtotime($rowB->start_date . ' +1 day')),
        ]);

        $resp->assertStatus(422);
    }
}
