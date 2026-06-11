<?php

namespace Tests\Unit\Attendance;

use Tests\TestCase;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Holiday;

class BindHolidaysToDtrTest extends TestCase
{
    protected DtrRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = app()->make(DtrRepository::class);
    }

    /** @test */
    public function it_attaches_holiday_to_dtr()
    {
        $user = $this->user();
        $date = $this->scenarioDate();

        $dtr = Dtr::firstOrCreate([
            'user_id' => $user->id,
            'date'    => $date,
        ]);

        $type = $user->country_id == 2
            ? (rand(0, 1) ? 'lh' : 'sh')
            : 'sh';

        $countryPrefixes = [
            1 => 'IND',
            2 => 'PHL',
            3 => 'BGR',
            4 => 'MAR',
            5 => 'BE',
        ];

        $alphaThree = $countryPrefixes[$user->country_id] ?? 'UNK';

        $holiday = Holiday::updateOrCreate(
            [
                'date'       => $date,
                'country_id' => $user->country_id,
            ],
            [
                'name' => '[' . $alphaThree . '] Test Holiday (' .
                    ($type === 'lh' ? 'Regular' : 'Special') .
                    ')',
                'is_predefined' => 0,
                'type'          => $type,
            ]
        );

        $result = $this->repo->bind_holidays_to_dtr(
            $date,
            $date
        );

        $dtr = $dtr->fresh();

        $this->assertTrue(
            $dtr->holidays()->where('holiday_id', $holiday->id)->exists()
        );

        $this->assertNotEmpty($result);
    }
}