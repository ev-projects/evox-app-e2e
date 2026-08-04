<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Department\Resources\DepartmentLabelResource;

/**
 * Pure toArray() transformation test.
 * DepartmentLabelResource maps a department into a {label, value} option pair.
 */
class DepartmentLabelResourceTest extends TestCase
{
    public function test_maps_department_to_label_and_value()
    {
        $department = (object) [
            'id' => 12,
            'department_name' => 'Engineering',
        ];

        $result = (new DepartmentLabelResource($department))->toArray(request());

        $this->assertSame([
            'label' => 'Engineering',
            'value' => 12,
        ], $result);
    }

    public function test_null_resource_returns_null()
    {
        $result = (new DepartmentLabelResource(null))->toArray(request());

        $this->assertNull($result);
    }
}
