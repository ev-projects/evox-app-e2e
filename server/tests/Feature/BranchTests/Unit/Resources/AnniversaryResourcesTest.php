<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Carbon\Carbon;
use Tests\TestCase;
use App\Modules\Payroll\Resources\AnniversaryResources;

/**
 * Pure toArray() transformation test.
 * AnniversaryResources maps an in-memory list of milestone rows and derives a
 * display label per type (regularization / anniversary / birthdate).
 */
class AnniversaryResourcesTest extends TestCase
{
    public function test_regularization_row_is_labelled_regularization()
    {
        $rows = [
            (object) [
                'date' => '2025-04-10',
                'type' => 'regularization',
                'first_name' => 'Ana',
                'last_name' => 'Cruz',
            ],
        ];

        $result = (new AnniversaryResources($rows))->toArray(request());

        $this->assertCount(1, $result);
        $this->assertSame('April 10', $result[0]['date']);
        $this->assertSame('Cruz, Ana', $result[0]['name']);
        $this->assertSame('Regularization', $result[0]['display']);
        $this->assertSame('regularization', $result[0]['type']);
    }

    public function test_birthdate_row_is_labelled_birthday()
    {
        $rows = [
            (object) [
                'date' => '1990-12-25',
                'type' => 'birthdate',
                'first_name' => 'Ben',
                'last_name' => 'Reyes',
            ],
        ];

        $result = (new AnniversaryResources($rows))->toArray(request());

        $this->assertSame('December 25', $result[0]['date']);
        $this->assertSame('Reyes, Ben', $result[0]['name']);
        $this->assertSame('Birthday', $result[0]['display']);
    }

    public function test_anniversary_uses_ordinal_years_of_service()
    {
        $threeYearsAgo = Carbon::now()->subYears(3)->format('Y-m-d');

        $rows = [
            (object) [
                'date' => $threeYearsAgo,
                'type' => 'anniversary',
                'first_name' => 'Cara',
                'last_name' => 'Lim',
            ],
        ];

        $result = (new AnniversaryResources($rows))->toArray(request());

        $this->assertSame('3rd Anniversary', $result[0]['display']);
    }

    public function test_zero_year_anniversary_is_ev_rookies()
    {
        $thisYear = Carbon::now()->format('Y-m-d');

        $rows = [
            (object) [
                'date' => $thisYear,
                'type' => 'anniversary',
                'first_name' => 'Dan',
                'last_name' => 'Tan',
            ],
        ];

        $result = (new AnniversaryResources($rows))->toArray(request());

        $this->assertSame('EV Rookies', $result[0]['display']);
    }
}
