<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Fluent;
use App\EvoxLevels;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Repositories\AnnouncementRepository;
use App\Modules\User\Models\User;

/**
 * REAL AnnouncementRepository (Menu=Dashboard/Admin Page=Department Announcements).
 * File was 31.1% covered (217 uncovered lines) — controller tests mock it. NO stored procedures
 * anywhere (verified: zero call_sp). All writes (store children, update's forceDelete+recreate,
 * destroy) roll back under DatabaseTransactions. Thumbnails stay null in every payload so the
 * filesystem is never touched.
 *
 * index() filters come from the request() GLOBAL -> driven via request()->merge().
 *
 * FINDING ANN-NULL-1 (documented, not executed): two undefined-variable fatals live here —
 * show_hr_strict() returns $dep_announcement that is never set for non-HR users, and
 * dashboard_index()/increment_dashboard_index() use $announcements_list at the tail without it
 * being set when dep_id is a non-numeric non-"all" string. Both blow up as ErrorException in
 * debug / notice in prod. Tests below only exercise the defined arms.
 */
class AnnouncementRepositoryLiveTest extends TestCase
{
    use DatabaseTransactions;

    /** @var AnnouncementRepository */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new AnnouncementRepository();

        // no SubDepartmentID -> the main_dep_id=0 / no-direct-department arms are deterministic
        $this->user = User::where('is_active', 1)
            ->whereNull('SubDepartmentID')
            ->whereNotNull('country_id')
            ->orderBy('id', 'desc')->first()
            ?: User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user in test DB');
        $this->be($this->user);
    }

    private function storePayload(array $overrides = [])
    {
        return new Fluent(array_merge([
            'title'               => 'Live Test Announcement',
            'category'            => 'Department',
            'content'             => '<p>live body</p>',
            'headline'            => 'live headline',
            'release_date'        => '2026-07-01',
            'expiry_date'         => '2026-12-31',
            'on_link'             => 0,
            'link'                => null,
            'status'              => 1,
            'country_id'          => null,           // falls back to Auth::user()->country_id arm
            'set_all'             => 1,
            'set_exclude'         => 0,
            'set_country_all'     => 1,
            'selectedDepartments' => null,
            'thumbnail'           => null,           // never touch the filesystem
        ], $overrides));
    }

    // ------------------------------------------------------------------------ index()
    /** @test */
    public function index_department_filter_with_title_status_and_order()
    {
        request()->merge([
            'department_id'      => $this->user->department_id ?: 1,
            'announcement_title' => 'a',
            'status'             => 'ongoing',
            'order_by'           => 'announcement_title:asc',
        ]);
        $page = $this->repo->index();
        $this->assertNotNull($page);

        request()->merge(['status' => 'expired', 'order_by' => 'created_at:desc']);
        $this->assertNotNull($this->repo->index());
    }

    /** @test */
    public function index_pov_employee_and_country_arms()
    {
        $employee = User::whereNotNull('country_id')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$employee) $this->markTestSkipped('no user with country in test DB');

        request()->merge(['employee' => $employee->id]);          // pov_user + its country filter
        $this->assertNotNull($this->repo->index());
    }

    /** @test */
    public function index_default_arm_without_filters_returns_root_announcements()
    {
        $this->assertNotNull($this->repo->index());               // announcement_id-null arm

        request()->merge(['country_id' => $this->user->country_id ?: 1]);
        $this->assertNotNull($this->repo->index());               // explicit-country arm
    }

    // ------------------------------------------------------------------------ store()
    /** @test */
    public function store_set_all_creates_single_root_announcement()
    {
        $ann = $this->repo->store($this->storePayload());

        $this->assertNotNull($ann->id);
        $this->assertSame('Live Test Announcement', $ann->title);
        $this->assertEquals(1, $ann->set_all);
        $this->assertSame($this->user->id, $ann->created_by);
        $this->assertEquals($this->user->country_id, $ann->country_id);   // country fallback arm
        $this->assertNull($ann->announcement_id);                          // root, no children
    }

    /** @test */
    public function store_selected_departments_creates_child_rows()
    {
        $deps = EvoxDepartment::orderBy('id')->limit(2)->pluck('id');
        if ($deps->count() < 2) $this->markTestSkipped('need 2 departments in test DB');

        $ann = $this->repo->store($this->storePayload([
            'set_all'             => 0,
            'selectedDepartments' => $deps->implode(','),          // string -> preg_split arm
        ]));

        // store() returns the LAST child; its parent is the root row
        $rootId = $ann->announcement_id;
        $this->assertNotNull($rootId);
        $children = Announcement::where('announcement_id', $rootId)->get();
        $this->assertCount(2, $children);
        $this->assertEqualsCanonicalizing($deps->all(), $children->pluck('present_dep_id')->all());
    }

    /** @test */
    public function store_set_exclude_inverts_department_selection()
    {
        $allIds = EvoxDepartment::pluck('id');
        if ($allIds->count() < 3) $this->markTestSkipped('need 3+ departments in test DB');
        $keepOut = $allIds->slice(0, $allIds->count() - 2);        // exclude all but 2

        $ann = $this->repo->store($this->storePayload([
            'set_all'             => 0,
            'set_exclude'         => '1',
            'selectedDepartments' => $keepOut->values()->all(),    // array arm (no preg_split)
        ]));

        $children = Announcement::where('announcement_id', $ann->announcement_id)->get();
        $this->assertCount(2, $children);                          // whereNotIn arm
    }

    // --------------------------------------------------------------- show()/show_strict()
    /** @test */
    public function show_returns_row_and_show_strict_passes_for_global_announcement()
    {
        $ann = $this->repo->store($this->storePayload());          // set_all=1 + set_country_all=1

        $this->assertEquals($ann->id, $this->repo->show($ann->id)->id);
        // fast-path arm: global visibility checks pass immediately
        $this->assertEquals($ann->id, $this->repo->show_strict($ann->id)->id);
    }

    // ------------------------------------------------------------- update()/update_status()
    /** @test */
    public function update_rewrites_fields_replaces_children_and_clears_thumbnail()
    {
        $deps = EvoxDepartment::orderBy('id')->limit(2)->pluck('id');
        if ($deps->count() < 1) $this->markTestSkipped('no departments in test DB');
        $root = $this->repo->store($this->storePayload());

        $out = $this->repo->update($this->storePayload([
            'title'               => 'Updated Live Title',
            'content'             => 'null',                       // "null" string -> keep arm
            'on_link'             => 'true',                       // -> 1 arm
            'set_all'             => 0,
            'selectedDepartments' => $deps->implode(','),
            'inputFileWasDeleted' => 'true',                       // thumbnail-clear arm
        ]), $root->id);

        $rootFresh = Announcement::find($root->id);
        $this->assertSame('Updated Live Title', $rootFresh->title);
        $this->assertSame($root->content, $rootFresh->content);    // content kept
        $this->assertEquals(1, $rootFresh->on_link);
        $this->assertNull($rootFresh->thumbnail);
        $this->assertCount($deps->count(),
            Announcement::where('announcement_id', $root->id)->get());   // children recreated
    }

    /** @test */
    public function update_status_flips_status_and_wraps_in_success_response()
    {
        $root = $this->repo->store($this->storePayload());

        $res = $this->repo->update_status(new Fluent(['status' => 0]), $root->id);

        $this->assertEquals(200, $res->getStatusCode());
        $this->assertEquals(0, Announcement::find($root->id)->status);
    }

    // ----------------------------------------------------------------------- destroy()
    /** @test */
    public function destroy_removes_root_and_force_deletes_children()
    {
        $deps = EvoxDepartment::orderBy('id')->limit(1)->pluck('id');
        $root = $this->repo->store($this->storePayload(
            $deps->count() ? ['set_all' => 0, 'selectedDepartments' => $deps->implode(',')] : []
        ));
        $rootId = $root->announcement_id ?: $root->id;

        $this->repo->destroy($rootId);

        $this->assertNull(Announcement::find($rootId));
        $this->assertCount(0, Announcement::where('announcement_id', $rootId)->where('set_all', 0)->get());
    }

    // ----------------------------------------------------------------- dashboard arms
    /** @test */
    public function dashboard_index_all_and_numeric_department_arms()
    {
        $all = $this->repo->dashboard_index(new Fluent(['dep_id' => 'all']));
        $this->assertLessThanOrEqual(6, $all->count());

        $dep = EvoxDepartment::orderBy('id')->first();
        if ($dep) {
            $byDep = $this->repo->dashboard_index(new Fluent(['dep_id' => (string) $dep->id]));
            $this->assertLessThanOrEqual(6, $byDep->count());
        }
    }

    /** @test */
    public function increment_dashboard_index_pages_results()
    {
        if (!EvoxDepartment::find($this->user->department_id)) {
            $this->markTestSkipped('auth user has no matching EvoxDepartment row');
        }

        $page1 = $this->repo->increment_dashboard_index(new Fluent(['dep_id' => 'all', 'page' => 1]));
        $this->assertLessThanOrEqual(3, $page1->count());

        $dep = EvoxDepartment::orderBy('id')->first();
        $byDep = $this->repo->increment_dashboard_index(new Fluent(['dep_id' => (string) $dep->id, 'page' => 1]));
        $this->assertLessThanOrEqual(3, $byDep->count());
    }

    // ----------------------------------------------------- HR / handled-list methods
    /** @test */
    public function hr_and_department_handled_lists()
    {
        $this->assertNotNull($this->repo->all_hr_handled_Announcements());
        $this->assertNotNull($this->repo->all_department_handled_Announcements());
    }

    /** @test */
    public function show_hr_strict_returns_hr_announcement_for_hr_level_user()
    {
        $hrLevelIds = EvoxLevels::where('Name', 'like', '%HR%')->pluck('LevelId');
        $hrUser = $hrLevelIds->isEmpty() ? null
            : User::whereIn('LevelId', $hrLevelIds)->where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$hrUser) $this->markTestSkipped('no HR-level user in test DB');
        $hrAnn = Announcement::where('category', 'HR')->orderBy('id', 'desc')->first();
        if (!$hrAnn) $this->markTestSkipped('no HR announcement in test DB');
        $this->be($hrUser);

        $this->assertEquals($hrAnn->id, $this->repo->show_hr_strict($hrAnn->id)->id);
    }
}
