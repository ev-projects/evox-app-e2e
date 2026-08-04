<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for OpsScheduleController::store/update arms.
 * Menu=Schedule Page=OpsSchedule.
 *
 * Controller has NO constructor deps (uses OpsSchedule Eloquent model + DB/Storage facades directly),
 * so there is no IoC seam to mock. store() and update() both branch on $request->type
 * ('image' | 'form'). BOTH concrete branches reach OpsSchedule::create()/update() and/or
 * Storage->storeAs() -> real writes -> SKIPPED-DESTRUCTIVE.
 *
 * The catch(Exception) arm IS live (`use Exception;` is imported). It is reached NON-destructively
 * here: when $request->type is neither 'image' nor 'form', both branches are skipped and the method
 * falls through to success_response(..., $new_ops_sched/$updated_ops_sched, ...) with an UNDEFINED
 * variable. Laravel bootstraps error_reporting(-1), so the "Undefined variable" E_NOTICE is thrown
 * as an ErrorException INSIDE the try -> caught -> error_response default 400. No create/update runs.
 *
 * FINDING: `DB::beginTransaction()` is called OUTSIDE the try block in both store() and update()
 *   (line 132 / 216). A failure there would bypass the catch (no rollback). Not exploited here (safe).
 *
 * SKIPPED arms:
 *   store()  type==='image' -> OpsSchedule::create()/update() + Storage->storeAs()  // SKIPPED-DESTRUCTIVE
 *   store()  type==='form'  -> OpsSchedule::create()                                // SKIPPED-DESTRUCTIVE
 *   update() type==='image' -> Storage->storeAs() + OpsSchedule::where()->update()  // SKIPPED-DESTRUCTIVE
 *   update() type==='form'  -> OpsSchedule::where()->update()                        // SKIPPED-DESTRUCTIVE
 */

namespace Tests\Feature\BranchTests\Schedule\OpsSchedule;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;

class OpsScheduleSubmitBranchTest extends TestCase
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

    // store() catch(Exception): type is neither 'image' nor 'form' -> both branches skipped ->
    //   success_response() references undefined $new_ops_sched -> ErrorException inside try ->
    //   catch -> error_response default 400. No DB write occurs (no create reached).
    public function store__submit__unknown_type_exception__error_400()
    {
        $response = $this->actingAs($this->user)->postJson('/api/opsschedule', []); // type omitted

        $response->assertStatus(400)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // update() catch(Exception): same non-destructive fall-through -> undefined $updated_ops_sched ->
    //   ErrorException inside try -> catch -> error_response default 400. No DB write occurs.
    public function update__submit__unknown_type_exception__error_400()
    {
        $response = $this->actingAs($this->user)->putJson('/api/opsschedule/1', []); // type omitted

        $response->assertStatus(400)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // store()/update() type==='image' | 'form' success arms -> OpsSchedule::create()/update() +
    //   Storage->storeAs() -> real writes on live-dump DB/storage. // SKIPPED-DESTRUCTIVE
}
