<?php
// Validation REJECTION tests — Assign Employees (Assign Employee Supervisors). Every case sends
// INVALID data and asserts the FormRequest blocks it (422). A rejected request never reaches
// assign_employees_to_user(), so this is safe on the live-dump DB.
//
// IMPORTANT: `user_id` itself is not `required` in AssignUserEmployeesRequest (only
// `user_id.*` fires if the key is present), and the FE has no Yup schema at all. A payload with
// ONLY a valid `department_id` and no `user_id` key passes validation and would silently detach
// every existing supervisee in that department — see matrices/assign-employees.md. This suite
// therefore NEVER sends department_id alone; every case either omits department_id (always kept
// paired with a harmless user_id array so the missing-department case is isolated) or pairs a
// valid department_id with an invalid user_id so the request always 422s before any detach runs.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;

class AssignUserEmployeesValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

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

    /** @test */ public function rejects_missing_department_id()
    {
        $this->postAssignEmployees(['user_id' => [$this->user->id]])->assertStatus(422);
    }

    /** @test */ public function rejects_nonexistent_department_id()
    {
        $this->postAssignEmployees(['department_id' => 999999999, 'user_id' => [$this->user->id]])->assertStatus(422);
    }

    /** @test */ public function rejects_nonexistent_user_id()
    {
        $this->postAssignEmployees(['department_id' => $this->department->id, 'user_id' => [999999999]])->assertStatus(422);
    }
}
