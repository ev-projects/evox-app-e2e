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
 *  // FINDING: show() has NO try/catch. On a null resource, new AnnouncementResource(null) dereferences resource
 *             properties (release_date, created_by, ...) BEFORE its own is_null() guard; `null->prop` raises a PHP
 *             notice that Laravel converts to an ErrorException -> uncaught 500. A null resource cannot yield 200.
 *  // FINDING: show_hr_strict() has NO try/catch. Both isLevel("HR") arms end up passing a null resource to
 *             AnnouncementResource (HR arm: find(bogus) -> null; non-HR arm: undefined $dep_announcement -> null),
 *             so both arms converge on the same uncaught 500 (same unguarded-property-access bug as show()).
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

    /** @test */
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

    /** @test */
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

    /** @test */
    public function test_show__load__null_resource__uncaught_500()
    {
        // FINDING: show() has NO try/catch. The repo returns null, so the controller builds
        // `new AnnouncementResource(null)`. AnnouncementResource::toArray() accesses resource properties
        // ($this->release_date on lines 23-25, $this->created_by, $this->set_all, etc.) at the TOP of the
        // method, BEFORE its own `is_null($this->resource)` guard on line 61. On a null resource these go
        // through JsonResource::__get -> `null->release_date`, which raises a PHP notice/warning that
        // Laravel's HandleExceptions bootstrapper converts into an ErrorException. With no try/catch, it
        // propagates uncaught -> 500. A null-resource cannot produce a graceful 200 here.
        $this->repo->shouldReceive('show')
            ->once()
            ->with('9999999')
            ->andReturnNull();

        $response = $this->getJson('/api/department/announcements/9999999');

        $response->assertStatus(500);
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

    public function test_showHrStrict__load__null_resource__uncaught_500()
    {
        // FINDING: show_hr_strict() has NO try/catch. Whichever isLevel("HR") arm is taken, the resource
        // passed to AnnouncementResource is null (HR arm: Announcement::where('category','HR')->find(bogus)
        // returns null; non-HR arm: $dep_announcement is never assigned -> null). AnnouncementResource::toArray()
        // dereferences resource properties ($this->release_date, ...) BEFORE its is_null() guard (line 61), so
        // `null->release_date` raises a notice that Laravel converts to an ErrorException -> uncaught 500.
        // Both isLevel arms therefore converge on 500, not the previously-assumed 200.
        $response = $this->getJson('/api/department/announcements/hr/9999999');

        $response->assertStatus(500);
    }

    // show_strict()      // SKIPPED-SP  — reaches call_sp("EH_SP_Dashboard"); see file header.
    // dashboard_index()  // SKIPPED-SP  — reaches call_sp("EH_SP_Dashboard"); see file header.
}
