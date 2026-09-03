<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\Department\Repositories\AnnouncementRepository;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;

/**
 * =====================================================================================================
 *  SOURCE FILE UNDER TEST
 *      app/Modules/Department/Repositories/AnnouncementRepository.php :: show_strict  (lines 256-283,
 *      the dashboard-membership block, never executed before this file)
 *
 *  MENU PATH
 *      Dashboard -> Announcements -> open one          (GET /api/announcement/strict/{id})
 *      HR -> Department Announcements -> open one      (same repository method)
 *
 *  WHAT show_strict DECIDES
 *      Whether the signed-in employee is allowed to read one specific announcement. The fast gate on
 *      lines 249-252 answers yes for anything global or for their own department in their own country
 *      (AnnouncementRepositoryLiveTest covers that arm for a set_all=1 row). Everything else falls to
 *      the block on lines 256-283, which asks a second question: does this announcement appear in the
 *      list the employee's own dashboard would render? If yes it is readable after all; if no, the
 *      method drops through to the department-scoped lookup on line 284 and answers null.
 *
 *  WHY WAVE 2 SKIPPED IT
 *      The block is only reachable with a four-way fixture — a CLONE row that the caller's
 *      $main_dep_id lookup finds, which nevertheless fails the fast gate. The two ways to build that
 *      are the only two arms of the block, and both are here:
 *        - the caller sits in a SUB-department, so $main_dep_id (their sub-department's parent) is not
 *          their users.department_id; the clone matches the former and so fails the gate's
 *          `present_dep_id == department_id` test, but IS in the dashboard list -> readable;
 *        - the caller sits directly in a department, the clone matches it, but the clone is published
 *          to a DIFFERENT country; it fails the gate on the country test and is excluded from the
 *          dashboard list by the same country filter -> not readable.
 *      Every announcement row is created here, inside the suite's transaction, so no live row decides
 *      the outcome. The employees are probed (bounded, indexed) because users cannot be created.
 *
 *  FINDINGS RAISED HERE
 *      ANN-STRICT-EXCLUDE-1  (documented, not tested — the state it changes is not reachable through
 *          the UI) line 258 builds the exclusion list with
 *          `Announcement::where('announcement_id','!=',null)->pluck('announcement_id')`. In SQL
 *          `announcement_id != NULL` is never true, so $toExclude is ALWAYS an empty array and the
 *          `whereNotIn('id', $toExclude)` on line 270 excludes nothing. The intent was whereNotNull,
 *          i.e. "keep parent rows that already have clones out of the department list". Today the
 *          filter is inert. Reaching a case where the difference is observable through show_strict
 *          needs a clone OF a clone, which store() never creates, so it is documented rather than
 *          tested by fabricating a row the app cannot produce.
 *      ANN-STRICT-LISTALL-DEAD-1  (documented, not tested) lines 273-278 re-check membership of
 *          $list_all for callers with no sub-department. That query selects `set_all = 1` rows passing
 *          the country filter — which is precisely the fast gate on lines 249-250. Anything the block
 *          could find there has already returned on line 251, so the early return on line 276 is
 *          unreachable for every set_country_all value the UI can store (store()/update() write
 *          `$request->set_country_all == 1 ? 1 : 0`). It is dead code, not a bug.
 * =====================================================================================================
 */
class AnnouncementStrictVisibilityTest extends TestCase
{
    use DatabaseTransactions;

    /** @var AnnouncementRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new AnnouncementRepository();
    }

    /**
     * An employee whose sub-department belongs to a DIFFERENT department than users.department_id
     * (or who has no department_id at all). For them show_strict()'s $main_dep_id is not
     * $logged_user->department_id, which is what lets a clone fail the gate and still be listed.
     *
     * Two bounded queries: one indexed page of users, one whereIn over the sub-department lookup.
     */
    private function subDepartmentCaller()
    {
        $users = User::where('is_active', 1)
            ->whereNotNull('SubDepartmentID')
            ->whereNotNull('country_id')
            ->orderBy('id', 'desc')->limit(100)->get()
            ->filter(function ($user) {
                return is_valid($user->SubDepartmentID);
            });
        if ($users->isEmpty()) {
            return [null, null];
        }

        $subs = EvoxSubDepartment::whereIn('Id', $users->pluck('SubDepartmentID')->unique()->all())
            ->get()->keyBy('Id');

        foreach ($users as $user) {
            $sub = $subs->get($user->SubDepartmentID);
            if (!$sub || !is_valid($sub->DepartmentId)) {
                continue;
            }
            if ($user->department_id === null || (int) $sub->DepartmentId !== (int) $user->department_id) {
                return [$user, (int) $sub->DepartmentId];
            }
        }

        return [null, null];
    }

    /**
     * An employee attached straight to a department and to no sub-department, so $main_dep_id IS
     * their users.department_id. The department must really exist: line 284 dereferences it.
     */
    private function departmentCaller()
    {
        $users = User::where('is_active', 1)
            ->whereNull('SubDepartmentID')
            ->whereNotNull('department_id')
            ->whereNotNull('country_id')
            ->orderBy('id', 'desc')->limit(50)->get();

        foreach ($users as $user) {
            if (EvoxDepartment::find($user->department_id)) {
                return $user;
            }
        }

        return null;
    }

    /** A country id that is configured and is NOT the caller's. */
    private function otherCountryId($countryId)
    {
        $zone = UtcTimelog::whereNotNull('country_id')
            ->where('country_id', '!=', $countryId)->orderBy('country_id')->first();

        return $zone ? $zone->country_id : null;
    }

