<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/BhrApiFake.php';

use Tests\TestCase;
use Tests\Support\BhrApiFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Bhr\Repositories\BhrRepository;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use Illuminate\Support\Facades\DB;

/**
 * REAL BhrRepository (the BambooHR integration layer — 19.2% covered, 172 uncovered lines).
 * Every HTTP call goes through the global bhr_api_call() helper; the BhrApiFake seam (new sibling
 * of CallSpFake) intercepts it at the namespace boundary, so the REAL repository logic — endpoint
 * construction, response parsing, holiday diffing/inserting, sorting — runs with zero network I/O.
 * Holiday writes in sync_holidays roll back under DatabaseTransactions.
 */
class BhrRepositoryApiFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var BhrRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        BhrApiFake::activate();
        $this->repo = new BhrRepository();
    }

    protected function tearDown(): void
    {
        BhrApiFake::reset();
        parent::tearDown();
    }

    /** A holiday date in year 2093 whose month-day does not collide with any predefined holiday. */
    private function freeHolidayDate()
    {
        foreach (['2093-03-11', '2093-03-12', '2093-03-13', '2093-03-18', '2093-03-19'] as $candidate) {
            $collides = Holiday::where('is_predefined', 1)
                ->whereRaw("DATE_FORMAT(date,'%m-%d') = DATE_FORMAT(?,'%m-%d')", [$candidate])
                ->exists();
            if (!$collides) return $candidate;
        }
        $this->markTestSkipped('all candidate dates collide with predefined holidays');
    }

    // ------------------------------------------------------------- user-number fetches
    /** @test */
    public function changed_users_are_sorted_by_last_changed_and_keyed_by_id()
    {
        BhrApiFake::fake('employees/changed', (object) ['employees' => [
            (object) ['id' => 5, 'lastChanged' => '2026-01-02T08:00:00+00:00'],
            (object) ['id' => 3, 'lastChanged' => '2026-01-01T08:00:00+00:00'],
        ]]);

        $out = $this->repo->get_changed_users('2026-01-01T00:00:00+00:00');

        $this->assertSame([3 => 3, 5 => 5], $out);
        $this->assertSame([3, 5], array_keys($out));            // oldest change first
        $call = BhrApiFake::callsFor('employees/changed')[0];
        $this->assertStringContainsString('since=', $call['endpoint']);
    }

    /** @test */
    public function all_bhr_user_numbers_collects_directory_ids()
    {
        BhrApiFake::fake('employees/directory', (object) ['employees' => [
            (object) ['id' => 11], (object) ['id' => 12],
        ]]);

        $out = $this->repo->get_all_bhr_user_numbers();

        $this->assertSame([11, 12], $out->all());
    }

    // ----------------------------------------------------------------- user detail fetches
    /** @test */
    public function get_user_requests_sync_fields_and_returns_payload()
    {
        $payload = (object) ['id' => 1001, 'firstName' => 'Seam'];
        BhrApiFake::fake('employees/1001', $payload);

        $this->assertSame($payload, $this->repo->get_user('1001', true));

        $endpoint = BhrApiFake::calls()[0]['endpoint'];
        $this->assertStringContainsString('employees/1001?fields=', $endpoint);
    }

    /** @test */
    public function profile_picture_handles_string_object_and_missing_number_arms()
    {
        BhrApiFake::fake('photo/medium', 'RAW-IMAGE-BYTES');
        $this->assertSame(base64_encode('RAW-IMAGE-BYTES'), $this->repo->get_profile_picture('1001'));

        BhrApiFake::reset();
        BhrApiFake::activate();
        BhrApiFake::fake('photo/medium', (object) ['fileBase64' => 'ALREADY-B64']);
        $this->assertSame('ALREADY-B64', $this->repo->get_profile_picture('1001'));

        $this->assertNull($this->repo->get_profile_picture(''));           // invalid arm, no call
        $this->assertCount(1, BhrApiFake::calls());
    }

    /** @test */
    public function user_bhr_field_appends_additional_fields_and_guards_empty_number()
    {
        $payload = (object) ['customField' => 'x'];
        BhrApiFake::fake('employees/1001', $payload);

        $out = $this->repo->get_user_bhr_field('1001', '', ['4206.4', '4206.7']);

        $this->assertSame($payload, $out);
        $endpoint = BhrApiFake::calls()[0]['endpoint'];
        $this->assertStringContainsString('4206.4,4206.7', $endpoint);      // concat arm

        $this->assertNull($this->repo->get_user_bhr_field(''));             // invalid arm
    }

    /** @test */
    public function job_information_report_and_leave_credits_build_correct_endpoints()
    {
        BhrApiFake::fake('tables/jobInfo', (object) ['rows' => []]);
        $this->assertNotNull($this->repo->get_user_job_information('1001', 'jobInfo'));
        $this->assertStringContainsString('employees/1001/tables/jobInfo', BhrApiFake::calls()[0]['endpoint']);

        BhrApiFake::fake('reports/77', (object) ['title' => 'r']);
        $this->assertNotNull($this->repo->get_report('77'));
        $this->assertSame([], $this->repo->get_report(''));                 // invalid arm -> []

        BhrApiFake::fake('time_off/calculator', [(object) ['name' => 'VL']]);
        $this->repo->get_leave_credits('1001', '2026-07-15');
        $calc = BhrApiFake::callsFor('time_off/calculator')[0];
        $this->assertStringContainsString('end=2026-07-15T00:00:00-00:00', $calc['endpoint']);
    }

    // ------------------------------------------------------------------------ leaves
    /** @test */
    public function get_leaves_appends_employee_id_only_when_user_given()
    {
        BhrApiFake::fake('time_off/requests', [(object) ['id' => 1]]);

        $this->repo->get_leaves('2026-07-01', '2026-07-15');
        $this->assertStringNotContainsString('employeeId', BhrApiFake::calls()[0]['endpoint']);

        $user = new User();
        $user->bhr_num = '9009';
        $this->repo->get_leaves('2026-07-01', '2026-07-15', $user);
        $this->assertStringContainsString('employeeId=9009', BhrApiFake::calls()[1]['endpoint']);
    }

    // ---------------------------------------------------------------------- holidays
    /** @test */
    public function get_holidays_merges_country_calls_filters_type_and_sorts()
    {
        BhrApiFake::fake('whos_out', function ($m, $e, $d, $j, $country) {
            if ($country === 'default') {
                return [
                    (object) ['type' => 'holiday', 'name' => 'B Holiday', 'start' => '2093-03-20'],
                    (object) ['type' => 'timeOff', 'name' => 'Not a holiday', 'start' => '2093-03-01'],
                ];
            }
            if ($country === 'India') {
                return [(object) ['type' => 'holiday', 'name' => 'A Holiday', 'start' => '2093-03-05']];
            }
            return null;                                        // ?? [] null-coalesce arm
        });

        $out = $this->repo->get_holidays('2093-03-01', '2093-03-31');

        $this->assertCount(2, $out);                            // timeOff filtered out
        $this->assertSame(['A Holiday', 'B Holiday'],           // sorted by start date
            array_map(function ($h) { return $h->name; }, $out));
        $this->assertCount(5, BhrApiFake::calls());             // PHL+IND+BUL+MAR+BEL
    }

    /** @test */
    public function sync_holidays_inserts_new_rows_then_treats_them_as_existing()
    {
        $date = $this->freeHolidayDate();
        $unique = uniqid('SeamHoliday');
        $utc = UtcTimelog::whereNotNull('alpha_three')->first();
        $name = ($utc ? "[{$utc->alpha_three}] " : '') . $unique . ' (Regular)';

        BhrApiFake::fake('whos_out', function ($m, $e, $d, $j, $country) use ($name, $date) {
            return $country === 'default'
                ? [(object) ['type' => 'holiday', 'name' => $name, 'start' => $date]]
                : null;
        });

        // first run: not existing -> INSERT arm
        $inserted = $this->repo->sync_holidays('2093-03-01', '2093-03-31');
        $this->assertCount(1, $inserted);
        $holiday = $inserted->first();
        $this->assertSame($name, $holiday->name);
        $this->assertSame('lh', $holiday->type);                // '(Regular)' -> legal holiday arm
        $this->assertEquals(0, $holiday->is_predefined);
        if ($utc) {
            $this->assertEquals($utc->country_id, $holiday->country_id);   // acronym-match arm
        }
        $this->assertNotNull(Holiday::find($holiday->id));      // row present inside the txn

        // second run: same payload -> EXISTING arm, nothing inserted
        $second = $this->repo->sync_holidays('2093-03-01', '2093-03-31');
        $this->assertCount(0, $second);
    }
}
