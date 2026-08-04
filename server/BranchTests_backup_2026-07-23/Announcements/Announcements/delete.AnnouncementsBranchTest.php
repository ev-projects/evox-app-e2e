<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AnnouncementController::destroy arms. Menu=Announcements Page=Announcements.
 *
 * SKIPPED arms: none. destroy()'s only write goes through the IoC-mocked repository, so both the success and catch
 *               arms are safe to exercise without deleting real data.
 */

namespace Tests\Feature\BranchTests\Announcements\Announcements;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;

class AnnouncementsDeleteBranchTest extends TestCase
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

    // -------------------------------------------------------------- destroy()

    public function test_destroy__delete__success__ok_200()
    {
        // try arm: DB::beginTransaction() -> repo->destroy() (mocked, no real delete) -> DB::commit() -> success_response 200.
        $this->repo->shouldReceive('destroy')
            ->once()
            ->with('9999999')
            ->andReturnNull();

        $response = $this->deleteJson('/api/department/announcements/my_handle_announcements/9999999');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_destroy__delete__exception__error_400()
    {
        // catch arm: repo->destroy() throws -> DB::rollback() + error_response(...) default 400.
        $this->repo->shouldReceive('destroy')
            ->once()
            ->with('9999999')
            ->andThrow(new \Exception('boom'));

        $response = $this->deleteJson('/api/department/announcements/my_handle_announcements/9999999');

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
