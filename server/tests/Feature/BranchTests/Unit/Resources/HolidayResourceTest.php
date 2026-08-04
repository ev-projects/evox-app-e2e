<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Payroll\Resources\HolidayResource;

/**
 * Pure toArray() transformation test.
 * HolidayResource iterates an in-memory list of holiday objects and maps
 * name/date/type. No SP, no DB, no lazy relation loads.
 */
class HolidayResourceTest extends TestCase
{
    private function makeHoliday($name, $date, $type)
    {
        return (object) [
            'name' => $name,
            'date' => $date,
            'type' => $type,
        ];
    }

    public function test_maps_each_holiday_to_name_date_and_type()
    {
        $holidays = [
            $this->makeHoliday('New Year', '2026-01-01', 'Legal'),
            $this->makeHoliday('Labor Day', '2026-05-01', 'Special'),
        ];

        $result = (new HolidayResource($holidays))->toArray(request());

        $this->assertCount(2, $result);

        $this->assertSame('New Year', $result[0]['holiday_name']);
        $this->assertSame('January 01', $result[0]['holiday_date']);
        $this->assertSame('Legal', $result[0]['holiday_type']);

        $this->assertSame('Labor Day', $result[1]['holiday_name']);
        $this->assertSame('May 01', $result[1]['holiday_date']);
        $this->assertSame('Special', $result[1]['holiday_type']);
    }

    public function test_formats_date_as_month_name_and_day()
    {
        $holidays = [$this->makeHoliday('Independence Day', '2026-06-12', 'Legal')];

        $result = (new HolidayResource($holidays))->toArray(request());

        $this->assertSame('June 12', $result[0]['holiday_date']);
    }

    public function test_null_resource_returns_null()
    {
        $result = (new HolidayResource(null))->toArray(request());

        $this->assertNull($result);
    }
}
