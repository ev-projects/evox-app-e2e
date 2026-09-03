<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Carbon\Carbon;
use Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Resources\DtrBiometricsResource;
use App\Modules\Payroll\Resources\DtrHalfDayMismacth;
use App\Modules\Payroll\Resources\DtrLogResource;
use App\Modules\Payroll\Resources\DtrLogResourceCollection;
use App\Modules\Report\Resources\NewDtrSummaryResource;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\User\Resources\UserProfileResource;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST
 *      app/Modules/Payroll/Resources/DtrLogResourceCollection.php :: toArray
 *      app/Modules/Payroll/Resources/DtrBiometricsResource.php    :: toArray
 *      app/Modules/Payroll/Resources/DtrHalfDayMismacth.php       :: toArray
 *      app/Modules/Report/Resources/NewDtrSummaryResource.php     :: toArray
 *
 *  MENU PATH
 *      Reports  -> DTR Logs            (the paginated log table — DtrLogResourceCollection)
 *      Reports  -> Half Day Mismatch   (DtrHalfDayMismacth)
 *      Reports  -> DTR Summary         (NewDtrSummaryResource)
 *      Admin    -> Cron -> Sync Biometrics to DTR   (DtrBiometricsResource is the sync response)
 *
 *  COVERAGE AT THE TIME OF WRITING
 *      DtrLogResourceCollection::toArray  0.00%
 *      DtrBiometricsResource::toArray     0.00%
 *      DtrHalfDayMismacth::toArray        0.00%
 *      NewDtrSummaryResource::toArray     0.00%
 *
 *  FINDINGS RAISED HERE
 *      RES-SUMMARY-NULL-1  NewDtrSummaryResource declares $result INSIDE its null guard and returns it
 *                          unconditionally, so a null row raises "Undefined variable: result" instead
 *                          of serialising as null like every sibling resource.
 *      RES-HALFDAY-NULL-1  DtrHalfDayMismacth queries the owner off $this->id BEFORE its null guard,
 *                          so the guard can never be reached — a null row is a fatal, not a null.
 *      RES-SUMMARY-THIN-1  NewDtrSummaryResource returns ONLY Employee_Name. Every other column the
 *                          DTR Summary report gathers (employee number, department, totals) is dropped
 *                          by the resource, which is why the screen reads its data elsewhere.
 * =====================================================================================================
 *
 *  METHOD. Rows are built in memory in exactly the shape the repositories produce (an unsaved Dtr for
 *  the biometrics response, a stdClass report row for the half-day mismatch). Timestamps are fixed
 *  epochs and every expected datetime is derived independently of the helper under test, so nothing
 *  here depends on the day the suite runs. The only queries are two bounded, indexed probes (one
 *  utc_timelog row, one active user in that country). DatabaseTransactions is carried for those.
 */
class PayrollDtrResourceContractsTest extends TestCase
{
    use DatabaseTransactions;

    /** 2026-08-03 09:00:00 UTC and 2026-08-03 18:00:00 UTC — fixed, never "now". */
    const TIME_IN  = 1785747600;
    const TIME_OUT = 1785780000;

    /** @var Request */
    private $request;

    protected function setUp(): void
    {
        parent::setUp();
        $this->request = Request::create('/api/probe', 'GET');
    }

    /** An active user whose country really has a utc_timelog row (owner-POV conversions need one). */
    private function timezoneAwareUser(): ?User
    {
        $zone = UtcTimelog::whereNotNull('timezone')->whereNotNull('country_id')
            ->orderBy('id', 'desc')->first();
        if (!$zone) return null;

        return User::where('country_id', $zone->country_id)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
    }

    // =================================================================================================
    //  DtrLogResourceCollection — Reports -> DTR Logs
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — a paginated log request must return the page's rows under `data` AND the five
     * pagination counters the table's pager binds to. Without them the pager renders a single page and
     * the payroll officer never sees rows 26 and up.
     */
    public function a_paginated_log_response_carries_the_page_rows_and_the_five_pager_counters()
    {
        $rows = collect([
            (object) ['id' => 1, 'date' => '2026-08-03'],
            (object) ['id' => 2, 'date' => '2026-08-04'],
        ]);
        $paginator = new LengthAwarePaginator($rows, 25, 2, 3);   // 25 rows, 2 per page, on page 3

        $out = (new DtrLogResourceCollection($paginator))->toArray($this->request);

        $this->assertArrayHasKey('pagination', $out);
        $this->assertSame(25, $out['pagination']['total']);
        $this->assertSame(2,  $out['pagination']['count']);        // rows on THIS page
        $this->assertSame(2,  $out['pagination']['per_page']);
        $this->assertSame(3,  $out['pagination']['current_page']);
        $this->assertSame(13, $out['pagination']['last_page']);    // ceil(25 / 2)

        // the page rows come through as DTR log resources, in order
        $this->assertCount(2, $out['data']);
        $this->assertInstanceOf(DtrLogResource::class, $out['data']->first());
    }

