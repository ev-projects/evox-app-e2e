<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Carbon\Carbon;
use Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\DepartmentOnSchedule;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\Department\Resources\AnnouncementResource;
use App\Modules\Department\Resources\AnnouncementStrictResource;
use App\Modules\Department\Resources\DepartmentListResource;
use App\Modules\Department\Resources\DepartmentResource;
use App\Modules\User\Models\User;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST
 *      app/Modules/Department/Resources/DepartmentListResource.php     :: toArray
 *      app/Modules/Department/Resources/DepartmentResource.php         :: toArray
 *      app/Modules/Department/Resources/AnnouncementResource.php       :: toArray
 *      app/Modules/Department/Resources/AnnouncementStrictResource.php :: toArray
 *
 *  MENU PATH
 *      Admin         -> Departments                 (list, view, assign handlers)
 *      Announcements -> Announcements               (AnnouncementResource)
 *      HR            -> Department Announcements    (AnnouncementStrictResource — the clone rows)
 *
 *  COVERAGE AT THE TIME OF WRITING
 *      DepartmentListResource::toArray      85.71%
 *      DepartmentResource::toArray          53.85%
 *      AnnouncementResource::toArray        91.53%
 *      AnnouncementStrictResource::toArray  95.00%
 *
 *  FINDINGS RAISED HERE
 *      DEPT-RES-NOREL-1   DepartmentResource calls `$this->department_user_handlers()`, which exists on
 *                         NO model in app/ (the department models expose `department_supervisors()`;
 *                         `department_user_handlers()` belonged to the removed Client model). The
 *                         repository feeds it an EvoxDepartment, so viewing a department or assigning
 *                         its handlers raises BadMethodCallException every single time.
 *      DEPT-LIST-DESC-1   DepartmentListResource emits a `description` key that is always null: the
 *                         repository's select list has no such column.
 *      ANN-CREATOR-TYPO-1 AnnouncementResource reads `$user->departmSubDepartmentIDent_id` — a mangled
 *                         identifier that no model carries — so the creator's department is always
 *                         null. The sibling AnnouncementStrictResource reads `$user->SubDepartmentID`
 *                         and resolves it correctly.
 *      ANN-NULL-DEAD-1    Both announcement resources parse `$this->release_date` BEFORE their
 *                         `is_null($this->resource)` guard, so the guard is unreachable and a null row
 *                         is fatal rather than skipped.
 *      ANN-CREATEDAT-FMT-1 `created_at` is emitted with the format 'Y-m-d h:m:s'. In PHP 'm' is the
 *                         MONTH, so every announcement's timestamp shows the month where the minutes
 *                         belong and the real minutes are never rendered.
 * =====================================================================================================
 *
 *  METHOD. Every row is a REAL row probed with a bounded, indexed query; branch flags (set_all,
 *  set_exclude, dep_id, created_by, expiry_date …) are steered by assigning to the in-memory model.
 *  NOTHING IS EVER SAVED — no create, no update, no delete anywhere in this file. DatabaseTransactions
 *  is carried as belt and braces on top of that.
 */
class DepartmentAndAnnouncementResourceContractsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var Request */
    private $request;

    protected function setUp(): void
    {
        parent::setUp();
        $this->request = Request::create('/api/probe', 'GET');
    }

    /** A department exactly as DepartmentRepository::all() selects it (aliased Id/Name). */
    private function listedDepartment()
    {
        return EvoxDepartment::select([
                'Id AS id',
                'Name AS department_name',
                'HeadId',
                'isActive',
                'CreatedOn AS created_at',
                'UpdatedOn AS updated_at',
                'CreatedBy',
                'LevelId',
            ])->orderBy('Name', 'asc')->first();
    }

    /** The newest announcement, with a creator that still resolves. */
    private function probeAnnouncement()
    {
        return Announcement::orderBy('id', 'desc')->first();
    }

    private function activeUser()
    {
        return User::where('is_active', 1)->orderBy('id', 'desc')->first();
    }

    /**
     * The department ids cloned from an announcement, read with the SAME predicate
     * Announcement::announcement_clones_departments() uses, so the expected include/exclude sets are
     * derived from the rule rather than from the resource under test.
     */
    private function clonedDepartmentIds($announcementId): array
    {
        return Announcement::where('announcement_id', $announcementId)
            ->pluck('present_dep_id')->toArray();
    }

    private function includedDepartmentCount($announcementId): int
    {
        return EvoxDepartment::whereIn('Id', $this->clonedDepartmentIds($announcementId))->count();
    }

    private function excludedDepartmentCount($announcementId): int
    {
        return EvoxDepartment::whereNotIn('Id', $this->clonedDepartmentIds($announcementId))->count();
    }

    // =================================================================================================
    //  DepartmentListResource — Admin -> Departments (the list)
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — the department picker shows a name and, per department, whether scheduling is
     * switched on for it; that flag is what hides the Schedule tab for departments that do not use it.
     * FINDING DEPT-LIST-DESC-1 is pinned in the same pass: `description` is always null.
     */
    public function a_listed_department_carries_its_name_and_its_scheduling_switch()
    {
        $department = $this->listedDepartment();
        if (!$department) $this->markTestSkipped('no EVOX_DEPARTMENT row in test DB');

        $onSchedule = DepartmentOnSchedule::where('department_id', $department->id)->first();
        $expectedFlag = $onSchedule ? ($onSchedule->is_active == true) : false;

        $out = (new DepartmentListResource($department))->toArray($this->request);

        $this->assertSame($department->id, $out['id']);
        $this->assertSame($department->department_name, $out['department_name']);
        $this->assertSame($expectedFlag, $out['schedule_active']);
        // FINDING DEPT-LIST-DESC-1 — the key is emitted but the source select never provides it
        $this->assertNull($out['description']);
        $this->assertSame(['id', 'department_name', 'description', 'schedule_active'], array_keys($out));
    }

    /**
     * @test
     * BUSINESS RULE — the guard arm: a null entry in the department list serialises as null, so a
     * department that vanished between the query and the render does not blank the whole picker.
     */
    public function a_null_listed_department_serialises_as_null()
    {
        $this->assertNull((new DepartmentListResource(null))->toArray($this->request));
    }

    // =================================================================================================
    //  DepartmentResource — Admin -> Departments (view / assign handlers)
    // =================================================================================================

    /**
     * @test
     * FINDING DEPT-RES-NOREL-1 (characterisation).
     *
     * `department_user_handlers()` is defined on no model in the codebase. DepartmentController::find()
     * and ::assign_handlers() both wrap a department in this resource, so BOTH endpoints raise
     * BadMethodCallException the moment the response is serialised — the department detail screen and
     * the handler assignment confirmation cannot ever have worked with this model. Assert the failure
     * that happens TODAY; when the call is corrected to `department_supervisors()` this test fails and
     * becomes the shape assertion.
     */
    public function viewing_a_department_raises_a_missing_relation_error_FINDING_DEPT_RES_NOREL_1()
    {
        $department = EvoxDepartment::orderBy('Id', 'desc')->first();
        if (!$department) $this->markTestSkipped('no EVOX_DEPARTMENT row in test DB');

        $this->expectException(\BadMethodCallException::class);

        (new DepartmentResource($department))->toArray($this->request);
    }

    /**
     * @test
     * BUSINESS RULE — the guard arm still works: the controller relies on a not-found department
     * serialising as null (that is the arm submit.DepartmentBranchTest drives for its 200), and it is
     * the only path through this resource that does not fault.
     */
    public function a_null_department_serialises_as_null()
    {
        $this->assertNull((new DepartmentResource(null))->toArray($this->request));
    }

    // =================================================================================================
    //  AnnouncementResource — Announcements -> Announcements
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — an announcement targeted at ONE department lists exactly the departments cloned
     * from it, resolves that department for the "posted to" label, flags itself as new for three days
     * after its release date, and reports expiry against the stored expiry date.
     */
    public function a_department_targeted_announcement_lists_its_target_and_is_new_for_three_days()
    {
        $announcement = $this->probeAnnouncement();
        $department   = EvoxDepartment::orderBy('Id', 'desc')->first();
        $user         = $this->activeUser();
        if (!$announcement || !$department || !$user) {
            $this->markTestSkipped('need an announcement, a department and an active user in test DB');
        }

        $announcement->created_by      = $user->id;
        $announcement->set_all         = 0;
        $announcement->set_exclude     = 0;
        $announcement->dep_id          = $department->Id;
        $announcement->present_dep_id  = null;
        $announcement->announcement_id = null;
        $announcement->thumbnail       = null;
        $announcement->content         = '<p>Town hall on Friday</p>';
        $announcement->release_date    = Carbon::now()->subDay()->format('Y-m-d');
        $announcement->expiry_date     = Carbon::now()->addDays(30)->format('Y-m-d');

        $out = (new AnnouncementResource($announcement))->toArray($this->request);

        $this->assertSame($announcement->id, $out['id']);
        $this->assertSame('<p>Town hall on Friday</p>', $out['content']);
        $this->assertNull($out['thumbnail']);
        $this->assertSame(0, $out['set_all']);
        $this->assertSame('0', $out['set_exclude']);            // cast to string for the front end
        $this->assertTrue($out['is_new']);                      // released yesterday
        $this->assertFalse($out['is_expired']);                 // expires in 30 days
        $this->assertNotNull($out['dep']);                      // the targeted department is resolved
        $this->assertSame($department->Id, $out['dep']->id);
        $this->assertCount($this->includedDepartmentCount($announcement->id), $out['selectedDepartments']);
        $this->assertSame($user->id, $out['creator']['id']);
        $this->assertSame($user->getFullName(), $out['creator']['full_name']);

        // FINDING ANN-CREATEDAT-FMT-1 — the stamp is formatted 'Y-m-d h:m:s': 'm' is MONTH, so the
        // minutes slot of every announcement carries the month and the real minutes are never shown.
        $this->assertRegExp('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $out['created_at']);
        $clock = explode(':', explode(' ', $out['created_at'])[1]);
        $this->assertSame($announcement->created_at->format('m'), $clock[1]);
        $this->assertSame($announcement->created_at->format('h'), $clock[0]);
        $this->assertSame($announcement->created_at->format('s'), $clock[2]);
    }

    /**
     * @test
     * BUSINESS RULE — a CLONE row (one department's copy of a group announcement) resolves its
     * department list and its "posted to" label from the PARENT announcement and the present
     * department, not from its own dep_id, which clones do not carry.
     */
    public function a_cloned_announcement_resolves_its_target_list_from_the_parent_announcement()
    {
        $announcement = $this->probeAnnouncement();
        $department   = EvoxDepartment::orderBy('Id', 'desc')->first();
        if (!$announcement || !$department) {
            $this->markTestSkipped('need an announcement and a department in test DB');
        }

        $announcement->created_by      = 0;                       // system authored: no creator block
        $announcement->set_all         = 0;
        $announcement->set_exclude     = 0;
        $announcement->dep_id          = null;
        $announcement->present_dep_id  = $department->Id;
        $announcement->announcement_id = $announcement->id;
        $announcement->release_date    = Carbon::now()->subDays(30)->format('Y-m-d');
        $announcement->expiry_date     = Carbon::now()->subDay()->format('Y-m-d');

        $out = (new AnnouncementResource($announcement))->toArray($this->request);

        $this->assertSame($department->Id, $out['dep']->id);      // resolved from present_dep_id
        $this->assertNotNull($out['selectedDepartments']);
        $this->assertSame([], $out['creator']);                   // created_by 0 -> no owner block
        $this->assertFalse($out['is_new']);                       // released a month ago
        $this->assertTrue($out['is_expired']);                    // expired yesterday
    }

    /**
     * @test
     * BUSINESS RULE — the EXCLUDE arms. When an announcement is published to everyone EXCEPT a set of
     * departments, the selected list must be the complement (every department NOT cloned), for both
     * the parent row (dep_id) and the clone row (announcement_id).
     */
    public function an_exclusion_announcement_lists_the_complement_of_its_cloned_departments()
    {
        $announcement = $this->probeAnnouncement();
        $department   = EvoxDepartment::orderBy('Id', 'desc')->first();
        if (!$announcement || !$department) {
            $this->markTestSkipped('need an announcement and a department in test DB');
        }

        $expectedComplement = $this->excludedDepartmentCount($announcement->id);

        // ---- clone row, exclusion set
        $announcement->created_by      = 0;
        $announcement->set_all         = 0;
        $announcement->set_exclude     = 1;
        $announcement->dep_id          = null;
        $announcement->present_dep_id  = $department->Id;
        $announcement->announcement_id = $announcement->id;

        $cloneOut = (new AnnouncementResource($announcement))->toArray($this->request);

        $this->assertSame('1', $cloneOut['set_exclude']);
        $this->assertCount($expectedComplement, $cloneOut['selectedDepartments']);

        // ---- parent row, exclusion set (dep_id arm of the same branch)
        $announcement->dep_id          = $department->Id;
        $announcement->present_dep_id  = null;
        $announcement->announcement_id = null;

        $parentOut = (new AnnouncementResource($announcement))->toArray($this->request);

        $this->assertCount($expectedComplement, $parentOut['selectedDepartments']);
        $this->assertSame($department->Id, $parentOut['dep']->id);
    }

    /**
     * @test
     * BUSINESS RULE — an announcement saved from an empty editor stores the literal string "null" or
     * "<p>null</p>"; the screen must show an EMPTY body for those, never the word "null". A stored
     * thumbnail is published as a full asset URL.
     */
    public function a_placeholder_body_renders_empty_and_a_stored_thumbnail_becomes_an_asset_url()
    {
        $announcement = $this->probeAnnouncement();
        if (!$announcement) $this->markTestSkipped('no announcement row in test DB');

        $announcement->created_by      = 0;
        $announcement->set_all         = 1;                  // no department list on this arm
        $announcement->set_exclude     = 0;
        $announcement->dep_id          = null;
        $announcement->present_dep_id  = null;
        $announcement->announcement_id = null;
        $announcement->thumbnail       = 'announcements/banner.png';

        $announcement->content = '<p>null</p>';
        $paragraph = (new AnnouncementResource($announcement))->toArray($this->request);
        $this->assertSame('', $paragraph['content']);

        $announcement->content = 'null';
        $bare = (new AnnouncementResource($announcement))->toArray($this->request);
        $this->assertSame('', $bare['content']);

        $this->assertStringContainsString('announcements/banner.png', $bare['thumbnail']);
        $this->assertStringContainsString('/storage/', $bare['thumbnail']);
        $this->assertSame([], $bare['selectedDepartments']);   // set_all = 1 -> no per-department list
    }

    /**
     * @test
     * FINDING ANN-CREATOR-TYPO-1 (characterisation).
     *
     * The creator block reads `$user->departmSubDepartmentIDent_id`, an identifier produced by an
     * accidental paste. No model carries it, Eloquent returns null for unknown attributes, so
     * `is_valid(null)` is false and the creator's department is ALWAYS null on the Announcements
     * screen — even for an author who does have a sub-department. The strict sibling reads
     * `$user->SubDepartmentID` and gets it right, which is the comparison asserted here.
     */
    public function the_announcement_creator_department_is_always_null_FINDING_ANN_CREATOR_TYPO_1()
    {
        $announcement = $this->probeAnnouncement();
        $sub  = EvoxSubDepartment::orderBy('Id', 'desc')->first();
        $user = $sub ? User::where('SubDepartmentID', $sub->Id)->where('is_active', 1)
                            ->orderBy('id', 'desc')->first() : null;
        if (!$announcement || !$user) {
            $this->markTestSkipped('need an announcement and a user attached to a sub-department');
        }

        $announcement->created_by      = $user->id;
        $announcement->set_all         = 1;
        $announcement->set_exclude     = 0;
        $announcement->dep_id          = null;
        $announcement->present_dep_id  = null;
        $announcement->announcement_id = null;

        $loose  = (new AnnouncementResource($announcement))->toArray($this->request);
        $strict = (new AnnouncementStrictResource($announcement))->toArray($this->request);

        // same author, same row — one resource resolves the department, the other cannot
        $this->assertSame($user->id, $loose['creator']['id']);
        $this->assertNull($loose['creator']['department']);
        $this->assertSame($sub->Name, $strict['creator']['department']);
    }

    // =================================================================================================
    //  AnnouncementStrictResource — HR -> Department Announcements
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — the strict resource is what the HR screen reads, and it must report a clone
     * under the PARENT announcement's id: HR acts on the original, so the id it hands back has to be
     * the one the update/delete endpoints accept.
     */
    public function a_cloned_announcement_reports_the_parent_id_and_a_standalone_reports_its_own()
    {
        $announcement = $this->probeAnnouncement();
        if (!$announcement) $this->markTestSkipped('no announcement row in test DB');

        $announcement->created_by      = 0;
        $announcement->set_all         = 1;
        $announcement->set_exclude     = 0;
        $announcement->dep_id          = null;
        $announcement->present_dep_id  = null;
        $announcement->thumbnail       = null;
        $announcement->content         = '<p>Payroll cut-off moved</p>';
        $announcement->release_date    = Carbon::now()->subDay()->format('Y-m-d');
        $announcement->expiry_date     = Carbon::now()->addDays(10)->format('Y-m-d');

        $announcement->announcement_id = null;
        $standalone = (new AnnouncementStrictResource($announcement))->toArray($this->request);
        $this->assertSame($announcement->id, $standalone['id']);
        $this->assertSame('<p>Payroll cut-off moved</p>', $standalone['content']);   // never blanked
        $this->assertTrue($standalone['is_new']);
        $this->assertFalse($standalone['is_expired']);
        $this->assertSame([], $standalone['creator']);

        $announcement->announcement_id = 987654321;
        $clone = (new AnnouncementStrictResource($announcement))->toArray($this->request);
        $this->assertSame(987654321, $clone['id']);
    }

    /**
     * @test
     * BUSINESS RULE — an author with no sub-department must still appear as the creator, with a null
     * department, rather than taking the screen down. This is the other arm of the strict resource's
     * department lookup.
     */
    public function an_author_without_a_sub_department_is_still_named_as_the_creator()
    {
        $announcement = $this->probeAnnouncement();
        $user = User::whereNull('SubDepartmentID')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$announcement || !$user) {
            $this->markTestSkipped('need an announcement and an active user with no sub-department');
        }

        $announcement->created_by      = $user->id;
        $announcement->set_all         = 1;
        $announcement->set_exclude     = 0;
        $announcement->dep_id          = null;
        $announcement->present_dep_id  = null;
        $announcement->announcement_id = null;

        $out = (new AnnouncementStrictResource($announcement))->toArray($this->request);

        $this->assertSame($user->id, $out['creator']['id']);
        $this->assertNull($out['creator']['department']);
        $this->assertSame($user->email, $out['creator']['email']);
    }

    /**
     * @test
     * BUSINESS RULE — the strict resource's exclusion arms, driven on the clone and on the parent, so
     * the HR screen's "everyone except" list is the complement of the cloned departments.
     */
    public function the_strict_resource_lists_the_complement_for_an_exclusion_announcement()
    {
        $announcement = $this->probeAnnouncement();
        $department   = EvoxDepartment::orderBy('Id', 'desc')->first();
        if (!$announcement || !$department) {
            $this->markTestSkipped('need an announcement and a department in test DB');
        }

        $expectedComplement = $this->excludedDepartmentCount($announcement->id);

        $announcement->created_by      = 0;
        $announcement->set_all         = 0;
        $announcement->set_exclude     = 1;
        $announcement->dep_id          = null;
        $announcement->present_dep_id  = $department->Id;
        $announcement->announcement_id = $announcement->id;

        $clone = (new AnnouncementStrictResource($announcement))->toArray($this->request);
        $this->assertCount($expectedComplement, $clone['selectedDepartments']);
        $this->assertSame($department->Id, $clone['dep']->id);

        $announcement->dep_id          = $department->Id;
        $announcement->present_dep_id  = null;
        $announcement->announcement_id = null;

        $parent = (new AnnouncementStrictResource($announcement))->toArray($this->request);
        $this->assertCount($expectedComplement, $parent['selectedDepartments']);
    }

    /**
     * @test
     * BUSINESS RULE — the inclusion arms of the strict resource: a parent row scoped to one department
     * and a clone row scoped through its parent both produce the cloned-department list.
     */
    public function the_strict_resource_lists_the_cloned_departments_for_an_inclusion_announcement()
    {
        $announcement = $this->probeAnnouncement();
        $department   = EvoxDepartment::orderBy('Id', 'desc')->first();
        if (!$announcement || !$department) {
            $this->markTestSkipped('need an announcement and a department in test DB');
        }

        $expectedIncluded = $this->includedDepartmentCount($announcement->id);

        $announcement->created_by      = 0;
        $announcement->set_all         = 0;
        $announcement->set_exclude     = 0;
        $announcement->dep_id          = $department->Id;
        $announcement->present_dep_id  = null;
        $announcement->announcement_id = null;

        $parent = (new AnnouncementStrictResource($announcement))->toArray($this->request);
        $this->assertCount($expectedIncluded, $parent['selectedDepartments']);

        $announcement->dep_id          = null;
        $announcement->present_dep_id  = $department->Id;
        $announcement->announcement_id = $announcement->id;

        $clone = (new AnnouncementStrictResource($announcement))->toArray($this->request);
        $this->assertCount($expectedIncluded, $clone['selectedDepartments']);
    }

    // =================================================================================================
    //  The dead null guard shared by both announcement resources
    // =================================================================================================

    /**
     * @test
     * FINDING ANN-NULL-DEAD-1 (characterisation).
     *
     * Both resources call `Carbon::parse($this->release_date)` on their very first line, above the
     * `if (! is_null($this->resource))` guard. Reading an attribute off a null resource is fatal, so
     * the guard can never run: a null entry inside an announcement collection takes the whole
     * Announcements screen down instead of being skipped. Flip both assertions to assertNull() once
     * the guard is moved to the top.
     */
    public function a_null_announcement_is_fatal_in_both_resources_FINDING_ANN_NULL_DEAD_1()
    {
        // Narrowed from any-\Throwable: the failure must be the property read on the null resource
        // (PHP raises it as a notice on 7.4 / a warning on 8.x; PHPUnit converts both into
        // PHPUnit\Framework\Error\Error subclasses under convertNoticesToExceptions). Accepting any
        // throwable would let an unrelated fault keep this characterisation green.
        $loose = null;
        try {
            (new AnnouncementResource(null))->toArray($this->request);
        } catch (\Throwable $e) {
            $loose = $e;
        }
        $this->assertNotNull($loose, 'AnnouncementResource null guard is reachable again — flip this test');
        $this->assertInstanceOf(\PHPUnit\Framework\Error\Error::class, $loose);
        $this->assertStringContainsString('release_date', $loose->getMessage());

        $strict = null;
        try {
            (new AnnouncementStrictResource(null))->toArray($this->request);
        } catch (\Throwable $e) {
            $strict = $e;
        }
        $this->assertNotNull($strict, 'AnnouncementStrictResource null guard is reachable again — flip this test');
        $this->assertInstanceOf(\PHPUnit\Framework\Error\Error::class, $strict);
        $this->assertStringContainsString('release_date', $strict->getMessage());
    }
}
