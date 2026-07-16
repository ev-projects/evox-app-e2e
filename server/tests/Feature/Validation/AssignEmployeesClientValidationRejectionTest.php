<?php
// Validation REJECTION tests — Assign Employees to Client. AssignEmployeesClientRequest
// requires department_id (exists:departments,id), client_id (required only — see
// matrices/assign-employees-client.md for the 'exists' gap on client_id), and
// user_id.* (required|exists:users,id, per-element). Every case sends an invalid payload
// that AssignEmployeesClientRequest rejects before ClientRepository::assign_clients() runs.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\EvoxDepartment;

class AssignEmployeesClientValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

    private $user;
    private $department;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        $this->department = EvoxDepartment::first();
        if (!$this->user || !$this->department) {
            $this->markTestSkipped('no user/department available in test DB');
        }
    }

    private function postAssignClient(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/client/assign', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'department_id' => $this->department->id,
            'client_id'     => 1,
            'user_id'       => [$this->user->id],
        ], $override);
    }

    /** @test */ public function rejects_missing_department_id()
    { $p = $this->base(); unset($p['department_id']); $this->postAssignClient($p)->assertStatus(422); }

    /** @test */ public function rejects_nonexistent_department_id()
    { $this->postAssignClient($this->base(['department_id' => 999999999]))->assertStatus(422); }

    /** @test */ public function rejects_missing_client_id()
    { $p = $this->base(); unset($p['client_id']); $this->postAssignClient($p)->assertStatus(422); }

    /** @test */ public function rejects_nonexistent_user_id_in_array()
    { $this->postAssignClient($this->base(['user_id' => [999999999]]))->assertStatus(422); }
}
