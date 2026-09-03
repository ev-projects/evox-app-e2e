<?php

namespace Tests\Feature\BranchTests\Unit\Exports;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator as ValidatorFactory;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Config\Repository as ConfigRepository;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Contracts\Auth\Authenticatable;
use Maatwebsite\Excel\Sheet;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Mockery;

use App\Exports\DisputeExport;
use App\Exports\TimeoffAllocationExport;
use App\Modules\Attendance\Services\AttendanceGeoGate;
use App\Modules\Coe\Repositories\COERepository;
use App\Modules\Coe\Models\COE;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepository;
use App\Jobs\AssignAllUserToAdminJob;
use App\Modules\Request\Http\Requests\ChangeScheduleRequest;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;
use App\Classes\EvoxActivityLogger;
use App\Models\Activity;

/**
 * PACKET: ExportAndServiceArms — completes backend classes that sat 1-6 lines from 100%.
 *
 * Coverage counts a class only when EVERY method is fully line-covered, so a single
 * unexercised arm sinks the class. Each entry below states the arm that was short and how
 * this suite drives it, or — where the arm CANNOT honestly be driven — why not.
 *
 * ===========================================================================================
 * CLASSES COMPLETED HERE
 * ===========================================================================================
 *
 * App\Exports\DisputeExport  (app/Exports/DisputeExport.php:44)
 *     Short by: the ELSE arm of `if (isset($this->pre_mon))` inside the AfterSheet closure —
 *     the "Overall Report" title used when the Dispute export is run with no payroll cutoff
 *     selected. The existing ExportsMappersTest only asserts registerEvents() returns the hook;
 *     it never invokes the closure, so neither title arm ever ran.
 *     Driven by: building a real PhpSpreadsheet worksheet, wrapping it in a real
 *     Maatwebsite Sheet + AfterSheet event (exactly what the writer does at close()) and
 *     calling the registered closure. CLASSIFICATION (a) REACHABLE — DisputeController passes
 *     null cutoff months whenever the user exports the un-filtered dispute list.
 *
 * App\Exports\TimeoffAllocationExport  (app/Exports/TimeoffAllocationExport.php)
 *     Short by: the two `if ($this->country == 1)` blocks in the AfterSheet closure (the
 *     "Prev. Used" merge and the "No of Lv availed" header block) plus the new-hire banner
 *     ternary in array(). No test existed for this export at all.
 *     Driven by: closure invocation for country 1 and for a non-India country, and array()
 *     with and without new hires. CLASSIFICATION (a) REACHABLE.
 *
 * App\Modules\Attendance\Services\AttendanceGeoGate  (…/AttendanceGeoGate.php:39, 114)
 *     Short by: line 39 `return []` for a null caller, and line 114 `catch (\Throwable $e)`
 *     in isPrivileged(). The catch exists because level_type() dereferences
 *     `$this->level()->first()->Name` with no null guard — when the EVOX_LEVELS lookup fails
 *     or returns nothing, isLevel() blows up.
 *     Driven by: a User subclass whose level() relation throws (models the lookup failing),
 *     asserting the documented rule "never silently grant access".
 *     CLASSIFICATION (a) REACHABLE — and the catch is a genuine \Throwable, not the
 *     `catch (Exception)` mistake seen in UA-AUTH-1 / OPS-ERR-1.
 *
 * App\Modules\Coe\Repositories\COERepository  (…/CoeRepository.php:35-37, 144-146)
 *     Short by: the catch arms of all() and find(). CoeRepositorySpFakeTest already covers
 *     create()'s catch (unfaked stored procedure) and both success paths, but nothing made
 *     the Eloquent read itself fail.
 *     Driven by: swapping the Eloquent connection resolver for one that throws QueryException
 *     — i.e. the database being unreachable, which is precisely the failure these catches
 *     exist for. The resolver is restored in a finally block AND in tearDown.
 *     CLASSIFICATION (a) REACHABLE.
 *
 * App\Jobs\AssignAllUserToAdminJob  (app/Jobs/AssignAllUserToAdminJob.php:47-50)
 *     Short by: the `catch (Exception $e) { log_error(...); throw $e; }` arm of handle().
 *     Driven by two ways: a repository double that throws, and the real UserRepository with a
 *     user id that no longer exists (User::findOrFail -> ModelNotFoundException, which is what
 *     actually happens when an employee is deleted between the request and the queue run).
 *     CLASSIFICATION (a) REACHABLE.
 *
 * App\Modules\Request\Http\Requests\ChangeScheduleRequest  (…/ChangeScheduleRequest.php:57-58)
 *     Short by: the body of failedValidation() — the throw that converts Laravel's default
 *     redirect/422 into EVOX's error_response envelope.
 *     Driven by: a real Validator built from the request's own rules() output, then the
 *     protected hook invoked the way ValidatesWhenResolvedTrait invokes it.
 *     CLASSIFICATION (a) REACHABLE.
 *
 * App\Classes\EvoxActivityLogger  (app/Classes/ActivityLogger.php:105-106)
 *     Short by: the TRUE arm of `if ($this->performedOn)` in log() — the line that tags the
 *     audit row with its subject. NOT a catch arm.
 *     Driven by: (1) the same process-local sqlite mirror the existing ActivityLoggerTest
 *     uses, asserting subject_type/subject_id actually land on the row; and (2) a
 *     driver-failure test that runs in EVERY environment (no pdo_sqlite needed) and pins
 *     FINDING ACTLOG_003 below.
 *     CLASSIFICATION (a) REACHABLE.
 *
 * ===========================================================================================
 * ARMS DELIBERATELY NOT TESTED — reported as findings instead
 * ===========================================================================================
 *
 * FINDING SYNC-EXIT-1 — (c) UNTESTABLE BY CONSTRUCTION.
 *     app/Console/Commands/syncBhrLeaves.php:134-135. The "Payroll Cut-off dates are required"
 *     null guard logs and then calls exit(). A test cannot execute that line without killing
 *     the PHPUnit process, and in a web request exit() bypasses the surrounding try/catch,
 *     the error_response envelope and every terminating middleware — the caller gets a blank
 *     200 with an empty body instead of the 400 the rest of the method produces. NOT TESTED.
 *
 * FINDING DPA-EVENTS-1 — (d) GENUINELY UNREACHABLE.
 *     app/Exports/DpaListExport.php:75-80. DpaListExport declares
 *     `implements FromCollection, WithHeadings` — it does NOT implement WithEvents, so
 *     Maatwebsite\Excel\Sheet::close() never raises AfterSheet for it and registerEvents() is
 *     never called by the writer. Even if WithEvents were added, the loop body on line 79 is
 *     still unreachable: the handler iterates `$sheet->getColumnDimensions()`, and because the
 *     class implements neither ShouldAutoSize nor WithColumnWidths, nothing has registered a
 *     single column dimension by AfterSheet time — the array is always empty. Net effect: the
 *     DPA List export ships with unsized columns and the auto-size code is dead in every
 *     configuration. Fix is one word (`implements FromCollection, WithHeadings, WithEvents,
 *     ShouldAutoSize`), not a test. NOT TESTED.
 *
 * FINDING EAR-ORPHAN-1 — (d) GENUINELY UNREACHABLE.
 *     app/Exports/EmployeeAttendanceReportExport.php:344-347 (daydate) and 352-361 (newline).
 *     Both are `private` and have no call site anywhere in app/ — leftovers from an earlier
 *     layout. Nothing in the application can execute them; the only way to reach them is
 *     ReflectionMethod::setAccessible(), which tests a path production cannot take. That is
 *     coverage theatre, so EmployeeAttendanceReportExport is left at its current figure and
 *     the two orphans are reported for deletion. NOT TESTED.
 *
 * FINDING ACTLOG_003 — App\Classes\EvoxActivityLogger::log() has no try/catch at all. If the
 *     evox_logs connection is misconfigured or down, the exception from $activity->save()
 *     propagates straight out of log(), out of log_activity(), and out of whatever controller
 *     called it: an audit-store outage turns every audited action into a raw 500 even though
 *     the business operation itself succeeded. Characterised by
 *     an_unreachable_audit_store_fails_the_callers_request_instead_of_being_swallowed().
 *     App code NOT changed.
 *
 * ===========================================================================================
 * HOUSE RULES OBSERVED
 *   DatabaseTransactions (never RefreshDatabase). No migrations, no DDL, no seeding against
 *   any server connection — the only Schema::create call targets a sqlite :memory: database
 *   that lives inside this PHP process and is torn down again. No writes to `dtrs`. Every
 *   probe is bounded (orderBy id desc / first) with markTestSkipped when the row is absent.
 * ===========================================================================================
 */
class ExportAndServiceArmsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var \Illuminate\Database\ConnectionResolverInterface|null */
    private $savedModelResolver = null;

    /** @var array|null */
    private $originalLogsConnection = null;

    /** @var bool */
    private $logsConnectionSwapped = false;

    protected function tearDown(): void
    {
        // Defensive: never let a swapped resolver / connection leak into the next test.
        if ($this->savedModelResolver !== null) {
            Model::setConnectionResolver($this->savedModelResolver);
            $this->savedModelResolver = null;
        }

        if ($this->logsConnectionSwapped) {
            DB::purge('evox_logs');
            config(['database.connections.evox_logs' => $this->originalLogsConnection]);
            $this->logsConnectionSwapped = false;
            $this->originalLogsConnection = null;
        }

        Mockery::close();

        parent::tearDown();
    }

    // =======================================================================================
    // App\Exports\DisputeExport — AfterSheet title arms
    // =======================================================================================

    /**
     * Business rule: the dispute workbook must always be self-describing. When the user
     * exported WITHOUT picking a payroll cutoff, the banner has to say "Overall Report" —
     * otherwise a whole-history export is indistinguishable from a single-cutoff one and
     * gets filed against the wrong period.
     *
     * @test
     */
    public function a_dispute_export_with_no_payroll_cutoff_is_banner_titled_overall_report()
    {
        $export = new DisputeExport([['001', 'Alice', 'IT']], null, null);

        $worksheet = $this->runAfterSheet($export);

        $this->assertSame('Overall Report', $worksheet->getCell('J1')->getValue());
        $this->assertArrayHasKey('J1:L1', $worksheet->getMergeCells());
    }

    /**
     * The paired arm: a cutoff-scoped export names the exact period it covers.
     *
     * @test
     */
    public function a_dispute_export_for_a_payroll_cutoff_names_the_period_in_the_banner()
    {
        $export = new DisputeExport([['001', 'Alice', 'IT']], 'June', 'July');

        $worksheet = $this->runAfterSheet($export);

        $this->assertSame('Payroll Cutoff (June To July)', $worksheet->getCell('J1')->getValue());
        $this->assertArrayHasKey('J1:L1', $worksheet->getMergeCells());
    }

    /**
     * The banner row is INSERTED, so the 39 headings must still be intact one row lower —
     * if insertNewRowBefore ever stopped shifting, the banner would overwrite 'Employee No'.
     *
     * @test
     */
    public function the_inserted_banner_row_pushes_the_headings_down_instead_of_overwriting_them()
    {
        $export = new DisputeExport([['001']], null, null);

        $spreadsheet = new Spreadsheet();
        $worksheet = $spreadsheet->getActiveSheet();
        $worksheet->fromArray([$export->headings()], null, 'A1');

        $this->invokeAfterSheet($export, $worksheet);

        $this->assertSame('Employee No', $worksheet->getCell('A2')->getValue());
        $this->assertSame('Overall Report', $worksheet->getCell('J1')->getValue());
        $this->assertCount(39, $export->headings());
    }

    // =======================================================================================
    // App\Exports\TimeoffAllocationExport
    // =======================================================================================

    /**
     * ReportController only builds this export for country 1 (India), so the India header
     * block IS the production path. The month banner and the leave-availed sub-headers are
     * what payroll reads the sheet by.
     *
     * @test
     */
    public function the_india_timeoff_allocation_sheet_carries_the_month_and_leave_availed_headers()
    {
        $export = $this->timeoffExport(1);

        $worksheet = $this->runAfterSheet($export);

        $this->assertSame('Month of July 2026', $worksheet->getCell('G1')->getValue());
        $this->assertSame('Prev. Used', $worksheet->getCell('J4')->getValue());
        $this->assertSame('No of Lv availed', $worksheet->getCell('G3')->getValue());
        $this->assertSame('(June 21 - July 20)', $worksheet->getCell('G4')->getValue());
        // current_period is built without a separator before the day count — asserted as-is.
        $this->assertSame('(July 01 - July31)', $worksheet->getCell('H6')->getValue());

        $merges = $worksheet->getMergeCells();
        $this->assertArrayHasKey('D1:H1', $merges);
        $this->assertArrayHasKey('J4:K4', $merges);
        $this->assertArrayHasKey('G3:H3', $merges);
        $this->assertArrayHasKey('G4:H4', $merges);

        // Every one of the 20 mapped columns is set to auto-size by the handler.
        $this->assertTrue($worksheet->getColumnDimension('A')->getAutoSize());
        $this->assertTrue($worksheet->getColumnDimension('T')->getAutoSize());
    }

    /**
     * The false arm of both country guards. The month banner is unconditional, but the
     * India-only leave columns must stay empty for any other geo — writing "Prev. Used" onto
     * a non-India sheet would label a column that holds nothing.
     *
     * @test
     */
    public function a_non_india_timeoff_allocation_sheet_omits_the_india_only_leave_columns()
    {
        $export = $this->timeoffExport(2);

        $worksheet = $this->runAfterSheet($export);

        $this->assertSame('Month of July 2026', $worksheet->getCell('G1')->getValue());
        $this->assertNull($worksheet->getCell('J4')->getValue());
        $this->assertNull($worksheet->getCell('G3')->getValue());
        $this->assertNull($worksheet->getCell('G4')->getValue());
        $this->assertNull($worksheet->getCell('H6')->getValue());

        $merges = $worksheet->getMergeCells();
        $this->assertArrayHasKey('D1:H1', $merges);
        $this->assertArrayNotHasKey('J4:K4', $merges);
        $this->assertArrayNotHasKey('G3:H3', $merges);
    }

    /**
     * Business rule: new hires are reported under their own banner so payroll can see which
     * rows are pro-rated. With no new hires the banner must NOT be printed — an empty
     * "NEW HIRE (…)" heading reads as "these rows below are new hires" for the wrong rows.
     *
     * @test
     */
    public function the_new_hire_banner_is_printed_only_when_there_are_new_hires()
    {
        $withNewHires = $this->timeoffExport(1);
        $rows = $withNewHires->array();

        // layout: [0] spacer, [1] spacer block, [2] spacer block, [3] columns_set,
        //         [4] spacer block, [5] employees, [6] spacer block, [7] banner, [8] new hires
        $this->assertSame(['NEW HIRE (June 21 - July 20)'], $rows[7]);
        $this->assertSame('EV-002', $rows[8][0][1]);
        $this->assertSame('EV-001', $rows[5][0][1]);
        $this->assertSame(['Sno', 'Employee No'], array_slice($rows[3], 0, 2));

        $noNewHires = new TimeoffAllocationExport(
            $this->timeoffRows(),
            [],                     // <- no new hires
            'June', 'July', 31,
            ['Sno', 'Employee No'],
            2026, 1
        );

        $this->assertSame([''], $noNewHires->array()[7]);
    }

    /** @test */
    public function the_timeoff_allocation_sheet_declares_its_title_start_cell_and_widths()
    {
        $export = $this->timeoffExport(1);

        $this->assertSame('Timeoff Allocation Report', $export->title());
        $this->assertSame('A2', $export->startCell());

        $widths = $export->columnWidths();
        $this->assertSame(40, $widths['A']);
        $this->assertCount(11, $widths);
    }

    // =======================================================================================
    // App\Modules\Attendance\Services\AttendanceGeoGate
    // =======================================================================================

    /**
     * Line 39. An unauthenticated caller has an EMPTY allowed-geo set, not "all geos" and not
     * "their own". Every downstream check has to fall closed off the back of it.
     *
     * @test
     */
    public function an_unauthenticated_caller_is_allowed_no_geos_and_fails_every_downstream_check()
    {
        $gate = new AttendanceGeoGate();

        $this->assertSame([], $gate->allowedGeoIds(null));
        $this->assertFalse($gate->canAccessGeo(null, 2));
        $this->assertFalse($gate->canAccessDepartment(null, 1));
        $this->assertFalse($gate->canAccessEmployee(null, $this->plainUser(101, 2)));
        $this->assertFalse($gate->canAccessEmployee($this->plainUser(101, 2), null));
    }

    /**
     * Line 114 — the `catch (\Throwable $e)` in isPrivileged().
     *
     * level_type() does `$this->level()->first()->Name` with no null guard, so any failure of
     * the EVOX_LEVELS lookup (row missing, table unreachable) blows up inside isLevel(). The
     * gate's own comment says the catch must "never silently grant access". This pins that:
     * the caller is demoted to their own geo, NOT promoted to the all-geos branch.
     *
     * @test
     */
    public function a_failing_level_lookup_demotes_the_caller_instead_of_granting_every_geo()
    {
        $gate = new AttendanceGeoGate();
        $caller = new GeoGateUserWithBrokenLevelLookup();
        $caller->id = 501;
        $caller->country_id = 7;

        // isPrivileged() swallows the lookup failure and falls through to the own-geo path.
        $this->assertSame([7], $gate->allowedGeoIds($caller));

        // Own geo yes, anything else no — the privileged all-geos branch was NOT taken.
        $this->assertTrue($gate->canAccessGeo($caller, 7));
        $this->assertFalse($gate->canAccessGeo($caller, 99));

        // Same demotion applies employee-by-employee.
        $this->assertTrue($gate->canAccessEmployee($caller, $this->plainUser(502, 7)));
        $this->assertFalse($gate->canAccessEmployee($caller, $this->plainUser(503, 99)));

        // Self-access still works even though the level lookup is broken.
        $this->assertTrue($gate->canAccessEmployee($caller, $this->plainUser(501, 99)));
    }

    /**
     * The same demotion, on the department gate. A caller with no usable geo gets refused
     * BEFORE any department query runs — the guard short-circuits, so a broken level lookup
     * cannot turn into an unbounded employee scan either.
     *
     * @test
     */
    public function a_failing_level_lookup_refuses_department_access_without_querying_employees()
    {
        $gate = new AttendanceGeoGate();
        $caller = new GeoGateUserWithBrokenLevelLookup();
        $caller->id = 601;
        $caller->country_id = 0;          // no usable geo

        $queries = 0;
        DB::listen(function () use (&$queries) { $queries++; });

        $this->assertFalse($gate->canAccessDepartment($caller, 1));
        $this->assertSame(0, $queries, 'Empty allowed-geo set must short-circuit before the department query.');
    }

    // =======================================================================================
    // App\Modules\Coe\Repositories\COERepository — the two read catch arms
    // =======================================================================================

    /**
     * Lines 35-37. all() must not turn a database outage into "you have no certificates".
     * An employee who has requested a COE and is shown an empty list will simply request it
     * again, so the failure has to surface, not be flattened into an empty collection.
     *
     * @test
     */
    public function an_unreachable_database_makes_the_coe_list_report_the_failure_not_an_empty_list()
    {
        $user = $this->anyActiveUser();
        $this->be($user);

        $repo = new COERepository();
        $caught = null;

        $this->savedModelResolver = Model::getConnectionResolver();
        Model::setConnectionResolver(new DownConnectionResolver());

        try {
            $repo->all();
        } catch (\Exception $e) {
            $caught = $e;
        } finally {
            Model::setConnectionResolver($this->savedModelResolver);
            $this->savedModelResolver = null;
        }

        $this->assertInstanceOf(QueryException::class, $caught, 'all() swallowed the database failure.');
        $this->assertStringContainsString('Connection refused', $caught->getMessage());
    }

    /**
     * Lines 144-146. find() must not turn a database outage into a 404. "COE not found" and
     * "the database is down" are different answers and the controller branches on null.
     *
     * @test
     */
    public function an_unreachable_database_makes_a_coe_lookup_report_the_failure_not_a_missing_record()
    {
        $user = $this->anyActiveUser();
        $this->be($user);

        $repo = new COERepository();
        $caught = null;

        $this->savedModelResolver = Model::getConnectionResolver();
        Model::setConnectionResolver(new DownConnectionResolver());

        try {
            $repo->find(1);
        } catch (\Exception $e) {
            $caught = $e;
        } finally {
            Model::setConnectionResolver($this->savedModelResolver);
            $this->savedModelResolver = null;
        }

        $this->assertInstanceOf(QueryException::class, $caught, 'find() swallowed the database failure and would read as a 404.');
        $this->assertStringContainsString('Connection refused', $caught->getMessage());

        // Sanity: with the real resolver back, find() behaves normally again.
        $this->assertNull($repo->find(-1));
        $existing = COE::orderBy('id', 'desc')->first();
        if ($existing) {
            $this->assertEquals($existing->id, $repo->find($existing->id)->id);
        }
    }

    // =======================================================================================
    // App\Jobs\AssignAllUserToAdminJob
    // =======================================================================================

    /**
     * The success arm. The job is a pure pass-through: whatever id and role payload were
     * captured at dispatch must reach the repository unchanged, because the payload decides
     * whether the user is made a supervisor of every department.
     *
     * @test
     */
    public function the_admin_assignment_job_hands_the_captured_id_and_roles_to_the_repository()
    {
        $this->markTestSkipped(
            '[CAT-4] App\Jobs\AssignAllUserToAdminJob class deleted (Client module removal 2026-08-10). ' .
            'Re-enable if the job is restored. Ref: Client module removal tracked in session 2026-08-10.'
        );
        $repo = Mockery::mock(UserRepository::class);
        $repo->shouldReceive('adminRoleConditions')
             ->once()
             ->with(4242, ['admin', 'employee']);

        $job = new AssignAllUserToAdminJob(4242, ['admin', 'employee']);

        $this->assertNull($job->handle($repo));
    }

    /**
     * Lines 47-50. The catch logs and RETHROWS — it does not swallow. That matters because
     * this job is queued: swallowing would mark the job finished while the user still has no
     * supervisor rows, and nobody would ever find out.
     *
     * @test
     */
    public function a_failing_admin_assignment_is_logged_and_rethrown_so_the_queue_records_a_failure()
    {
        $this->markTestSkipped(
            '[CAT-4] App\Jobs\AssignAllUserToAdminJob class deleted (Client module removal 2026-08-10). ' .
            'Re-enable if the job is restored.'
        );
        $boom = new \Exception('Department supervisor sync failed');

        $repo = Mockery::mock(UserRepository::class);
        $repo->shouldReceive('adminRoleConditions')
             ->once()
             ->andThrow($boom);

        $job = new AssignAllUserToAdminJob(4242, ['admin']);
        $caught = null;

        try {
            $job->handle($repo);
        } catch (\Exception $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'handle() swallowed the failure — the queue would mark this job successful.');
        $this->assertSame($boom, $caught, 'The original exception must be rethrown as-is, not wrapped.');
    }

    /**
     * The same arm driven by the real production failure rather than a double: the employee
     * was deleted between the role change being submitted and the queue picking the job up,
     * so UserRepository::adminRoleConditions -> User::findOrFail throws ModelNotFoundException.
     * One bounded lookup by primary key; no writes (the role loop never starts).
     *
     * @test
     */
    public function an_admin_assignment_for_a_deleted_employee_surfaces_as_a_model_not_found_failure()
    {
        $this->markTestSkipped(
            '[CAT-4] App\Jobs\AssignAllUserToAdminJob class deleted (Client module removal 2026-08-10). ' .
            'Re-enable if the job is restored.'
        );
        $job = new AssignAllUserToAdminJob(-999999, []);
        $caught = null;

        try {
            $job->handle(new UserRepository());
        } catch (\Exception $e) {
            $caught = $e;
        }

        $this->assertInstanceOf(ModelNotFoundException::class, $caught);
        $this->assertStringContainsString('App\\Modules\\User\\Models\\User', $caught->getMessage());
    }

    // =======================================================================================
    // App\Modules\Request\Http\Requests\ChangeScheduleRequest
    // =======================================================================================

    /**
     * Lines 57-58. EVOX does not use Laravel's default validation response — failedValidation
     * replaces it with the templated error envelope so the React client can render the list.
     * Rule: HTTP 422, body {"error":{"message":[…every message…],"content":[]}}.
     *
     * @test
     */
    public function a_change_schedule_request_with_a_backwards_date_range_returns_a_422_error_envelope()
    {
        $formRequest = new ChangeScheduleRequest();
        $rules = $formRequest->rules(new StoreScheduleRequest());

        // valid_to before valid_from -> after_or_equal fails; note is not a string -> fails too
        $validator = ValidatorFactory::make(
            ['valid_from' => '2026-08-10', 'valid_to' => '2026-08-01', 'employee_note' => ['x']],
            $rules,
            $formRequest->messages()
        );

        $this->assertTrue($validator->fails(), 'Fixture no longer violates the rules — pick another payload.');

        $expectedMessages = $validator->errors()->all();
        $caught = null;

        try {
            $this->invokeFailedValidation($formRequest, $validator);
        } catch (HttpResponseException $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'failedValidation() did not throw — the default redirect response would be used.');

        $response = $caught->getResponse();
        $this->assertSame(JsonResponse::HTTP_UNPROCESSABLE_ENTITY, $response->getStatusCode());
        $this->assertSame(422, $response->getStatusCode());

        $payload = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $payload);
        $this->assertSame(['message', 'content'], array_keys($payload['error']));
        $this->assertSame($expectedMessages, $payload['error']['message']);
        $this->assertSame([], $payload['error']['content']);
        $this->assertNotEmpty($payload['error']['message']);
    }

    /**
     * The rule set itself is the business contract for the endpoint: both dates required, both
     * strictly Y-m-d, and the range may not run backwards.
     *
     * @test
     */
    public function the_change_schedule_rules_require_a_forward_iso_date_range_and_bounded_notes()
    {
        $formRequest = new ChangeScheduleRequest();

        $this->assertTrue($formRequest->authorize());

        $rules = $formRequest->rules(new StoreScheduleRequest());
        $this->assertSame('required|date|date_format:"Y-m-d"', $rules['valid_from']);
        $this->assertSame('required|date|after_or_equal:valid_from|date_format:"Y-m-d"', $rules['valid_to']);
        $this->assertSame('string|max:255', $rules['employee_note']);
        $this->assertSame('string|max:255', $rules['approver_note']);

        $this->assertSame(
            'The dates that are submitted is already exist',
            $formRequest->messages()['valid_from.unique_dates']
        );
    }

    // =======================================================================================
    // App\Classes\EvoxActivityLogger — the performedOn arm of log()
    // =======================================================================================

    /**
     * Lines 105-106. Business rule: an audit entry must name WHO the action was performed on,
     * not only who performed it. Without the subject association the row still saves, so the
     * audit trail looks healthy while every entry points at nobody.
     *
     * Writes to a sqlite database that exists only inside this PHP process — no server
     * connection is touched. Skips cleanly if pdo_sqlite is unavailable.
     *
     * @test
     */
    public function logging_against_a_subject_tags_the_audit_row_with_that_employee()
    {
        $this->useProcessLocalActivityLog();

        $actor   = $this->plainUser(4242, 2);
        $subject = $this->plainUser(9001, 2);
        $subject->first_name = 'Marina';

        $this->makeActivityLogger($actor)
             ->on($subject)
             ->useLog('activity')
             ->withProperties(['REMOTE_ADDR' => '10.0.0.9'])
             ->log('Schedule changed for :subject.first_name');

        $entry = Activity::orderBy('id', 'desc')->first();

        $this->assertNotNull($entry, 'log() did not persist an activity row.');
        $this->assertSame(User::class, $entry->subject_type);
        $this->assertEquals(9001, $entry->subject_id);
        $this->assertSame(User::class, $entry->causer_type);
        $this->assertEquals(4242, $entry->causer_id);
        $this->assertSame('Schedule changed for Marina', $entry->description);
        $this->assertSame('activity', $entry->log_name);
    }

    /**
     * FINDING ACTLOG_003 — characterised, app code NOT changed.
     *
     * log() builds the row (subject, causer, properties, placeholders) and then saves with no
     * error handling whatsoever. Point evox_logs at an unusable driver and the failure walks
     * straight out of log() to the caller: an audit-store outage becomes a raw 500 on an
     * action that otherwise succeeded. This test runs in every environment — it needs no
     * database driver at all — so lines 105-106 are covered even where pdo_sqlite is absent.
     *
     * @test
     */
    public function an_unreachable_audit_store_fails_the_callers_request_instead_of_being_swallowed()
    {
        $this->originalLogsConnection = config('database.connections.evox_logs');
        $this->logsConnectionSwapped = true;

        config(['database.connections.evox_logs' => [
            'driver'   => 'evox-no-such-driver',
            'database' => 'unreachable',
            'prefix'   => '',
        ]]);
        DB::purge('evox_logs');

        $actor   = $this->plainUser(4242, 2);
        $subject = $this->plainUser(9001, 2);

        $caught = null;
        try {
            $this->makeActivityLogger($actor)
                 ->on($subject)                      // <- the performedOn arm still runs
                 ->withProperty('REQUEST_METHOD', 'PUT')
                 ->log('Leave approved');
        } catch (\Throwable $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'ACTLOG_003 looks resolved: log() now handles a failing audit store.');
        $this->assertInstanceOf(\InvalidArgumentException::class, $caught);
        $this->assertStringContainsString('evox-no-such-driver', $caught->getMessage());
    }

    // =======================================================================================
    // helpers
    // =======================================================================================

    /** Build the sheet the writer would build, raise AfterSheet, return the worksheet. */
    private function runAfterSheet($export)
    {
        $spreadsheet = new Spreadsheet();
        $worksheet = $spreadsheet->getActiveSheet();

        $this->invokeAfterSheet($export, $worksheet);

        return $worksheet;
    }

    private function invokeAfterSheet($export, $worksheet): void
    {
        $events = $export->registerEvents();

        $this->assertArrayHasKey(AfterSheet::class, $events);

        $handler = $events[AfterSheet::class];
        $handler(new AfterSheet(new Sheet($worksheet), $export));
    }

    private function timeoffRows(): array
    {
        return [
            (object) ['sno' => 1, 'emp_num' => 'EV-001', 'name' => 'Dela Cruz, Juan', 'status' => 'Regular'],
        ];
    }

    private function timeoffNewHireRows(): array
    {
        return [
            (object) ['sno' => 1, 'emp_num' => 'EV-002', 'name' => 'Santos, Maria', 'status' => 'Probationary'],
        ];
    }

    private function timeoffExport(int $country): TimeoffAllocationExport
    {
        return new TimeoffAllocationExport(
            $this->timeoffRows(),
            $this->timeoffNewHireRows(),
            'June',
            'July',
            31,
            ['Sno', 'Employee No'],
            2026,
            $country
        );
    }

    /** Unsaved User — enough for the gate's id/country_id reads, never persisted. */
    private function plainUser($id, $countryId): User
    {
        $user = new User();
        $user->id = $id;
        $user->country_id = $countryId;

        return $user;
    }

    private function anyActiveUser(): User
    {
        $user = User::where('is_active', 1)->orderBy('id', 'desc')->first();

        if (!$user) {
            $this->markTestSkipped('No active user in the test database to authenticate as.');
        }

        return $user;
    }

    private function invokeFailedValidation(ChangeScheduleRequest $request, $validator): void
    {
        $method = new \ReflectionMethod(ChangeScheduleRequest::class, 'failedValidation');
        $method->setAccessible(true);
        $method->invoke($request, $validator);
    }

    private function makeActivityLogger(?User $currentUser): EvoxActivityLogger
    {
        return new EvoxActivityLogger(
            new ExportArmsStubGuard($currentUser),
            new ConfigRepository(['laravel-activitylog' => ['default_log_name' => 'default']])
        );
    }

    /**
     * Point the evox_logs connection at a sqlite database that exists only inside this PHP
     * process and create the activity_log table there. No server database is contacted; the
     * original configuration is restored in tearDown.
     */
    private function useProcessLocalActivityLog(): void
    {
        if (!extension_loaded('pdo_sqlite')) {
            $this->markTestSkipped('pdo_sqlite is unavailable; refusing to write activity_log on a real connection.');
        }

        $this->originalLogsConnection = config('database.connections.evox_logs');
        $this->logsConnectionSwapped = true;

        config(['database.connections.evox_logs' => [
            'driver'                  => 'sqlite',
            'database'                => ':memory:',
            'prefix'                  => '',
            'foreign_key_constraints' => false,
        ]]);
        DB::purge('evox_logs');

        try {
            Schema::connection('evox_logs')->create('activity_log', function (Blueprint $table) {
                $table->increments('id');
                $table->string('log_name')->nullable();
                $table->text('description')->nullable();
                $table->integer('subject_id')->nullable();
                $table->string('subject_type')->nullable();
                $table->integer('causer_id')->nullable();
                $table->string('causer_type')->nullable();
                $table->text('properties')->nullable();
                $table->timestamps();
            });
        } catch (\Throwable $e) {
            $this->markTestSkipped('Could not build the process-local activity_log mirror: ' . $e->getMessage());
        }
    }
}

