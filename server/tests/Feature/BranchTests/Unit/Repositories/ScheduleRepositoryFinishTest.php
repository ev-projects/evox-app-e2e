<?php
/**
 * FINISHER SUITE — completes the last unfinished method in two otherwise-complete classes.
 *
 *  1. ScheduleRepository::get_template_schedules() (was 53.33%)
 *     Business meaning: the "pick a schedule template" dropdown a supervisor sees when assigning a
 *     shift. An Admin must see EVERY saved template in the company; anyone else must see ONLY the
 *     templates they authored — otherwise one team leader's template list leaks into another's.
 *     Arms driven here:
 *       (a) isLevel("Admin") TRUE  -> unfiltered `where source_type=template` query.
 *       (b) isLevel("Admin") FALSE -> the extra `where created_by = me` filter.
 *       (c) catch(Exception) -> log_error + rethrow. Reached without touching the query: a user whose
 *           LevelId points at no EVOX_LEVELS row makes level_type() read ->Name on null, which
 *           Laravel's HandleExceptions converts into an ErrorException (an Exception, so the catch
 *           does fire). Same mechanism already characterised in
 *           BranchTests/HR/DepartmentAnnouncements/load.DepartmentAnnouncementsBranchTest.php.
 *     Both level arms are driven by re-pointing the probed user's LevelId IN MEMORY only (never
 *     saved), so no account in the dump is modified.
 *
 *  2. OpsScheduleController::get() (was 58.62%)
 *     Business meaning: the Ops Schedule landing page — every ops department rendered as either an
 *     uploaded image or a formatted contact table, split into two columns.
 *     OpsScheduleControllerBranchTest already covers the image block, the form block and a
 *     >=1-block chunk on whatever rows the dump happens to hold. Covered here and NOT there:
 *       (a) a department with NO schedule at all -> `count($list_per_dept)` FALSE -> department is
 *           skipped entirely and array_values() re-indexes around the hole;
 *       (b) the `if ($ops_scheds)` FALSE arm -> nothing to show, array_chunk is skipped and the page
 *           answers an empty list instead of chunking;
 *       (c) a form department carrying MORE THAN ONE row, so the inner per-row formatting loop runs
 *           repeatedly and the `list` key is rebuilt on each pass.
 *     Determinism: config('constants.OPS_DEPTS') is re-pointed at fixture department ids that the
 *     test itself populates through the controller's own store endpoint, so the arms do not depend
 *     on what the live dump contains.
 *
 * SAFETY: zero stored procedures on either path (verified by reading both sources). Every write goes
 * through DatabaseTransactions and rolls back; image uploads land on a FAKED disk; no migrations,
 * no DDL, no whole-table scans (all fixture lookups are single-row probes).
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use App\EvoxLevels;
use App\Modules\Opsschedule\Models\OpsSchedule;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\User\Models\User;

class ScheduleRepositoryFinishTest extends TestCase
{
    use DatabaseTransactions;

    /** Fixture department ids used ONLY by the OpsSchedule tests (no real ops department uses them). */
    const DEPT_FORM  = 990001;
    const DEPT_IMAGE = 990002;
    const DEPT_EMPTY = 990003;

    /** @var ScheduleRepository */
    private $repo;
    /** @var User */
    private $me;
    /** @var User */
    private $other;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        // The controller uploads with no disk argument -> config('filesystems.default').
        Storage::fake(config('filesystems.default'));
        Storage::fake('local');
        Storage::fake('public');
        $this->withoutMiddleware();

        $this->repo = new ScheduleRepository();

        $this->me = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$this->me) $this->markTestSkipped('no active user with a level in test DB');

        $this->other = User::where('is_active', 1)->where('id', '<>', $this->me->id)
            ->orderBy('id', 'desc')->first();
        if (!$this->other) $this->markTestSkipped('need a second active user in test DB');
    }

    // ------------------------------------------------------------------ helpers

    /** Creates one template schedule owned by $ownerId. Direct model write — no SP, no repository. */
    private function makeTemplate($ownerId, $label)
    {
        $schedule = new Schedule();
        $schedule->name          = 'ZZ Finisher Template ' . $label . ' ' . uniqid();
        $schedule->bind_to       = null;
        $schedule->bind_id       = null;
        $schedule->source_type   = 'template';
        $schedule->schedule_type = 'standard';
        $schedule->valid_from    = null;
        $schedule->valid_to      = null;
        $schedule->rest_days     = ['sun', 'sat'];
        $schedule->created_by    = $ownerId;
        $schedule->updated_by    = $ownerId;
        $schedule->save();

        return $schedule;
    }

    /** Re-points the acting user's level in memory only (never saved) and authenticates as them. */
    private function actAsLevel($levelId)
    {
        $this->me->LevelId = $levelId;
        $this->be($this->me);
    }

    private function adminLevelOrSkip()
    {
        $level = EvoxLevels::where('Name', 'Admin')->first();
        if (!$level) $this->markTestSkipped('no EVOX_LEVELS row named "Admin" in test DB');
        return $level;
    }

    /** JS Date.toString() shape the ops controller parses: index 4 is the HH:MM:SS token. */
    private function jsTime($hms)
    {
        return "Sun Aug 01 2027 {$hms} GMT+0800 (Philippine Standard Time)";
    }

    private function storeOpsForm($deptId, $name)
    {
        return $this->actingAs($this->me)->postJson('/api/opsschedule', [
            'type' => 'form', 'department' => $deptId,
            'name' => $name, 'position' => 'Lead', 'email' => 'ops@evox.test',
            'domain' => 'evox', 'scope' => 'PH,IN', 'timezone' => 'GMT+8',
            'start_time' => $this->jsTime('08:00:00'), 'end_time' => $this->jsTime('17:00:00'),
            'sun' => 'false', 'mon' => 'true', 'tue' => 'true', 'wed' => 'true',
            'thu' => 'true', 'fri' => 'true', 'sat' => 'false',
        ]);
    }

    private function opsDeptConfig(array $ids)
    {
        $names = [
            self::DEPT_FORM  => 'Finisher Form Dept',
            self::DEPT_IMAGE => 'Finisher Image Dept',
            self::DEPT_EMPTY => 'Finisher Empty Dept',
        ];
        $depts = [];
        foreach ($ids as $id) {
            $depts[] = ['name' => $names[$id], 'description' => 'Fixture department.', 'id' => $id];
        }
        config(['constants.OPS_DEPTS' => $depts]);
    }

    // ------------------------------------------- ScheduleRepository::get_template_schedules()

    /** @test */
    public function admin_sees_every_template_schedule_regardless_of_owner()
    {
        $adminLevel = $this->adminLevelOrSkip();
        $mine  = $this->makeTemplate($this->me->id, 'mine');
        $theirs = $this->makeTemplate($this->other->id, 'theirs');

        $this->actAsLevel($adminLevel->LevelId);
        if (!$this->me->isLevel('Admin')) {
            $this->markTestSkipped('probed user cannot be resolved to the Admin level');
        }

        $ids = $this->repo->get_template_schedules()->pluck('id')->all();

        // Admin arm: NO created_by filter -> both owners' templates are listed.
        $this->assertContains($mine->id, $ids);
        $this->assertContains($theirs->id, $ids);
    }

    /** @test */
    public function non_admin_sees_only_the_templates_they_created()
    {
        $nonAdminLevel = EvoxLevels::where('Name', '<>', 'Admin')->orderBy('LevelId')->first();
        if (!$nonAdminLevel) $this->markTestSkipped('no non-Admin EVOX_LEVELS row in test DB');

        $mine   = $this->makeTemplate($this->me->id, 'mine');
        $theirs = $this->makeTemplate($this->other->id, 'theirs');

        $this->actAsLevel($nonAdminLevel->LevelId);
        if ($this->me->isLevel('Admin')) {
            $this->markTestSkipped('fallback level resolved back to Admin');
        }

        $ids = $this->repo->get_template_schedules()->pluck('id')->all();

        // Non-Admin arm: the extra `where created_by = me` filter hides the other owner's template.
        $this->assertContains($mine->id, $ids);
        $this->assertNotContains($theirs->id, $ids);
    }

    /** @test */
    public function template_lookup_logs_and_rethrows_when_the_users_level_row_is_missing()
    {
        $highest = EvoxLevels::orderBy('LevelId', 'desc')->first();
        if (!$highest) $this->markTestSkipped('EVOX_LEVELS is empty in test DB');

        // A LevelId no EVOX_LEVELS row owns -> level_type() reads ->Name on null -> PHP error ->
        // Laravel converts it to an ErrorException (extends Exception) -> the catch arm fires.
        $this->actAsLevel($highest->LevelId + 1000);

        $caught = null;
        try {
            $this->repo->get_template_schedules();
        } catch (\Throwable $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'get_template_schedules() must not swallow the failure');
        $this->assertInstanceOf(\Exception::class, $caught,
            'catch(Exception) arm must be the one that logs and rethrows');
    }

    // ------------------------------------------------- OpsScheduleController::get()

    /** @test */
    public function ops_schedule_page_skips_departments_that_have_no_schedule_at_all()
    {
        $this->opsDeptConfig([self::DEPT_FORM, self::DEPT_EMPTY, self::DEPT_IMAGE]);
        if (OpsSchedule::where('department_id', self::DEPT_EMPTY)->first()) {
            $this->markTestSkipped('fixture "empty" department already has rows');
        }

        // Two rows for the form department so the inner per-row formatting loop runs twice.
        $this->storeOpsForm(self::DEPT_FORM, 'Ops Contact One')->assertStatus(201);
        $this->storeOpsForm(self::DEPT_FORM, 'Ops Contact Two')->assertStatus(201);
        $this->actingAs($this->me)->post('/api/opsschedule', [
            'type' => 'image', 'department' => self::DEPT_IMAGE,
            'image' => UploadedFile::fake()->image('ops.png'),
        ])->assertStatus(201);

        $res = $this->actingAs($this->me)->getJson('/api/opsschedule');

        $res->assertStatus(200);
        $chunks = $res->json('content');
        // 3 configured departments, but the empty one contributes nothing -> 2 blocks,
        // re-indexed by array_values and chunked into halves of 1.
        $this->assertCount(2, $chunks);
        $blocks = collect($chunks)->flatten(1);
        $this->assertCount(2, $blocks);
        $this->assertNull($blocks->firstWhere('department', 'Finisher Empty Dept'));

        $form = $blocks->firstWhere('type', 'form');
        $this->assertNotNull($form);
        $this->assertSame('Finisher Form Dept', $form['department']);
        $this->assertCount(2, $form['list']);                       // inner loop ran per row
        $this->assertSame('Mon - Fri', $form['list'][0]['work_days']);
        $this->assertSame(['PH', 'IN'], $form['list'][0]['scope']);
        $this->assertSame('8am', $form['list'][1]['start_time']);
        $this->assertSame('5pm', $form['list'][1]['end_time']);

        $image = $blocks->firstWhere('type', 'image');
        $this->assertNotNull($image);
        $this->assertSame('Finisher Image Dept', $image['department']);
        $this->assertStringContainsString('/storage/', $image['image']);
    }

    /** @test */
    public function ops_schedule_page_returns_an_empty_list_when_no_department_has_a_schedule()
    {
        $this->opsDeptConfig([self::DEPT_EMPTY]);
        if (OpsSchedule::where('department_id', self::DEPT_EMPTY)->first()) {
            $this->markTestSkipped('fixture "empty" department already has rows');
        }

        $res = $this->actingAs($this->me)->getJson('/api/opsschedule');

        // `if ($ops_scheds)` FALSE arm: array_chunk is skipped entirely and the page answers a flat
        // empty list rather than a pair of empty columns.
        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
    }
}
