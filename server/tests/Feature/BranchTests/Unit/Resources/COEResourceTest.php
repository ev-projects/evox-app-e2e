<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Coe\Resources\COEResource;

/**
 * Pure toArray() transformation test.
 * COEResource maps id/user_id/purpose and formats created_at via Carbon.
 * Input is a plain object so the model's purpose accessor is not involved.
 */
class COEResourceTest extends TestCase
{
    public function test_maps_main_info_fields()
    {
        $coe = (object) [
            'id' => 42,
            'user_id' => 7,
            'purpose' => 'Bank Loan Application',
            'created_at' => '2026-01-15 10:30:45',
        ];

        $result = (new COEResource($coe))->toArray(request());

        $this->assertSame(42, $result['id']);
        $this->assertSame(7, $result['user_id']);
        $this->assertSame('Bank Loan Application', $result['purpose']);
        $this->assertSame('2026-01-15 10:30:45', $result['generated_at']);
    }

    public function test_generated_at_is_normalised_to_full_datetime()
    {
        $coe = (object) [
            'id' => 1,
            'user_id' => 1,
            'purpose' => 'Proof of Employment',
            'created_at' => '2026-03-01',
        ];

        $result = (new COEResource($coe))->toArray(request());

        $this->assertSame('2026-03-01 00:00:00', $result['generated_at']);
    }
}
