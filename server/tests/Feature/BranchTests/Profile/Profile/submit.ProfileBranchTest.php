<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ProfileController::store/update arms. Menu=Profile Page=Profile.
 *
 * Top-level module controller App\Modules\User\Http\Controllers\ProfileController. Routes mounted
 * under /api inside prefix user/{id}/profile, middleware jwtauth + auth.apikey (disabled here via
 * withoutMiddleware()). Constructor deps UserRepositoryInterface + ProfileRepositoryInterface are
 * IoC-mocked (bare) in setUp so the controller always instantiates; individual tests override the
 * relevant mock. success_response => 200 {message,content}. error_response default => 400
 * {error:{message,content}}; UpdateUserProfileRequest::failedValidation passes HTTP 422.
 *
 * Routes (module api.php mounted under /api):
 *   POST /api/user/{id}/profile  -> REMOVED 2026-08-13 (ProfileController@store was never implemented)
 *   PUT  /api/user/{id}/profile  -> ProfileController@update
 *
 * CHANGE 2026-08-13: POST route removed as dead code. ProfileController@store() was never implemented;
 *   the route was unreachable (Save button gated behind decommissioned Client role). POST now returns 404.
 *
 * SKIPPED arms:
 *   // SKIPPED-SP: update() SUCCESS arm returns new UserProfileResource($this->profile->update(...)),
 *      whose toArray() reaches userFeatures()/isUserNhoValid()/country_zone() -> call_sp against the
 *      live-dump DB. Only the two error/400 paths and the 422 FormRequest path are authored.
 */

namespace Tests\Feature\BranchTests\Profile\Profile;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Repositories\ProfileRepositoryInterface;

class ProfileSubmitBranchTest extends TestCase
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
        if (!$this->user) {
            $this->markTestIncomplete('no user in test DB');
        }
        // Both constructor deps IoC-mocked (bare) so ProfileController instantiates on every route hit.
        $this->mockDep(UserRepositoryInterface::class);
        $this->mockDep(ProfileRepositoryInterface::class);
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // Unique values so UpdateUserProfileRequest's unique:users rules pass (no format rule on either).
    private function validProfilePayload(): array
    {
        $uid = uniqid();
        return [
            'first_name'    => 'BranchTest',
            'last_name'     => 'User',
            'email'         => 'btemail_' . $uid,
            'mobile_number' => 'btmobile_' . $uid,
        ];
    }

    // ============================================================ store()  (ROUTE REMOVED 2026-08-13)
    // POST route removed: ProfileController@store() was never implemented. Dead code cleanup 2026-08-13.
    // The PUT route exists, so POST returns 405 Method Not Allowed (not 404).
    /** @test */
    public function store__submit__method_does_not_exist__error_500()
    {
        $res = $this->postJson("/api/user/{$this->user->id}/profile", $this->validProfilePayload());

        $res->assertStatus(405); // PUT route exists → POST → 405 Method Not Allowed
    }

    // ================================================================== update()
    // Branch: UpdateUserProfileRequest fails (empty body -> first_name/last_name required) ->
    // failedValidation throws HttpResponseException(error_response(..., 422)) BEFORE the method body.
    /** @test */
    public function update__submit__formrequest_invalid__error_422()
    {
        $res = $this->putJson("/api/user/{$this->user->id}/profile", []);

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: FormRequest passes, then inner $this->validate(['id'=>'int']) fails for a non-int route
    // id -> ValidationException caught by catch(Exception) -> error_response default 400.
    /** @test */
    public function update__submit__invalid_id__error_400()
    {
        $res = $this->putJson('/api/user/abc/profile', $this->validProfilePayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: FormRequest passes, id int passes, then $this->user->show($id) throws ->
    // catch(Exception) -> error_response default 400.
    /** @test */
    public function update__submit__exception__error_400()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andThrow(new Exception('boom'));

        $res = $this->putJson("/api/user/{$this->user->id}/profile", $this->validProfilePayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
    // SKIPPED-SP: update() SUCCESS arm -> new UserProfileResource(...) -> userFeatures()/isUserNhoValid()
    //   -> call_sp against the live-dump DB. Not authored.
}
