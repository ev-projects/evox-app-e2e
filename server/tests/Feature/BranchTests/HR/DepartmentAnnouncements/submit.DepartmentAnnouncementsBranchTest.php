<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AnnouncementController::{store validation arm,
 * update validation arm, update if-success arm, update else-no-rights arm}. Menu=HR Page=DepartmentAnnouncements.
 *
 * NET-NEW COMPLEMENT to Announcements\Announcements\submit.AnnouncementsBranchTest.php — that file covers
 * store success/catch and the update()/update_status() catch arms (via a throwing logger). This file covers
 * ONLY arms that file skipped (SKIPPED-DATA) or left uncovered (the FormRequest 422 gate).
 *
 * SKIPPED arms (still not authorable):
 *  // SKIPPED-DESTRUCTIVE update_status() success arm — Announcement::find($id)->update() is a real UPDATE on
 *                         live-dump data with no repository seam; remains covered only on its catch arm (older file).
 *
 * FINDINGS:
 *  // FINDING: update()'s if/else arms ARE deterministically reachable (the older file marked them SKIPPED-DATA):
 *             selecting a user whose department_id matches an announcement's dep_id satisfies
 *             $department->departments_announcements()->find($id) (success arm, short-circuits isLevel), and any
 *             non-Admin user with a real EVOX_DEPARTMENT row + level row reaches the else arm with a bogus id.
 *  // FINDING: AnnouncementRequest::failedValidation() returns error_response($errors, [], 422) — message is the
 *             ARRAY of validation errors, not a string (asymmetric with every other error payload in the module).
 */

namespace Tests\Feature\BranchTests\HR\DepartmentAnnouncements;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;

class DepartmentAnnouncementsSubmitBranchTest extends TestCase
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

    /** Payload that passes AnnouncementRequest validation (set_all=1 & set_country_all=1 waive the required_if rules). */
    private function validPayload(): array
    {
        return [
            'title'           => 'Branch test announcement',
            'release_date'    => '2026-01-01',
            'expiry_date'     => '2026-12-31',
            'set_all'         => 1,
            'set_country_all' => 1,
        ];
    }

    // ----------------------------------------------------------------- store()

    // store() validation arm: AnnouncementRequest fails (missing title/release_date/expiry_date) ->
    // failedValidation() -> error_response(errors, [], HTTP_UNPROCESSABLE_ENTITY) 422. Controller body never runs
    // (the mocked repo receives no call), so this is the FormRequest gate branch, distinct from success/catch.
    /** @test */
    public function store__submit__missing_required_fields__error_422()
    {
        $response = $this->postJson('/api/department/announcements/create', []);

        $response->assertStatus(422)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ---------------------------------------------------------------- update()

    // update() validation arm: same AnnouncementRequest gate as store() -> 422 before the try body
    // (no EvoxDepartment lookup, no repo call).
    /** @test */
    public function update__submit__missing_required_fields__error_422()
    {
        $response = $this->postJson(
            '/api/department/announcements/my_handle_announcements/9999999/update',
            []
        );

        $response->assertStatus(422)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // update() if-arm (success): $check_announcement truthy — the acting user's department owns the target
    // announcement, so the || short-circuits BEFORE isLevel("Admin") (no level-row risk). repo->update() is
    // IoC-mocked -> no real write -> success_response 200.
    /** @test */
    public function update__submit__department_announcement_match__ok_200()
    {
        // A user whose department_id matches at least one live announcement's dep_id (scoped subquery, no scan).
        $user = User::where('is_active', 1)
            ->whereNotNull('department_id')
            ->whereIn('department_id', function ($q) {
                $q->select('dep_id')->from('announcements')
                  ->whereNotNull('dep_id')
                  ->whereNull('deleted_at');
            })
            ->first();
        if (is_null($user)) {
            $this->markTestIncomplete('No active user whose department owns an announcement.');
        }
        $department = EvoxDepartment::find($user->department_id);
        if (is_null($department)) {
            // A null department fatals with \Error (method call on null) — uncaught 500, not a testable branch.
            $this->markTestIncomplete('User department_id has no EVOX_DEPARTMENT row.');
        }
        $ann = $department->departments_announcements()->first();
        if (is_null($ann)) {
            $this->markTestIncomplete('Department has no live announcement fixture.');
        }

        $this->repo->shouldReceive('update')->once()->andReturn(['id' => $ann->id]);

        $response = $this->actingAs($user)->postJson(
            '/api/department/announcements/my_handle_announcements/' . $ann->id . '/update',
            $this->validPayload()
        );

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    // update() else-arm (no rights): announcement id 0 is not in the user's department and the user is not
    // Admin -> error_response default 400. Guards: the department row must exist (null -> \Error 500) and the
    // level row must exist (level_type() dereferences level()->first()->Name).
    /** @test */
    public function update__submit__non_admin_no_matching_announcement__error_400()
    {
        // Require a non-Admin user who has a resolvable EVOX_DEPARTMENT row and an EVOX_LEVELS row.
        // Admin users short-circuit into the if-arm (success); we need the else-arm (no rights).
        $user = User::where('is_active', 1)
            ->whereNotNull('department_id')
            ->whereNotNull('LevelId')
            ->whereIn('department_id', function ($q) {
                $q->select('Id')->from('EVOX_DEPARTMENT');
            })
            ->whereNotIn('LevelId', function ($q) {
                $q->select('LevelId')->from('EVOX_LEVELS')
                  ->where('Name', 'like', '%Admin%');
            })
            ->first();
        if (is_null($user)) {
            $this->markTestIncomplete(
                'No active non-Admin user with a resolvable EVOX_DEPARTMENT row and an EVOX_LEVELS row.'
            );
        }
        // Belt-and-suspenders: verify the resolved user is genuinely non-Admin.
        if ($user->isLevel('Admin')) {
            $this->markTestIncomplete('Fixture user resolved as Admin despite filter; cannot reach the 400 else-arm.');
        }

        $response = $this->actingAs($user)->postJson(
            '/api/department/announcements/my_handle_announcements/0/update',
            $this->validPayload()
        );

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
