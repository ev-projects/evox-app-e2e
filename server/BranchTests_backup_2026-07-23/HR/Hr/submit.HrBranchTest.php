<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for HrController::{store,update} arms. Menu=HR Page=Hr.
 *
 * SKIPPED arms:
 *  // SKIPPED-DESTRUCTIVE store() try success arm — reaches $hrAnnouncement->save(), a real INSERT into change_log
 *                        on live-dump data. Only the exception path is exercised.
 *  // SKIPPED-DESTRUCTIVE update() try success arm — ChangeLogs::find($id)->update(...), a real UPDATE on live-dump
 *                        data (and find() may be null -> \Error). Only the exception path is exercised.
 *
 * FINDINGS:
 *  // FINDING: HrController lives in namespace App\Modules\Hr\Http\Controllers but never does `use Exception;`.
 *             store()/update() `catch(Exception $e)` therefore resolves to the non-existent
 *             App\Modules\Hr\Http\Controllers\Exception, so a REAL \Exception thrown in the try is NOT caught ->
 *             it escapes uncaught -> HTTP 500, never the intended error_response() 400. The 400 catch arm is DEAD
 *             and cannot be authored to pass; the tests below assert the real 500 and skip the unreachable 400.
 */

namespace Tests\Feature\BranchTests\HR\Hr;

use Mockery;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;

class HrSubmitBranchTest extends TestCase
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

    /** Make log_activity() (first statement in each try) throw a genuine \Exception without touching the DB. */
    private function makeLoggerThrow(): void
    {
        $logger = Mockery::mock(EvoxActivityLogger::class);
        $logger->shouldReceive('useLog')->andThrow(new \Exception('boom'));
        $this->app->instance(EvoxActivityLogger::class, $logger);
    }

    private function validPayload(): array
    {
        return [
            'title'       => 'Branch test announcement',
            'category'    => 'General',
            'description' => 'Branch test description',
            'log_date'    => '2026-01-01',
        ];
    }

    // ---------------------------------------------------------------------- store()

    public function test_store__submit__exception__uncaught_500()
    {
        // A real \Exception is raised inside the try (log_activity), but the namespaced catch(Exception) is DEAD
        // (no `use Exception;`), so it escapes -> 500 (NOT the intended 400). See FINDING in file header.
        $this->makeLoggerThrow();

        $response = $this->postJson('/api/hr/announcements', $this->validPayload());

        $response->assertStatus(500);
        // store() success arm: SKIPPED-DESTRUCTIVE (real save()); see file header.
    }

    // --------------------------------------------------------------------- update()

    public function test_update__submit__exception__uncaught_500()
    {
        // Same dead-catch FINDING: real \Exception in try -> uncaught -> 500.
        $this->makeLoggerThrow();

        $response = $this->postJson('/api/hr/announcements/999999999', $this->validPayload());

        $response->assertStatus(500);
        // update() success arm: SKIPPED-DESTRUCTIVE (real find()->update()); see file header.
    }
}
