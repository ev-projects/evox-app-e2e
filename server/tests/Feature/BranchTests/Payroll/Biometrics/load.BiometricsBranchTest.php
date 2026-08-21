<?php
/**
 * SOURCE FILE UNDER TEST
 *   app/Modules/Payroll/Repositories/BiometricsRepository.php :: get_biometrics()   (0% before this file)
 *
 * MENU PATH
 *   Attendance -> DTR (and the sync/cron path behind it). This repository is the ONLY door between
 *   EVOX and the physical door-scanner database: CronController::sync_realtime_biometrics() and the
 *   DTR generation commands call get_biometrics() to pull raw check-in / check-out punches.
 *
 * WHY THIS CLASS READ 0%
 *   Biometrics lives on the separate `biometrix` MsSQL connection (config/database.php:88). Every
 *   existing test mocks BiometricsRepositoryInterface, so the concrete repository has never executed
 *   a line. It cannot be driven against the real device database from a test — that host is a live
 *   production dependency and reaching it would be both an external call and a hang risk.
 *
 *   What CAN be driven, safely and locally, is the whole method up to and including the query, by
 *   repointing the `biometrix` connection at a database that does not exist. The query then fails at
 *   connection time, which exercises the query construction, the user-collection branch, and the
 *   error handling — and, usefully, lets the SQL and its bindings be inspected on the exception.
 *
 * WHY A USER CARES
 *   Two rules are proved here.
 *   1. The device stores its own employee numbering: EVOX emp_num 1234 is Userid "201234" on the
 *      scanner. If that translation is dropped, the punch pull silently returns nothing and every
 *      employee's DTR for that window comes back empty — read as absent, not as "sync failed".
 *   2. A failure to reach the device database must SURFACE. get_biometrics() logs and rethrows; it
 *      must never return an empty collection, because the callers cannot tell "nobody punched" from
 *      "the scanner was unreachable" and would write a day of absences.
 *
 * ARMS COVERED — both sides of the one conditional
 *   - no user collection supplied   -> the query is scoped by check type and time window only
 *   - a user collection supplied    -> the emp_nums are translated to device Userids and added
 *   - the query fails               -> logged and rethrown, never swallowed
 *
 * RESIDUE (honest): lines 58-60, the two closing log calls and the `return $result` of the SUCCESS
 *   path, cannot execute without a reachable biometrix database. They are the only lines of this
 *   method this suite does not cover. See FINDING BIO-NOSEAM-1.
 *
 * SAFETY
 *   No network. The `biometrix` connection is repointed IN CONFIG ONLY, at a sqlite path that does
 *   not exist, and purged so the change takes effect; the real MsSQL host is never contacted and the
 *   real connection settings are restored by the framework at the end of each test. Nothing is
 *   written anywhere, and no stored procedure is reachable from this method.
 *
 * FINDINGS
 *   BIO-NOSEAM-1: BiometricsRepository has no injectable seam of any kind — the model is referenced
 *     statically and the connection name is hard-coded on the model. The success path of the only
 *     method in the class is therefore untestable without a live door-scanner database, which is why
 *     the class sat at 0%. Recorded, not fixed: the fix is a change to app code (accept a query
 *     builder, or move the connection name to config the test can point at a fixture).
 */

namespace Tests\Feature\BranchTests\Payroll\Biometrics;

use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;
use App\Modules\Payroll\Repositories\BiometricsRepository;
use App\Modules\User\Models\User;

class BiometricsLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    const WINDOW_FROM = '2020-01-01 00:00:00';
    const WINDOW_TO   = '2020-01-01 23:59:59';

    protected function setUp(): void
    {
        parent::setUp();

        // Repoint the door-scanner connection at a database that cannot exist, and drop any cached
        // handle so the next query resolves the new settings. The real MsSQL host is never contacted.
        Config::set('database.connections.biometrix', [
            'driver'   => 'sqlite',
            'database' => ':memory:',
            'prefix'   => '',
        ]);
        DB::purge('biometrix');
        // An empty in-memory sqlite carries no `checkinout` table, so the query below fails at
        // execution with a QueryException (no such table) — the failure this suite exercises —
        // without contacting the real MsSQL host and without leaving a stray database file behind.
    }

    protected function tearDown(): void
    {
        DB::purge('biometrix');
        Mockery::close();
        parent::tearDown();
    }

    /** Run the repository and hand back the QueryException it must raise. */
    private function captureFailure(EloquentCollection $users = null): QueryException
    {
        try {
            (new BiometricsRepository())->get_biometrics(self::WINDOW_FROM, self::WINDOW_TO, $users);
        } catch (QueryException $e) {
            return $e;
        }

        $this->fail('get_biometrics() must rethrow when the door-scanner database cannot be reached');
    }

    // =========================================================  the unreachable-scanner rule

    /**
     * The whole point of the catch arm: a scanner outage must not look like a day with no punches.
     * If this method ever returned an empty collection instead of rethrowing, DTR generation would
     * mark a full day of employees absent.
     *
     * @test
     */
    public function an_unreachable_door_scanner_is_rethrown_rather_than_returned_as_an_empty_punch_list()
    {
        $e = $this->captureFailure();

        $this->assertInstanceOf(QueryException::class, $e);
        $this->assertNotEmpty($e->getMessage(), 'the failure must carry a diagnosable message');
    }

    /**
     * The unfiltered arm. Without a user collection the punch pull is scoped by check type and time
     * window only — in and out punches, nothing else, and only inside the requested window.
     *
     * @test
     */
    public function pulling_punches_for_everybody_is_scoped_to_in_and_out_types_inside_the_window()
    {
        $e   = $this->captureFailure();
        $sql = $e->getSql();

        $this->assertStringContainsString('checkinout', $sql, 'punches are read from the device log table');
        $this->assertStringContainsString('CheckType', $sql);
        $this->assertStringContainsString('CheckTime', $sql);

        $bindings = $e->getBindings();
        $this->assertContains('I', $bindings, 'clock-in punches are requested');
        $this->assertContains('O', $bindings, 'clock-out punches are requested');
        $this->assertContains(self::WINDOW_FROM, $bindings, 'the window start is applied');
        $this->assertContains(self::WINDOW_TO, $bindings, 'the window end is applied');
        // Userid appears once, in the select list — there is no employee filter clause.
        $this->assertSame(
            1,
            substr_count($sql, 'Userid'),
            'no employee filter clause is added when no collection is supplied'
        );
        $this->assertSame(
            4,
            count($bindings),
            'with no user collection the query binds exactly the two check types and the two window ends'
        );
    }

    /**
     * The filtered arm, and the translation rule. EVOX emp_num 1234 is Userid "201234" on the
     * scanner; the repository must apply that prefix to every member of the collection before it
     * filters, or the pull matches nothing and the day reads as absent.
     *
     * @test
     */
    public function pulling_punches_for_named_employees_translates_their_numbers_to_device_ids()
    {
        $users = User::whereNotNull('emp_num')->where('emp_num', '!=', '')
            ->orderBy('id', 'desc')->limit(2)->get();

        if ($users->count() < 1) {
            $this->markTestSkipped('no user with an emp_num in test DB to translate');
        }

        $e        = $this->captureFailure($users);
        $bindings = $e->getBindings();

        foreach ($users as $user) {
            $this->assertContains(
                '20' . $user->emp_num,
                $bindings,
                'emp_num ' . $user->emp_num . ' must reach the scanner as device id 20' . $user->emp_num
            );
            $this->assertNotContains(
                (string) $user->emp_num,
                $bindings,
                'the untranslated emp_num must never be sent to the scanner'
            );
        }

        // Userid now appears twice — once in the select list and once as the filter clause.
        $this->assertSame(
            2,
            substr_count($e->getSql(), 'Userid'),
            'an employee filter clause is added when a collection is supplied'
        );
        $this->assertSame(
            4 + $users->count(),
            count($bindings),
            'the user filter adds exactly one binding per employee on top of the unfiltered query'
        );
    }
}
