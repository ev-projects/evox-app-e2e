<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AnnouncementController::{store,update,update_status} arms. Menu=Announcements Page=Announcements.
 *
 * SKIPPED arms:
 *  // SKIPPED-DATA        update() if($check_announcement || isLevel("Admin")) success arm — reaching it requires EvoxDepartment::find(user->department_id)
 *                         to return a real department AND a real level row / department-linked announcement. None of that is controllable from the
 *                         `is_active` fixture user, and a null EvoxDepartment triggers a \Error (not Exception) i.e. an uncaught 500, so the arm
 *                         cannot be authored to pass deterministically. Only the catch arm is exercised.
 *  // SKIPPED-DATA        update() else (no-rights) arm — same fixture/level uncertainty as above; not deterministically reachable.
 *  // SKIPPED-DESTRUCTIVE update_status() success arm — performs Announcement::find($id)->update(), a real UPDATE on live-dump data. Only the catch arm is exercised.
 *
 * FINDINGS:
 *  // FINDING: update() catch is catch(Exception) but a null EvoxDepartment leads to a method-call-on-null \Error (Throwable, not Exception) -> uncaught 500, never the 400 arm.
 *  // FINDING: update_status() sets $dep_announcement->status before any null check; a missing id -> \Error (500), not the intended 400 catch arm.
 */

namespace Tests\Feature\BranchTests\Announcements\Announcements;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;

class AnnouncementsSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var \Mockery\MockInterface */
    protected $repo;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        $this->repo = Mockery::mock(AnnouncementRepositoryInterface::class);
        $this->app->instance(AnnouncementRepositoryInterface::class, $this->repo);

        $this->makeLoggerBenign();

        $this->user = User::where('is_active', 1)->first();
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function makeLoggerBenign(): void
    {
        $logger = Mockery::mock(EvoxActivityLogger::class);
        $logger->shouldReceive('useLog')->andReturnSelf();
        $logger->shouldReceive('withProperties')->andReturnSelf();
        $logger->shouldReceive('log')->andReturnNull();
        $this->app->instance(EvoxActivityLogger::class, $logger);
    }

    /** Make log_activity() throw so a controller catch(Exception) arm can be reached without touching the SP/DB. */
    private function makeLoggerThrow(): void
    {
        $logger = Mockery::mock(EvoxActivityLogger::class);
        $logger->shouldReceive('useLog')->andThrow(new \Exception('boom'));
        $this->app->instance(EvoxActivityLogger::class, $logger);
    }

    /** Payload that passes AnnouncementRequest validation (set_all=1 & set_country_all=1 waive the required_if rules). */
    private function validPayload(): array
    {
        return [
            'title'           => 'Branch test announcement',
            'release_date'    => '2026-01-01',
            'expiry_date'     => '2026-12-31',
            'set_all'         => 1,
            'set_country_all' => 1,
        ];
    }

    // ---------------------------------------------------------------- store()

    /** @test */
    public function test_store__submit__success__ok_200()
    {
        // try arm: repository returns the created record; controller returns it verbatim in success_response.
        $this->repo->shouldReceive('store')
            ->once()
            ->andReturn(['id' => 1, 'title' => 'Branch test announcement']);

        $response = $this->postJson('/api/department/announcements/create', $this->validPayload());

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_store__submit__exception__error_400()
    {
        // catch arm: error_response(...) with default HTTP_BAD_REQUEST.
        $this->repo->shouldReceive('store')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->postJson('/api/department/announcements/create', $this->validPayload());

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // --------------------------------------------------------------- update()

    /** @test */
    public function test_update__submit__exception__error_400()
    {
        // catch arm: log_activity() (first statement in try) throws -> error_response(...) default 400.
        // update() has no DB::beginTransaction() but its catch calls DB::rollback(); open a savepoint here so that
        // rollback does not unwind the DatabaseTransactions wrapper and break teardown.
        DB::beginTransaction();
        $this->makeLoggerThrow();

        $response = $this->postJson(
            '/api/department/announcements/my_handle_announcements/9999999/update',
            $this->validPayload()
        );

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
        // update if/else success & no-rights arms: SKIPPED-DATA (see file header).
    }

    // -------------------------------------------------------- update_status()

    public function test_updateStatus__submit__exception__error_400()
    {
        // catch arm: DB::beginTransaction() runs, log_activity() throws -> DB::rollback() + error_response(...) default 400.
        // update_status() balances its own beginTransaction/rollback, so no extra savepoint is needed.
        $this->makeLoggerThrow();

        $response = $this->putJson(
            '/api/department/announcements/my_handle_announcements/9999999/update-status',
            ['status' => 1]
        );

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
        // update_status success arm: SKIPPED-DESTRUCTIVE (real Announcement->update()); see file header.
    }
}
