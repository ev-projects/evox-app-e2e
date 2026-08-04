<?php

namespace Tests\Feature\BranchTests\Unit\Models;

use Tests\TestCase;
use App\Modules\Coe\Models\COE;

/**
 * Pure accessor test.
 * COE::getPurposeAttribute() resolves purpose_index against the COE_PURPOSES
 * constant map. No DB access.
 */
class COEModelTest extends TestCase
{
    public function test_purpose_accessor_resolves_index_zero()
    {
        $coe = new COE();
        $coe->purpose_index = 0;

        $this->assertSame('Auto/Car Loan Application', $coe->purpose);
    }

    public function test_purpose_accessor_resolves_housing_loan()
    {
        $coe = new COE();
        $coe->purpose_index = 2;

        $this->assertSame('Housing Loan Application', $coe->purpose);
    }

    public function test_purpose_accessor_resolves_proof_of_employment()
    {
        $coe = new COE();
        $coe->purpose_index = 4;

        $this->assertSame('Proof of Employment', $coe->purpose);
    }
}
