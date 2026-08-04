<?php
// DEEPER validation — Assign Roles/Permissions CONTROLLER / BUSINESS / DB-layer rules (beyond
// the FormRequest datatype layer in AssignUserRolePermissionValidationRejectionTest). This
// file adds the DB-layer proof the shallow suite doesn't: rejecting a fake role/permission
// name leaves the target user's `user_has_roles`/`user_has_permissions` pivot rows untouched.
//
// IMPORTANT — why the is_under_supervisee() business gate is NOT exercised here:
// UserController@assign_roles_permissions unconditionally does
//   AssignAllUserToAdminJob::dispatch($id, $request->get('roles'))->delay(...)
// BEFORE the is_under_supervisee($id) authorization check inside
// UserRepository::assign_roles_to_user()/assign_permissions_to_user() ever runs. On this
// environment QUEUE_CONNECTION is commented out in .env (falls back to config default
// 'sync'), so a ShouldQueue job dispatched here executes SYNCHRONOUSLY in the same request —
// meaning ANY payload with a real, existing role/permission name reaches
// UserRepository::adminRoleConditions() regardless of whether the target is actually under
// the acting user's supervision. There is no way to send a request that both (a) passes the
// FormRequest (needs a real role/permission name) and (b) is guaranteed not to trigger this
// job side-effect. So every case below keeps at least one fake name, exactly like the shallow
// suite, and the supervision gate itself is documented rather than executed.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class AssignUserRolePermissionBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) { $this->markTestIncomplete('no user available in test DB'); }
    }

    private function postAssign(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/user/' . $this->user->id . '/assign_roles_permissions/', $payload);
    }

    /** @test — fake role name 422s at the FormRequest layer, before syncRoles() (and before
     *  the queued adminRoleConditions side-effect) can run; target's role pivot is untouched. */
    public function rejects_fake_role_and_writes_nothing_to_user_has_roles()
    {
        $before = DB::table('user_has_roles')->where('user_id', $this->user->id)->count();
        $this->postAssign(['roles' => ['NotARealRoleXYZ']])->assertStatus(422);
        $after = DB::table('user_has_roles')->where('user_id', $this->user->id)->count();

        $this->assertSame($before, $after, 'a rejected assign-roles request must not touch user_has_roles');
    }

    /** @test — same DB-layer proof for permissions. */
    public function rejects_fake_permission_and_writes_nothing_to_user_has_permissions()
    {
        $before = DB::table('user_has_permissions')->where('user_id', $this->user->id)->count();
        $this->postAssign(['permissions' => ['NotARealPermissionXYZ']])->assertStatus(422);
        $after = DB::table('user_has_permissions')->where('user_id', $this->user->id)->count();

        $this->assertSame($before, $after, 'a rejected assign-permissions request must not touch user_has_permissions');
    }

    /** @test */
    public function supervision_gate_and_queued_job_side_effect_are_documented_not_exercised()
    {
        $this->markTestIncomplete(
            'AssignAllUserToAdminJob::dispatch() runs unconditionally BEFORE is_under_supervisee() ' .
            'and QUEUE_CONNECTION falls back to sync on this env, so any payload with a real role/' .
            'permission name has a synchronous side-effect regardless of authorization outcome — ' .
            'not safe to POST live. See matrices/assign-roles-permissions.md.'
        );
    }

    // The empty/omitted roles+permissions payload (the confirmed role-stripping bug) is
    // documented in matrices/assign-roles-permissions.md and intentionally never sent here.
    /** @test */
    public function empty_payload_role_strip_bug_is_documented_not_exercised()
    {
        $this->markTestIncomplete(
            'An empty/omitted roles+permissions payload passes validation and silently strips ' .
            'the target user\'s entire role/permission set via sync([]) — real write, not safe ' .
            'to POST. See matrices/assign-roles-permissions.md REAL BUG section.'
        );
    }
}
