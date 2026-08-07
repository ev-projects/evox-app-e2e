<?php

namespace Tests\Feature\Console;

use Mockery;
use Tests\TestCase;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class SyncBhrHolidaysCommandTest extends TestCase
{
    protected function tearDown()
    {
        Mockery::close();

        parent::tearDown();
    }

    /** @test */
    public function it_syncs_bhr_holidays_successfully()
    {
        $payrollCutoff = (object) [
            'start_date' => '2026-01-01',
            'end_date' => '2026-01-15',
        ];

        $holidayResult = new Collection([]);


        $payrollRepository = Mockery::mock(PayrollCutoffRepositoryInterface::class);
        $bhrRepository = Mockery::mock(BhrRepositoryInterface::class);
        $dtrRepository = Mockery::mock(DtrRepositoryInterface::class);


        $payrollRepository
            ->shouldReceive('get_payroll_cutoff')
            ->once()
            ->andReturn($payrollCutoff);


        $bhrRepository
            ->shouldReceive('sync_holidays')
            ->once()
            ->with(
                $payrollCutoff->start_date,
                Mockery::type('string')
            )
            ->andReturn(true);


        $dtrRepository
            ->shouldReceive('bind_holidays_to_dtr')
            ->once()
            ->with(
                $payrollCutoff->start_date,
                Mockery::type('string')
            )
            ->andReturn($holidayResult);


        $this->app->instance(
            PayrollCutoffRepositoryInterface::class,
            $payrollRepository
        );

        $this->app->instance(
            BhrRepositoryInterface::class,
            $bhrRepository
        );

        $this->app->instance(
            DtrRepositoryInterface::class,
            $dtrRepository
        );


        $this->artisan('sync_bhr_holidays')
            ->assertExitCode(0);
    }
}