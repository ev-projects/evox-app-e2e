<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ScheduleController::store/update/assign arms. Menu=Schedule Page=Schedule.
 *
 * Covers the POST/PUT "submit" endpoints of App\Modules\Schedule\Http\Controllers\ScheduleController:
 *   POST /api/schedule/          -> store(StoreScheduleRequest)
 *   PUT  /api/schedule/{id}      -> update(UpdateScheduleRequest,$id)
 *   POST /api/schedule/assign/   -> assign(AssignScheduleRequest)
 *
 * Both constructor-injected deps are IoC-mocked per test:
 *   - App\Modules\Schedule\Repositories\ScheduleRepositoryInterface
 *   - App\Modules\Payroll\Repositories\DtrRepositoryInterface
 * Repository/DTR return values are supplied as real (unsaved) Eloquent instances OR anonymous
 * Schedule/User subclasses that override owner()/defaultSchedule() so the assign() department loop
 * is driven WITHOUT touching the DB and WITHOUT reaching any write. Resource serialization performs
 * only id-scoped read-only reads (schedule_details/schedule_policies of a non-existent id => empty).
 *
 * SKIPPED arms: none (no call_sp / external / whole-table / destructive arm is reachable — every
 *   persistence path goes through the mocked repository/DTR, never real data).
 * FINDINGS: none.
 *
 * Status codes asserted from the real bodies:
 *   store success  => success_response(...,HTTP_CREATED)          => 201 {message,content}
 *   update/assign  => success_response(...)                       => 200 {message,content}
 *   any catch      => error_response(...,$e) [default HTTP_BAD_REQUEST] => 400 {error:{message,content}}
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

class ScheduleSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();               // reach controller bodies past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Bind both constructor deps into the container. */
    private function bind($repo, $dtr): void
    {
        $this->app->instance(ScheduleRepositoryInterface::class, $repo);
        $this->app->instance(DtrRepositoryInterface::class, $dtr);
    }

    /** A real (unsaved) Schedule whose id points to nothing, so serialization reads are empty & safe. */
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

    /**
     * A department-bound Schedule whose owner() is overridden to return a controlled department
     * whose users()->get() yields one User whose defaultSchedule()->first() is $userDefaultSchedule.
     * No DB and no writes: only the mocked repo/DTR are exercised inside the loop.
     */
    private function deptSchedule($userDefaultSchedule): Schedule
    {
        $user = new class($userDefaultSchedule) extends User {
            public $__ds;
            public function __construct($ds) { $this->__ds = $ds; parent::__construct(); }
            public function defaultSchedule() {
                return new class($this->__ds) {
                    private $v;
                    public function __construct($v) { $this->v = $v; }
                    public function first() { return $this->v; }
                };
            }
        };

        $usersRel = new class($user) {
            private $u;
            public function __construct($u) { $this->u = $u; }
            public function get() { return collect([$this->u]); }
        };

        $dept = new class($usersRel) {
            private $r;
            public function __construct($r) { $this->r = $r; }
            public function users() { return $this->r; }
        };

        $schedule = new class($dept) extends Schedule {
            public $__dept;
            public function __construct($dept) { $this->__dept = $dept; parent::__construct(); }
            public function owner() { return $this->__dept; }
        };
        $schedule->id            = 999999999;
        $schedule->name          = 'BranchTest Dept Schedule';
        $schedule->source_type   = 'default';
        $schedule->schedule_type = 'standard';
        $schedule->rest_days     = ['sat', 'sun'];
        $schedule->valid_from    = null;
        $schedule->valid_to      = null;
        $schedule->bind_to       = 'department';
        $schedule->bind_id       = '1';
        return $schedule;
    }

    /** Minimal payload that passes StoreScheduleRequest/ScheduleRequest (source_type=template => no valid_from/to). */
    private function storePayload(): array
    {
        return [
            'name'            => 'Branch Template',
            'source_type'     => 'template',
            'schedule_type'   => 'standard',
            'schedule_details' => ['all' => ['start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '00:30']],
        ];
    }

    /** Minimal payload that passes AssignScheduleRequest (source_type=default => valid_from required). */
    private function assignPayload(string $action = 'assign'): array
    {
        return [
            'source_type'     => 'default',
            'schedule_type'   => 'standard',
            'valid_from'      => '2020-01-01',
            'bind_to'         => 'department',
            'bind_id'         => '1',
            'action'          => $action,
            'schedule_details' => ['all' => ['start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '00:30']],
        ];
    }

    // ============================================================ store()
    // Branch A: try succeeds -> success_response(...,HTTP_CREATED) => 201
    /** @test */
    public function store__submit__success__created_201()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('store')->andReturn($this->realSchedule());
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->postJson('/api/schedule/', $this->storePayload());

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo->store throws -> catch(Exception) -> error_response default 400
    /** @test */
    public function store__submit__exception__error_400()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('store')->andThrow(new Exception('boom'));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->postJson('/api/schedule/', $this->storePayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ update()
    // Branch A: show() returns a TEMPLATE (isTemplate() true) -> update() -> success_response 200
    /** @test */
    public function update__submit__is_template__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('show')->andReturn($this->realSchedule(['source_type' => 'template']));
        $repo->shouldReceive('update')->andReturn($this->realSchedule(['source_type' => 'template']));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->putJson('/api/schedule/999999999', $this->storePayload());

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: show() returns a NON-template (isTemplate() false) -> not-authorized default -> success_response 200
    /** @test */
    public function update__submit__not_template__not_auth_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('show')->andReturn($this->realSchedule(['source_type' => 'default']));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->putJson('/api/schedule/999999999', $this->storePayload());

        $res->assertStatus(200)->assertJsonStructure(['message']);
    }

    // Branch C: repo->show throws -> catch(Exception) -> error_response default 400
    /** @test */
    public function update__submit__exception__error_400()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('show')->andThrow(new Exception('boom'));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->putJson('/api/schedule/999999999', $this->storePayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ assign()
    // Branch A: schedule->bind_to == 'user' -> dtr->apply_schedule_to_dtr -> success_response 200
    /** @test */
    public function assign__submit__bind_to_user__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('assign')->andReturn($this->realSchedule(['bind_to' => 'user', 'bind_id' => '1']));
        $dtr = Mockery::mock(DtrRepositoryInterface::class);
        $dtr->shouldReceive('apply_schedule_to_dtr')->andReturn(null);
        $this->bind($repo, $dtr);

        $res = $this->postJson('/api/schedule/assign/', $this->assignPayload());

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: bind_to == 'department' but action NOT in ASSIGN_DEPARTMENT_ACTIONS -> loop skipped -> success 200
    /** @test */
    public function assign__submit__department_action_not_matched__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('assign')->andReturn($this->realSchedule(['bind_to' => 'department', 'bind_id' => '1']));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->postJson('/api/schedule/assign/', $this->assignPayload('not_a_matching_action'));

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch C: department + action=assign_schedule_holiday_policy + user HAS default schedule (is_valid true)
    //           -> switch case replicate_schedule_holiday_policy -> success 200
    /** @test */
    public function assign__submit__department_holiday_policy_valid_user_schedule__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('assign')->andReturn($this->deptSchedule(new Schedule()));
        $repo->shouldReceive('replicate_schedule_holiday_policy')->andReturn($this->realSchedule(['bind_id' => '1']));
        $dtr = Mockery::mock(DtrRepositoryInterface::class);
        $dtr->shouldReceive('apply_schedule_to_dtr')->andReturn(null);
        $this->bind($repo, $dtr);

        $res = $this->postJson('/api/schedule/assign/', $this->assignPayload('assign_schedule_holiday_policy'));

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch D: department + action=assign_schedule_policy + valid user schedule -> switch case replicate_schedule_policy -> 200
    /** @test */
    public function assign__submit__department_schedule_policy_valid_user_schedule__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('assign')->andReturn($this->deptSchedule(new Schedule()));
        $repo->shouldReceive('replicate_schedule_policy')->andReturn($this->realSchedule(['bind_id' => '1']));
        $dtr = Mockery::mock(DtrRepositoryInterface::class);
        $dtr->shouldReceive('apply_schedule_to_dtr')->andReturn(null);
        $this->bind($repo, $dtr);

        $res = $this->postJson('/api/schedule/assign/', $this->assignPayload('assign_schedule_policy'));

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch E: department + action=assign + valid user schedule -> switch case replicate_schedule -> 200
    /** @test */
    public function assign__submit__department_assign_valid_user_schedule__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('assign')->andReturn($this->deptSchedule(new Schedule()));
        $repo->shouldReceive('replicate_schedule')->andReturn($this->realSchedule(['bind_id' => '1']));
        $dtr = Mockery::mock(DtrRepositoryInterface::class);
        $dtr->shouldReceive('apply_schedule_to_dtr')->andReturn(null);
        $this->bind($repo, $dtr);

        $res = $this->postJson('/api/schedule/assign/', $this->assignPayload('assign'));

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch F: department + action=assign + user WITHOUT default schedule (is_valid false)
    //           -> else copy_schedule_to_user -> success 200
    /** @test */
    public function assign__submit__department_user_without_default_schedule__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('assign')->andReturn($this->deptSchedule(null));   // null => is_valid() false
        $repo->shouldReceive('copy_schedule_to_user')->andReturn($this->realSchedule(['bind_id' => '1']));
        $dtr = Mockery::mock(DtrRepositoryInterface::class);
        $dtr->shouldReceive('apply_schedule_to_dtr')->andReturn(null);
        $this->bind($repo, $dtr);

        $res = $this->postJson('/api/schedule/assign/', $this->assignPayload('assign'));

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch G: bind_to is neither 'user' nor 'department' -> both if/elseif fall through -> success 200
    /** @test */
    public function assign__submit__bind_to_neither__success_200()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('assign')->andReturn($this->realSchedule(['bind_to' => 'other']));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->postJson('/api/schedule/assign/', $this->assignPayload('assign'));

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch H: repo->assign throws -> catch(Exception) -> error_response default 400
    /** @test */
    public function assign__submit__exception__error_400()
    {
        $repo = Mockery::mock(ScheduleRepositoryInterface::class);
        $repo->shouldReceive('assign')->andThrow(new Exception('boom'));
        $this->bind($repo, Mockery::mock(DtrRepositoryInterface::class));

        $res = $this->postJson('/api/schedule/assign/', $this->assignPayload('assign'));

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
