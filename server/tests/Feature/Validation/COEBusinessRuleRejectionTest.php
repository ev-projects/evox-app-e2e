<?php
// DEEPER validation — Certificate of Employment (COE) CONTROLLER / BUSINESS / DB-layer rules
// (beyond the single FormRequest-layer rejection already in COEValidationRejectionTest).
//
// Investigated and found: COEController@create has exactly ONE business-layer guard — a BHR
// (external HR system) lookup failure returns error_response(..., 404) — but that depends on live
// external-service state and target-user BHR data we cannot control from this suite, so it is not
// safely automatable. Every other input (purpose_index present but nonsensical, show_compensation
// omitted, purpose_note omitted) sails past validation into a REAL COE creation: a `coes` row write
// + external BHR call + PDF render/stream (see matrices/coe.md FINDING, FINDINGS-FOR-REVIEW.md A8).
// That makes any further probing here unsafe on the live-dump DB / external BHR sandbox.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class COEBusinessRuleRejectionTest extends TestCase
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

    /** @test */
    public function bhr_lookup_failure_gate_is_documented_not_tested()
    {
        $this->markTestIncomplete(
            'The only business-layer guard in COEController@create is a BHR lookup failure -> 404, ' .
            'which depends on live external BHR service state per user and is not controllable/safe ' .
            'from this suite. Every other payload with a non-empty purpose_index proceeds to a real ' .
            'COE creation (DB write + external call + PDF), so no further rejection case is safe to ' .
            'automate here. See matrices/coe.md and FINDINGS-FOR-REVIEW.md A8.'
        );
    }
}
