<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\User\Resources\PermissionResource;

/**
 * Pure toArray() transformation test.
 * PermissionResource is a straight field map (id/name/label/pivot).
 */
class PermissionResourceTest extends TestCase
{
    public function test_maps_permission_fields_including_pivot()
    {
        $pivot = (object) ['role_id' => 2, 'permission_id' => 9];
        $permission = (object) [
            'id' => 9,
            'name' => 'view-payroll',
            'label' => 'View Payroll',
            'pivot' => $pivot,
        ];

        $result = (new PermissionResource($permission))->toArray(request());

        $this->assertSame(9, $result['id']);
        $this->assertSame('view-payroll', $result['name']);
        $this->assertSame('View Payroll', $result['label']);
        $this->assertSame($pivot, $result['pivot']);
    }

    public function test_null_pivot_is_preserved()
    {
        $permission = (object) [
            'id' => 1,
            'name' => 'edit-user',
            'label' => 'Edit User',
            'pivot' => null,
        ];

        $result = (new PermissionResource($permission))->toArray(request());

        $this->assertNull($result['pivot']);
    }
}
