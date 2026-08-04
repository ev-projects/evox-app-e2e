<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\User\Resources\LeaveCreditsListResource;

/**
 * Pure toArray() transformation test.
 * LeaveCreditsListResource maps an in-memory list of leave-credit rows.
 */
class LeaveCreditsListResourceTest extends TestCase
{
    public function test_maps_each_leave_credit_row()
    {
        $rows = [
            (object) ['name' => 'Vacation Leave', 'balance' => 12.5, 'policyType' => 'accrued'],
            (object) ['name' => 'Sick Leave', 'balance' => 5, 'policyType' => 'fixed'],
        ];

        $result = (new LeaveCreditsListResource($rows))->toArray(request());

        $this->assertCount(2, $result);
        $this->assertSame(
            ['type' => 'Vacation Leave', 'balance' => 12.5, 'policy_type' => 'accrued'],
            $result[0]
        );
        $this->assertSame(
            ['type' => 'Sick Leave', 'balance' => 5, 'policy_type' => 'fixed'],
            $result[1]
        );
    }

    public function test_empty_input_returns_empty_array()
    {
        $result = (new LeaveCreditsListResource([]))->toArray(request());

        $this->assertSame([], $result);
    }
}
