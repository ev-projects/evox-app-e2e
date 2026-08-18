<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Bhr/Repositories/BhrRepository.php — the arms BhrRepositoryApiFakeTest does not
 *   reach: every catch(Exception) arm (get_changed_users, get_user, get_user_bhr_field,
 *   get_user_job_information, get_leave_credits, get_holidays, get_leaves, sync_holidays), the
 *   non-sync field set of get_user(), both field-assembly arms of get_user_bhr_field(), and the
 *   no-match arm of the protected get_match() (reached through sync_holidays).
 *
 * MENU PATH   Admin -> Cron (BambooHR user/holiday/leave sync jobs). There is no page a user can
 *             click that reaches this class directly; it is the integration layer the scheduled
 *             sync commands drive.
 *
 * THE SEAM: tests/Feature/BranchTests/Support/BhrApiFake.php intercepts bhr_api_call() at the
 * namespace boundary, exactly as BhrRepositoryApiFakeTest does. While active, an endpoint with no
 * registered fake throws rather than reaching the network, so no HTTP can escape even by mistake.
 * The catch arms here are driven by registering a fake that THROWS — the real-world case being
 * BambooHR returning 5xx or the connection timing out.
 *
 * SAFETY: DatabaseTransactions; the only writes are the Holiday rows sync_holidays inserts, in the
 * year 2093, and they roll back. No SP, no DDL, no external I/O, no whole-table read.
 *
 * FINDINGS
 *   FINDING BE-BHR-NESTED-ROLLBACK  get_holidays() (line 466) and get_leaves() (line 506) call
 *     DB::rollback() in their catch arms although neither ever calls DB::beginTransaction(). Both
 *     are read-only. When sync_holidays() — which DOES open a transaction — calls get_holidays()
 *     and BambooHR fails, the inner rollback closes sync_holidays' transaction and sync_holidays'
 *     own catch then rolls back ONE LEVEL TOO FAR, discarding whatever transaction the caller had
 *     open. Under a scheduled sync that means an unrelated in-flight unit of work is committed
 *     early / thrown away. Characterised by
 *     bhr__a_failed_holiday_fetch_rolls_back_the_callers_transaction_FINDING_BE_BHR_NESTED_ROLLBACK.
 *   FINDING BE-BHR-DEAD-TEST  BhrRepository::test() (lines 525-540) is a scratch stub: it opens a
 *     transaction, sets $result = null, commits and returns null. It is protected, has no caller
 *     anywhere in the codebase and 0% coverage. It should be deleted, not tested — no test is
 *     written for it here.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/BhrApiFake.php';

use Exception;
use RuntimeException;
use Tests\TestCase;
use Tests\Support\BhrApiFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\Bhr\Repositories\BhrRepository;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\User\Models\UtcTimelog;

class BhrRepositoryFailureArmsTest extends TestCase
{
    use DatabaseTransactions;

    const OUTAGE = 'BambooHR unavailable (503)';

    /** @var BhrRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        BhrApiFake::activate();
        $this->repo = new BhrRepository();
    }

    protected function tearDown(): void
    {
        BhrApiFake::reset();
        parent::tearDown();
    }

    /** Registers an endpoint that behaves like BambooHR being down. */
    private function fakeOutage($needle)
    {
        BhrApiFake::fake($needle, function () {
            throw new RuntimeException(self::OUTAGE);
        });
    }

    private function failureFrom(callable $work)
    {
        $caught = null;
        try {
            $work();
        } catch (Exception $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'a BambooHR failure must reach the caller, never be swallowed');

        return $caught;
    }

    /**
     * Re-opens the transaction DatabaseTransactions relies on. Only needed after a method whose
     * catch arm rolls back a transaction it never opened (see FINDING BE-BHR-NESTED-ROLLBACK).
     */
    private function restoreTestTransaction()
    {
        while (DB::transactionLevel() < 1) {
            DB::beginTransaction();
        }
    }

    /** A 2093 date whose month-day collides with no predefined holiday. */
    private function freeHolidayDate()
    {
        foreach (['2093-03-11', '2093-03-12', '2093-03-13', '2093-03-18', '2093-03-19'] as $candidate) {
            $collides = Holiday::where('is_predefined', 1)
                ->whereRaw("DATE_FORMAT(date,'%m-%d') = DATE_FORMAT(?,'%m-%d')", [$candidate])
                ->exists();
            if (!$collides) {
                return $candidate;
            }
        }
        $this->markTestSkipped('all candidate dates collide with predefined holidays');
    }

