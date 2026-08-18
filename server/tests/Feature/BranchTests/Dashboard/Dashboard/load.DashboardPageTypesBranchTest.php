<?php
/**
 * SOURCE FILE UNDER TEST
 *   app/Http/Controllers/DashboardController.php :: get_dashboard_all()   (85.96% before this file)
 *
 * MENU PATH
 *   Dashboard -> Home. One endpoint, GET /api/get_dashboard_all/{page_type}, serves four different
 *   tiles chosen by the page_type segment:
 *     1 = who is on leave today/tomorrow + holidays + the pending-request counters
 *     2 = birthdays and anniversaries
 *     3 = departments and announcements (paginated)
 *     4 = EVOX updates (body removed; the arm is now a no-op)
 *
 * WHY A USER CARES
 *   Every arm here shapes something the whole company looks at every morning. The counters on tile 1
 *   are what tells a supervisor they have approvals waiting; if the isset() guards fall the wrong way
 *   the badge reads 0 and requests sit unapproved. Tile 2 must sort chronologically and zero-pad the
 *   day or "Jan 5" sorts after "Jan 12". Tile 3 changes BOTH which result set it reads and how many
 *   rows it asks for depending on whether a department filter is applied — 3 announcements per page
 *   when paging, 6 when not.
 *
 * ARMS COVERED — both sides of every conditional
 *   page_type=1  counters present  -> the four personal and four team counters read from the SP
 *   page_type=1  counters absent   -> every counter falls back to the string "0" (the false ternary arms)
 *   page_type=1  'Tomorrow' bucket / the misspelled 'Tomorow' bucket — both accepted (lines 65-70)
 *   page_type=2  celebrations sorted ascending, day zero-padded, display upper-cased
 *   page_type=3  no department filter -> department_id null, 6 per page, announcements from set [1]
 *   page_type=3  department filter   -> department_id passed, 3 per page, announcements from set [2]
 *   page_type=4  no-op arm -> empty data envelope
 *   catch(Exception) -> handled error envelope rather than a 500
 *
 * SAFETY
 *   EH_SP_Dashboard is intercepted by the Tests\Support\CallSpFake seam (App\Http\Controllers is one
 *   of the shadowed namespaces), so the stored procedure NEVER executes and the database is never
 *   touched by these tests. The catch arm is driven by deliberately leaving the SP unfaked, which
 *   makes the seam throw. Read-only throughout; DatabaseTransactions is held anyway so the acting-user
 *   lookup can never leak state.
 *
 * FINDINGS
 *   DASH-TOMOROW-1 (characterized below, not fixed): lines 65-70 accept BOTH 'Tomorrow' and the
 *     misspelled 'Tomorow' as the tomorrow bucket, and the misspelling is checked SECOND — so if the
 *     stored procedure ever emitted both spellings the misspelled one would win. The response key is
 *     itself misspelled ("tommorowleaves") and the front end depends on that spelling.
 *   DASH-COUNTERGUARD-1 (characterized below, not fixed): each personal counter is guarded on
 *     `isset($response[3][0]->MyRequest)` — the guard tests element 0 while the value is read from
 *     elements 0..3, and the team counters guard on element 1 while reading 0..3. A short result set
 *     that satisfies the guard but lacks the later elements is an undefined-index error, not a zero.
 */

namespace Tests\Feature\BranchTests\Dashboard\Dashboard;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\Support\CallSpFake;
use Tests\TestCase;
use App\Modules\User\Models\User;

class DashboardPageTypesLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();                     // EH_SP_Dashboard can no longer reach the database
        $this->withoutMiddleware();                 // past jwtauth / auth.apikey to the controller body

        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user with a LevelId in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** Register the canned result sets EH_SP_Dashboard would return. */
    private function dashboardReturns(array $resultSets): void
    {
        CallSpFake::fake('EH_SP_Dashboard', $resultSets);
    }

    /** The parameter array the controller handed the stored procedure. */
    private function spParameters(): array
    {
        $calls = CallSpFake::callsFor('EH_SP_Dashboard');
        $this->assertCount(1, $calls, 'the dashboard must ask the stored procedure exactly once');

        return $calls[0]['params'];
    }

    // ============================================================  page_type 1 — leaves + counters

    /**
     * The counters arm with a full result set. Every badge on the dashboard is read from the stored
     * procedure and stringified — a supervisor with two overtime requests waiting must see "2", and
     * the personal and team counters must not be crossed over.
     *
     * @test
     */
    public function the_leave_tile_reports_the_personal_and_team_request_counters_from_the_procedure()
    {
        $this->dashboardReturns([
            0 => [
                (object) ['leave_day' => 'Today', 'name' => 'Alice'],
                (object) ['leave_day' => 'Tomorrow', 'name' => 'Bob'],
            ],
            1 => [(object) ['name' => 'Independence Day', 'date' => '2026-06-12']],
            2 => [
                (object) ['requestCount' => 5],
                (object) ['MyTeamRequest' => 1, 'requestCount' => 6],
                (object) ['requestCount' => 7],
                (object) ['requestCount' => 8],
            ],
            3 => [
                (object) ['MyRequest' => 1, 'requestCount' => 1],
                (object) ['requestCount' => 2],
                (object) ['requestCount' => 3],
                (object) ['requestCount' => 4],
            ],
        ]);

        $res = $this->getJson('/api/get_dashboard_all/1');

        $res->assertStatus(200);
        $numbers = $res->json('data.status_numbers');

        $this->assertSame('1', $numbers['alterlogpending'], 'my pending alteration requests');
        $this->assertSame('2', $numbers['overtimepending'], 'my pending overtime requests');
        $this->assertSame('3', $numbers['restdayworkpending']);
        $this->assertSame('4', $numbers['changeschedulepending']);

        $this->assertSame('5', $numbers['team_alterlogpending'], "my team's pending alteration requests");
        $this->assertSame('6', $numbers['team_overtimepending']);
        $this->assertSame('7', $numbers['team_restdayworkpending']);
        $this->assertSame('8', $numbers['team_changeschedulepending']);

        $this->assertCount(1, $res->json('data.todayleaves'));
        $this->assertSame('Alice', $res->json('data.todayleaves.0.name'));
        $this->assertCount(1, $res->json('data.tommorowleaves'));
        $this->assertSame('Bob', $res->json('data.tommorowleaves.0.name'));
        $this->assertSame('Independence Day', $res->json('data.dashboardholiday.0.name'));

        $params = $this->spParameters();
        $this->assertSame((int) $this->user->id, (int) $params[1], 'the counters are scoped to the signed-in user');
        $this->assertSame('1', (string) $params[4], 'page_type is forwarded to the procedure');
        $this->assertNull($params[2], 'page_type 1 never passes a department filter');
    }

    /**
     * The other side of all eight ternaries. FINDING DASH-COUNTERGUARD-1: when the guard element is
     * absent every badge must read the string "0" — an empty dashboard, never a crash and never null.
     *
     * @test
     */
    public function the_leave_tile_reports_zero_for_every_counter_when_the_procedure_returns_none()
    {
        $this->dashboardReturns([
            0 => [],
            1 => [],
            2 => [],
            3 => [],
        ]);

        $res = $this->getJson('/api/get_dashboard_all/1');

        $res->assertStatus(200);
        $numbers = $res->json('data.status_numbers');

        foreach ($numbers as $key => $value) {
            $this->assertSame('0', $value, "counter {$key} must fall back to the string zero, not null");
        }
        $this->assertSame([], $res->json('data.todayleaves'), 'nobody on leave today');
        $this->assertSame([], $res->json('data.tommorowleaves'), 'nobody on leave tomorrow');
    }

    /**
     * FINDING DASH-TOMOROW-1. The controller accepts the misspelled bucket name 'Tomorow' as well as
     * 'Tomorrow', and checks the misspelling second — so it overwrites the correctly-spelled bucket.
     * Pinned as today's behaviour; if the stored procedure is ever corrected to emit only 'Tomorrow'
     * this test still passes, and if the second check is removed it fails here first.
     *
     * @test
     */
    public function the_misspelled_tomorow_bucket_is_accepted_and_overwrites_the_correctly_spelled_one()
    {
        $this->dashboardReturns([
            0 => [
                (object) ['leave_day' => 'Tomorrow', 'name' => 'spelled correctly'],
                (object) ['leave_day' => 'Tomorow', 'name' => 'spelled wrong'],
            ],
            1 => [],
            2 => [],
            3 => [],
        ]);

        $res = $this->getJson('/api/get_dashboard_all/1');

        $res->assertStatus(200);
        $this->assertCount(1, $res->json('data.tommorowleaves'));
        $this->assertSame(
            'spelled wrong',
            $res->json('data.tommorowleaves.0.name'),
            'FINDING DASH-TOMOROW-1: the misspelled bucket is applied second and wins'
        );
    }

    // ==================================================================  page_type 2 — celebrations

    /**
     * Birthdays and anniversaries must come back in calendar order with a zero-padded day, and the
     * label upper-cased. Without the padding "Jan 5" sorts as text after "Jan 12" in the browser list.
     *
     * @test
     */
    public function the_celebrations_tile_sorts_by_date_pads_the_day_and_capitalises_the_label()
    {
        $this->dashboardReturns([
            0 => [
                (object) ['date' => 'Mar 3', 'display' => 'anniversary'],
                (object) ['date' => 'Jan 5', 'display' => 'birthday'],
            ],
        ]);

        $res = $this->getJson('/api/get_dashboard_all/2');

        $res->assertStatus(200);
        $birthdays = $res->json('data.team_birthday');

        $this->assertCount(2, $birthdays);
        $this->assertSame('Jan 05', $birthdays[0]['date'], 'earliest date first, day zero-padded to two digits');
        $this->assertSame('Birthday', $birthdays[0]['display'], 'the label is capitalised for display');
        $this->assertSame('Mar 03', $birthdays[1]['date']);
        $this->assertSame('Anniversary', $birthdays[1]['display']);
    }

    // =============================================================  page_type 3 — announcements

    /**
     * No department filter. The controller must pass a null department, ask for page 1, and take the
     * announcements from result set [1] — the unfiltered set.
     *
     * @test
     */
    public function the_announcements_tile_without_a_department_filter_reads_the_unfiltered_result_set()
    {
        $this->dashboardReturns([
            0 => [(object) ['Id' => 39, 'Name' => 'Human Resources']],
            1 => [(object) ['id' => 1, 'title' => 'company-wide']],
            2 => [(object) ['id' => 2, 'title' => 'department-only']],
        ]);

        $res = $this->getJson('/api/get_dashboard_all/3?dep_id=all');

        $res->assertStatus(200);
        $this->assertSame('company-wide', $res->json('data.announcements.0.title'));
        $this->assertSame('Human Resources', $res->json('data.departments.0.Name'));

        $params = $this->spParameters();
        $this->assertNull($params[2], '"all" must be translated to no department filter');
        $this->assertSame(1, $params[5], 'the unpaged view starts at page 1');
        $this->assertSame(6, $params[6], 'the unpaged view asks for 6 announcements');
    }

    /**
     * A department is chosen. Now the filter is forwarded, the page size drops to 3, and the
     * announcements are taken from result set [2] — the department-scoped set. Reading [1] here would
     * show an employee company-wide announcements while the screen claims to be filtered.
     *
     * @test
     */
    public function choosing_a_department_switches_to_the_scoped_result_set_and_the_smaller_page_size()
    {
        $this->dashboardReturns([
            0 => [(object) ['Id' => 39, 'Name' => 'Human Resources']],
            1 => [(object) ['id' => 1, 'title' => 'company-wide']],
            2 => [(object) ['id' => 2, 'title' => 'department-only']],
        ]);

        $res = $this->getJson('/api/get_dashboard_all/3?dep_id=39&page=2');

        $res->assertStatus(200);
        $this->assertSame(
            'department-only',
            $res->json('data.announcements.0.title'),
            'a filtered view must read the department-scoped announcements'
        );

        $params = $this->spParameters();
        $this->assertSame('39', (string) $params[2], 'the chosen department is forwarded to the procedure');
        $this->assertSame('2', (string) $params[5], 'the requested page is forwarded');
        $this->assertSame(3, $params[6], 'a paged announcements view asks for 3 rows, not 6');
    }

    // ====================================================================  page_type 4 and the catch

    /**
     * The EVOX-updates arm had its body removed. It must still answer with the standard envelope and
     * an empty payload rather than erroring — the tile is still requested by the front end.
     *
     * @test
     */
    public function the_evox_updates_tile_answers_with_an_empty_payload()
    {
        $this->dashboardReturns([0 => [], 1 => []]);

        $res = $this->getJson('/api/get_dashboard_all/4');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('data'), 'page_type 4 has no body left — it returns nothing');
    }

    /**
     * Catch arm. When the stored procedure fails the dashboard must return the handled error envelope,
     * not an unhandled 500 — the front end shows a message instead of a blank screen.
     *
     * @test
     */
    public function a_stored_procedure_failure_is_reported_as_a_handled_error_not_a_crash()
    {
        // EH_SP_Dashboard deliberately NOT faked: the seam throws instead of touching the database.

        $res = $this->getJson('/api/get_dashboard_all/1');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertStringContainsString(
            'EH_SP_Dashboard',
            $res->json('error.content'),
            'the failing procedure is named in the error content'
        );
    }
}
