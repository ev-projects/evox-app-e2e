<?php
// Validation REJECTION tests — Payroll Dispute. REAL BUG: unlike every other form in this
// batch, DisputeController@store does NOT use a FormRequest — it builds an inline
// Validator::make() and, on failure, returns response()->json(['errors'=>...]) with NO
// status code, which defaults to HTTP 200. Every other endpoint here uses the shared
// failedValidation() -> error_response(..., 422) pattern. So these tests assert the ACTUAL
// observed behavior (200 + an 'errors' key in the body) rather than 422 — asserting 422
// would fail against real staging behavior. See matrices/payroll-dispute.md for the full
// writeup; treat this file's assertions as documentation of a confirmed inconsistency, not
// as an endorsement of the current status code.
//
// Every payload below is still invalid, so Dispute::create() never runs and nothing is
// written — safe on the live-dump DB.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class DisputeValidationRejectionTest extends TestCase
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

    private function postDispute(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/storedispute', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'employee_id'   => $this->user->id,
            'dispute_type'  => 'Late',
            'description'   => 'validation rejection probe',
        ], $override);
    }

    /** @test */ public function rejects_missing_employee_id_but_returns_200_not_422()
    {
        $p = $this->base(); unset($p['employee_id']);
        $response = $this->postDispute($p);
        $response->assertStatus(200); // BUG: should be 422, see class doc comment
        $response->assertJsonStructure(['errors']);
    }

    /** @test */ public function rejects_nonexistent_employee_id_but_returns_200_not_422()
    {
        $response = $this->postDispute($this->base(['employee_id' => 999999999]));
        $response->assertStatus(200); // BUG: should be 422
        $response->assertJsonStructure(['errors']);
    }

    /** @test */ public function rejects_missing_dispute_type_but_returns_200_not_422()
    {
        $p = $this->base(); unset($p['dispute_type']);
        $response = $this->postDispute($p);
        $response->assertStatus(200); // BUG: should be 422
        $response->assertJsonStructure(['errors']);
    }

    /** @test */ public function rejects_overlong_dispute_type_but_returns_200_not_422()
    {
        $response = $this->postDispute($this->base(['dispute_type' => str_repeat('x', 51)]));
        $response->assertStatus(200); // BUG: should be 422
        $response->assertJsonStructure(['errors']);
    }

    /** @test */ public function rejects_overlong_status_but_returns_200_not_422()
    {
        $response = $this->postDispute($this->base(['status' => str_repeat('x', 21)]));
        $response->assertStatus(200); // BUG: should be 422
        $response->assertJsonStructure(['errors']);
    }
}
