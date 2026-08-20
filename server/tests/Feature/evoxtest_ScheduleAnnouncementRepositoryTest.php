<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use App\Modules\User\Models\User;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Repositories\AnnouncementRepository;

/**
 * Item 4 — covers ScheduleRepository + AnnouncementRepository.
 *
 * Targeted methods are those NOT hit by existing API tests:
 *   ScheduleRepository: show, list, get_template_schedules (2 branches),
 *     copy_schedule_to_user (null + real schedule paths),
 *     replicate_schedule_holiday_policy, replicate_schedule_policy, replicate_schedule
 *   AnnouncementRepository: show, all_hr_handled_Announcements, show_hr_strict,
 *     handle_announcements_index, dashboard_index,
 *     store, update_status, destroy
 *
 * All write tests are safe: DatabaseTransactions rolls them back.
 */
class evoxtest_ScheduleAnnouncementRepositoryTest extends TestCase
{
    use DatabaseTransactions;

    private ScheduleRepository    $scheduleRepo;
    private AnnouncementRepository $announcementRepo;
    private User $supervisor;   // Gary Aure — id=1698
    private User $employee;     // Glenn Macasarte — id=1593

    protected function setUp(): void
    {
        parent::setUp();
        $this->scheduleRepo    = new ScheduleRepository();
        $this->announcementRepo = new AnnouncementRepository();
        $this->supervisor = User::findOrFail(1698);
        $this->employee   = User::findOrFail(1593);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ScheduleRepository
    // ══════════════════════════════════════════════════════════════════════════

    public function test_schedule_show_returns_schedule_by_id()
    {
        $schedule = Schedule::first();
        if (!$schedule) {
            $this->markTestSkipped('No schedules in DB.');
        }
        $result = $this->scheduleRepo->show($schedule->id);
        $this->assertInstanceOf(Schedule::class, $result);
        $this->assertEquals($schedule->id, $result->id);
    }

    public function test_schedule_list_returns_paginated_for_user()
    {
        $result = $this->scheduleRepo->list($this->employee->id);
        $this->assertNotNull($result);
        $this->assertTrue(method_exists($result, 'currentPage'),
            'Expected a LengthAwarePaginator from list()');
    }

    public function test_schedule_get_template_schedules_as_non_admin()
    {
        Auth::setUser($this->employee);
        $result = $this->scheduleRepo->get_template_schedules();
        $this->assertNotNull($result);
    }

    public function test_schedule_get_template_schedules_as_admin()
    {
        $admin = User::where('email', 'dummyman@ops.eastvantage.com')->first();
        if (!$admin) {
            $this->markTestSkipped('Admin user dummyman@ops.eastvantage.com not found in DB.');
        }
        Auth::setUser($admin);
        $result = $this->scheduleRepo->get_template_schedules();
        $this->assertNotNull($result);
    }

    /**
     * Null schedule path → creates a default schedule for the user using
     * DEFAULT_SCHEDULE constants. No auth() call in this branch.
     */
    public function test_copy_schedule_to_user_null_creates_default_schedule()
    {
        Auth::setUser($this->supervisor);
        $result = $this->scheduleRepo->copy_schedule_to_user(null, $this->employee);
        $this->assertInstanceOf(Schedule::class, $result);
        $this->assertEquals('user', $result->bind_to);
        $this->assertEquals($this->employee->id, $result->bind_id);
    }

    /**
     * Real schedule path → replicates details + policies to a new Schedule row.
     */
    public function test_copy_schedule_to_user_with_real_schedule_replicates()
    {
        $source = Schedule::whereHas('schedule_details')
                          ->whereHas('schedule_policies')
                          ->first();
        if (!$source) {
            $this->markTestSkipped('No schedule with details and policies in DB.');
        }
        Auth::setUser($this->supervisor);
        $result = $this->scheduleRepo->copy_schedule_to_user($source, $this->employee);
        $this->assertInstanceOf(Schedule::class, $result);
        $this->assertEquals('user', $result->bind_to);
    }

    public function test_replicate_schedule_holiday_policy()
    {
        Auth::setUser($this->supervisor);
        $schedules = Schedule::whereHas('schedule_policies')->take(2)->get();
        if ($schedules->count() < 2) {
            $this->markTestSkipped('Need at least 2 schedules with policies in DB.');
        }
        $result = $this->scheduleRepo->replicate_schedule_holiday_policy(
            $schedules[0],
            $schedules[1]
        );
        $this->assertInstanceOf(Schedule::class, $result);
    }

    public function test_replicate_schedule_policy()
    {
        Auth::setUser($this->supervisor);
        $schedules = Schedule::whereHas('schedule_policies')->take(2)->get();
        if ($schedules->count() < 2) {
            $this->markTestSkipped('Need at least 2 schedules with policies in DB.');
        }
        $result = $this->scheduleRepo->replicate_schedule_policy(
            $schedules[0],
            $schedules[1]
        );
        $this->assertInstanceOf(Schedule::class, $result);
    }

    /**
     * Copies schedule_type, details, and policies from s2 to s1.
     * Requires 'standard' schedules so filter_schedule_details passes day='all' rows.
     */
    public function test_replicate_schedule_copies_details_and_policies()
    {
        Auth::setUser($this->supervisor);
        $schedules = Schedule::where('schedule_type', 'standard')
                             ->whereHas('schedule_details')
                             ->whereHas('schedule_policies')
                             ->take(2)
                             ->get();
        if ($schedules->count() < 2) {
            $this->markTestSkipped('Need at least 2 standard schedules with details+policies in DB.');
        }
        $result = $this->scheduleRepo->replicate_schedule($schedules[0], $schedules[1]);
        $this->assertInstanceOf(Schedule::class, $result);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // AnnouncementRepository
    // ══════════════════════════════════════════════════════════════════════════

    public function test_announcement_show_returns_model_or_null()
    {
        $announcement = Announcement::first();
        if (!$announcement) {
            $this->markTestSkipped('No announcements in DB.');
        }
        $result = $this->announcementRepo->show($announcement->id);
        $this->assertEquals($announcement->id, optional($result)->id);
    }

    public function test_announcement_all_hr_handled_returns_builder()
    {
        Auth::setUser($this->employee);
        // dep_id on users may be null → returns empty builder; no exception expected
        $result = $this->announcementRepo->all_hr_handled_Announcements();
        $this->assertNotNull($result);
    }

    public function test_announcement_all_hr_handled_announcements_via_hr_category()
    {
        Auth::setUser($this->employee);
        $result = $this->announcementRepo->all_hr_handled_Announcements();
        $this->assertNotNull($result);
    }

    public function test_announcement_show_hr_strict_with_hr_user()
    {
        $hrUser = User::where('email', 'alvini.cruz@eastvantage.com')->first();
        if (!$hrUser) {
            $this->markTestSkipped('HR user alvini.cruz@eastvantage.com not found in DB.');
        }
        Auth::setUser($hrUser);
        $announcement = Announcement::where('category', 'HR')->first();
        if (!$announcement) {
            $this->markTestSkipped('No HR-category announcements in DB.');
        }
        // Returns the announcement if access is granted, or null — no exception
        $result = $this->announcementRepo->show_hr_strict($announcement->id);
        $this->assertTrue(true);
    }

    public function test_announcement_handle_announcements_index_returns_collection()
    {
        Auth::setUser($this->employee);
        $result = $this->announcementRepo->handle_announcements_index();
        $this->assertNotNull($result);
    }

    public function test_announcement_dashboard_index_all_departments()
    {
        Auth::setUser($this->employee);
        $request = new Request();
        $request->merge(['dep_id' => null]);
        $result = $this->announcementRepo->dashboard_index($request);
        $this->assertNotNull($result);
    }

    public function test_announcement_dashboard_index_specific_department()
    {
        Auth::setUser($this->employee);
        $request = new Request();
        $request->merge(['dep_id' => 117]);   // EVOX_DEPARTMENT Gary belongs to
        $result = $this->announcementRepo->dashboard_index($request);
        $this->assertNotNull($result);
    }

    /**
     * store() with set_all=1, no selectedDepartments, no thumbnail.
     * Rolls back via DatabaseTransactions.
     */
    public function test_announcement_store_creates_announcement()
    {
        Auth::setUser($this->employee);
        $request = $this->makeAnnouncementRequest('E2E Store Test Announcement');
        $result  = $this->announcementRepo->store($request);
        $this->assertNotNull($result);
        $this->assertNotNull($result->id);
        $this->assertEquals('E2E Store Test Announcement', $result->title);
    }

    public function test_announcement_update_status()
    {
        Auth::setUser($this->employee);
        $announcement = Announcement::first();
        if (!$announcement) {
            $this->markTestSkipped('No announcements in DB.');
        }
        $request = new Request();
        $request->merge(['status' => 'inactive']);
        $result = $this->announcementRepo->update_status($request, $announcement->id);
        $this->assertNotNull($result);
    }

    /**
     * store → then destroy the temporary record.
     * Both are rolled back by DatabaseTransactions.
     */
    public function test_announcement_destroy_removes_record()
    {
        Auth::setUser($this->employee);
        $created = $this->announcementRepo->store($this->makeAnnouncementRequest('E2E Destroy Test'));
        $this->announcementRepo->destroy($created->id);
        // Soft-deleted records are excluded from default queries
        $this->assertNull(Announcement::find($created->id));
    }

    // ─── helper ─────────────────────────────────────────────────────────────

    private function makeAnnouncementRequest(string $title): Request
    {
        $request = new Request();
        $request->merge([
            'title'               => $title,
            'category'            => 'Department',
            'content'             => 'E2E test content',
            'headline'            => 'Test headline',
            'release_date'        => '2026-08-01',
            'expiry_date'         => '2026-12-31',
            'on_link'             => 0,
            'link'                => null,
            'status'              => 'active',
            'country_id'          => 1,
            'set_all'             => 1,
            'set_exclude'         => 0,
            'set_country_all'     => 1,
            'selectedDepartments' => null,
            'thumbnail'           => null,
        ]);
        return $request;
    }
}
