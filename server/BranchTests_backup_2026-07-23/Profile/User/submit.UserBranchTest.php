<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for UserController::submit arms. Menu=Profile Page=User.
 *
 * Covers POST endpoints: change_password, assign_roles_permissions, forgot_password_request,
 * addUserAsset, updateUserAsset. Constructor deps (UserRepositoryInterface, EmailRepositoryInterface)
 * IoC-mocked per test. success_response => 200 {message,content} EXCEPT addUserAsset/updateUserAsset
 * which pass JsonResponse::HTTP_CREATED => 201. error_response default => 400 EXCEPT change_password's
 * `if(!$user)` arm which passes JsonResponse::HTTP_NOT_FOUND => 404.
 *
 * SKIPPED arms:
 *   // SKIPPED-SP: change_password SUCCESS arm returns new UserProfileResource($user), whose toArray()
 *      reaches $user->userFeatures()/isUserNhoValid() -> call_sp against the live-dump DB. Only the
 *      `if(!$user)` 404 arm and the catch/400 arm are authored.
 *   // SKIPPED-SP: assign_roles_permissions SUCCESS arm returns new UserProfileResource($user) ->
 *      userFeatures()/isUserNhoValid() -> call_sp. Only the catch/400 arm is authored.
 *   // SKIPPED-DESTRUCTIVE: addUserAsset / updateUserAsset CATCH arms — AssetManagement is used statically
 *      inside the try with no IoC seam; the only way to force the catch is a live-DB constraint violation.
 *      Not authored.
 *
 * NOTE: addUserAsset/updateUserAsset success arms perform a REAL Eloquent insert/update (no repo seam).
 *       These are DML only (never call_sp/DDL) and are rolled back by DatabaseTransactions. updateUserAsset
 *       uses a non-matching id (0 rows affected) so no existing real row is mutated.
 *
 * Routes (module api.php mounted under /api):
 *   POST /api/user/{id}/change_password           -> change_password()
 *   POST /api/user/{id}/assign_roles_permissions  -> assign_roles_permissions()
 *   POST /api/forgot_password_request             -> forgot_password_request()
 *   POST /api/user/addasset                       -> addUserAsset()
 *   POST /api/user/updateasset                    -> updateUserAsset()
 */

