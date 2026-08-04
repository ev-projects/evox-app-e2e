<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Payroll\Resources\PayrollCutoffResource;

/**
 * Pure toArray() transformation test.
 * PayrollCutoffResource maps cutoff fields and derives year/month/month_label
 * from end_date via Carbon. Null-resource guard covered.
 */
class PayrollCutoffResourceTest extends TestCase
{
    public function test_maps_fields_and_derives_year_month_labels()
    {
        $cutoff = (object) [
            'id' => 100,
            'name' => 'March 2026 Cutoff',
            'start_date' => '2026-03-16',
            'end_date' => '2026-03-31',
        ];

        $result = (new PayrollCutoffResource($cutoff))->toArray(request());

        $this->assertSame(100, $result['id']);
        $this->assertSame('March 2026 Cutoff', $result['name']);
        $this->assertSame('2026-03-16', $result['start_date']);
        $this->assertSame('2026-03-31', $result['end_date']);
        $this->assertSame('2026', $result['year']);
        $this->assertSame('03', $result['month']);
        $this->assertSame('March', $result['month_label']);
    }

    public function test_null_start_and_end_dates_stay_null_for_raw_fields()
    {
        $cutoff = (object) [
            'id' => 1,
            'name' => 'Draft',
            'start_date' => null,
            'end_date' => null,
        ];

        $result = (new PayrollCutoffResource($cutoff))->toArray(request());

        $this->assertNull($result['start_date']);
        $this->assertNull($result['end_date']);
    }

    public function test_null_resource_returns_null()
    {
        $result = (new PayrollCutoffResource(null))->toArray(request());

        $this->assertNull($result);
    }
}
