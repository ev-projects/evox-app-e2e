<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for HrController::delete arm. Menu=HR Page=Hr.
 *
 * SKIPPED arms:
 *  // SKIPPED-DESTRUCTIVE delete() try success arm — ChangeLogs::find($id)->delete(), a real DELETE on live-dump
 *                        data (and find() may be null -> \Error). Only the exception path is exercised.
 *
 * FINDINGS:
 *  // FINDING (FIXED 2026-07-31): `use Exception;` was added to HrController.php (2026-07-30). delete()'s
 *             `catch(Exception $e)` now resolves correctly — a REAL \Exception thrown in the try IS caught
 *             -> error_response() -> HTTP 400. Assertion updated from 500 -> 400.
 */

namespace Tests\Feature\BranchTests\HR\Hr;

use Mockery;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;

class HrDeleteBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

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

    /** Make log_activity() (first statement in the try) throw a genuine \Exception without touching the DB. */
    private function makeLoggerThrow(): void
    {
        $logger = Mockery::mock(EvoxActivityLogger::class);
        $logger->shouldReceive('useLog')->andThrow(new \Exception('boom'));
        $this->app->instance(EvoxActivityLogger::class, $logger);
    }

    // ---------------------------------------------------------------------- delete()

    /** @test */
    public function test_delete__delete__exception__uncaught_500()
    {
        // catch(Exception $e) now works (use Exception; added 2026-07-30) -> 400.
        $this->makeLoggerThrow();

        $response = $this->deleteJson('/api/hr/announcements/999999999');

        $response->assertStatus(400);
        // delete() success arm: SKIPPED-DESTRUCTIVE (real find()->delete()); see file header.
    }
}
