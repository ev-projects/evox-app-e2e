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
 *  // FINDING (FIXED 2026-07-31): `use Exception;` was added to HrController.php (2026-07-30). store()/update()'s
 *             `catch(Exception $e)` now resolves correctly — a REAL \Exception thrown in the try IS caught
 *             -> error_response() -> HTTP 400. Assertions updated from 500 -> 400.
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

    /** @test */
    public function test_store__submit__exception__uncaught_500()
    {
        // catch(Exception $e) now works (use Exception; added 2026-07-30) -> 400.
        $this->makeLoggerThrow();

        $response = $this->postJson('/api/hr/announcements', $this->validPayload());

        $response->assertStatus(400);
        // store() success arm: SKIPPED-DESTRUCTIVE (real save()); see file header.
    }

    // --------------------------------------------------------------------- update()

    /** @test */
    public function test_update__submit__exception__uncaught_500()
    {
        // catch(Exception $e) now works (use Exception; added 2026-07-30) -> 400.
        $this->makeLoggerThrow();

        $response = $this->postJson('/api/hr/announcements/999999999', $this->validPayload());

        $response->assertStatus(400);
        // update() success arm: SKIPPED-DESTRUCTIVE (real find()->update()); see file header.
    }
}
