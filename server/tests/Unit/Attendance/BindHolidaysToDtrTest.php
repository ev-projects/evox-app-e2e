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

        $dtr = Dtr::firstOrCreate(
            [
                'user_id' => $user->id,
                'date' => $date,
            ]
        );

        $holiday = Holiday::firstOrCreate(
            [
                'date' => $date,
                'country_id' => $user->country_id,
            ],
            [
                'name' => 'Test Holiday (Regular)',
                'is_predefined' => 0,
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