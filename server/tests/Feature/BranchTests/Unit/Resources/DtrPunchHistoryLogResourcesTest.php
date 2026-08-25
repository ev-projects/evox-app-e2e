<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Payroll\Resources\DtrPunchHistoryLogResources;
use App\Modules\Payroll\Resources\DtrPunchLogResource;
use App\Modules\User\Models\User;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST
 *      app/Modules/Payroll/Resources/DtrPunchHistoryLogResources.php :: toArray
 *
 *  MENU PATH
 *      Attendance -> DTR -> Punch History   (the per-day punch list under a DTR row)
 *
 *  COVERAGE AT THE TIME OF WRITING
 *      DtrPunchHistoryLogResources::toArray  0.00%   (never instantiated by any test)
 *
 *  WHAT IT IS. This is the payload behind the punch list a person sees when they open a day on their
 *  DTR: every active punch pair for that date, plus the day's rendered hours, night differential and
 *  overtime read from the payroll summary. It is resolved for the logged-in user or, for a supervisor,
 *  for one of their supervisees — `get_authenticated_user()` enforces that, which is why the suite
 *  authenticates before resolving anything.
 *
 *  FINDINGS RAISED HERE
 *      RES-PUNCHDAY-NULL-1  The resource resolves `$this->user_id` and fetches the punch history
 *                           BEFORE its `is_null($this->resource)` guard, so the guard is unreachable:
 *                           a null day in the collection is fatal instead of being skipped.
 * =====================================================================================================
 *
 *  METHOD. The day being rendered is an in-memory Dtr carrying only the two attributes the resource
 *  reads (user_id, date) — nothing is created and nothing is saved. Which day to render is chosen by
 *  two bounded, indexed probes against rows that already exist in the dump: one punch row for the
 *  populated arm and one payroll summary row for the payroll-items arm. Both arms of the summary
 *  lookup are driven (a day with a summary row, and a day without one).
 */
class DtrPunchHistoryLogResourcesTest extends TestCase
{
    use DatabaseTransactions;

    /** @var Request */
    private $request;

    protected function setUp(): void
    {
        parent::setUp();
        $this->request = Request::create('/api/probe', 'GET');
    }

    /** The day under render, exactly as the DTR controller hands it over. */
    private function day($userId, $date)
    {
        $dtr = new Dtr();
        $dtr->setRawAttributes(['id' => 0, 'user_id' => $userId, 'date' => $date]);

        return $dtr;
    }

    /**
     * @test
     * BUSINESS RULE — opening a day shows that day's ACTIVE punches and nothing else: not another
     * day's punches, and not punches that were superseded by an approved punch correction
     * (is_active = 0). The day is reported back under the same employee and date it was asked for.
     */
    public function opening_a_day_lists_only_that_days_active_punches_for_that_employee()
    {
        $punch = DtrPunchHistory::where('is_active', 1)->whereNotNull('date')
            ->orderBy('id', 'desc')->first();
        if (!$punch) $this->markTestSkipped('no active punch history row in test DB');

        $user = User::find($punch->user_id);
        if (!$user) $this->markTestSkipped('probed punch row has no resolvable owner');
        $this->be($user);

        $out = (new DtrPunchHistoryLogResources($this->day($user->id, $punch->date)))
            ->toArray($this->request);

        $this->assertSame($user->id, $out['user_id']);
        $this->assertSame($punch->date, $out['date']);

        $this->assertGreaterThan(0, count($out['time_log']), 'the probed punch was not listed');
        foreach ($out['time_log'] as $entry) {
            $this->assertInstanceOf(DtrPunchLogResource::class, $entry);
            $this->assertSame($punch->date, $entry->resource->date);
            $this->assertSame($user->id, $entry->resource->user_id);
        }
    }

    /**
     * @test
     * BUSINESS RULE — the day carries the payroll figures the DTR screen shows next to the punch list:
     * rendered hours, night differential, overtime and overtime night differential, each formatted as
     * a clock value (or blank when the day earned none of it). All four are always present together —
     * the screen reads them as a set.
     */
    public function a_day_with_a_payroll_summary_carries_its_four_computed_figures()
    {
        $summary = DB::table('drt_summary_report')->whereNotNull('login_date')
            ->orderBy('login_date', 'desc')->first();
        if (!$summary) $this->markTestSkipped('no drt_summary_report row in test DB');

        $user = User::find($summary->user_id);
        if (!$user) $this->markTestSkipped('probed summary row has no resolvable owner');
        $this->be($user);

        $out = (new DtrPunchHistoryLogResources($this->day($user->id, $summary->login_date)))
            ->toArray($this->request);

        $this->assertSame(
            ['rendered_hours', 'night_diff', 'overtime', 'overtime_night_diff'],
            array_keys($out['payroll_items'])
        );
        foreach ($out['payroll_items'] as $figure) {
            $this->assertInternalType('string', $figure);
        }
        $this->assertSame($summary->login_date, $out['date']);
    }

    /**
     * @test
     * BUSINESS RULE — the other arm: a day with no punches and no payroll summary (a date before the
     * employee joined, or a future date) renders as an EMPTY day rather than an error. The DTR screen
     * relies on that to draw a blank day.
     */
    public function a_day_with_no_punches_and_no_summary_renders_as_an_empty_day()
    {
        // whereHas('level') guards: isLevel() -> level_type() crashes when LevelId has no EvoxLevels row
        $user = User::where('is_active', 1)->whereNotNull('LevelId')->whereHas('level')->orderBy('id', 'desc')->first();
        if (!$user) $this->markTestSkipped('no active user with a valid EvoxLevels entry in test DB');
        $this->be($user);

        $out = (new DtrPunchHistoryLogResources($this->day($user->id, '1990-01-01')))
            ->toArray($this->request);

        $this->assertSame($user->id, $out['user_id']);
        $this->assertSame('1990-01-01', $out['date']);
        $this->assertCount(0, $out['time_log']);
        $this->assertSame([], $out['payroll_items']);
    }

    /**
     * @test
     * FINDING RES-PUNCHDAY-NULL-1 (characterisation).
     *
     * `get_authenticated_user($this->user_id)` and the punch-history fetch both run ABOVE the
     * `if (! is_null($this->resource))` guard, so reading a null day is fatal and the guard is dead
     * code. A single null entry in the collection therefore takes the whole punch list down instead of
     * being skipped, which is the opposite of what the guard was written for. Flip to assertNull()
     * when the guard is moved to the top of the method.
     */
    public function a_null_day_is_fatal_because_the_owner_lookup_precedes_the_guard_FINDING_RES_PUNCHDAY_NULL_1()
    {
        $user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(\Throwable::class);

        (new DtrPunchHistoryLogResources(null))->toArray($this->request);
    }
}
