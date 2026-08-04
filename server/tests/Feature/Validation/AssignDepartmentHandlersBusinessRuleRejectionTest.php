<?php
// DEEPER validation — Assign Department Handlers CONTROLLER / BUSINESS / DB-layer rules
// (beyond the FormRequest datatype layer in AssignDepartmentHandlersValidationRejectionTest).
// Adds the DB-layer proof the shallow suite doesn't: rejecting a non-existent user_id leaves
// the target department's `department_handlers` pivot rows untouched — i.e.
// DepartmentRepository::assign_handlers()'s sync() genuinely never runs.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class AssignDepartmentHandlersBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;
    private $departmentId = 1;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) { $this->markTestIncomplete('no user available in test DB'); }
    }

    private function postAssignHandlers(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/department/assign_handlers/' . $this->departmentId, $payload);
    }

    /** @test — a non-existent user_id 422s before DepartmentRepository::assign_handlers()'s
     *  sync() runs; the department's handler pivot rows are untouched. */
    public function rejects_nonexistent_user_id_and_writes_nothing_to_department_handlers()
    {
        $before = DB::table('department_handlers')->where('department_id', $this->departmentId)->count();

        $this->postAssignHandlers(['user_id' => [999999999]])->assertStatus(422);

        $after = DB::table('department_handlers')->where('department_id', $this->departmentId)->count();
        $this->assertSame($before, $after, 'a rejected assign-handlers request must not touch department_handlers');
    }

    // The documented "user_id omitted entirely" gap (see matrices/assign-department-handlers.md)
    // reaches assign_handlers($id, null) — a write path with no validation to stop it —
    // intentionally never sent here.
    /** @test */
    public function missing_user_id_gap_is_documented_not_exercised()
    {
        $this->markTestIncomplete(
            'user_id.* has no `required` on the array itself; omitting user_id entirely passes ' .
            'validation and reaches DepartmentRepository::assign_handlers($id, null) — real ' .
            'write path, not safe to POST. See matrices/assign-department-handlers.md.'
        );
    }
}