/**
 * A User whose EVOX_LEVELS lookup blows up. level_type() dereferences
 * `$this->level()->first()->Name` with no guard, so this is what the gate's isPrivileged()
 * catch (\Throwable) arm exists to absorb. Nothing else about User is changed.
 */
class GeoGateUserWithBrokenLevelLookup extends User
{
    public function level()
    {
        throw new \RuntimeException('EVOX_LEVELS lookup failed');
    }
}

/**
 * A connection resolver that models the database being unreachable. Installed for the
 * duration of one assertion and removed again in a finally block.
 */
class DownConnectionResolver implements ConnectionResolverInterface
{
    public function connection($name = null)
    {
        throw new QueryException(
            'select * from `coe`',
            [],
            new \PDOException('SQLSTATE[HY000] [2002] Connection refused')
        );
    }

    public function getDefaultConnection()
    {
        return 'mysql';
    }

    public function setDefaultConnection($name)
    {
        //
    }
}

/** Minimal Guard so EvoxActivityLogger can be built without an auth driver or a DB. */
class ExportArmsStubGuard implements Guard
{
    private $currentUser;

    public function __construct($currentUser = null)
    {
        $this->currentUser = $currentUser;
    }

    public function check()
    {
        return $this->currentUser !== null;
    }

    public function guest()
    {
        return $this->currentUser === null;
    }

    public function user()
    {
        return $this->currentUser;
    }

    public function id()
    {
        return $this->currentUser === null ? null : $this->currentUser->getKey();
    }

    public function validate(array $credentials = [])
    {
        return false;
    }

    public function setUser(Authenticatable $user)
    {
        $this->currentUser = $user;
    }

    public function getProvider()
    {
        return null;
    }
}
