<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\User\Resources\EmploymentStatusResource;

/**
 * Pure toArray() transformation test.
 * EmploymentStatusResource maps an in-memory list of employment-status rows.
 */
class EmploymentStatusResourceTest extends TestCase
{
    public function test_maps_each_status_row()
    {
        $rows = [
            (object) ['date' => '2025-01-01', 'employmentStatus' => 'Probationary', 'comment' => 'Hired'],
            (object) ['date' => '2025-07-01', 'employmentStatus' => 'Regular', 'comment' => 'Regularized'],
        ];

        $result = (new EmploymentStatusResource($rows))->toArray(request());

        $this->assertCount(2, $result);
        $this->assertSame(
            ['date' => '2025-01-01', 'emp_status' => 'Probationary', 'comment' => 'Hired'],
            $result[0]
        );
        $this->assertSame(
            ['date' => '2025-07-01', 'emp_status' => 'Regular', 'comment' => 'Regularized'],
            $result[1]
        );
    }

    public function test_empty_input_returns_empty_array()
    {
        $result = (new EmploymentStatusResource([]))->toArray(request());

        $this->assertSame([], $result);
    }
}
