<?php
/**
 * SOURCE FILE UNDER TEST
 *   app/Modules/Opsschedule/Http/Controllers/OpsScheduleController.php :: getList()  (70.83% before this file)
 *
 * MENU PATH
 *   Schedule -> Ops Schedule -> list. GET /api/opsschedule/list/{dept_id?}. The support-hours table
 *   an employee reads to find out when Finance, IT, HR and the rest are contactable.
 *
 * WHAT THIS FILE ADDS
 *   getList()'s two formatting arms are chosen per ROW, from live table content:
 *     type 'form'  -> office-hours row: work days collapsed to a "Mon - Fri" range, scope split into
 *                     a list of country codes, epoch start/end times rendered as "8am - 5pm"
 *     otherwise    -> uploaded-image row: no scope, and the stored path turned into a public URL
 *   The existing OpsScheduleControllerBranchTest covers both, but only after creating its fixtures
 *   through store(), which it abandons with markTestSkipped whenever every non-form OPS department
 *   already carries an image row (BUG-122 blocks the replace arm). When that skip fires, the whole
 *   'form' formatting block goes unexecuted — which is the seven-line residue this file closes.
 *
 *   Here the two rows are created directly, in one OPS department, and read back through the
 *   department-filtered route. That makes both arms run on every execution, whatever the dump holds.
 *
 * WHY A USER CARES
 *   The formatting IS the feature. Stored as `mon,tue,wed,thu,fri` and two epoch integers, the row is
 *   unreadable; the screen must say "Mon - Fri, 8am - 5pm". And the scope column decides which
 *   countries a support desk covers — it has to arrive as a list, not as the raw "PH,IN" string, or
 *   the country chips render as one nonsense entry.
 *
 * ARMS COVERED — both sides of every conditional
 *   - dept_id supplied      -> the query is filtered to that department
 *   - dept_id omitted       -> the unfiltered query runs
 *   - row type 'Form'       -> work-day range, split scope, "8am - 5pm" time range
 *   - row type not 'Form'   -> empty scope, storage URL built for the path
 *
 * SAFETY
 *   DatabaseTransactions: both fixture rows are written inside the test transaction and rolled back.
 *   The storage disks are faked so the image row's URL is built without touching the real filesystem.
 *   Reads are filtered to one department; the one unfiltered call asserts only the envelope, so no
 *   assertion depends on how much live data the dump carries. No stored procedure is reachable.
 *
 * FINDINGS
 *   OPS-DEPTFALLBACK-1 (characterized below, not fixed): the department name is resolved with
 *     array_search() against OPS_DEPTS and used immediately as $ops_depts[$arr_key]['name'] with no
 *     check. A row whose department_id is not in OPS_DEPTS makes array_search return false, which PHP
 *     reads as index 0 — so the row is silently labelled with the FIRST configured department
 *     (Marketing) rather than reporting an unknown department.
 */

namespace Tests\Feature\BranchTests\Schedule\OpsSchedule;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;
use App\Modules\Opsschedule\Models\OpsSchedule;
use App\Modules\User\Models\User;

class OpsScheduleListLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** Names unique enough to pick this suite's own rows out of the live dump. */
    const FORM_ROW_NAME  = 'branch-test ops form row';
    const IMAGE_ROW_NAME = 'branch-test ops image row';

    /** @var User */
    private $user;

    /** @var array one entry of config constants.OPS_DEPTS */
    private $dept;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        Storage::fake(config('filesystems.default'));
        Storage::fake('local');
        Storage::fake('public');
        $this->withoutMiddleware();                 // past jwtauth / auth.apikey to the controller body

        $this->user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user row in test DB to act as');
        }
        $this->actingAs($this->user);

        $this->dept = config('constants.OPS_DEPTS')[0];      // Marketing, id 4
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * An office-hours row exactly as the store form writes one: days as a comma list, scope as a
     * comma list, times as epoch integers. 08:00 and 17:00 are round-tripped through the same
     * timezone the controller formats in, so the expected "8am - 5pm" holds wherever this runs.
     */
    private function createFormRow(): OpsSchedule
    {
        return OpsSchedule::create([
            'department_id' => $this->dept['id'],
            'type'          => 'form',
            'is_active'     => 1,
            'name'          => self::FORM_ROW_NAME,
            'position'      => 'Support Lead',
            'email'         => 'ops.branch.test@example.com',
            'domain'        => 'example.com',
            'scope'         => 'PH,IN',
            'work_days'     => 'mon,tue,wed,thu,fri',
            'start_time'    => strtotime('2027-08-02 08:00:00'),
            'end_time'      => strtotime('2027-08-02 17:00:00'),
            'timezone'      => 'Asia/Manila',
        ]);
    }

    /** An uploaded-image row in the same department, so one call exercises both arms. */
    private function createImageRow(): OpsSchedule
    {
        return OpsSchedule::create([
            'department_id' => $this->dept['id'],
            'type'          => 'image',
            'is_active'     => 1,
            'name'          => self::IMAGE_ROW_NAME,
            'path'          => 'ops_schedules/branch-test.png',
        ]);
    }

    /** This suite's row, found by its unique name, out of the department-filtered response. */
    private function ownRow(array $content, string $name): ?array
    {
        foreach ($content as $row) {
            if (isset($row['name']) && $row['name'] === $name) {
                return $row;
            }
        }

        return null;
    }

    // =========================================================  the office-hours formatting arm

    /**
     * The 'Form' arm. Everything a person reads on the support-hours table is produced here: the
     * working-week range, the country list, and the opening hours.
     *
     * @test
     */
    public function an_office_hours_row_is_rendered_as_a_day_range_a_country_list_and_an_hours_range()
    {
        $this->createFormRow();

        $res = $this->getJson('/api/opsschedule/list/' . $this->dept['id']);

        $res->assertStatus(200);
        $this->assertSame(trans('messages.fetch_ops_schedules_success'), $res->json('message'));

        $row = $this->ownRow($res->json('content'), self::FORM_ROW_NAME);
        $this->assertNotNull($row, 'the department filter must return the row created for that department');

        $this->assertSame('Form', $row['type'], 'the stored lower-case type is capitalised for display');
        $this->assertSame($this->dept['name'], $row['department'], 'the department id is resolved to its name');
        $this->assertSame('Mon - Fri', $row['work_days'], 'the five stored days collapse to a first-to-last range');
        $this->assertSame(['PH', 'IN'], $row['scope'], 'scope is split into country codes, not left as "PH,IN"');
        $this->assertSame('8am', $row['start_time']);
        $this->assertSame('5pm', $row['end_time']);
        $this->assertSame('8am - 5pm', $row['start_end_time'], 'the two epoch columns become one readable range');
    }

    /**
     * A single working day is the degenerate case of the same range: first and last are the same day,
     * so the row must read "Sat - Sat" rather than dropping one end.
     *
     * @test
     */
    public function a_single_working_day_is_rendered_as_a_range_with_the_same_day_at_both_ends()
    {
        $row = $this->createFormRow();
        $row->work_days = 'sat';
        $row->save();

        $res = $this->getJson('/api/opsschedule/list/' . $this->dept['id']);

        $found = $this->ownRow($res->json('content'), self::FORM_ROW_NAME);
        $this->assertNotNull($found);
        $this->assertSame('Sat - Sat', $found['work_days']);
    }

    // ==============================================================  the uploaded-image arm

    /**
     * The other arm. An image row carries no scope and no hours — it carries a picture, so the stored
     * relative path must be turned into a URL the browser can actually fetch.
     *
     * @test
     */
    public function an_uploaded_image_row_carries_no_scope_and_a_resolvable_path()
    {
        $this->createImageRow();

        $res = $this->getJson('/api/opsschedule/list/' . $this->dept['id']);

        $res->assertStatus(200);
        $row = $this->ownRow($res->json('content'), self::IMAGE_ROW_NAME);
        $this->assertNotNull($row);

        $this->assertSame('Image', $row['type']);
        $this->assertSame([], $row['scope'], 'an image row has no country scope');
        $this->assertStringContainsString(
            'ops_schedules/branch-test.png',
            $row['path'],
            'the stored relative path is expanded into a fetchable URL'
        );
        $this->assertNotSame('ops_schedules/branch-test.png', $row['path'], 'the raw relative path is not served as-is');
    }

    /**
     * Both arms in one response. The list mixes office-hours rows and image rows for the same
     * department, and each must be formatted by its own arm rather than the first row's arm winning.
     *
     * @test
     */
    public function a_department_holding_both_kinds_of_row_formats_each_by_its_own_rule()
    {
        $this->createFormRow();
        $this->createImageRow();

        $content = $this->getJson('/api/opsschedule/list/' . $this->dept['id'])->json('content');

        $form  = $this->ownRow($content, self::FORM_ROW_NAME);
        $image = $this->ownRow($content, self::IMAGE_ROW_NAME);

        $this->assertNotNull($form);
        $this->assertNotNull($image);
        $this->assertSame(['PH', 'IN'], $form['scope']);
        $this->assertSame([], $image['scope']);
        $this->assertArrayHasKey('start_end_time', $form, 'only the office-hours arm builds an hours range');
        $this->assertArrayNotHasKey('start_end_time', $image, 'the image arm must not fabricate opening hours');
    }

    // =====================================================================  the filter itself

    /**
     * The other side of the dept_id conditional. Without a department the query is unfiltered, so a
     * row created in one department is still returned; with a different department's id it is not.
     *
     * @test
     */
    public function the_department_filter_narrows_the_list_and_omitting_it_widens_it()
    {
        $this->createFormRow();

        $unfiltered = $this->getJson('/api/opsschedule/list')->json('content');
        $this->assertNotNull(
            $this->ownRow($unfiltered, self::FORM_ROW_NAME),
            'the unfiltered list must include every department'
        );

        $otherDept = config('constants.OPS_DEPTS')[3];      // Information Technology, id 28
        $filtered  = $this->getJson('/api/opsschedule/list/' . $otherDept['id'])->json('content');
        $this->assertNull(
            $this->ownRow($filtered, self::FORM_ROW_NAME),
            'a row belonging to Marketing must not appear under the IT filter'
        );
    }

    /**
     * FINDING OPS-DEPTFALLBACK-1. A row whose department_id is not one of the configured OPS
     * departments is labelled with the FIRST configured department instead of being reported as
     * unknown, because array_search() returns false and PHP indexes the array with it as 0.
     *
     * @test
     */
    public function a_row_in_an_unconfigured_department_is_mislabelled_as_the_first_ops_department()
    {
        $row = $this->createFormRow();
        $row->department_id = 987654;                       // not present in OPS_DEPTS
        $row->save();

        $content = $this->getJson('/api/opsschedule/list')->json('content');
        $found   = $this->ownRow($content, self::FORM_ROW_NAME);

        $this->assertNotNull($found);
        $this->assertSame(
            config('constants.OPS_DEPTS')[0]['name'],
            $found['department'],
            'FINDING OPS-DEPTFALLBACK-1: an unknown department id falls back to index 0, not to an error'
        );
    }
}