    // ============================================== field selection (success arms)

    /** @test */
    public function a_profile_read_asks_for_the_display_fields_and_a_sync_read_asks_for_the_sync_fields()
    {
        BhrApiFake::fake('employees/1001', (object) ['id' => 1001]);

        // for_sync = false (the default) -> BHR_USER_FIELDS, which carries payRate.
        $this->repo->get_user('1001');
        $displayEndpoint = BhrApiFake::calls()[0]['endpoint'];
        $this->assertStringContainsString('payRate', $displayEndpoint);
        $this->assertStringNotContainsString('employmentHistoryStatus', $displayEndpoint);

        // for_sync = true -> BHR_USER_SYNC_FIELDS, which carries the employment status instead.
        $this->repo->get_user('1001', true);
        $syncEndpoint = BhrApiFake::calls()[1]['endpoint'];
        $this->assertStringContainsString('employmentHistoryStatus', $syncEndpoint);
        $this->assertStringNotContainsString('payRate', $syncEndpoint);
    }

    /** @test */
    public function a_named_field_set_replaces_the_personal_default_and_extra_fields_are_appended()
    {
        BhrApiFake::fake('employees/1001', (object) ['id' => 1001]);

        // Default key -> BHR_USER_PERSONAL.
        $this->repo->get_user_bhr_field('1001');
        $this->assertStringContainsString('mobilePhone', BhrApiFake::calls()[0]['endpoint']);

        // Explicit key -> that constant instead.
        $this->repo->get_user_bhr_field('1001', 'BHR_USER_SYNC_FIELDS');
        $named = BhrApiFake::calls()[1]['endpoint'];
        $this->assertStringContainsString('employmentHistoryStatus', $named);
        $this->assertStringNotContainsString('mobilePhone', $named);

        // Named set is non-empty -> the extra fields are appended after a comma.
        $this->repo->get_user_bhr_field('1001', 'BHR_USER_PERSONAL', ['4206.4', '4206.7']);
        $this->assertStringContainsString('jobTitle,4206.4,4206.7', BhrApiFake::calls()[2]['endpoint']);
    }

    /** @test */
    public function an_empty_field_set_asks_for_the_extra_fields_only_with_no_leading_comma()
    {
        config(['constants.ZZ_EMPTY_FIELD_SET' => []]);
        BhrApiFake::fake('employees/1001', (object) ['id' => 1001]);

        $this->repo->get_user_bhr_field('1001', 'ZZ_EMPTY_FIELD_SET', ['4206.4', '4206.7']);

        $endpoint = BhrApiFake::calls()[0]['endpoint'];
        $this->assertStringContainsString('fields=4206.4,4206.7', $endpoint);
        $this->assertStringNotContainsString('fields=,', $endpoint);
    }

    // ================================================== holiday classification arms

    /** @test */
    public function a_holiday_without_a_country_tag_is_filed_as_a_special_holiday_with_no_country()
    {
        if (UtcTimelog::whereNull('alpha_three')->exists()) {
            $this->markTestSkipped('a utc_timelog row has a NULL alpha_three, so the no-tag lookup would match it');
        }

        $date = $this->freeHolidayDate();
        $name = uniqid('SeamUntagged') . ' Company Day';      // no [XXX] tag, no '(Regular)'

        BhrApiFake::fake('whos_out', function ($m, $e, $d, $j, $country) use ($name, $date) {
            return $country === 'default'
                ? [(object) ['type' => 'holiday', 'name' => $name, 'start' => $date]]
                : null;
        });

        $inserted = $this->repo->sync_holidays('2093-03-01', '2093-03-31');

        $this->assertCount(1, $inserted);
        $holiday = $inserted->first();
        // get_match() finds no [XXX] tag -> null -> no country is attached.
        $this->assertNull($holiday->country_id);
        // Name does not contain '(Regular)' -> special holiday, not legal.
        $this->assertSame('sh', $holiday->type);
    }

    // ==================================================================== catch arms

    /** @test */
    public function a_failed_changed_user_fetch_is_reported_to_the_sync_job()
    {
        $this->fakeOutage('employees/changed');

        $error = $this->failureFrom(function () {
            $this->repo->get_changed_users('2026-01-01T00:00:00+00:00');
        });

        $this->assertSame(self::OUTAGE, $error->getMessage());
    }

