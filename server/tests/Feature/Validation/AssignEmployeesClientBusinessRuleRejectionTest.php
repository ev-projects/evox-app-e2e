<?php
// DEEPER validation — Assign Employees to Client CONTROLLER / BUSINESS / DB-layer rules
// (beyond the FormRequest datatype layer in AssignEmployeesClientValidationRejectionTest).
// Adds the DB-layer proof the shallow suite doesn't: rejecting a non-existent user_id leaves
// `employee_clients` untouched for the target department_id/client_id pair — i.e.
// ClientRepository::assign_clients() genuinely never runs.
//
// IMPORTANT — why the client_id.exists gap is NOT exercised live: ClientRepository::
// assign_clients() opens with
//   Client::where([['department_id',$department_id],['client_id',$client_id]])->forceDelete();
// BEFORE iterating user_id to firstOrCreate() rows. Because AssignEmployeesClientRequest
// never applies an `exists:clients,id` rule to client_id (confirmed gap, see matrices/
// assign-employees-client.md), a payload with a non-existent client_id still passes
// validation and reaches this forceDelete() — a real, unconditional delete against
// `employee_clients` for that department/client pair. That is a write with a destructive
// side-effect, not a rejection, so it is documented rather than exercised.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\EvoxDepartment;

class AssignEmployeesClientBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;
    private $department;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        $this->department = EvoxDepartment::first();
        if (!$this->user || !$this->department) {
            $this->markTestIncomplete('no user/department available in test DB');
        }
    }

    private function postAssignClient(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/client/assign', $payload);
    }

    /** @test — valid department_id/client_id + a non-existent user_id element 422s at the
     *  FormRequest layer, before assign_clients()'s forceDelete()/firstOrCreate() ever runs;
     *  employee_clients is untouched for this department/client pair. */
    public function rejects_nonexistent_user_id_and_writes_nothing_to_employee_clients()
    {
        $clientId = 1;
        $before = DB::table('employee_clients')
            ->where('department_id', $this->department->id)->where('client_id', $clientId)->count();

        $this->postAssignClient([
            'department_id' => $this->department->id,
            'client_id'     => $clientId,
            'user_id'       => [999999999],
        ])->assertStatus(422);

        $after = DB::table('employee_clients')
            ->where('department_id', $this->department->id)->where('client_id', $clientId)->count();
        $this->assertSame($before, $after, 'a rejected assign-client request must not touch employee_clients');
    }

    /** @test */
    public function client_id_exists_gap_is_documented_not_exercised()
    {
        $this->markTestIncomplete(
            'client_id has no exists:clients,id rule despite a defined error message; a non-' .
            'existent client_id still passes validation and reaches ClientRepository::' .
            'assign_clients(), which unconditionally forceDelete()s matching employee_clients ' .
            'rows before re-creating them — real destructive write, not safe to POST. ' .
            'See matrices/assign-employees-client.md REAL BUG section.'
        );
    }
}
