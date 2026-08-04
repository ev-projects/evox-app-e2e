<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use Illuminate\Support\Collection;
use App\Modules\User\Resources\RoleResource;

/**
 * Pure toArray() transformation test.
 * RoleResource maps id/name and wraps a pre-loaded (in-memory) permissions
 * collection in a nested resource collection. The permissions attribute is
 * supplied directly as a Collection so no relation is lazily loaded from the DB.
 */
class RoleResourceTest extends TestCase
{
    public function test_maps_id_name_and_wraps_permissions_collection()
    {
        $role = (object) [
            'id' => 4,
            'name' => 'Manager',
            'permissions' => new Collection(), // empty, avoids DB relation load
        ];

        $result = (new RoleResource($role))->toArray(request());

        $this->assertSame(4, $result['id']);
        $this->assertSame('Manager', $result['name']);
        $this->assertArrayHasKey('permissions', $result);
    }
}
