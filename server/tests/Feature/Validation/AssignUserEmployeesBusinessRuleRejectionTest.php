<?php
// DEEPER validation — Assign Employees (Supervisors) CONTROLLER / BUSINESS / DB-layer rules
// (beyond the FormRequest datatype layer in AssignUserEmployeesValidationRejectionTest). Adds
// the DB-layer proof the shallow suite doesn't: rejecting a non-existent user_id leaves the
// target supervisor's `users_supervisors` pivot rows untouched — i.e. the detach-then-reattach
// in UserRepository::assign_employees_to_user() genuinely never runs.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;

class AssignUserEmployeesBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;
    private $department;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        $this->department = Department::first();
        if (!$this->user || !$this->department) {
            $this->markTestIncomplete('no user/department available in test DB');
        }
    }

    private function postAssignEmployees(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/user/' . $this->user->id . '/assign_employees/', $payload);
    }

    /** @test — valid department_id + a non-existent user_id element 422s at the FormRequest
     *  layer, before assign_employees_to_user()'s detach()/syncWithoutDetaching() ever runs;
     *  the target supervisor's supervisee pivot rows are untouched. */
    public function rejects_nonexistent_user_id_and_writes_nothing_to_users_supervisors()
    {
        $before = DB::table('users_supervisors')->where('supervisor_id', $this->user->id)->count();

        $this->postAssignEmployees([
            'department_id' => $this->department->id,
            'user_id'       => [999999999],
        ])->assertStatus(422);

        $after = DB::table('users_supervisors')->where('supervisor_id', $this->user->id)->count();
        $this->assertSame($before, $after, 'a rejected assign-employees request must not touch users_supervisors');
    }

    // The documented "department_id alone, no user_id key" silent-detach-everyone bug (see
    // matrices/assign-employees.md) reaches the controller and performs a real, undoable
    // detach — intentionally never sent here.
    /** @test */
    public function department_only_detach_bug_is_documented_not_exercised()
    {
        $this->markTestIncomplete(
            'A payload with only a valid department_id and no user_id key passes validation ' .
            'and silently detaches every existing supervisee in that department — real, ' .
            'undoable write, not safe to POST. See matrices/assign-employees.md REAL BUG section.'
        );
    }
}
