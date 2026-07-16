<?php
// DEEPER validation — Payroll Dispute CONTROLLER / BUSINESS / DB-layer rules (beyond the
// FormRequest-equivalent layer in DisputeValidationRejectionTest, which already documents and
// asserts REAL BUG A11: DisputeController@store's inline Validator::make() returns HTTP 200
// (not 422) on failure, via response()->json(['errors'=>...]) with no status argument). This
// file re-confirms A11 is captured as an asserting test (per review request) and adds the
// DB-layer proof the shallow suite doesn't: every rejected submission, despite the misleading
// 200, writes ZERO rows to `disputes` — Dispute::create() genuinely never runs, confirming the
// bug is purely a status-code/response-contract defect, not a validation-bypass defect.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class DisputeBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) { $this->markTestSkipped('no user available in test DB'); }
    }

    private function postDispute(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/storedispute', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'employee_id'  => $this->user->id,
            'dispute_type' => 'Late',
            'description'  => 'business rule rejection probe',
        ], $override);
    }

    /** @test — CONFIRMED A11: missing employee_id returns 200 with an 'errors' body instead of
     *  422, AND (the DB-layer proof this file adds) Dispute::create() never runs regardless —
     *  the misleading status does not mean the row silently got created. */
    public function A11_missing_employee_id_returns_200_but_writes_nothing()
    {
        $before = DB::table('disputes')->count();

        $p = $this->base(); unset($p['employee_id']);
        $response = $this->postDispute($p);
        $response->assertStatus(200); // BUG A11: should be 422
        $response->assertJsonStructure(['errors']);

        $after = DB::table('disputes')->count();
        $this->assertSame($before, $after, 'A11: even though the status is wrong, the row must still not be written');
    }

    /** @test — same A11 + DB-layer proof for a non-existent employee_id. */
    public function A11_nonexistent_employee_id_returns_200_but_writes_nothing()
    {
        $before = DB::table('disputes')->count();

        $response = $this->postDispute($this->base(['employee_id' => 999999999]));
        $response->assertStatus(200); // BUG A11
        $response->assertJsonStructure(['errors']);

        $after = DB::table('disputes')->count();
        $this->assertSame($before, $after);
    }

    /** @test — same A11 + DB-layer proof for missing dispute_type. */
    public function A11_missing_dispute_type_returns_200_but_writes_nothing()
    {
        $before = DB::table('disputes')->count();

        $p = $this->base(); unset($p['dispute_type']);
        $response = $this->postDispute($p);
        $response->assertStatus(200); // BUG A11
        $response->assertJsonStructure(['errors']);

        $after = DB::table('disputes')->count();
        $this->assertSame($before, $after);
    }
}
