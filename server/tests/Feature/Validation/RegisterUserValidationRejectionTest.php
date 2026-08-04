<?php
// Validation REJECTION tests — Register User. Every case sends INVALID data and asserts the
// FormRequest blocks it (422). A rejected request writes NOTHING (no user row, no email sent),
// so this is safe on the live-dump DB. Uses withoutMiddleware() to bypass the JWT/apiKey/role:admin
// auth gate (not what we're testing here) so the request reaches RegisterUserRequest validation.
// No seeding (shared dump can't run UserTestSeeder) — we act as a real existing user and reuse
// real Department/Role rows only for the "one field broken" base payload. NEVER send a fully
// valid payload here — that would create a real user and email them a temp password.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;
use Spatie\Permission\Models\Role;

class RegisterUserValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

    private $user;
    private $department;
    private $role;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        $this->department = Department::first();
        $this->role = Role::first();
        if (!$this->user || !$this->department || !$this->role) {
            $this->markTestIncomplete('no user/department/role available in test DB');
        }
    }

    private function postRegister(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/user/register', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'first_name'          => 'RejectTest',
            'last_name'           => 'RejectTest',
            'email'               => 'reject_test_' . time() . '_' . mt_rand(1000, 9999) . '@example.invalid',
            'departments_handled' => [$this->department->id],
            'roles'               => [$this->role->name],
        ], $override);
    }

    /** @test */ public function rejects_missing_first_name()
    { $p = $this->base(); unset($p['first_name']); $this->postRegister($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_last_name()
    { $p = $this->base(); unset($p['last_name']); $this->postRegister($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_email()
    { $p = $this->base(); unset($p['email']); $this->postRegister($p)->assertStatus(422); }

    /** @test */ public function rejects_duplicate_email()
    { $this->postRegister($this->base(['email' => $this->user->email]))->assertStatus(422); }

    /** @test */ public function rejects_missing_departments_handled()
    { $p = $this->base(); unset($p['departments_handled']); $this->postRegister($p)->assertStatus(422); }

    /** @test */ public function rejects_nonexistent_department_id()
    { $this->postRegister($this->base(['departments_handled' => [999999999]]))->assertStatus(422); }

    /** @test */ public function rejects_missing_roles()
    { $p = $this->base(); unset($p['roles']); $this->postRegister($p)->assertStatus(422); }

    /** @test */ public function rejects_nonexistent_role_name()
    { $this->postRegister($this->base(['roles' => ['NotARealRoleXYZ']]))->assertStatus(422); }
}
