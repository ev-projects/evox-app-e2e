<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ScheduleController::destroy arms. Menu=Schedule Page=Schedule.
 *
 * Covers the DELETE "delete" endpoint of App\Modules\Schedule\Http\Controllers\ScheduleController:
 *   DELETE /api/schedule/{id}  -> destroy($id)
 *
 * Both constructor deps (ScheduleRepositoryInterface, DtrRepositoryInterface) are IoC-mocked per test.
 * The repository's destroy() is MOCKED (returns a scalar) so the delete never touches real data — the
 * template-branch success arm is safe to exercise; nothing reaches an SP/external/table-scan/real write.
 *
 * SKIPPED arms: none (destroy() persistence goes through the mocked repository, not real data).
 * FINDINGS: none.
 *
 * Status codes asserted from the real bodies:
 *   template branch      => success_response(...,repo->destroy())            => 200 {message,content}
 *   non-template branch  => success_response(...) [not authorized default]   => 200 {message}
 *   catch                => error_response(...,$e) [default HTTP_BAD_REQUEST] => 400 {error:{message,content}}
 */

namespace Tests\Feature\BranchTests\Schedule\Schedule;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;

class ScheduleDeleteBranchTest extends TestCase
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
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function bind($repo, $dtr): void
    {
        $this->app->instance(ScheduleRepositoryInterface::class, $repo);
        $this->app->instance(DtrRepositoryInterface::class, $dtr);
    }

    private function realSchedule(array $overrides = []): Schedule
    {
        $s = new Schedule();
        $s->id            = 999999999;
        $s->name          = 'BranchTest Schedule';
        $s->source_type   = 'template';
        $s->schedule_type = 'standard';
        $s->rest_days     = ['sat', 'sun'];
        $s->valid_from    = null;
        $s->valid_to      = null;
        foreach ($overrides as $k => $v) { $s->{$k} = $v; }
        return $s;
    }

    // ============================================================ destroy()
    // Branch A: show() returns a TEMPLATE (isTemplate() true) -> repo->destroy (mocked) -> success 200
    /** @test */
    public function destroy__delete__is_template__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('show')->andReturn($this->realSchedule(['source_type' => 'template']));
        $repo->shouldReceive('destroy')->andReturn(true);
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->deleteJson('/api/schedule/999999999');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: show() returns a NON-template (isTemplate() false) -> not-authorized default -> success 200
    /** @test */
    public function destroy__delete__not_template__not_auth_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('show')->andReturn($this->realSchedule(['source_type' => 'default']));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->deleteJson('/api/schedule/999999999');

        $res->assertStatus(200)->assertJsonStructure(['message']);
    }

    // Branch C: repo->show throws -> catch(Exception) -> error_response default 400
    /** @test */
    public function destroy__delete__exception__error_400()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('show')->andThrow(new Exception('boom'));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->deleteJson('/api/schedule/999999999');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
