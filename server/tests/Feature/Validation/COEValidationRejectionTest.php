<?php
// Validation REJECTION test — Certificate of Employment (COE). COERequest only validates
// `purpose_index` as `required` — no `in:` restriction, no validation at all for
// `show_compensation` or `purpose_note`. That means ANY payload that includes a non-empty
// `purpose_index` passes FormRequest validation and proceeds into COEController@create,
// which calls out to the BHR repository, writes a `coes` row, and streams a real PDF.
// That is NOT safe to trigger against the live-dump DB / external BHR service.
//
// So this suite deliberately contains exactly ONE case: omitting purpose_index, which is
// the only rejection guaranteed to stop at the FormRequest layer (422) before any write or
// external call happens. See matrices/coe.md for the full finding.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class COEValidationRejectionTest extends TestCase
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

    /** @test */ public function rejects_missing_purpose_index()
    {
        $this->actingAs($this->user)
            ->postJson('/api/request/coe', ['show_compensation' => '1'])
            ->assertStatus(422);
    }
}