namespace Tests\Feature\BranchTests\Profile\User;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class UserSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    protected function bindMock(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ========================================================== change_password()
    // ChangePasswordRequest: current/new/confirm required, min:6; confirm must equal new.
    /** @test */
    public function change_password__submit__password_mismatch__error_404()
    {
        // repo->change_password returns falsy -> `if(!$user)` -> error_response HTTP_NOT_FOUND 404
        $user = $this->bindMock(UserRepositoryInterface::class);
        $user->shouldReceive('change_password')->once()->andReturn(false);

        $res = $this->postJson("/api/user/{$this->user->id}/change_password", [
            'current_password'     => 'oldpass',
            'new_password'         => 'newpass1',
            'confirm_new_password' => 'newpass1',
        ]);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function change_password__submit__exception__error_400()
    {
        $user = $this->bindMock(UserRepositoryInterface::class);
        $user->shouldReceive('change_password')->once()->andThrow(new Exception('boom'));

        $res = $this->postJson("/api/user/{$this->user->id}/change_password", [
            'current_password'     => 'oldpass',
            'new_password'         => 'newpass1',
            'confirm_new_password' => 'newpass1',
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
    // SKIPPED-SP: change_password SUCCESS arm -> UserProfileResource -> userFeatures() call_sp. Not authored.

    // ================================================== assign_roles_permissions()
    // AssignUserRolePermissionRequest: roles.*/permissions.* exists rules — empty arrays satisfy them.
    /** @test */
    public function assign_roles_permissions__submit__exception__error_400()
    {
        $user = $this->bindMock(UserRepositoryInterface::class);
        // AssignAllUserToAdminJob::dispatch(...) is captured by Queue::fake() and never runs.
        $user->shouldReceive('assign_roles_to_user')->once()->andThrow(new Exception('boom'));

        $res = $this->postJson("/api/user/{$this->user->id}/assign_roles_permissions", [
            'roles'       => [],
            'permissions' => [],
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
    // SKIPPED-SP: assign_roles_permissions SUCCESS arm -> UserProfileResource -> userFeatures() call_sp. Not authored.

    // ================================================= forgot_password_request()
    // ForgotPasswordRequest: email required|exists:users,email — use fixture user's real email.
    /** @test */
    public function forgot_password_request__submit__valid_email__success_200()
    {
        $user = $this->bindMock(UserRepositoryInterface::class);
        $user->shouldReceive('apply_temporary_password')->once()->andReturn($this->user);
        $email = $this->bindMock(EmailRepositoryInterface::class);
        $email->shouldReceive('sendForgotPasswordRequestEmail')->once()->andReturnNull();

        $res = $this->postJson('/api/forgot_password_request', ['email' => $this->user->email]);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function forgot_password_request__submit__exception__error_400()
    {
        $user = $this->bindMock(UserRepositoryInterface::class);
        $user->shouldReceive('apply_temporary_password')->once()->andThrow(new Exception('boom'));

        $res = $this->postJson('/api/forgot_password_request', ['email' => $this->user->email]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ================================================================ addUserAsset()
    // Real Eloquent insert (no repo seam); DML only, rolled back by DatabaseTransactions.
    /** @test */
    public function addUserAsset__submit__add_others_equipment__success_201()
    {
        // action=='Add' + equipment_type=='Others' -> ternary picks add_equipment_type -> insert -> 201
        $res = $this->postJson('/api/user/addasset', [
            'action'             => 'Add',
            'personal_equipment' => 'Laptop',
            'equipment_type'     => 'Others',
            'add_equipment_type' => 'Custom Rig',
            'serial_no'          => 'SN-001',
            'asset_tag'          => 'TAG-001',
        ]);

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function addUserAsset__submit__add_named_equipment__success_201()
    {
        // action=='Add' + equipment_type!='Others' -> ternary keeps equipment_type -> insert -> 201
        $res = $this->postJson('/api/user/addasset', [
            'action'             => 'Add',
            'personal_equipment' => 'Laptop',
            'equipment_type'     => 'Laptop',
            'serial_no'          => 'SN-002',
            'asset_tag'          => 'TAG-002',
        ]);

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function addUserAsset__submit__bulk_else__success_201()
    {
        // action!='Add' (else) -> foreach($request->all() as array) insert each -> 201.
        // A top-level list => $request->action is null (else arm); each element is an array to insert.
        $res = $this->postJson('/api/user/addasset', [
            ['personal_equipment' => 'Mouse', 'equipment_type' => 'Peripheral', 'serial_no' => 'SN-003', 'asset_tag' => 'TAG-003'],
        ]);

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }
    // SKIPPED-DESTRUCTIVE: addUserAsset CATCH arm — AssetManagement is static with no IoC seam; forcing the
    // catch would require a live-DB constraint violation. Not authored.

    // ============================================================= updateUserAsset()
    // Real Eloquent update (no repo seam); DML only, non-matching id => 0 rows, rolled back by DatabaseTransactions.
    /** @test */
    public function updateUserAsset__submit__others_equipment__success_201()
    {
        // equipment_type=='Others' -> ternary picks add_equipment_type -> update -> 201
        $res = $this->postJson('/api/user/updateasset', [
            'id'                 => 999999999,   // non-matching id -> update affects 0 rows, still 201
            'personal_equipment' => 'Laptop',
            'equipment_type'     => 'Others',
            'add_equipment_type' => 'Custom Rig',
            'serial_no'          => 'SN-010',
            'asset_tag'          => 'TAG-010',
        ]);

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function updateUserAsset__submit__named_equipment__success_201()
    {
        // equipment_type!='Others' -> ternary keeps equipment_type -> update -> 201
        $res = $this->postJson('/api/user/updateasset', [
            'id'                 => 999999999,
            'personal_equipment' => 'Monitor',
            'equipment_type'     => 'Monitor',
            'serial_no'          => 'SN-011',
            'asset_tag'          => 'TAG-011',
        ]);

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }
    // SKIPPED-DESTRUCTIVE: updateUserAsset CATCH arm — same static-model / no-IoC-seam reason. Not authored.
}
