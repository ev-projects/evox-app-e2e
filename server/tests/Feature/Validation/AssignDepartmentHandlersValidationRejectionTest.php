<?php
// Validation REJECTION tests — Assign Department Handlers. AssignDepartmentHandlersRequest
// only validates 'user_id.*' => 'exists:users,id' (no 'required' on the array itself — see
// matrices/assign-department-handlers.md for the gap this leaves: omitting user_id entirely
// is NOT rejected here, so it is deliberately not exercised, since that path reaches
// DepartmentRepository::assign_handlers() and writes). Every case below always supplies a
// non-existent user id so the FormRequest 422s before any write happens.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AssignDepartmentHandlersValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestSkipped('no user available in test DB');
        }
    }

    private function postAssignHandlers(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/department/assign_handlers/1', $payload);
    }

    /** @test */ public function rejects_single_nonexistent_user_id()
    {
        $this->postAssignHandlers(['user_id' => [999999999]])->assertStatus(422);
    }

    /** @test */ public function rejects_when_array_mixes_real_and_nonexistent_id()
    {
        $this->postAssignHandlers(['user_id' => [$this->user->id, 999999999]])->assertStatus(422);
    }
}
