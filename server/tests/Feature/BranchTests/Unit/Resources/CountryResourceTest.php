<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\User\Resources\CountryResource;

/**
 * Pure toArray() transformation test.
 * CountryResource is a straight field map over an in-memory country object.
 */
class CountryResourceTest extends TestCase
{
    public function test_maps_all_country_fields()
    {
        $country = (object) [
            'id' => 5,
            'country_id' => 608,
            'country_name' => 'Philippines',
            'alpha_two' => 'PH',
            'alpha_three' => 'PHL',
        ];

        $result = (new CountryResource($country))->toArray(request());

        $this->assertSame([
            'id' => 5,
            'country_id' => 608,
            'country_name' => 'Philippines',
            'alpha_two' => 'PH',
            'alpha_three' => 'PHL',
        ], $result);
    }
}
