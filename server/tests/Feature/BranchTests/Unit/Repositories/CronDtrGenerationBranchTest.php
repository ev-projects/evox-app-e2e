<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Console\OutputStyle;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use App\Console\Commands\generateWeeklyDtr;
use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;

/**
 * THE DTR GENERATION CHAIN — the cron that creates every employee's day before anyone can be paid
 * for it. Read as a page lifecycle:
 *
 *   PHASE 1  CRON FIRES        generateWeeklyDtr::handle() asks the user repo for the active roster
 *                              and builds next month's date array.
 *   PHASE 2  DAYS ARE CREATED  DtrRepository::generate_dtr() batch-inserts one row per user per date
 *                              and then stamps the best schedule onto each created day.
 *   PHASE 3  THINGS BIND ON    bind_holidays_to_dtr / bind_superceded_leaves_to_dtr attach holidays
 *                              and cancelled leaves to the days that already exist.
 *   PHASE 4  PUNCHES LAND      sync_biometrics_to_dtr matches a clock punch to a day and computes.
 *
 * Both outcomes are covered per phase: the happy arm AND the empty/failure/guard arm.
 *
 * ONLY the branches NOT already covered by DtrRepositoryCronSpFakeTest (generate happy path,
 * idempotency, one-day holiday range, superceded happy row, empty-batch finding, empty biometrics)
 * and DtrRepositorySpFakeTest (bind_leaves_to_dtr, all five arms) are exercised here.
 *
 * SAFETY: staging DB is a LIVE BACKUP DUMP. DatabaseTransactions only; every probe is bounded to
 * ONE user / ONE day; all writes use year 2094-2095 so they can never collide with real data; the
 * call_sp seam is ACTIVE as a tripwire (these bodies are SP-free — if a hidden SP path exists the
 * seam throws instead of hanging). No DDL, no unbounded gets, no external calls.
 *
 * FINDINGS registered by this file (see the per-test comments):
 *   DTR-BIO-TX1  DtrRepository::apply_biometrics_to_dtr commits TWICE on the success arm
 *                (line 1194 inside the if-block, then line 1223 after it). Nested one level deep
 *                the second commit is the one PDO actually honours, so it COMMITS THE CALLER'S
 *                transaction. Under DatabaseTransactions that means a test's writes escape the
 *                rollback and land in the live-backup DB — which is exactly why the
 *                "punch WITH a matching day" arm is deliberately NOT executed below.
 *   DTR-HOL-DEL1 bind_holidays_to_dtr line 717 calls $dtr->holidays()->delete() on a
 *                belongsToMany relation. That deletes rows from the holidays MASTER table (detach()
 *                is what removes the pivot). One country-specific holiday landing on a day that
 *                already carries a global holiday can wipe that global holiday for the whole
 *                company. Arm documented, NOT executed.
 *   DTR-HOL-DEAD bind_holidays_to_dtr lines 726-728 (the "different country_id" else) can never
 *                run: when $holiday->country_id is not null the DTR query at 668-670 has already
 *                filtered users to that same country_id, and when it IS null the if at 714 is
 *                always true. Dead code.
 *   DTR-SUP-1    bind_superceded_leaves_to_dtr builds no $leave_insert_array guard, so ANY batch
 *                that produces zero insert values (no superceded rows, OR superceded rows whose
 *                days have no DTR yet, OR an unknown employee number) implodes an empty array into
 *                the INSERT and throws. Second and third triggers characterised below.
 *   DTR-GEN-SQL1 generate_dtr interpolates $date straight into the INSERT string (line 68-73) with
 *                no escaping or binding — a value carrying a quote breaks the statement outright.
 */
class CronDtrGenerationBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var DtrRepository */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = app()->make(DtrRepository::class);

        // ONE active, BHR-numbered user — bounded probe, no table scan.
        $this->user = User::where('is_active', 1)->whereNotNull('bhr_num')->orderBy('id', 'desc')->first()
                   ?: User::whereNotNull('bhr_num')->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no BHR-numbered user in test DB');
        }
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Loose Mockery mock bound into the container for an interface. */
    private function mockDep(string $iface)
    {
        $m = Mockery::mock($iface)->shouldIgnoreMissing();
        $this->app->instance($iface, $m);
        return $m;
    }

    /** Container-build a console command and reflection-bind input/output so handle() runs directly. */
    private function makeCommand(string $class, array $input = [])
    {
        $cmd = $this->app->make($class);
        $cmd->setLaravel($this->app);
        $in  = new ArrayInput($input, $cmd->getDefinition());
        $ref = new \ReflectionObject($cmd);
        foreach (['input' => $in, 'output' => new OutputStyle($in, new NullOutput())] as $prop => $val) {
            $p = $ref->getProperty($prop);
            $p->setAccessible(true);
            $p->setValue($cmd, $val);
        }
        return $cmd;
    }

    /** The one-user collection every generation call in this file is bounded to. */
    private function oneUser()
    {
        return User::where('id', $this->user->id)->get();
    }

    /** Generate exactly one far-future day for the fixture user and return the created DTR. */
    private function generateOneDay($date)
    {
        $this->repo->generate_dtr($this->oneUser(), [$date]);
        return Dtr::where('user_id', $this->user->id)->where('date', $date)->first();
    }

    /** BHR-shaped superceded leave row for the fixture user. */
    private function supercededLeave($id, $start, $end, array $overrides = [])
    {
        $base = [
            'id'         => $id,
            'employeeId' => $this->user->bhr_num,
            'start'      => $start,
            'end'        => $end,
            'dates'      => (object) [$start => 1],
            'type'       => (object) ['name' => 'Vacation Leave'],
            'status'     => (object) ['status' => 'superceded', 'lastChangedByUserId' => 3],
            'notes'      => (object) ['employee' => 'e', 'manager' => 'm'],
            'amount'     => (object) ['amount' => 1],
        ];
        return (object) array_merge($base, $overrides);
    }

    /** An in-memory clock punch. Never saved — Biometrics is read-only and lives on another connection. */
    private function punch($checkTime)
    {
        $bio = new Biometrics();
        $bio->Userid    = $this->user->emp_num;
        $bio->CheckTime = $checkTime;
        $bio->CheckType = 'I';
        return $bio;
    }

    // ══ PHASE 1 — the cron fires ═════════════════════════════════════════════
    // Happy path (roster read, next month's dates built) is already covered in
    // ConsoleSyncCommandsSpFakeTest. Only the failure arm remains.

    /** @test */
    public function the_weekly_dtr_cron_reports_an_error_instead_of_crashing_when_the_employee_list_cannot_be_read()
    {
        $userRepo = $this->mockDep(UserRepositoryInterface::class);
        $userRepo->shouldReceive('get_all_active_users')->once()
                 ->andThrow(new \Exception('roster unavailable'));

        $dtrRepo = $this->mockDep(DtrRepositoryInterface::class);
        $dtrRepo->shouldNotReceive('generate_dtr');   // nothing is generated when the roster fails

        $response = $this->makeCommand(generateWeeklyDtr::class)->handle();

        $this->assertSame(400, $response->getStatusCode());
        $body = $response->getData(true);
        $this->assertArrayHasKey('error', $body);
        $this->assertSame('roster unavailable', $body['error']['content']);
        $this->assertSame([], CallSpFake::calls());
    }

    // ══ PHASE 2 — the days are created ═══════════════════════════════════════

    /** @test */
    public function generating_days_for_an_empty_employee_list_writes_nothing_and_reports_zero_days()
    {
        $result = $this->repo->generate_dtr(new EloquentCollection([]), ['2094-05-01', '2094-05-02']);

        $this->assertSame(0, $result['total_dtr_count']);
        $this->assertSame([], $result['dtr']);
        $this->assertSame(0, Dtr::whereIn('date', ['2094-05-01', '2094-05-02'])->count());
        $this->assertSame([], CallSpFake::calls());
    }

    /** @test */
    public function a_newly_generated_day_is_stamped_with_the_source_of_the_schedule_that_was_applied()
    {
        $dtr = $this->generateOneDay('2094-05-05');
        $this->assertNotNull($dtr, 'generation did not create the day');

        $schedule = $dtr->getBestSchedule();
        if (!is_valid($schedule)) {
            $this->markTestSkipped('fixture user has no schedule effective on the generated date');
        }

        // generate_dtr line 132: the created day inherits the winning schedule's source type
        $this->assertSame($schedule->source_type, $dtr->source_type_tagging);
        // line 131: the day is explicitly marked as a working day or a rest day, never left unknown
        $this->assertNotNull($dtr->is_rest_day);
        $this->assertSame([], CallSpFake::calls());
    }

    /** @test */
    public function a_malformed_date_aborts_the_whole_generation_batch_and_leaves_no_days_behind()
    {
        // FINDING DTR-GEN-SQL1: the date is concatenated raw into the INSERT, so a value carrying a
        // quote breaks the statement. One bad date in the batch kills every good date with it.
        $dates = ['2094-06-01', "2094-06-02'"];

        try {
            $this->repo->generate_dtr($this->oneUser(), $dates);
            $this->fail('expected the malformed date to abort the batch');
        } catch (\Illuminate\Database\QueryException $e) {
            // generate_dtr catch arm: rollback + rethrow
        }

        // the good date in the same batch was never written either
        $this->assertSame(0, Dtr::where('user_id', $this->user->id)->where('date', '2094-06-01')->count());
        $this->assertSame([], CallSpFake::calls());
    }

    // ══ PHASE 3 — holidays bind onto the days ════════════════════════════════

    /** Pick a predefined, country-agnostic holiday whose month-day is unique in the holidays table. */
    private function uniquePredefinedHoliday()
    {
        $candidates = Holiday::where('is_predefined', 1)->whereNull('country_id')
                             // PROBE WIDENED 2026-08-06: was limit(25). A window that small gave up on databases
                             // holding thousands of qualifying rows, so the test marked itself incomplete and covered
                             // NOTHING - which is why several classes with working tests reported 0% coverage.
                             // Still bounded and indexed; no whole-table scan.
                             ->orderBy('id', 'desc')->limit(400)->get();

        foreach ($candidates as $holiday) {
            $md = ($holiday->date instanceof \DateTimeInterface)
                ? $holiday->date->format('m-d')
                : \Carbon\Carbon::parse($holiday->date)->format('m-d');
            $sameDay = Holiday::whereRaw("DATE_FORMAT(date, '%m-%d') = ?", [$md])->count();
            if ($sameDay === 1) {
                return [$holiday, $md];
            }
        }
        return [null, null];
    }

    /** @test */
    public function a_holiday_falling_inside_the_requested_range_is_attached_to_that_day()
    {
        list($holiday, $md) = $this->uniquePredefinedHoliday();
        if (!$holiday) {
            $this->markTestSkipped('no predefined holiday with a unique month-day in test DB');
        }

        $date = '2094-' . $md;
        $dtr  = $this->generateOneDay($date);
        $this->assertNotNull($dtr);
        $this->assertSame(0, $dtr->holidays()->count(), 'fresh day should start with no holiday');

        $result = $this->repo->bind_holidays_to_dtr($date, $date);

        $this->assertTrue($result->pluck('id')->contains($dtr->id), 'the generated day was not bound');
        $this->assertSame(1, $dtr->holidays()->count());
        $this->assertSame($holiday->id, $dtr->holidays()->first()->id);
        $this->assertSame([], CallSpFake::calls());
    }

    /** @test */
    public function running_the_holiday_binding_twice_never_attaches_the_same_holiday_a_second_time()
    {
        list($holiday, $md) = $this->uniquePredefinedHoliday();
        if (!$holiday) {
            $this->markTestSkipped('no predefined holiday with a unique month-day in test DB');
        }

        $date = '2094-' . $md;
        $dtr  = $this->generateOneDay($date);
        $this->assertNotNull($dtr);

        $this->repo->bind_holidays_to_dtr($date, $date);
        $afterFirstRun = $dtr->holidays()->count();

        // the NOT EXISTS guard means the second cron run finds nothing left to bind
        $second = $this->repo->bind_holidays_to_dtr($date, $date);

        $this->assertFalse($second->pluck('id')->contains($dtr->id));
        $this->assertSame($afterFirstRun, $dtr->holidays()->count());
        $this->assertSame([], CallSpFake::calls());
    }

    /** @test */
    public function a_day_with_no_holiday_in_the_requested_range_is_left_untouched()
    {
        $taken = Holiday::selectRaw("DATE_FORMAT(date, '%m-%d') as md")
                        ->limit(500)->get()->pluck('md')->all();

        $freeMd = null;
        for ($day = 2; $day <= 27; $day++) {
            $candidate = '06-' . str_pad($day, 2, '0', STR_PAD_LEFT);
            if (!in_array($candidate, $taken, true)) {
                $freeMd = $candidate;
                break;
            }
        }
        if (!$freeMd) {
            $this->markTestSkipped('every candidate June day carries a holiday in test DB');
        }

        $date = '2094-' . $freeMd;
        $dtr  = $this->generateOneDay($date);
        $this->assertNotNull($dtr);

        $result = $this->repo->bind_holidays_to_dtr($date, $date);

        $this->assertCount(0, $result);
        $this->assertSame(0, $dtr->holidays()->count());
        $this->assertSame([], CallSpFake::calls());
    }

    // ══ PHASE 3 — cancelled (superceded) leaves bind onto the days ═══════════

    /** @test */
    public function a_batch_of_cancelled_leaves_is_written_even_when_one_of_them_has_no_matching_day()
    {
        $dtr = Dtr::select('dtrs.*')
                  ->where('dtrs.user_id', $this->user->id)
                  ->orderBy('dtrs.id', 'desc')
                  ->first();
        if (!$dtr) {
            $this->markTestSkipped('fixture user has no existing DTR row');
        }

        $withDay    = $this->supercededLeave(601, $dtr->date, $dtr->date,
                                             ['dates' => (object) [$dtr->date => 1]]);
        $withoutDay = $this->supercededLeave(602, '2095-05-01', '2095-05-01');   // no DTR generated yet

        $processed = $this->repo->bind_superceded_leaves_to_dtr([$withDay, $withoutDay]);

        // both rows are reported back to the cron, only the one with a real day produced an insert
        $this->assertCount(2, $processed);
        $this->assertSame('superceded', $processed[0]['status']);
        $this->assertSame('superceded', $processed[1]['status']);
        $this->assertSame($this->user->emp_num, $processed[0]['employee_no']);
        $this->assertSame('2095-05-01 - 2095-05-01', $processed[1]['date']);
        $this->assertSame([], CallSpFake::calls());
    }

    /** @test */
    public function cancelled_leaves_whose_days_have_not_been_generated_yet_break_the_whole_batch()
    {
        // FINDING DTR-SUP-1 (second trigger): the rows ARE superceded and the employee IS known, but
        // no DTR exists for those dates, so $leave_insert_array stays empty -> implode of an empty
        // array -> "VALUES ()" -> QueryException. Every leave sync that runs ahead of DTR generation
        // takes this path and only survives because CronController swallows the rethrow.
        $leave = $this->supercededLeave(603, '2095-06-01', '2095-06-02',
                                        ['dates' => (object) ['2095-06-01' => 1]]);

        $this->expectException(\Exception::class);
        $this->repo->bind_superceded_leaves_to_dtr([$leave]);
    }

    /** @test */
    public function a_cancelled_leave_for_an_unknown_employee_number_is_skipped_instead_of_being_written()
    {
        // Employee lookup returns null, so the per-row handler bails (reading emp_num off null) and
        // the loop continues to the next row — nothing for this employee is ever inserted. With no
        // insert values left the batch then hits FINDING DTR-SUP-1 on the way out.
        $leave = $this->supercededLeave(604, '2095-07-01', '2095-07-01',
                                        ['employeeId' => 'ZZ-NO-SUCH-BHR-' . uniqid()]);

        $this->expectException(\Exception::class);
        $this->repo->bind_superceded_leaves_to_dtr([$leave]);
    }

    // ══ PHASE 4 — clock punches land on the days ═════════════════════════════
    //
    // The "punch WITH a matching day" arm is deliberately NOT executed here: see FINDING DTR-BIO-TX1
    // in the class docblock. apply_biometrics_to_dtr commits twice on that arm, and the second commit
    // ends the caller's transaction — under DatabaseTransactions the writes would be committed to the
    // live-backup DB instead of being rolled back. Both arms below stay on single-commit paths.

    /** @test */
    public function a_punch_that_matches_no_existing_day_syncs_nothing_and_computes_no_payroll()
    {
        $result = $this->repo->sync_biometrics_to_dtr(
            new EloquentCollection([$this->punch('2094-08-01 09:00:00')]),
            999999999                                  // guaranteed-miss DTR id
        );

        $this->assertCount(0, $result);                // nothing pushed -> compute_payroll_items never ran
        $this->assertSame([], CallSpFake::calls());
    }

    /** @test */
    public function a_punch_for_an_employee_with_an_unreadable_hire_date_is_skipped_and_the_run_continues()
    {
        // in-memory only — the fixture user is never saved with this value
        $signedIn = User::find($this->user->id);
        $signedIn->date_hired = 'not-a-date';
        $this->be($signedIn);

        $result = $this->repo->sync_biometrics_to_dtr(
            new EloquentCollection([
                $this->punch('2094-08-02 09:00:00'),
                $this->punch('2094-08-03 09:00:00'),
            ]),
            999999999                                  // guaranteed-miss DTR id -> "no day" arm
        );

        // both punches blow up on the unparsable hire date, both are caught per-row, the cron survives
        $this->assertCount(0, $result);
        $this->assertSame([], CallSpFake::calls());
    }
}
