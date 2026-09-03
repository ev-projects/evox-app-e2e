<?php
/**
 * SOURCES UNDER TEST:
 *   app/Modules/Department/Repositories/AnnouncementRepository.php  (store, show_strict, destroy)
 *   app/Modules/Department/Repositories/DepartmentRepository.php    (find, destroy_department)
 *   app/Modules/Department/Models/Announcement.php                  (announcement_clones_departments)
 * MENU PATH: Admin -> Departments / Department Announcements
 * MEASURED COVERAGE AT AUTHORING (lines-%): AnnouncementRepository store 92.31, show_strict 43.75,
 *   destroy 72.73; DepartmentRepository find 50, destroy_department 54.55;
 *   Announcement::announcement_clones_departments 92.86.
 *
 * FINDINGS:
 *  // FINDING ANN-UPD-NULL (documented, deliberately NOT executed): AnnouncementRepository::update()
 *     opens a transaction and then does `Announcement::find($id)->title = ...` with no null guard.
 *     A missing id raises a method-call-on-null \Error, which `catch (Exception $e)` does not match,
 *     so DB::rollback() never runs and the request leaves an OPEN transaction behind. Executing that
 *     arm in a DatabaseTransactions test would unwind the suite's own wrapper, so it is described
 *     here rather than triggered. Same shape as the already-registered update_status finding.
 *
 * NET-NEW COMPLEMENT to Unit\Repositories\AnnouncementRepositoryLiveTest.php, which covers index,
 * store's set_all/child/exclude arms, show_strict's global fast path, update, update_status,
 * destroy's success path and the dashboard arms. This file adds show_strict's per-department arms,
 * the rollback arms of store/destroy, the DepartmentRepository pair, and the model's exclude arm.
 * Every row read or written is created by the test and rolled back; no stored procedures are
 * involved anywhere in these classes.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Fluent;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Classes\EvoxActivityLogger;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Repositories\AnnouncementRepository;
use App\Modules\Department\Repositories\DepartmentRepository;

class DepartmentModuleRepositoryGapsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var AnnouncementRepository */
    private $announcements;
    /** @var DepartmentRepository */
    private $departments;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->announcements = new AnnouncementRepository();
        $this->departments   = new DepartmentRepository();
        $this->makeLoggerBenign();

        // show_strict()'s per-department arms need a caller whose department_id resolves to a real
        // EVOX_DEPARTMENT row and who has no SubDepartmentID (so main_dep_id == department_id).
        $this->user = User::where('is_active', 1)
            ->whereNull('SubDepartmentID')
            ->whereNotNull('department_id')
            ->whereNotNull('country_id')
            ->orderBy('id', 'desc')->first();
        if (!$this->user || !EvoxDepartment::find($this->user->department_id)) {
            $this->markTestSkipped('no active user whose department_id resolves to an EVOX_DEPARTMENT row');
        }
        $this->be($this->user);
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

    /** Make log_activity() throw so the repositories' rollback arms can be reached. */
    private function makeLoggerThrow($message = 'activity log unavailable'): void
    {
        $logger = Mockery::mock(EvoxActivityLogger::class);
        $logger->shouldReceive('useLog')->andThrow(new \Exception($message));
        $this->app->instance(EvoxActivityLogger::class, $logger);
    }

    private function payload(array $overrides = [])
    {
        return new Fluent(array_merge([
            'title'               => 'Repo gap fixture ' . uniqid('', true),
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
            'thumbnail'           => null,           // never touches the filesystem
        ], $overrides));
    }

    // =============================================== AnnouncementRepository::show_strict()

    // A department-scoped announcement resolves through its CLONE row: the caller asks for the
    // parent id, and the copy carrying their own department is what they are allowed to read.
    /** @test */
    public function a_department_scoped_announcement_resolves_through_the_clone_for_the_callers_department()
    {
        $child  = $this->announcements->store($this->payload([
            'set_all'             => 0,
            'selectedDepartments' => [$this->user->department_id],
        ]));
        $rootId = $child->announcement_id;
        $this->assertNotNull($rootId, 'fixture must have produced a parent/clone pair');

        $visible = $this->announcements->show_strict($rootId);

        $this->assertNotNull($visible);
        $this->assertEquals($child->id, $visible->id);
        $this->assertEquals($this->user->department_id, $visible->present_dep_id);
    }

    // The same announcement scoped to somebody ELSE's department is not readable: no clone matches
    // the caller's department, and the parent is not attached to it either, so nothing comes back.
    /** @test */
    public function an_announcement_scoped_to_another_department_is_not_readable()
    {
        $otherDepartment = EvoxDepartment::where('Id', '!=', $this->user->department_id)
            ->orderBy('Id')->first();
        if (!$otherDepartment) {
            $this->markTestSkipped('need a second department in test DB');
        }

        $child  = $this->announcements->store($this->payload([
            'set_all'             => 0,
            'selectedDepartments' => [$otherDepartment->id],
        ]));
        $rootId = $child->announcement_id;

        $this->assertNull($this->announcements->show_strict($rootId));
    }

    // ==================================================== AnnouncementRepository::store()

    // A failure anywhere in store() rolls the whole thing back and re-throws — a half-written
    // parent must never survive.
    /** @test */
    public function a_failure_during_store_rolls_back_and_rethrows()
    {
        $payload = $this->payload();
        $this->makeLoggerThrow('store blew up');

        try {
            $this->announcements->store($payload);
            $this->fail('store() must re-throw after rolling back');
        } catch (\Exception $e) {
            $this->assertSame('store blew up', $e->getMessage());
        }

        $this->assertSame(0, Announcement::where('title', $payload->title)->count());
    }

    // ================================================== AnnouncementRepository::destroy()

    // Deleting a parent also force-deletes its department clones.
    /** @test */
    public function deleting_a_parent_announcement_force_deletes_its_department_clones()
    {
        $child  = $this->announcements->store($this->payload([
            'set_all'             => 0,
            'selectedDepartments' => [$this->user->department_id],
        ]));
        $rootId = $child->announcement_id;
        $this->assertSame(1, Announcement::where('announcement_id', $rootId)->count());

        $this->announcements->destroy($rootId);

        $this->assertNull(Announcement::find($rootId));
        $this->assertSame(0, Announcement::where('announcement_id', $rootId)->count());
    }

    // A failure during the delete rolls back and re-throws, leaving the announcement in place.
    /** @test */
    public function a_failure_during_destroy_rolls_back_and_leaves_the_announcement_in_place()
    {
        $root = $this->announcements->store($this->payload());
        $this->makeLoggerThrow('destroy blew up');

        try {
            $this->announcements->destroy($root->id);
            $this->fail('destroy() must re-throw after rolling back');
        } catch (\Exception $e) {
            $this->assertSame('destroy blew up', $e->getMessage());
        }

        $this->assertNotNull(Announcement::find($root->id));
    }

    // ========================================================= DepartmentRepository::find()

    /** @test */
    public function finding_a_department_returns_it_and_an_unknown_id_returns_null()
    {
        $existing = EvoxDepartment::orderBy('Id')->first();
        if (!$existing) {
            $this->markTestSkipped('no department rows in test DB');
        }

        $found = $this->departments->find($existing->id);

        $this->assertNotNull($found);
        $this->assertEquals($existing->id, $found->id);
        $this->assertNull($this->departments->find(999999999));
    }

    // ============================================ DepartmentRepository::destroy_department()

    // Disabling a department is a soft delete that also records WHO disabled it and WHEN — the
    // audit stamp is the part a plain soft delete would lose.
    /** @test */
    public function disabling_a_department_soft_deletes_it_and_stamps_who_disabled_it()
    {
        $department = Department::create([
            'department_name' => 'RG-DISABLE-' . uniqid('', true),
            'description'     => 'repository gap fixture (rolled back by DatabaseTransactions)',
        ]);

        $this->assertTrue($this->departments->destroy_department($department->id));

        $this->assertNull(Department::find($department->id));            // soft-deleted
        $row = Department::withTrashed()->find($department->id);
        $this->assertNotNull($row);
        $this->assertNotNull($row->deleted_at);
        $this->assertEquals($this->user->id, $row->disabled_by);
        $this->assertNotNull($row->disabled_on);
    }

    // ================================== Announcement::announcement_clones_departments()

    // The include and exclude views are exact complements: the departments an announcement was
    // cloned into, and every other department.
    /** @test */
    public function the_clone_department_views_are_exact_complements_of_each_other()
    {
        $departmentIds = EvoxDepartment::orderBy('Id')->pluck('id');
        if ($departmentIds->count() < 2) {
            $this->markTestSkipped('need at least 2 departments in test DB');
        }
        $selected = $departmentIds->take(2);

        $child = $this->announcements->store($this->payload([
            'set_all'             => 0,
            'selectedDepartments' => $selected->all(),
        ]));
        $root = Announcement::find($child->announcement_id);

        $included = $root->announcement_clones_departments()->pluck('id');
        $excluded = $root->announcement_clones_departments(false)->pluck('id');

        $this->assertEqualsCanonicalizing($selected->all(), $included->all());
        $this->assertEmpty(array_intersect($included->all(), $excluded->all()));
        $this->assertSame($departmentIds->count(), $included->count() + $excluded->count());
    }
}