    /**
     * The announcement row the UI writes, with the parts each test varies passed in.
     * Uses DB::table()->insertGetId() instead of Announcement::create() because 'title' is not in
     * Announcement::$fillable, which throws MassAssignmentException. Returns a plain object with
     * an 'id' property — callers only need ->id (for assertions and clone linking).
     */
    private function announcement(User $author, array $overrides)
    {
        $id = DB::table('announcements')->insertGetId(array_merge([
            'title'           => 'strict visibility fixture',
            'category'        => 'Department',
            'content'         => '<p>fixture body</p>',
            'headline'        => 'fixture headline',
            'release_date'    => '1990-01-15',
            'expiry_date'     => '1990-12-31',
            'on_link'         => 0,
            'link'            => null,
            'status'          => 1,
            'country_id'      => $author->country_id,
            'dep_id'          => null,
            'present_dep_id'  => null,
            'announcement_id' => null,
            'set_all'         => 0,
            'set_exclude'     => 0,
            'set_country_all' => 0,
            'thumbnail'       => null,
            'created_by'      => $author->id,
            'updated_by'      => $author->id,
            'created_at'      => now(),
            'updated_at'      => now(),
        ], $overrides));
        return (object) ['id' => $id];
    }

    /**
     * @test
     * BUSINESS RULE — an employee who sits in a SUB-department may read an announcement published to
     * the parent department. The fast gate rejects it (the clone is filed under the parent department
     * id, not under the employee's own users.department_id), so readability is decided by the second
     * question: the announcement is on the employee's dashboard, therefore they may open it. What
     * comes back is the CLONE — the row carrying that department's copy — never the parent.
     */
    public function an_employee_may_open_an_announcement_published_to_their_sub_departments_parent()
    {
        list($caller, $parentDepartmentId) = $this->subDepartmentCaller();
        if (!$caller) {
            $this->markTestSkipped(
                'no active employee whose sub-department resolves to a department other than their own '
                . 'users.department_id — the gate cannot be failed on the department test'
            );
        }
        $this->be($caller);

        $root  = $this->announcement($caller, ['set_country_all' => 1]);
        $clone = $this->announcement($caller, [
            'announcement_id' => $root->id,
            'present_dep_id'  => $parentDepartmentId,
            'set_country_all' => 1,
        ]);

        $result = $this->repo->show_strict($root->id);

        $this->assertNotNull($result, 'the announcement on the employee\'s own dashboard was refused');
        $this->assertSame($clone->id, $result->id);
        $this->assertNotSame($root->id, $result->id);
        $this->assertSame($parentDepartmentId, (int) $result->present_dep_id);
    }

    /**
     * @test
     * BUSINESS RULE — the other arm, and the one that matters for confidentiality: an announcement
     * filed under the employee's OWN department but published to a different country is refused.
     * It fails the fast gate on the country test and the same country filter keeps it off their
     * dashboard, so the second question answers no too and show_strict returns nothing.
     */
    public function an_employee_may_not_open_their_departments_announcement_that_belongs_to_another_country()
    {
        $caller = $this->departmentCaller();
        if (!$caller) $this->markTestSkipped('no active employee attached to a resolvable department and no sub-department');
        $foreignCountry = $this->otherCountryId($caller->country_id);
        if (!$foreignCountry) $this->markTestSkipped('only one country is configured — no foreign audience to publish to');
        $this->be($caller);

        $root = $this->announcement($caller, ['set_country_all' => 1]);
        $this->announcement($caller, [
            'announcement_id' => $root->id,
            'present_dep_id'  => $caller->department_id,
            'country_id'      => $foreignCountry,
            'set_country_all' => 0,
        ]);

        $this->assertNull($this->repo->show_strict($root->id));
    }

    /**
     * @test
     * BUSINESS RULE — the control for the test above: the SAME fixture with the clone published to the
     * employee's own country is readable. One field decides it, which is what makes the refusal above
     * a country rule rather than an accident of the fixture.
     */
    public function the_same_departmental_announcement_is_readable_when_it_is_published_to_the_employees_own_country()
    {
        $caller = $this->departmentCaller();
        if (!$caller) $this->markTestSkipped('no active employee attached to a resolvable department and no sub-department');
        $this->be($caller);

        $root  = $this->announcement($caller, ['set_country_all' => 1]);
        $clone = $this->announcement($caller, [
            'announcement_id' => $root->id,
            'present_dep_id'  => $caller->department_id,
            'country_id'      => $caller->country_id,
            'set_country_all' => 0,
        ]);

        $result = $this->repo->show_strict($root->id);

        $this->assertNotNull($result);
        $this->assertSame($clone->id, $result->id);
    }

    /**
     * @test
     * BUSINESS RULE — an announcement that was never cloned to the caller's department is refused
     * outright: the clone lookup finds nothing, both blocks are skipped, and the department-scoped
     * lookup on line 284 has nothing to offer either.
     */
    public function an_announcement_never_cloned_to_the_callers_department_is_refused()
    {
        $caller = $this->departmentCaller();
        if (!$caller) $this->markTestSkipped('no active employee attached to a resolvable department and no sub-department');
        $this->be($caller);

        // a root marked set_all = 0 with NO clone row at all
        $root = $this->announcement($caller, ['set_country_all' => 1]);

        $this->assertNull($this->repo->show_strict($root->id));
    }
}
