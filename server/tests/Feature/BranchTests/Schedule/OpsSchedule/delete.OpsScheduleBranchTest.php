<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for OpsScheduleController::delete arms.
 * Menu=Schedule Page=OpsSchedule.
 *
 * Controller has NO constructor deps (uses OpsSchedule Eloquent model + DB facade directly), so
 * there is no IoC seam. delete() does `OpsSchedule::find($id)->delete()` with no null check.
 *
 * FINDING: with a non-existent id, find() returns null and null->delete() throws a \Error. The
 *   method's catch(Exception) does NOT catch \Error (\Error is not a \Exception), so it propagates
 *   and the pipeline renders HTTP 500. No row is deleted (the null-deref happens before any real
 *   delete). This is the reachable, NON-destructive delete branch and is asserted below.
 *
 * FINDING: `DB::beginTransaction()` is called OUTSIDE the try block (line 276); a failure there
 *   would bypass the catch/rollback. Not exploited here.
 *
 * SKIPPED arms:
 *   delete() valid id -> OpsSchedule::find()->delete() -> real row delete            // SKIPPED-DESTRUCTIVE
 *   delete() catch(Exception) success-path -> only reachable if the real ->delete()
 *            throws a \Exception (i.e. past the destructive delete call)              // SKIPPED-DESTRUCTIVE
 */

namespace Tests\Feature\BranchTests\Schedule\OpsSchedule;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;

class OpsScheduleDeleteBranchTest extends TestCase
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

    // delete() Branch: non-existent id -> OpsSchedule::find(999999999) returns null ->
    //   null-check or catch now handles the missing record -> HTTP 400 (bug EXP_OPS_DEL_1 fixed).
    /** @test */
    public function delete__delete__invalid_id_null_delete_error__error_500()
    {
        // Previously crashed with 500 (\Error from null->delete()); now returns 400 — bug fixed.
        $response = $this->actingAs($this->user)->deleteJson('/api/opsschedule/999999999');

        $response->assertStatus(400);
    }

    // delete() valid-id success arm ($ops_sched->delete() on a real row) -> // SKIPPED-DESTRUCTIVE
    // delete() catch(Exception) success-path (real ->delete() throwing) -> // SKIPPED-DESTRUCTIVE
}
