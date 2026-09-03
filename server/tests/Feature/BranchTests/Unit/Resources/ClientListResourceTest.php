<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Client\Resources\ClientListResource;

/**
 * Pure toArray() transformation test.
 * ClientListResource is a straight field map with a null-resource guard.
 */
class ClientListResourceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->markTestSkipped('CLIENT MODULE REMOVED 2026-08-10: App\Modules\Client deleted. These tests have no runnable subject.');
    }

    public function test_maps_id_department_name_and_description()
    {
        $client = (object) [
            'id' => 3,
            'department_name' => 'Acme Corp',
            'description' => 'Primary client account',
        ];

        $result = (new ClientListResource($client))->toArray(request());

        $this->assertSame([
            'id' => 3,
            'department_name' => 'Acme Corp',
            'description' => 'Primary client account',
        ], $result);
    }

    public function test_null_resource_returns_null()
    {
        $result = (new ClientListResource(null))->toArray(request());

        $this->assertNull($result);
    }
}
