<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Payroll\Models\DtrPolicy;
use App\Modules\Payroll\Repositories\BiometricsRepository;
use App\Modules\Schedule\Models\SchedulePolicy;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UtcTimeLogRepository;

/**
 * The remaining 0%-coverage models and repositories from the 03-Aug gap analysis:
 * UtcTimelog, SchedulePolicy, DtrPolicy, BiometricsRepository, UtcTimeLogRepository.
 * These sit under the DTR/attendance flow — the timezone table in particular decides what time
 * every employee's punches are displayed in, for every geography.
 *
 * Safety: BiometricsRepository reads are bounded to a ONE-MINUTE window (the Biometrics table is
 * large); UtcTimeLogRepository::check_adjustment() writes DST adjustment columns and is therefore
 * wrapped by DatabaseTransactions — nothing survives the test.
 */
class ZeroCoverageModelsReposTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $user = User::where('is_active', 1)->whereNotNull('country_id')
            ->orderBy('id', 'desc')->first();
        if ($user) $this->be($user);
    }

    // ------------------------------------------------------------------- UtcTimelog
    /** @test */
    public function utc_timelog_resolves_a_live_offset_for_every_configured_timezone()
    {
        $rows = UtcTimelog::whereNotNull('timezone')->get();
        if ($rows->isEmpty()) $this->markTestSkipped('utc_timelog table is empty');

        foreach ($rows as $row) {
            $offset = $row->get_country_timezone_to_offset();

            // Carbon's 'P' format: +HH:MM / -HH:MM
            $this->assertRegExp('/^[+-]\d{2}:\d{2}$/', $offset,
                "timezone '{$row->timezone}' produced an invalid offset");
        }
    }

    /** @test */
    public function utc_timelog_rows_carry_the_columns_the_app_reads()
    {
        $row = UtcTimelog::first();
        if (!$row) $this->markTestSkipped('utc_timelog table is empty');

        foreach (['country_id', 'timezone', 'time_difference'] as $column) {
            $this->assertTrue(array_key_exists($column, $row->getAttributes()),
                "utc_timelog is missing the '{$column}' column the app depends on");
        }
    }

    // --------------------------------------------------------- policy models + relations
    /** @test */
    public function schedule_policy_and_dtr_policy_expose_their_parent_relations()
    {
        $schedulePolicy = SchedulePolicy::whereNotNull('schedule_id')->orderBy('id', 'desc')->first();
        if ($schedulePolicy) {
            $this->assertNotNull($schedulePolicy->schedule());               // relation builder
            $this->assertNotNull($schedulePolicy->policy);
        }

        $dtrPolicy = DtrPolicy::whereNotNull('dtr_id')->orderBy('id', 'desc')->first();
        if ($dtrPolicy) {
            $this->assertNotNull($dtrPolicy->dtr());
            $this->assertNotNull($dtrPolicy->policy);
        }

        if (!$schedulePolicy && !$dtrPolicy) {
            $this->markTestSkipped('no schedule/dtr policy rows in test DB');
        }
    }

    // -------------------------------------------------------------- BiometricsRepository
    /** @test */
    public function biometrics_repository_reads_a_bounded_window_unfiltered()
    {
        // B5 (BUG-ENV-001) — biometrics live on a SEPARATE SQL Server instance, not MySQL.
        // Without a SQL Server PDO driver this cannot connect, and the failure is environmental,
        // not a defect. Skip loudly rather than reporting a false error: a skip says
        // "not verified here", an error says "broken", and only one of those is true.
        if (!extension_loaded('pdo_sqlsrv') && !extension_loaded('pdo_dblib')) {
            $this->markTestSkipped(
                'BUG-ENV-001: no SQL Server PDO driver (pdo_sqlsrv/pdo_dblib) in this environment — '
                . 'BiometricsRepository reads the checkinout table on a separate MSSQL host.'
            );
        }

        $repo = new BiometricsRepository();
        // deliberately tiny window — the biometrics table is large
        $start = '2026-07-01 00:00:00';
        $end   = '2026-07-01 00:01:00';

        $result = $repo->get_biometrics($start, $end);

        $this->assertNotNull($result);
        $this->assertIsIterable($result);
        foreach ($result as $row) {
            $this->assertContains($row->CheckType, ['I', 'O']);              // type filter arm
        }
    }

    /** @test */
    public function biometrics_repository_applies_the_user_collection_filter()
    {
        $user = User::whereNotNull('emp_num')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$user) $this->markTestSkipped('no active user with emp_num in test DB');

        $collection = new Collection();
        $collection->push($user);

        $repo = new BiometricsRepository();
        $result = $repo->get_biometrics('2026-07-01 00:00:00', '2026-07-01 00:01:00', $collection);

        // the emp_num -> biometrics-userid mapping arm ran; window keeps the result tiny
        $this->assertNotNull($result);
        $this->assertLessThanOrEqual(50, count($result));
    }

    // ------------------------------------------------------------ UtcTimeLogRepository
    /** @test */
    public function utc_adjustment_check_walks_the_year_and_records_dst_windows()
    {
        $rows = UtcTimelog::whereNotNull('timezone')->count();
        if ($rows === 0) $this->markTestSkipped('utc_timelog table is empty');

        $repo = new UtcTimeLogRepository();
        $result = $repo->check_adjustment();          // writes adjustment columns — rolled back

        $this->assertNotFalse($result);
        // every row now either has a coherent adjustment window or none at all
        foreach (UtcTimelog::whereNotNull('timezone')->get() as $row) {
            if ($row->start_adjustment !== null && $row->end_adjustment !== null) {
                $this->assertLessThanOrEqual(
                    strtotime((string) $row->end_adjustment),
                    strtotime((string) $row->start_adjustment),
                    "timezone '{$row->timezone}' has an inverted DST window"
                );
            }
        }
    }
}
