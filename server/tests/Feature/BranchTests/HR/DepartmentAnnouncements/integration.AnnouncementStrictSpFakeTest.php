<?php
/**
 * SOURCE UNDER TEST: app/Modules/Department/Http/Controllers/AnnouncementController.php
 * MENU PATH:         HR -> Department Announcements (and Announcements -> Announcements)
 * MEASURED COVERAGE AT AUTHORING (lines-%): show_strict 64.29, update_status 63.64,
 *   show_hr_strict 83.33.
 *
 * FINDINGS:
 *  // FINDING (already registered, not re-reported): show_hr_strict() has no try/catch and never
 *     assigns $dep_announcement on the non-HR arm, so a non-HR caller dereferences an undefined
 *     variable and the request 500s. Characterised below as expected-current-behaviour
 *     (*_FINDING_HR_UNDEFINED_VAR); when the arm is fixed the test fails, which is the signal to
 *     flip it to the intended 403/empty response.
 *
 * NET-NEW COMPLEMENT to Announcements\Announcements\{load,submit}.AnnouncementsBranchTest.php and
 * HR\DepartmentAnnouncements\{load,submit}.DepartmentAnnouncementsBranchTest.php. Those files cover
 * every arm reachable without EH_SP_Dashboard plus the catch arms. This file adds:
 *   - show_strict()'s three success/refusal arms, now drivable because CallSpFake shadows
 *     App\Modules\Department\Http\Controllers (they were previously SKIPPED-SP);
 *   - update_status()'s success arm, previously SKIPPED-DESTRUCTIVE — it is safe here because the
 *     row it flips is created by the test itself and rolled back with the transaction;
 *   - show_hr_strict()'s non-HR arm.
 * No stored procedure executes and no pre-existing announcement row is modified.
 */

namespace Tests\Feature\BranchTests\HR\DepartmentAnnouncements;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Support\Fluent;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\EvoxLevels;
use App\Classes\EvoxActivityLogger;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Repositories\AnnouncementRepository;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;

class AnnouncementStrictSpFakeIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    /** @var \Mockery\MockInterface */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();
        $this->withoutMiddleware();

        $this->makeLoggerBenign();

        $this->repo = Mockery::mock(AnnouncementRepositoryInterface::class);
        $this->app->instance(AnnouncementRepositoryInterface::class, $this->repo);

        // isLevel() dereferences level()->first()->Name, so the caller MUST have a level row; and
        // show_strict()'s if/else gate turns on isLevel("Admin"), so the caller must NOT be an Admin
        // or every test below would take the same (unrestricted) arm.
        $this->user = $this->userWithNonAdminLevel();
        if (!$this->user) {
            $this->markTestSkipped('no active non-Admin user with a resolvable EVOX level in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
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
     * An active user whose LevelId resolves to a real EVOX_LEVELS row that is not "Admin".
     * SubDepartmentID must be null: with one set, both the fixture builder and show_strict resolve
     * the department through EvoxSubDepartment::find(...)->DepartmentId, which fatals on a dangling
     * sub-department and would make these tests depend on live-dump data quality.
     */
    private function userWithNonAdminLevel()
    {
        $levelIds = EvoxLevels::whereNotNull('Name')->where('Name', '!=', 'Admin')->pluck('LevelId');
        if ($levelIds->isEmpty()) {
            return null;
        }
        return User::where('is_active', 1)->whereIn('LevelId', $levelIds)
            ->whereNull('SubDepartmentID')
            ->whereNotNull('country_id')->orderBy('id', 'desc')->first();
    }

    /**
     * A throwaway announcement created by THIS test through the real repository, so every arm
     * below reads and writes only rows the test owns. set_all/set_country_all = 1 keeps
     * AnnouncementResource on its department-free path; created_by is the acting user, so
     * creator() always resolves.
     */
    private function makeAnnouncementFixture(array $overrides = [])
    {
        return (new AnnouncementRepository())->store(new Fluent(array_merge([
            'title'               => 'Strict-arm fixture ' . uniqid('', true),
            'category'            => 'Department',
            'content'             => '<p>fixture body</p>',
            'headline'            => 'fixture headline',
            'release_date'        => '2026-01-01',
            'expiry_date'         => '2026-12-31',
            'on_link'             => 0,
            'link'                => null,
            'status'              => 1,
            'country_id'          => null,
            'set_all'             => 1,
            'set_exclude'         => 0,
            'set_country_all'     => 1,
            'selectedDepartments' => null,
            'thumbnail'           => null,
        ], $overrides)));
    }

    // ================================================================ show_strict()

    // Fast path: if the dashboard result set already contains this announcement the caller is
    // entitled to it, and the controller answers from the row it already loaded — the repository's
    // permission lookups are never consulted.
    /** @test */
    public function an_announcement_already_on_the_callers_dashboard_is_returned_without_a_permission_lookup()
    {
        $ann = $this->makeAnnouncementFixture();
        CallSpFake::fake('EH_SP_Dashboard', [[], [(object) ['id' => $ann->id]]]);
        $this->repo->shouldReceive('show')->never();
        $this->repo->shouldReceive('show_strict')->never();

        $res = $this->getJson('/api/department/announcements/strict/' . $ann->id);

        $res->assertStatus(200);
        $this->assertEquals($ann->id, $res->json('content.id'));

        // The dashboard is queried for this user, level 3, page 1, with a 999 page size.
        $this->assertSame(
            [$this->user->LevelId, $this->user->id, null, $this->user->country_id, 3, 1, 999],
            CallSpFake::callsFor('EH_SP_Dashboard')[0]['params']
        );
    }

    // Not on the dashboard and not an Admin/owner: the strict permission lookup runs, and when it
    // refuses the caller gets the explicit "not allowed" refusal, not an empty 200.
    /** @test */
    public function an_announcement_the_strict_lookup_refuses_is_reported_as_not_allowed()
    {
        $ann = $this->makeAnnouncementFixture();
        // The fixture is created BY the caller; hand ownership away so the owner bypass does not
        // fire and the strict permission lookup is the arm actually under test.
        Announcement::where('id', $ann->id)->update(['created_by' => 0]);
        CallSpFake::fake('EH_SP_Dashboard', [[], []]);          // dashboard does not contain it
        $this->repo->shouldReceive('show')->never();
        $this->repo->shouldReceive('show_strict')->once()->andReturnNull();

        $res = $this->getJson('/api/department/announcements/strict/' . $ann->id);

        $res->assertStatus(400);
        $this->assertSame('Your not allowed to see this announcement', $res->json('error.message'));
    }

    // The owner of an announcement bypasses the strict lookup even when it is not on their
    // dashboard: created_by == the caller routes them through the unrestricted show().
    /** @test */
    public function the_owner_of_an_announcement_reads_it_through_the_unrestricted_lookup()
    {
        $ann = $this->makeAnnouncementFixture();               // created_by = acting user
        CallSpFake::fake('EH_SP_Dashboard', [[], []]);
        $this->repo->shouldReceive('show_strict')->never();
        $this->repo->shouldReceive('show')->once()->with((string) $ann->id)->andReturn($ann);

        $res = $this->getJson('/api/department/announcements/strict/' . $ann->id);

        $res->assertStatus(200);
        $this->assertEquals($ann->id, $res->json('content.id'));
    }

    // An id that matches no announcement at all skips the dashboard comparison entirely (the
    // ternary yields an empty set) and still ends at the refusal, never at a 500.
    /** @test */
    public function an_unknown_announcement_id_is_refused_rather_than_fataling()
    {
        CallSpFake::fake('EH_SP_Dashboard', [[], [(object) ['id' => 1]]]);
        $this->repo->shouldReceive('show_strict')->once()->andReturnNull();

        $res = $this->getJson('/api/department/announcements/strict/999999999');

        $res->assertStatus(400);
        $this->assertSame('Your not allowed to see this announcement', $res->json('error.message'));
    }

    // =============================================================== update_status()

    // Publishing/unpublishing writes the new status and commits — asserted against the row itself,
    // not just the response body.
    /** @test */
    public function changing_an_announcement_status_persists_the_new_value()
    {
        $ann = $this->makeAnnouncementFixture(['status' => 1]);
        $this->assertEquals(1, Announcement::find($ann->id)->status);

        $res = $this->putJson(
            '/api/department/announcements/my_handle_announcements/' . $ann->id . '/update-status',
            ['status' => 0]
        );

        $res->assertStatus(200);
        $this->assertEquals(0, Announcement::find($ann->id)->status);
        $this->assertEquals(0, $res->json('content.status'));
    }

    // The HR route reaches the same controller method, so an HR admin can flip status there too.
    /** @test */
    public function the_hr_route_can_change_an_announcement_status_as_well()
    {
        $ann = $this->makeAnnouncementFixture(['status' => 0]);

        $res = $this->putJson(
            '/api/department/announcements/hr/' . $ann->id . '/update-status',
            ['status' => 1]
        );

        $res->assertStatus(200);
        $this->assertEquals(1, Announcement::find($ann->id)->status);
    }

    // ============================================================== show_hr_strict()

    // FINDING (already registered) — expected-current-behaviour. show_hr_strict() only assigns
    // $dep_announcement inside the isLevel("HR") arm, so a non-HR caller reaches
    // `new AnnouncementResource($dep_announcement)` with the variable never defined. The resulting
    // notice becomes an ErrorException and, with no try/catch in the method, an uncaught 500.
    // The correct behaviour would be a refusal; assert the 500 until the arm is fixed.
    /** @test */
    public function a_non_hr_caller_hits_an_undefined_variable_and_500s_FINDING_HR_UNDEFINED_VAR()
    {
        $nonHr = $this->user;
        if ($nonHr->isLevel('HR')) {
            $this->markTestSkipped('the only available caller is HR-level; the non-HR arm is unreachable');
        }
        $ann = $this->makeAnnouncementFixture(['category' => 'HR']);

        $res = $this->actingAs($nonHr)->getJson('/api/department/announcements/hr/' . $ann->id);

        $res->assertStatus(500);
    }
}
