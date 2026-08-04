<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for OpsScheduleController::getList/get/show arms.
 * Menu=Schedule Page=OpsSchedule.
 *
 * Controller has NO constructor deps (uses OpsSchedule Eloquent model + DB/Storage facades directly),
 * so there is no IoC seam. Read-only load arms are exercised against the real (live-dump) test DB
 * under DatabaseTransactions and mutate nothing.
 *
 * FINDING (show): show() does `OpsSchedule::find($id)->toArray()` with NO null check and NO try/catch.
 *   A non-existent id makes find() return null and null->toArray() throws a \Error which nothing
 *   catches -> the pipeline renders HTTP 500. No row is touched (read-only). Asserted as reality below.
 *
 * SKIPPED arms: none in this file. (get() internal per-department image/form/empty arms and the
 *   `if ($ops_scheds)` chunk arm are data-dependent read-only branches over live data; the method
 *   returns success_response 200 regardless, which is what is asserted.)
 */

namespace Tests\Feature\BranchTests\Schedule\OpsSchedule;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Opsschedule\Models\OpsSchedule;

class OpsScheduleLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->user = User::where('is_active', 1)->first();
        $this->withoutMiddleware();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // getList() Branch A: if ($dept_id) TRUE -> where department_id -> (no matching rows) -> foreach
    //   skipped -> success_response 200. Scoped to a guaranteed-non-existent dept id (read-only).
    public function getList__load__with_dept_id_no_rows__ok_200()
    {
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule/list/999999999');

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // getList() Branch B: else (no dept_id) -> OpsSchedule::get() -> format each -> success_response 200.
    public function getList__load__no_dept_id__ok_200()
    {
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule/list');

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // get() single reachable outcome: loops OPS_DEPTS, per-dept read-only queries -> success_response 200.
    // (Internal image/form/empty + chunk arms are data-dependent; method returns 200 regardless.)
    public function get__load__success__ok_200()
    {
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule');

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // show() Branch A: valid existing id -> find()->toArray() -> format -> success_response 200.
    //   Fixture-scoped to a single existing row (read-only).
    public function show__load__valid_id__ok_200()
    {
        $sched = OpsSchedule::first();
        if (!$sched) {
            $this->markTestSkipped('no ops_schedules row in test DB');
        }

        $response = $this->actingAs($this->user)->getJson('/api/opsschedule/show/' . $sched->id);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // show() Branch B (FINDING): non-existent id -> find() returns null -> null->toArray() throws \Error.
    //   show() has NO try/catch and NO null check, so the \Error propagates -> HTTP 500. Read-only
    //   (nothing is written); we assert the actual behavior.
    public function show__load__invalid_id__error_500()
    {
        // FINDING: OpsSchedule::find(999999999)->toArray() on a null model -> uncaught \Error -> 500.
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule/show/999999999');

        $response->assertStatus(500);
    }
}
