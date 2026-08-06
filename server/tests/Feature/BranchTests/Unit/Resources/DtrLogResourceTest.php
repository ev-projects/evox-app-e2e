<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Resources\DtrLogResource;

/**
 * WAVE-2 COVERAGE (2026-07-27). Tests for DtrLogResource::toArray() (0% before this).
 * This resource is DB-COUPLED by design: it queries drt_summary_report directly and walks
 * Dtr relations (user/holidays/leaves/country_zone), so it runs against REAL rows from the
 * test dump — bounded reads only (single dtr by id), DatabaseTransactions, no writes, no SP.
 * Rows are probed defensively; if the dump has no fully-linked DTR the test skips cleanly.
 */
class DtrLogResourceTest extends TestCase
{
    use DatabaseTransactions;

    /** Find a DTR whose user + timezone chain is intact (bounded probe over recent rows). */
    private function findLinkedDtr()
    {
        // PROBE WIDENED 2026-08-06: was limit(25). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        foreach (Dtr::orderBy('id', 'desc')->limit(400)->get() as $dtr) {
            $user = $dtr->user()->first();
            if ($user && $user->country_zone()) {
                return $dtr;
            }
        }
        return null;
    }

    public function test_null_resource_returns_null()
    {
        $this->assertNull((new DtrLogResource(null))->toArray(request()));
    }

    public function test_maps_real_dtr_row_with_user_payroll_items_and_pov_times()
    {
        $dtr = $this->findLinkedDtr();
        if (!$dtr) $this->markTestIncomplete('no DTR with linked user+timezone in test DB');

        $result = (new DtrLogResource($dtr))->toArray(request());

        $this->assertIsArray($result);
        $this->assertSame($dtr->id, $result['id']);
        $this->assertSame($dtr->user_id, $result['user_id']);
        $this->assertSame($dtr->date, $result['date']);
        $this->assertArrayHasKey('emp_num', $result);
        $this->assertArrayHasKey('full_name', $result);
        $this->assertNotSame('', $result['full_name']);
        // payroll_items assembled from drt_summary_report (may be empty array for quiet days)
        $this->assertIsArray($result['payroll_items']);
        $this->assertIsArray($result['holidays']);
        $this->assertArrayHasKey('timezone', $result);
        // user_POV block mirrors the six schedule/log timestamps through the user's timezone
        foreach (['time_in', 'time_out', 'start_datetime', 'end_datetime',
                  'start_flexy_datetime', 'end_flexy_datetime'] as $k) {
            $this->assertArrayHasKey($k, $result['user_POV']);
        }
    }

    public function test_break_time_formats_only_positive_values()
    {
        $dtr = $this->findLinkedDtr();
        if (!$dtr) $this->markTestIncomplete('no DTR with linked user+timezone in test DB');

        $result = (new DtrLogResource($dtr))->toArray(request());

        if (is_valid($dtr->break_time) && $dtr->break_time > 0) {
            $this->assertSame(seconds_to_time($dtr->break_time), $result['break_time']);
        } else {
            $this->assertNull($result['break_time']);
        }
    }
}