    /** @test */
    public function a_failed_user_detail_fetch_is_reported_to_the_sync_job()
    {
        $this->fakeOutage('employees/1001');

        $error = $this->failureFrom(function () {
            $this->repo->get_user('1001', true);
        });

        $this->assertSame(self::OUTAGE, $error->getMessage());
    }

    /** @test */
    public function a_failed_custom_field_fetch_is_reported_to_the_caller()
    {
        $this->fakeOutage('employees/1001');

        $error = $this->failureFrom(function () {
            $this->repo->get_user_bhr_field('1001', 'BHR_USER_PERSONAL');
        });

        $this->assertSame(self::OUTAGE, $error->getMessage());
    }

    /** @test */
    public function a_failed_job_information_fetch_is_reported_to_the_caller()
    {
        $this->fakeOutage('tables/jobInfo');

        $error = $this->failureFrom(function () {
            $this->repo->get_user_job_information('1001', 'jobInfo');
        });

        $this->assertSame(self::OUTAGE, $error->getMessage());
    }

    /** @test */
    public function a_failed_leave_credit_fetch_is_reported_to_the_caller()
    {
        $this->fakeOutage('time_off/calculator');

        $error = $this->failureFrom(function () {
            $this->repo->get_leave_credits('1001', '2026-07-15');
        });

        $this->assertSame(self::OUTAGE, $error->getMessage());
    }

    /** @test */
    public function a_failed_holiday_write_rolls_back_every_holiday_in_the_batch()
    {
        $date = $this->freeHolidayDate();
        $name = '[PHL] ' . uniqid('SeamRollback') . ' (Regular)';

        BhrApiFake::fake('whos_out', function ($m, $e, $d, $j, $country) use ($name, $date) {
            return $country === 'default'
                ? [(object) ['type' => 'holiday', 'name' => $name, 'start' => $date]]
                : null;
        });

        // The fetch succeeds and it is the INSERT that fails, so sync_holidays' own catch arm runs
        // and rolls back only the transaction it opened.
        Holiday::saving(function () {
            throw new Exception(self::OUTAGE);
        });

        $error = $this->failureFrom(function () {
            $this->repo->sync_holidays('2093-03-01', '2093-03-31');
        });

        $this->assertSame(self::OUTAGE, $error->getMessage());
        $this->assertSame(0, Holiday::where('name', $name)->count(),
            'a partially synced batch must not survive');
        $this->assertGreaterThanOrEqual(1, DB::transactionLevel(),
            'sync_holidays must not roll back past its own transaction here');
    }

    /** @test */
    public function a_failed_leave_fetch_is_reported_to_the_caller()
    {
        $this->fakeOutage('time_off/requests');

        $error = $this->failureFrom(function () {
            $this->repo->get_leaves('2026-07-01', '2026-07-15');
        });

        $this->assertSame(self::OUTAGE, $error->getMessage());
        $this->restoreTestTransaction();     // see FINDING BE-BHR-NESTED-ROLLBACK
    }

    /**
     * FINDING BE-BHR-NESTED-ROLLBACK — get_holidays() and get_leaves() are pure reads that never
     * open a transaction, yet both call DB::rollback() when the API fails. Called from
     * sync_holidays(), the inner rollback closes sync_holidays' transaction and the outer catch
     * then rolls back the CALLER's transaction as well. This test pins that behaviour: after a
     * failed sync the transaction level has dropped below where it started. Flip the assertion to
     * assertSame($before, DB::transactionLevel()) once the stray DB::rollback() calls are removed.
     *
     * @test
     */
    public function bhr__a_failed_holiday_fetch_rolls_back_the_callers_transaction_FINDING_BE_BHR_NESTED_ROLLBACK()
    {
        $this->fakeOutage('whos_out');

        $before = DB::transactionLevel();
        $this->assertGreaterThanOrEqual(1, $before, 'the test itself holds an open transaction');

        $error = $this->failureFrom(function () {
            $this->repo->sync_holidays('2093-03-01', '2093-03-31');
        });

        $this->assertSame(self::OUTAGE, $error->getMessage());
        $this->assertLessThan($before, DB::transactionLevel(),
            'today a failed holiday sync rolls back one level too far and takes the caller with it');

        $this->restoreTestTransaction();
    }
}
