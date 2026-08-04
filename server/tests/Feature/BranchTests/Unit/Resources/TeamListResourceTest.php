<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Team\Resources\TeamListResource;

/**
 * Pure toArray() transformation test.
 * TeamListResource is a straight field map with a null-resource guard.
 */
class TeamListResourceTest extends TestCase
{
    public function test_maps_id_name_and_description()
    {
        $team = (object) [
            'id' => 8,
            'name' => 'Alpha Squad',
            'description' => 'Night shift support',
        ];

        $result = (new TeamListResource($team))->toArray(request());

        $this->assertSame([
            'id' => 8,
            'name' => 'Alpha Squad',
            'description' => 'Night shift support',
        ], $result);
    }

    public function test_null_resource_returns_null()
    {
        $result = (new TeamListResource(null))->toArray(request());

        $this->assertNull($result);
    }
}
