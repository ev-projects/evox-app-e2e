<?php
// Validation REJECTION tests — Assign Roles/Permissions. Every case sends INVALID data and
// asserts the FormRequest blocks it (422). A rejected request never reaches syncRoles()/
// syncPermissions(), so this is safe on the live-dump DB.
//
// IMPORTANT: neither `roles` nor `permissions` is `required` in AssignUserRolePermissionRequest
// (only `roles.*`/`permissions.*` fire if the key is present), and the FE Yup schema is empty.
// That means an EMPTY or OMITTED payload is a "valid" request that would sync empty arrays and
// silently strip the target user's roles/permissions — see matrices/assign-roles-permissions.md.
// This suite therefore NEVER sends an empty/omitted roles+permissions payload; every case
// includes a deliberately non-existent role/permission name so the request always 422s.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AssignUserRolePermissionValidationRejectionTest extends TestCase
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

    private function postAssign(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/user/' . $this->user->id . '/assign_roles_permissions/', $payload);
    }

    /** @test */ public function rejects_nonexistent_role_name()
    { $this->postAssign(['roles' => ['NotARealRoleXYZ']])->assertStatus(422); }

    /** @test */ public function rejects_nonexistent_permission_name()
    { $this->postAssign(['permissions' => ['NotARealPermissionXYZ']])->assertStatus(422); }

    /** @test */ public function rejects_nonexistent_role_and_permission_together()
    { $this->postAssign(['roles' => ['NotARealRoleXYZ'], 'permissions' => ['NotARealPermissionXYZ']])->assertStatus(422); }
}
