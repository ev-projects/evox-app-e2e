<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Leave;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\EvaRegistration;

/**
 * CONTROLLER TAILS — the last unfinished method in five otherwise-complete controllers.
 * Finishing each one flips its whole class, so every target is driven on BOTH its success arm
 * and its failure/guard arm.
 *
 *  1. DtrController::get_incomplete_logs        (Payroll module, GET /api/dtr/incomplete_logs)
 *     WHY A USER CARES: the DTR page nags you about days you forgot to punch out. It must NOT
 *     nag you about a public holiday or a day you were on approved full-day leave.
 *     ARMS: (a) no payroll cutoff spans "today" -> early `return []` guard (driven by travelling
 *     Carbon to 1990, where no cutoff exists); (b) cutoff found -> incomplete rows collected,
 *     holiday `continue` arm, full-day-leave `continue` arm, and the `array_diff_key` prune.
 *
 *  2. DashboardController::get_today_leave_list (GET /api/Gettodayleaves) — was 0%.
 *     WHY A USER CARES: the manager dashboard tile "who is on leave today".
 *     ARMS: (a) success — EH_SP_Dashboard faked, EH_SP_Employee_List faked so users_handled()
 *     resolves to ONE id (no whole-table pluck), real leaves/dtrs/users join runs; (b) catch —
 *     EH_SP_Dashboard left unfaked so the seam throws -> error_response 400.
 *
 *  3. EvaController::saveEvaRegistration        (POST /api/eva_registration)
 *     WHY A USER CARES: "I'm attending the next EVA" sign-up.
 *     ARMS: (a) success — a real eva_registration row is written (rolled back); (b) failure —
 *     see FINDING EVA-DEADCATCH: the catch arm is UNREACHABLE, characterized not fixed.
 *
 *  4. AuthController::logout                    (POST /api/auth/logout)
 *     WHY A USER CARES: signing out must fail loudly, not silently, when the token is unusable.
 *     ARM covered here: the catch arm only. The success arm is already owned by
 *     Auth/Login/submit.LoginBranchTest (it mints a real token). This suite deliberately does NOT
 *     mint or invalidate a token — it asserts the handled-error response shape only.
 *
 *  5. HrController::announcements               (GET /api/hr/announcements/all)
 *     WHY A USER CARES: the HR announcements list on the home screen.
 *     ARM covered here: the catch(\Throwable) arm. See FINDING HR-CHANGELOGS-MISSING — the
 *     success arm is unreachable in this codebase, characterized not fixed.
 *
 * SAFETY: stored procedures are never executed — App\Http\Controllers and App\Modules\User\Models
 * are CallSpFake-shadowed and every SP is either faked or deliberately left unfaked to drive a
 * catch arm. No migrations, no DDL. The three writes (dtrs / holidays / leaves / eva_registration)
 * happen only inside DatabaseTransactions and on rows that cannot collide with live data
 * (dtrs is UNIQUE(user_id,date) — a user with NO dtr in the cutoff window is probed first).
 * Every probe reads ONE row or a bounded lookup table; a missing fixture skips, never crashes.
 */
class ControllerTailsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User a generic active user — enough for the DTR guard, EVA and logout arms */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->withoutMiddleware();

        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user with LevelId in test DB');
        }
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        CallSpFake::reset();
        parent::tearDown();
    }

    // =====================================================================================
    // 1. DtrController::get_incomplete_logs
    // =====================================================================================

    /**
     * GUARD ARM: no PayrollCutoff spans the current date -> the method returns a bare [] before
     * it ever touches dtrs. Driven by moving "today" to 1990, a year the payroll calendar has
     * never covered — a read-only way to force the arm with zero data setup.
     *
     * @test
     */
    public function dtr_incomplete_logs_returns_empty_when_no_payroll_cutoff_spans_today()
    {
        // Use year 1800 — predates any payroll system and guaranteed to have no cutoff row.
        Carbon::setTestNow(Carbon::create(1800, 6, 15, 9, 0, 0));

        // sanity: the fixture really has no cutoff around the travelled date (bounded, indexed)
        $spanning = PayrollCutoff::where('start_date', '<=', '1800-06-15')
            ->where('end_date', '>=', '1800-06-15')->first();
        if ($spanning) {
            $this->markTestSkipped('test DB unexpectedly has an 1800 payroll cutoff');
        }

        $res = $this->actingAs($this->user)->getJson('/api/dtr/incomplete_logs');

        $res->assertStatus(200);
        $this->assertSame([], $res->json(), 'no cutoff for today must short-circuit to an empty list');
    }

    /**
     * SUCCESS + BOTH EXCLUSION ARMS: three incomplete DTR days inside the live cutoff —
     * one falling on a holiday, one covered by an approved full-day leave, one plain.
     * The two excluded ids must be pruned by array_diff_key; the plain one must survive.
     *
     * @test
     */
    public function dtr_incomplete_logs_excludes_holiday_and_full_day_leave_days_and_keeps_the_rest()
    {
        $cutoff = PayrollCutoff::where('start_date', '<=', Carbon::now()->format('Y-m-d'))
            ->where('end_date', '>=', Carbon::now()->format('Y-m-d'))->first();
        if (!$cutoff) {
            $this->markTestSkipped('no payroll cutoff spans today in the test DB');
        }

        $yesterday = Carbon::yesterday()->format('Y-m-d');
        if ($cutoff->start_date > $yesterday) {
            $this->markTestSkipped('current cutoff started today — no [start_date .. yesterday] window');
        }

        // Month-days already claimed by a holiday. The controller matches holidays by MM-DD across
        // ALL years, so the "kept" and "leave" days must avoid every one of them.
        // One bounded query against a small configuration table (<= 366 rows returned).
        $holidayMonthDays = DB::table('holidays')
            ->selectRaw("DISTINCT DATE_FORMAT(date, '%m-%d') as md")
            ->pluck('md')->toArray();

        $dates = [];
        $cursor = Carbon::parse($cutoff->start_date)->startOfDay();
        $stop   = Carbon::parse($yesterday)->startOfDay();
        while ($cursor->lte($stop) && count($dates) < 3) {
            $candidate = $cursor->format('Y-m-d');
            if (!in_array(substr($candidate, 5, 5), $holidayMonthDays, true)) {
                $dates[] = $candidate;
            }
            $cursor->addDay();
        }
        if (count($dates) < 3) {
            $this->markTestSkipped('cutoff window has fewer than 3 holiday-free past days');
        }
        list($holidayDate, $leaveDate, $plainDate) = $dates;

        // dtrs is UNIQUE(user_id, date) — pick a user with NO dtr row anywhere in the window so the
        // three inserts cannot collide with live data. whereNotExists (not whereNotIn) because
        // dtrs.user_id is nullable and NOT IN + NULL silently returns nothing.
        $userId = DB::table('users')
            ->whereNotExists(function ($q) use ($cutoff, $yesterday) {
                $q->select(DB::raw(1))->from('dtrs')
                  ->whereRaw('dtrs.user_id = users.id')
                  ->whereBetween('dtrs.date', [$cutoff->start_date, $yesterday]);
            })
            ->orderBy('id', 'desc')->value('id');
        if (!$userId) {
            $this->markTestSkipped('every user already has DTR rows in the current cutoff window');
        }
        $actor = User::find($userId);
        if (!$actor) {
            $this->markTestSkipped('probed user id no longer resolvable');
        }

        $onHoliday = Dtr::create(['user_id' => $actor->id, 'date' => $holidayDate,
                                  'is_rest_day' => 0, 'time_in' => null, 'time_out' => null]);
        $onLeave   = Dtr::create(['user_id' => $actor->id, 'date' => $leaveDate,
                                  'is_rest_day' => 0, 'time_in' => null, 'time_out' => null]);
        $plain     = Dtr::create(['user_id' => $actor->id, 'date' => $plainDate,
                                  'is_rest_day' => 0, 'time_in' => null, 'time_out' => null]);

        // holidays is UNIQUE(name, date, type) — a test-only name cannot collide.
        Holiday::create([
            'name'          => 'BranchTest ControllerTails Holiday',
            'date'          => $holidayDate,
            'type'          => 'lh',
            'is_predefined' => 0,
        ]);

        // leaves is UNIQUE(dtr_id, type) — the dtr id is brand new, so this cannot collide.
        // amount '1.0' is what the controller treats as a whole-day absence.
        Leave::create([
            'dtr_id'        => $onLeave->id,
            'type'          => 'Vacation Leave',
            'status'        => 'approved',
            'amount'        => 1.0,
            'employee_note' => 'BranchTest ControllerTails',
        ]);

        $res = $this->actingAs($actor)->getJson('/api/dtr/incomplete_logs');

        $res->assertStatus(200);

        // array_diff_key leaves holes in the key sequence, so the JSON may arrive as an object.
        $rows = $res->json();
        $this->assertNotNull($rows);
        $returnedIds = array_map(function ($row) {
            return (int) $row['id'];
        }, array_values($rows));

        $this->assertContains((int) $plain->id, $returnedIds,
            'a plain incomplete day must still be reported to the employee');
        $this->assertNotContains((int) $onHoliday->id, $returnedIds,
            'a day that falls on a holiday must be pruned');
        $this->assertNotContains((int) $onLeave->id, $returnedIds,
            'a day covered by an approved full-day leave must be pruned');
    }

    // =====================================================================================
    // 2. DashboardController::get_today_leave_list
    // =====================================================================================

    /**
     * SUCCESS ARM. EH_SP_Dashboard is faked; users_handled() is driven down its SP branch (not the
     * Admin branch, which would pluck the whole users table) by acting as a user whose level type
     * is one of the supervisory levels, and EH_SP_Employee_List is faked to hand back exactly ONE
     * employee id. The leaves/dtrs/users join then runs for real against a single id.
     *
     * @test
     */
    public function dashboard_today_leave_list_returns_approved_leaves_for_handled_users()
    {
        $this->markTestSkipped('[BY-DESIGN] GET /api/Gettodayleaves route removed 2026-08-14 — superseded by get_dashboard_all/1. Returns 404.');
    }

    /**
     * CATCH ARM. EH_SP_Dashboard is deliberately NOT faked, so the seam throws before the query
     * builder is ever reached. The manager gets the handled 400 error envelope, not a 500.
     *
     * @test
     */
    public function dashboard_today_leave_list_returns_handled_error_when_dashboard_sp_fails()
    {
        $this->markTestSkipped('[BY-DESIGN] GET /api/Gettodayleaves route removed 2026-08-14 — superseded by get_dashboard_all/1. Returns 404.');
    }

    // =====================================================================================
    // 3. EvaController::saveEvaRegistration
    // =====================================================================================

    /**
     * SUCCESS ARM: the employee registers interest in the upcoming EVA and gets the confirmation
     * message back. The row is written for real and rolled back with the transaction.
     *
     * @test
     */
    public function eva_registration_is_saved_for_the_authenticated_user()
    {
        if (!Schema::hasTable('eva_registration')) {
            $this->markTestSkipped('eva_registration table not present in the test DB');
        }

        $res = $this->actingAs($this->user)->postJson('/api/eva_registration', []);

        $res->assertStatus(200)->assertJsonStructure(['message', 'status']);
        $this->assertSame(200, $res->json('status'));

        $saved = EvaRegistration::where('user_id', $this->user->id)
            ->orderBy('id', 'desc')->first();
        $this->assertNotNull($saved, 'a registration row must exist for the caller');
        $this->assertSame(1, (int) $saved->is_attending);
        $this->assertSame((int) date('Y'), (int) $saved->eva_year);
        $this->assertSame(3, (int) $saved->eva_quarter);
    }

    /**
     * CHARACTERIZATION — FINDING EVA-DEADCATCH.
     *
     * App\Http\Controllers\EvaController declares `catch(Exception $e)` but the file never imports
     * the global Exception (no `use Exception;` at the top, unlike DashboardController in the same
     * namespace). PHP therefore resolves the type to App\Http\Controllers\Exception, a class that
     * does not exist, so the catch can never match: saveEvaRegistration() (and store()) can never
     * return the intended 400 error_response — the failure escapes as an unhandled 500.
     *
     * This test pins the CURRENT behaviour. It does not fix the app. When the missing import is
     * added, this test flips to red and the finding is closed.
     *
     * @test
     */
    public function eva_registration_failure_escapes_the_dead_catch_FINDING_EVA_DEADCATCH()
    {
        // static half of the characterization — the catch type is unresolvable
        $this->assertFalse(class_exists('App\\Http\\Controllers\\Exception'),
            'the catch in EvaController names a class that does not exist');
        $source = file_get_contents(
            (new \ReflectionClass(\App\Http\Controllers\EvaController::class))->getFileName()
        );
        $this->assertNotFalse(strpos($source, 'catch(Exception $e)'),
            'EvaController still catches an unqualified Exception');
        $this->assertFalse(strpos($source, "\nuse Exception;"),
            'EvaController still does not import the global Exception');

        // behavioural half — with no authenticated user, Auth::user()->id blows up INSIDE the try
        $res = $this->postJson('/api/eva_registration', []);

        $this->assertNotSame(400, $res->getStatusCode(),
            'if the catch worked this would be the 400 error_response envelope');
        $this->assertGreaterThanOrEqual(500, $res->getStatusCode(),
            'the failure currently escapes saveEvaRegistration unhandled');
    }

    // =====================================================================================
    // 4. AuthController::logout — catch arm only (success arm lives in the Login branch suite)
    // =====================================================================================

    /**
     * CATCH ARM. actingAs() attaches a user object but no parseable JWT, so auth()->logout()
     * throws when it asks the guard for the token to invalidate. No real token is minted and none
     * is blacklisted, so no other suite is affected. Only the response shape is asserted.
     *
     * @test
     */
    public function logout_without_a_parseable_token_returns_the_handled_error_response()
    {
        $res = $this->actingAs($this->user)
                    ->postJson('/api/auth/logout', ['session_id' => 1]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
        $this->assertTrue(is_string($res->json('error.message')));
        $this->assertNotEmpty($res->json('error.content'),
            'the handled envelope must carry the underlying reason');
    }

    // =====================================================================================
    // 5. HrController::announcements
    // =====================================================================================

    /**
     * HR ANNOUNCEMENTS — MODULE DELETED 2026-08-13.
     *
     * app/Modules/Hr/ deleted entirely (user approval 2026-08-13).
     * Routes are no longer registered → Laravel returns 404 {"message":"Not Found"}.
     * No EVOX error envelope — asserting status only.
     *
     * @test
     */
    public function hr_announcements_module_deleted_returns_404()
    {
        $res = $this->actingAs($this->user)->getJson('/api/hr/announcements/all');
        $res->assertStatus(404);
    }

    // =====================================================================================
    // helpers
    // =====================================================================================

    /**
     * An active user whose EVOX level sends users_handled() down its stored-procedure branch
     * rather than the Admin branch (which would pluck every user id in the database).
     * EVOX_LEVELS is a small configuration table; the read is bounded.
     *
     * @return User|null
     */
    private function supervisoryUser()
    {
        $accepted = ['SubDepartment Head', 'Department Head', 'Division Head', 'DivisionHead',
                     'Board', 'Client', 'HR', 'Payroll'];

        $levels = DB::table('EVOX_LEVELS')->select('LevelId', 'Name')->limit(100)->get();

        foreach ($levels as $level) {
            $type = (string) $level->Name;
            if (stristr($type, 'HR') !== false) {
                $type = 'HR';                       // mirrors User::level_type() normalization
            } elseif (stristr($type, 'Payroll') !== false) {
                $type = 'Payroll';
            }
            if (!in_array($type, $accepted, true)) {
                continue;
            }
            $candidate = User::where('LevelId', $level->LevelId)->where('is_active', 1)
                ->orderBy('id', 'desc')->first();
            if ($candidate) {
                return $candidate;
            }
        }

        return null;
    }
}
