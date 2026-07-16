<?php
// DEEPER validation — Generate DTR CONTROLLER-layer rule (beyond the FormRequest datatype
// layer in GenerateDtrValidationRejectionTest). The one business-layer gap found
// (UserController::generateDtrDate calling User::findOrFail per `ids` entry before
// DtrRepository::generate_dtr() writes any `dtrs` rows) is DOCUMENTED ONLY here, not executed —
// per the coverage-max rule against ever submitting a structurally-valid GenerateDtrRequest
// payload (the whole point of `ids` + a real date range passing validation is that it's one
// step from a bulk `dtrs` write; safest to keep this entirely off the shared live-dump DB and
// verify on a disposable DB instead, consistent with how Overtime's SP-adjacent period gate and
// Assign Schedule's department-bind_id TypeError are handled).

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class GenerateDtrBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
    }

    /** @test */
    public function nonexistent_user_id_in_ids_is_documented_as_controller_layer_gap()
    {
        $this->markTestSkipped(
            'GenerateDtrRequest never validates `ids` contents (no exists:users,id / no array type ' .
            'check) — a valid-shaped payload with a nonexistent user id in `ids` passes the ' .
            'FormRequest and reaches UserController::generateDtrDate, which calls User::findOrFail() ' .
            'per id BEFORE DtrRepository::generate_dtr() writes anything; the ModelNotFoundException ' .
            'is caught and returns HTTP 400 (not 422) via error_response()\'s default code. Not ' .
            'executed here since the same request shape is one step from a real bulk `dtrs` insert ' .
            'if every id happens to resolve — see matrices/generate-dtr.md.'
        );
    }
}
