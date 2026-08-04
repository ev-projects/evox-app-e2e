<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AlterLogPunchController::destroy arms.
 * Menu=Requests Page=AlterLogPunch.
 *
 * FINDING: destroy() catch returns error_response(...) with the DEFAULT 400 (line 102) - unlike
 *   find/approve/decline/pending/cancel which pass HTTP_NOT_FOUND (404).
 * Note: destroy() returns the repository result directly as content (NOT wrapped in a Resource).
 *   The repository destroy() is IoC-mocked, so no real row is ever deleted (no SKIPPED-DESTRUCTIVE needed).
 *
 * SKIPPED arms: none.
 */

namespace Tests\Feature\BranchTests\Requests\AlterLogPunch;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class AlterLogPunchDeleteBranchTest extends TestCase
{
    use DatabaseTransactions;

    private $alterRepo;
    private $dtrRepo;
    private $emailRepo;
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();

        $this->user = User::where('is_active', 1)->first();

        $this->alterRepo = Mockery::mock(AlterLogPunchRepositoryInterface::class);
        $this->dtrRepo   = Mockery::mock(DtrRepositoryInterface::class);
        $this->emailRepo = Mockery::mock(EmailRepositoryInterface::class);

        $this->app->instance(AlterLogPunchRepositoryInterface::class, $this->alterRepo);
        $this->app->instance(DtrRepositoryInterface::class, $this->dtrRepo);
        $this->app->instance(EmailRepositoryInterface::class, $this->emailRepo);

        $this->withoutMiddleware();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // destroy() B1: repository destroy succeeds -> success_response 200 (content = mocked result)
    /** @test */
    public function destroy__delete__success__ok_200()
    {
        $this->alterRepo->shouldReceive('destroy')->andReturn(true);

        $response = $this->actingAs($this->user)->deleteJson('/api/request/alter_log_punch/1');

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // destroy() B2: repository throws -> catch -> error_response (DEFAULT 400)
    /** @test */
    public function destroy__delete__exception__error_400()
    {
        $this->alterRepo->shouldReceive('destroy')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)->deleteJson('/api/request/alter_log_punch/1');

        $response->assertStatus(400)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