    /**
     * @test
     * BUSINESS RULE — the other arm: an unpaginated collection (the export/all-rows path) must NOT
     * invent pagination counters, because the caller uses their absence to decide it already holds
     * every row.
     */
    public function an_unpaginated_log_response_carries_rows_but_no_pager_counters()
    {
        $out = (new DtrLogResourceCollection(collect([
            (object) ['id' => 1, 'date' => '2026-08-03'],
        ])))->toArray($this->request);

        $this->assertArrayNotHasKey('pagination', $out);
        $this->assertArrayHasKey('data', $out);
        $this->assertCount(1, $out['data']);
    }

    /**
     * @test
     * BUSINESS RULE — an empty page is still a well-formed response: `data` is present and empty, and
     * the counters truthfully report zero rows, so the table renders its "no records" state rather
     * than an error.
     */
    public function an_empty_paginated_log_response_reports_zero_rows_and_one_page()
    {
        $paginator = new LengthAwarePaginator(new Collection([]), 0, 15, 1);

        $out = (new DtrLogResourceCollection($paginator))->toArray($this->request);

        $this->assertCount(0, $out['data']);
        $this->assertSame(0, $out['pagination']['total']);
        $this->assertSame(0, $out['pagination']['count']);
        $this->assertSame(15, $out['pagination']['per_page']);
        $this->assertSame(1, $out['pagination']['last_page']);
    }

    // =================================================================================================
    //  DtrBiometricsResource — Admin -> Cron -> Sync Biometrics to DTR
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — the biometrics sync response reports each touched DTR as a readable datetime
     * pair, not as the raw epochs the device feed stores, and it carries the owning employee so the
     * operator can see WHOSE log was written.
     */
    public function a_synced_biometric_row_is_reported_as_datetimes_with_its_owning_employee()
    {
        $user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$user) $this->markTestSkipped('no active user in test DB');

        $dtr = new Dtr();
        $dtr->setRawAttributes([
            'id'       => 77,
            'user_id'  => $user->id,
            'date'     => '2026-08-03',
            'time_in'  => self::TIME_IN,
            'time_out' => self::TIME_OUT,
        ]);

        $out = (new DtrBiometricsResource($dtr))->toArray($this->request);

