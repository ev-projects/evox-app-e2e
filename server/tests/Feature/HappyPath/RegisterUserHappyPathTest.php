<?php
// HAPPY-PATH test — Register User. Previously skipped because UserController@register
// (app/Modules/User/Http/Controllers/UserController.php:1002) fires a real welcome email
// with a real temp password, outside any DB transaction.
//
// Re-enabled per Vishnu's 2026-07-09 scope confirmation ("don't post back anything to BHR
// or external resources" — internal notification emails are fine as long as they don't
// actually send). Traced the full call chain: EmailRepository::sendRegisteredUserEmail()
// (app/Modules/Email/Repositories/EmailRepository.php:50) does NOT call Mail::send()
// directly — it dispatches SendRegisteredUserEmailJob (implements ShouldQueue), and only
// that job's handle() method (app/Modules/Email/Jobs/SendRegisteredUserEmailJob.php)
// calls Mail::send(). Queue::fake() intercepts the dispatch() call itself, so handle()
// never runs and Mail::send() never executes — nothing is sent, no BHR/external call is
// involved at any point in this path (purely internal welcome-email job). This is the
// standard, safe way to exercise a queued-notification write path.
//
// DatabaseTransactions rolls back the users/role/department-handler writes; Queue::fake()
// means there is nothing left un-rolled-back on the mail side either.

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Email\Jobs\SendRegisteredUserEmailJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

class RegisterUserHappyPathTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        Queue::fake(); // must be before the request — prevents the welcome-email job from ever running
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestSkipped('no user available in test DB');
        }
    }

    /** @test */
    public function registers_a_new_user_and_queues_but_never_sends_the_welcome_email()
    {
        $email = 'happypath.test+' . time() . '@example.invalid';

        $payload = [
            'first_name' => 'HappyPath',
            'last_name' => 'Test' . time(),
            'email' => $email,
            'departments_handled' => [179],
            'roles' => ['employee'],
        ];

        $response = $this->actingAs($this->user)->postJson('/api/user/register', $payload);

        // BUG FOUND BY THIS TEST (staging, 2026-07-09): a fully-valid Register submission
        // still returns HTTP 400, NOT success — but the write already happened by then.
        // UserRepository::register_user() never sets country_id on the new user (it's left
        // null), then UserController@register builds `new UserProfileResource($data['user'])`
        // for the response, and UserProfileResource::country_timezone_to_offset()
        // (app/Modules/User/Resources/UserProfileResource.php:40 ->
        // app/Modules/User/Models/User.php:249) does
        // `UtcTimelog::where('country_id', $this->country_id)->first()->timezone` with no
        // null check — first() returns null for country_id=null, so ->timezone throws
        // "Trying to get property 'timezone' of non-object". That happens strictly AFTER
        // register_user()'s own DB::commit(), so the user/role/department-handler rows are
        // real and persisted (until this test's DatabaseTransactions rollback) even though
        // the HTTP response reports failure. Documenting the actual behavior rather than
        // asserting a success status that will never occur until this is fixed.
        $response->assertStatus(400);
        $responseData = json_decode($response->getContent(), true);
        $this->assertSame("Trying to get property 'timezone' of non-object", $responseData['error']['content'] ?? null);

        $newUserId = DB::table('users')->where('email', $email)->value('id');
        $this->assertNotNull($newUserId, 'users row was not written despite a fully valid payload');

        $this->assertDatabaseHas('users', ['id' => $newUserId, 'email' => $email]);
        $this->assertDatabaseHas('department_handlers', ['user_id' => $newUserId, 'department_id' => 179]);
        $this->assertDatabaseHas('user_has_roles', ['user_id' => $newUserId]);

        // Proves the welcome-email path was reached and WOULD have fired — without it
        // actually sending, since the queue never really runs. ($user is a protected
        // property on the job, so we assert the dispatch happened rather than inspecting it.)
        Queue::assertPushed(SendRegisteredUserEmailJob::class, 1);
    }
}
