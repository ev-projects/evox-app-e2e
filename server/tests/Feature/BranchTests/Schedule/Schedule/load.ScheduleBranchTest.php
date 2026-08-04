<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ScheduleController::show/templates arms. Menu=Schedule Page=Schedule.
 *
 * Covers the GET "load" endpoints of App\Modules\Schedule\Http\Controllers\ScheduleController:
 *   GET /api/schedule/{id}        -> show($id)
 *   GET /api/schedule/templates/  -> templates()
 *
 * Both constructor deps (ScheduleRepositoryInterface, DtrRepositoryInterface) are IoC-mocked per test.
 * Repository return values are real (unsaved) Schedule instances with a non-existent id, so resource
 * serialization performs only empty id-scoped reads (no writes, no SP, no external, no table scan).
 *
 * SKIPPED arms: none.  FINDINGS: none.
 *
 * Status codes asserted from the real bodies:
 *   show success       => success_response(...)                              => 200 {message,content}
 *   show catch         => error_response(...,$e,HTTP_NOT_FOUND)              => 404 {error:{message,content}}
 *   templates success  => success_response(...)                              => 200 {message,content}
 *   templates catch    => error_response(...,$e) [default HTTP_BAD_REQUEST]  => 400 {error:{message,content}}
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

class ScheduleLoadBranchTest extends TestCase
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

    // ============================================================ show()
    // Branch A: try succeeds -> success_response 200
    /** @test */
    public function show__load__success__ok_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('show')->andReturn($this->realSchedule());
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->getJson('/api/schedule/999999999');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo->show throws -> catch(Exception) -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function show__load__exception__not_found_404()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('show')->andThrow(new Exception('boom'));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->getJson('/api/schedule/999999999');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ templates()
    // Branch A: try succeeds -> TemplateScheduleResource::collection -> success_response 200
    /** @test */
    public function templates__load__success__ok_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('get_template_schedules')->andReturn(collect([
            $this->realSchedule(),
            $this->realSchedule(['id' => 999999998]),
        ]));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->getJson('/api/schedule/templates/');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo->get_template_schedules throws -> catch(Exception) -> error_response default 400
    /** @test */
    public function templates__load__exception__error_400()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('get_template_schedules')->andThrow(new Exception('boom'));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->getJson('/api/schedule/templates/');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