        $this->assertSame(77, $out['id']);
        $this->assertSame($user->id, $out['user_id']);
        $this->assertSame('2026-08-03', $out['date']);
        // no authenticated viewer and no owner argument: the app timezone (UTC) is used verbatim
        $this->assertSame(gmdate('Y-m-d H:i:s', self::TIME_IN), $out['time_in']);
        $this->assertSame(gmdate('Y-m-d H:i:s', self::TIME_OUT), $out['time_out']);
        $this->assertInstanceOf(UserProfileResource::class, $out['user']);
        $this->assertSame($user->id, $out['user']->resource->id);
    }

    /**
     * @test
     * BUSINESS RULE — a DTR the sync could not resolve (nothing bound to the punch) must serialise as
     * null so the operator's result list shows a gap instead of a row of empty fields.
     */
    public function an_unresolved_biometric_row_serialises_as_null()
    {
        $this->assertNull((new DtrBiometricsResource(null))->toArray($this->request));
    }

    // =================================================================================================
    //  DtrHalfDayMismacth — Reports -> Half Day Mismatch
    // =================================================================================================

    /** A half-day mismatch row exactly as the report query returns it. */
    private function mismatchRow($userId)
    {
        return (object) [
            'id'              => $userId,
            'Employee_Number' => '10101',
            'Employee_Name'   => 'Cruz, Ana',
            'Department'      => 'Operations',
            'date'            => '2026-08-03',
            'time_in'         => self::TIME_IN,
            'time_out'        => self::TIME_OUT,
            'type'            => 'sick_leave',
            'amount'          => 0.5,
            'status'          => 'approved',
            'employee_note'   => 'half day, clinic',
            'created_at'      => '2026-08-03 01:00:00',
            'updated_at'      => '2026-08-03 02:00:00',
        ];
    }

    /**
     * @test
     * BUSINESS RULE — the mismatch report is read by HR in the EMPLOYEE's timezone: the row's punches
     * must be converted with the owning employee's country offset, not the app's, otherwise a
     * Philippine half-day looks like it was logged the previous evening.
     */
    public function a_half_day_mismatch_row_converts_its_punches_into_the_employees_own_timezone()
    {
        $user = $this->timezoneAwareUser();
        if (!$user) $this->markTestSkipped('no active user whose country has a utc_timelog row');

        $zone = UtcTimelog::where('country_id', $user->country_id)->first();
        $expectedIn  = Carbon::createFromTimestamp(self::TIME_IN)->setTimezone($zone->timezone)
            ->format('Y-m-d H:i:s');
        $expectedOut = Carbon::createFromTimestamp(self::TIME_OUT)->setTimezone($zone->timezone)
            ->format('Y-m-d H:i:s');

        $out = (new DtrHalfDayMismacth($this->mismatchRow($user->id)))->toArray($this->request);

        $this->assertSame($expectedIn, $out['time_in']);
        $this->assertSame($expectedOut, $out['time_out']);

        // and the rest of the row is passed through under the report's column names
        $this->assertSame('10101', $out['emp_no']);
        $this->assertSame('Cruz, Ana', $out['user_name']);
        $this->assertSame('Operations', $out['department_name']);
        $this->assertSame('2026-08-03', $out['date']);
        $this->assertSame('sick_leave', $out['type']);
        $this->assertSame(0.5, $out['amount']);
        $this->assertSame('approved', $out['status']);
        $this->assertSame('half day, clinic', $out['employee_note']);
        $this->assertSame('2026-08-03 01:00:00', $out['created_at']);
        $this->assertSame('2026-08-03 02:00:00', $out['updated_at']);
    }

    /**
     * @test
     * BUSINESS RULE — the other arm of the owner lookup: a report row whose employee can no longer be
     * resolved (deleted account) must still render, falling back to the application timezone rather
     * than dropping the row out of the report.
     */
    public function a_half_day_mismatch_row_for_an_unresolvable_employee_falls_back_to_the_app_timezone()
    {
        $row = $this->mismatchRow(999999999);          // an id no user can hold

        $out = (new DtrHalfDayMismacth($row))->toArray($this->request);

        $this->assertSame(gmdate('Y-m-d H:i:s', self::TIME_IN), $out['time_in']);
        $this->assertSame(gmdate('Y-m-d H:i:s', self::TIME_OUT), $out['time_out']);
        $this->assertSame('Cruz, Ana', $out['user_name']);
    }

    /**
     * @test
     * FINDING RES-HALFDAY-NULL-1 (characterisation).
     *
     * `$owner = User::where('users.id','=',$this->id)->first();` runs on line 19, ABOVE the
     * `if (! is_null($this->resource))` guard on line 20. Reading `$this->id` off a null resource is
     * fatal, so the guard is unreachable: a null row in the report collection takes the whole report
     * down instead of being skipped. Flip this to `assertNull(...)` once the lookup is moved inside
     * the guard.
     */
    public function a_null_half_day_mismatch_row_is_fatal_because_the_owner_lookup_precedes_the_guard_FINDING_RES_HALFDAY_NULL_1()
    {
        $this->expectException(\Throwable::class);

        (new DtrHalfDayMismacth(null))->toArray($this->request);
    }

    // =================================================================================================
    //  NewDtrSummaryResource — Reports -> DTR Summary
    // =================================================================================================

    /**
     * @test
     * FINDING RES-SUMMARY-THIN-1 (characterisation).
     *
     * The DTR Summary row the report query produces carries the employee number, department and every
     * computed total, but this resource emits ONE key: Employee_Name. Assert exactly that, so the day
     * someone restores the dropped columns this test fails and gets updated to the fuller contract.
     */
    public function a_dtr_summary_row_emits_only_the_employee_name_FINDING_RES_SUMMARY_THIN_1()
    {
        $row = (object) [
            'Employee_Name'   => 'Cruz, Ana',
            'Employee_Number' => '10101',
            'Department'      => 'Operations',
            'rendered_hours'  => 176,
            'overtime'        => 4,
        ];

        $out = (new NewDtrSummaryResource($row))->toArray($this->request);

        $this->assertSame(['Employee_Name' => 'Cruz, Ana'], $out);
        $this->assertArrayNotHasKey('Employee_Number', $out);
        $this->assertArrayNotHasKey('rendered_hours', $out);
    }

    /**
     * @test
     * FINDING RES-SUMMARY-NULL-1 (characterisation).
     *
     * `$result` is declared INSIDE the `if (! is_null($this->resource))` block but returned outside
     * it, so a null row in the summary collection returns an undefined variable — under the suite's
     * convertNoticesToExceptions that surfaces as a raised error, and in production it emits a notice
     * and serialises as null with a PHP warning in the log. Every sibling resource initialises
     * `$result = null` first. Flip to `assertNull(...)` when it does too.
     */
    public function a_null_dtr_summary_row_raises_an_undefined_variable_FINDING_RES_SUMMARY_NULL_1()
    {
        $this->expectException(\Throwable::class);

        (new NewDtrSummaryResource(null))->toArray($this->request);
    }
}
