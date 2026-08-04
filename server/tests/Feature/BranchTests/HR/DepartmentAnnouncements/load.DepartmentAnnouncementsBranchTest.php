<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AnnouncementController::{show success, show_strict catch,
 * dashboard_index catch, show_hr_strict HR-arm success}. Menu=HR Page=DepartmentAnnouncements.
 *
 * NET-NEW COMPLEMENT to Announcements\Announcements\load.AnnouncementsBranchTest.php — that file covers
 * index/increment_dashboard_index/handle_announcements_index/all_hr_handled_Announcements (success+catch) and the
 * null-resource 500 arms of show()/show_hr_strict(). This file covers ONLY arms that file skipped or left uncovered.
 *
 * SKIPPED arms (still not authorable):
 *  // SKIPPED-SP  show_strict() success arms   — every non-exception arm reaches call_sp("EH_SP_Dashboard").
 *  // SKIPPED-SP  dashboard_index() success arm — the try body calls call_sp("EH_SP_Dashboard") directly.
 *  (Only their CATCH arms are exercised here, via a code path that throws BEFORE call_sp is reached — see FINDING.)
 *
 * FINDINGS:
 *  // FINDING: show_strict()/dashboard_index() catch arms ARE reachable without executing the SP, contrary to the
 *             SKIPPED-SP note in the older file: with no authenticated user, Auth::user() is null and the parameter
 *             build ($user->LevelId) raises a PHP notice that Laravel's HandleExceptions converts to an
 *             ErrorException — thrown BEFORE call_sp("EH_SP_Dashboard") executes, so the SP is never invoked.
 *             The catch then masks the null-user condition as a generic 400 (show_strict) / 404 (dashboard_index)
 *             instead of a 401. With jwtauth active this is shielded, but any middleware gap turns "not logged in"
 *             into a misleading error payload.
 *  // FINDING: show() success (200) REQUIRES a "resource-safe" row: AnnouncementResource::toArray() dereferences
 *             creator() with no null guard (created_by pointing at a hard-deleted user -> uncaught 500, since show()
 *             has no try/catch) and calls created_at->format() (null created_at -> uncaught 500). Tests below select
 *             fixtures defensively and skip when none qualify.
 */

namespace Tests\Feature\BranchTests\HR\DepartmentAnnouncements;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\EvoxLevels;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;

class DepartmentAnnouncementsLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var \Mockery\MockInterface */
    protected $repo;

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

        // NOTE: actingAs() is done per-test — the show_strict/dashboard_index catch tests
        // REQUIRE an unauthenticated request (null Auth::user()) to reach the catch pre-SP.
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

    /**
     * Picks an announcement that AnnouncementResource::toArray() can serialize WITHOUT throwing:
     *  - set_all = 1        -> skips every depList branch (no Announcement::find(...)->clones queries)
     *  - created_at not null -> created_at->format() cannot fatal
     *  - creator resolvable  -> created_by == 0 OR a (possibly trashed) User row exists, otherwise
     *                           creator() returns null and $user->id fatals (uncaught 500 in show()).
     * Scoped to at most 10 rows — never a whole-table scan.
     */
    private function safeAnnouncement($category = null)
    {
        $query = Announcement::where('set_all', 1)->whereNotNull('created_at');
        if ($category !== null) {
            $query->where('category', $category);
        }
        $candidates = $query->take(10)->get();
        foreach ($candidates as $ann) {
            if ($ann->created_by == 0 || !is_null(User::withTrashed()->find($ann->created_by))) {
                return $ann;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------ show()

    // show() success arm: repo->show() returns a resource-safe row -> AnnouncementResource serializes -> 200.
    // (The null-resource 500 arm is already covered in Announcements\Announcements\load.AnnouncementsBranchTest.php.)
    /** @test */
    public function show__load__resource_safe_fixture__ok_200()
    {
        $user = User::where('is_active', 1)->first();
        if (is_null($user)) {
            $this->markTestIncomplete('No active user fixture available.');
        }
        $ann = $this->safeAnnouncement();
        if (is_null($ann)) {
            $this->markTestIncomplete('No resource-safe announcement fixture (set_all=1, created_at set, creator resolvable).');
        }

        $this->repo->shouldReceive('show')->once()->andReturn($ann);

        $response = $this->actingAs($user)
            ->getJson('/api/department/announcements/' . $ann->id);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    // ----------------------------------------------------------- show_strict()

    // show_strict() catch arm: unauthenticated -> Auth::user() null -> Announcement::find(0) null (if skipped)
    // -> $user->LevelId notice -> ErrorException BEFORE call_sp("EH_SP_Dashboard") -> catch -> default 400.
    // The SP is never executed (SP-safe). Success arms remain SKIPPED-SP.
    /** @test */
    public function show_strict__load__unauthenticated_null_user__error_400()
    {
        $response = $this->getJson('/api/department/announcements/strict/0');

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------- dashboard_index()

    // dashboard_index() catch arm: unauthenticated -> $user->LevelId on null raises a notice ->
    // ErrorException BEFORE call_sp("EH_SP_Dashboard") -> catch -> error_response(..., HTTP_NOT_FOUND) 404.
    // The SP is never executed (SP-safe). Success arm remains SKIPPED-SP.
    /** @test */
    public function dashboard_index__load__unauthenticated_null_user__error_404()
    {
        $response = $this->getJson('/api/department/announcements/dashboard_departments');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // --------------------------------------------------------- show_hr_strict()

    // show_hr_strict() isLevel("HR")==true arm with a REAL HR-category announcement -> 200.
    // (The null-resource / non-HR 500 arm is already covered in the Announcements\Announcements file.)
    /** @test */
    public function show_hr_strict__load__hr_user_hr_announcement__ok_200()
    {
        $hrLevel = EvoxLevels::where('Name', 'like', '%HR%')->first();
        if (is_null($hrLevel)) {
            $this->markTestIncomplete('No EVOX_LEVELS row with an HR name available.');
        }
        $hrUser = User::where('is_active', 1)->where('LevelId', $hrLevel->LevelId)->first();
        if (is_null($hrUser)) {
            $this->markTestIncomplete('No active HR-level user fixture available.');
        }
        $ann = $this->safeAnnouncement('HR');
        if (is_null($ann)) {
            $this->markTestIncomplete('No resource-safe HR-category announcement fixture available.');
        }

        $response = $this->actingAs($hrUser)
            ->getJson('/api/department/announcements/hr/' . $ann->id);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }
}
