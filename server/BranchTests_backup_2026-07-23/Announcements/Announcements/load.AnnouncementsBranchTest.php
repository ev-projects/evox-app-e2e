<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AnnouncementController::{index,show,increment_dashboard_index,handle_announcements_index,all_hr_handled_Announcements,show_hr_strict} arms. Menu=Announcements Page=Announcements.
 *
 * SKIPPED arms:
 *  // SKIPPED-SP  show_strict()        — every non-exception arm reaches call_sp("EH_SP_Dashboard"); the catch can only be
 *                                        entered after Auth/find work that itself precedes the SP, so no arm is authorable without hitting the SP.
 *  // SKIPPED-SP  dashboard_index()    — the try body builds params then immediately calls call_sp("EH_SP_Dashboard"); catch only reachable via the SP.
 *
 * FINDINGS:
 *  // FINDING: show() has NO try/catch — a repository exception propagates as an uncaught 500 (no error_response arm to test).
 *  // FINDING: show_hr_strict() has NO try/catch and, when isLevel("HR") is false, returns success_response with the
 *             never-assigned $dep_announcement (undefined var -> null). Both isLevel arms converge on HTTP 200, so they are
 *             not independently observable via status; one 200 test covers the method.
 */

namespace Tests\Feature\BranchTests\Announcements\Announcements;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;

class AnnouncementsLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var \Mockery\MockInterface */
    protected $repo;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        // IoC-mock the only constructor-injected dependency.
        $this->repo = Mockery::mock(AnnouncementRepositoryInterface::class);
        $this->app->instance(AnnouncementRepositoryInterface::class, $this->repo);

        // Neutralise log_activity() so it performs no real activity-log write.
        $this->makeLoggerBenign();

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

    private function makeLoggerBenign(): void
    {
        $logger = Mockery::mock(EvoxActivityLogger::class);
        $logger->shouldReceive('useLog')->andReturnSelf();
        $logger->shouldReceive('withProperties')->andReturnSelf();
        $logger->shouldReceive('log')->andReturnNull();
        $this->app->instance(EvoxActivityLogger::class, $logger);
    }

    // ---------------------------------------------------------------- index()

    public function test_index__load__success__ok_200()
    {
        // try arm: empty paginator -> AnnouncementResourceCollection renders without touching per-row DB.
        $this->repo->shouldReceive('index')
            ->once()
            ->andReturn(new LengthAwarePaginator([], 0, 15, 1));

        $response = $this->getJson('/api/department/announcements/all');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_index__load__exception__error_404()
    {
        // catch arm: error_response(..., HTTP_NOT_FOUND).
        $this->repo->shouldReceive('index')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/department/announcements/all');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ----------------------------------------------------------------- show()

    public function test_show__load__success__ok_200()
    {
        // Only arm (no try/catch). Null resource -> AnnouncementResource(null)->toArray() returns null; success_response 200.
        $this->repo->shouldReceive('show')
            ->once()
            ->with('9999999')
            ->andReturnNull();

        $response = $this->getJson('/api/department/announcements/9999999');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    // ------------------------------------------- increment_dashboard_index()

    public function test_incrementDashboardIndex__load__success__ok_200()
    {
        // try arm: empty collection -> AnnouncementStrictResource::collection renders [].
        $this->repo->shouldReceive('increment_dashboard_index')
            ->once()
            ->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/department/announcements/increment_dashboard_departments');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_incrementDashboardIndex__load__exception__error_404()
    {
        // catch arm: error_response(..., HTTP_NOT_FOUND).
        $this->repo->shouldReceive('increment_dashboard_index')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/department/announcements/increment_dashboard_departments');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------- handle_announcements_index()

    public function test_handleAnnouncementsIndex__load__success__ok_200()
    {
        // try arm: empty collection -> AnnouncementResource::collection renders [].
        $this->repo->shouldReceive('handle_announcements_index')
            ->once()
            ->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/department/announcements/my_handle_announcements/all');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_handleAnnouncementsIndex__load__exception__error_404()
    {
        // catch arm: error_response(..., HTTP_NOT_FOUND).
        $this->repo->shouldReceive('handle_announcements_index')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/department/announcements/my_handle_announcements/all');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ---------------------------------------- all_hr_handled_Announcements()

    public function test_allHrHandledAnnouncements__load__success__ok_200()
    {
        // try arm: empty collection -> AnnouncementResource::collection renders [].
        $this->repo->shouldReceive('all_hr_handled_Announcements')
            ->once()
            ->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/department/announcements/hr/all');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_allHrHandledAnnouncements__load__exception__error_404()
    {
        // catch arm: error_response(..., HTTP_NOT_FOUND).
        $this->repo->shouldReceive('all_hr_handled_Announcements')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/department/announcements/hr/all');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------- show_hr_strict()

    public function test_showHrStrict__load__success__ok_200()
    {
        // No try/catch; single observable outcome (200) for both isLevel("HR") arms (see FINDING).
        // Bogus id -> Announcement::where('category','HR')->find() returns null -> AnnouncementResource(null) -> 200.
        $response = $this->getJson('/api/department/announcements/hr/9999999');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    // show_strict()      // SKIPPED-SP  — reaches call_sp("EH_SP_Dashboard"); see file header.
    // dashboard_index()  // SKIPPED-SP  — reaches call_sp("EH_SP_Dashboard"); see file header.
}
