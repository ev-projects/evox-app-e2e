<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Payroll\Resources\DtrPunchResource;

/**
 * Pure toArray() transformation test.
 * DtrPunchResource maps punch fields and derives recent_log / completed_today /
 * hours. Time formatting uses global date helpers whose default path (no
 * authenticated user in tests) is a plain date() call, so expected values are
 * computed with the same call to stay timezone-independent.
 */
class DtrPunchResourceTest extends TestCase
{
    public function test_maps_completed_punch_and_derives_flags()
    {
        $timeIn = 1000000000;
        $timeOut = $timeIn + 3600; // exactly one hour later

        $punch = (object) [
            'id' => 55,
            'date' => '2026-01-10',
            'time_in' => $timeIn,
            'time_out' => $timeOut,
            'log_action' => 'punch',
            'log_in_type' => 'Log_in',
            'log_out_type' => 'Log_out',
            'remarks' => 'ok',
            'project_name' => 'ProjX',
        ];

        $result = (new DtrPunchResource($punch))->toArray(request());

        $this->assertSame(55, $result['id']);
        $this->assertSame('2026-01-10', $result['date']);
        $this->assertSame(date('H:i:s', $timeIn), $result['time_in']);
        $this->assertSame(date('H:i:s', $timeOut), $result['time_out']);
        $this->assertSame(date('Y-m-d H:i:s', $timeIn), $result['date_time_in']);
        $this->assertSame(date('Y-m-d H:i:s', $timeOut), $result['date_time_out']);
        $this->assertSame('punch', $result['log_action']);
        $this->assertSame('Log_in', $result['log_in_type']);
        $this->assertSame('Log_out', $result['log_out_type']);
        // log_out_type is set -> recent_log echoes it, completed_today is true
        $this->assertSame('Log_out', $result['recent_log']);
        $this->assertTrue($result['completed_today']);
        $this->assertSame('ok', $result['remarks']);
        $this->assertSame('ProjX', $result['project_name']);
        // one hour rendered
        $this->assertSame('01:00:00', $result['hours']);
    }

    public function test_open_punch_without_log_out_falls_back_to_log_in_type()
    {
        $punch = (object) [
            'id' => 56,
            'date' => '2026-01-11',
            'time_in' => 1000000000,
            'time_out' => null,
            'log_action' => 'punch',
            'log_in_type' => 'Log_in',
            'log_out_type' => null,
            'remarks' => null,
            'project_name' => null,
        ];

        $result = (new DtrPunchResource($punch))->toArray(request());

        $this->assertNull($result['log_out_type']);
        // recent_log falls back to log_in_type
        $this->assertSame('Log_in', $result['recent_log']);
        // completed_today is false when there is no log_out
        $this->assertFalse($result['completed_today']);
        // time_out null -> formatted time is null, hours is null
        $this->assertNull($result['time_out']);
        $this->assertNull($result['hours']);
    }

    public function test_null_resource_returns_null()
    {
        $result = (new DtrPunchResource(null))->toArray(request());

        $this->assertNull($result);
    }
}
