<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DtrController::submit arms. Menu=Attendance Page=DTR.
 *
 * Controller: App\Modules\Payroll\Http\Controllers\DtrController.
 *   The constructor-injected DtrRepositoryInterface is IoC-mocked so the destructive repo writes
 *   (sync_biometrics_to_dtr / apply_punch_to_history) never touch the live-dump DB; every arm that
 *   would otherwise persist DTR rows returns a mocked value instead. (BiometricsRepositoryInterface,
 *   DtrSummaryExport and UserRepositoryInterface resolve normally; they are unused on these paths.)
 *
 * Routes (module Routes/api.php, prefix 'dtr', mounted under /api; jwtauth+auth.apikey bypassed):
 *   POST /api/dtr/quickpunch        -> quickpunch(Request)
 *   POST /api/dtr/quickpunch_multi  -> quickpunch_multi(Request)
 *
 * quickpunch(): 'in'/'out' arms build a Biometrics row, write an audit_trail record via
 *   log_to_audit_trail() (a CREATE, rolled back by DatabaseTransactions) and return
 *   success_response(DtrResource::collection($this->dtr->sync_biometrics_to_dtr(...)))=200 (repo
 *   mocked -> empty collection); the else arm throws "Unknown time log action." -> catch -> 400;
 *   the catch arm is also forced via the mocked repo ->andThrow.
 *
 * quickpunch_multi(): 'in'/'out'/'pause'/'continue' arms call the mocked
 *   $this->dtr->apply_punch_to_history(); if(!$result) => error_response 400, else success 400/200;
 *   the else arm throws -> catch default 400; the catch's str_contains('This date was already
 *   approved') branch is forced via the mocked repo ->andThrow with that message.
 *   No SKIPPED/SP arms — all writes are behind the mocked repo.
 */

namespace Tests\Feature\BranchTests\Attendance\DTR;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;

class DTRSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // reach controller past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first();
        if (!$this->user) $this->markTestSkipped('no active user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** IoC-mock DtrRepositoryInterface with a stubbed method (no real DB write). */
    private function mockDtrRepo(string $method, $return, bool $throw = false): void
    {
        $mock = Mockery::mock(DtrRepositoryInterface::class);
        if ($throw) {
            $mock->shouldReceive($method)->andThrow($return);
        } else {
            $mock->shouldReceive($method)->andReturn($return);
        }
        $this->app->instance(DtrRepositoryInterface::class, $mock);
    }

    // ========================================================= quickpunch()

    // Branch: quickpunch=='in' (if TRUE) + $request->dtr_id set (if TRUE) -> mocked repo ->
    // success_response => 200 {message, content}.
    /** @test */
    public function quickpunch__submit__in__success_200()
    {
        $this->mockDtrRepo('sync_biometrics_to_dtr', new Collection());

        $res = $this->postJson('/api/dtr/quickpunch', [
            'quickpunch' => 'in',
            'dtr_id'     => 1,
            'session_id' => 'test-session',
        ]);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: quickpunch=='out' (elseif TRUE) + no dtr_id (if FALSE) -> mocked repo -> 200.
    /** @test */
    public function quickpunch__submit__out__success_200()
    {
        $this->mockDtrRepo('sync_biometrics_to_dtr', new Collection());

        $res = $this->postJson('/api/dtr/quickpunch', [
            'quickpunch' => 'out',
            'session_id' => 'test-session',
        ]);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: unknown action (else) -> throw "Unknown time log action." -> catch -> error 400.
    /** @test */
    public function quickpunch__submit__unknown_action__error_400()
    {
        $res = $this->postJson('/api/dtr/quickpunch', [
            'quickpunch' => 'bogus',
            'session_id' => 'test-session',
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: catch(Exception) arm — mocked repo sync_biometrics_to_dtr throws -> error 400.
    /** @test */
    public function quickpunch__submit__exception__error_400()
    {
        $this->mockDtrRepo('sync_biometrics_to_dtr', new Exception('boom'), true);

        $res = $this->postJson('/api/dtr/quickpunch', [
            'quickpunch' => 'in',
            'session_id' => 'test-session',
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ==================================================== quickpunch_multi()

    // Branch: 'in' (if TRUE) + date != 'yesterday' (if FALSE) + apply_punch_to_history()==true
    // => if(!$result) FALSE => success_response 200.
    /** @test */
    public function quickpunch_multi__submit__in_result_true__success_200()
    {
        $this->mockDtrRepo('apply_punch_to_history', true);

        $res = $this->postJson('/api/dtr/quickpunch_multi', [
            'quickpunch' => 'in',
        ]);

        $res->assertStatus(200)->assertJsonStructure(['message']);
    }

    // Branch: 'out' (elseif TRUE) + apply_punch_to_history()==false => if(!$result) TRUE =>
    // error_response(' you need to clock in ') default 400.
    /** @test */
    public function quickpunch_multi__submit__out_result_false__error_400()
    {
        $this->mockDtrRepo('apply_punch_to_history', false);

        $res = $this->postJson('/api/dtr/quickpunch_multi', [
            'quickpunch' => 'out',
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: 'pause' (elseif TRUE) + date=='yesterday' && on_date==true (if TRUE, date subDay) +
    // result==true => success_response 200.
    /** @test */
    public function quickpunch_multi__submit__pause_yesterday__success_200()
    {
        $this->mockDtrRepo('apply_punch_to_history', true);

        $res = $this->postJson('/api/dtr/quickpunch_multi', [
            'quickpunch' => 'pause',
            'date'       => 'yesterday',
            'on_date'    => true,
        ]);

        $res->assertStatus(200)->assertJsonStructure(['message']);
    }

    // Branch: 'continue' (elseif TRUE) + result==true => success_response 200.
    /** @test */
    public function quickpunch_multi__submit__continue__success_200()
    {
        $this->mockDtrRepo('apply_punch_to_history', true);

        $res = $this->postJson('/api/dtr/quickpunch_multi', [
            'quickpunch' => 'continue',
        ]);

        $res->assertStatus(200)->assertJsonStructure(['message']);
    }

    // Branch: unknown action (else) -> throw "Unknown multi-punch action." ->
    // catch str_contains(...) FALSE -> error_response default 400.
    /** @test */
    public function quickpunch_multi__submit__unknown_action__error_400()
    {
        $res = $this->postJson('/api/dtr/quickpunch_multi', [
            'quickpunch' => 'bogus',
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: catch str_contains('This date was already approved') TRUE ->
    // error_response("This date was already approved as a rest day.") 400.
    // Forced via mocked repo throwing an exception carrying that message.
    /** @test */
    public function quickpunch_multi__submit__already_approved_exception__error_400()
    {
        $this->mockDtrRepo(
            'apply_punch_to_history',
            new Exception('This date was already approved'),
            true
        );

        $res = $this->postJson('/api/dtr/quickpunch_multi', [
            'quickpunch' => 'in',
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
