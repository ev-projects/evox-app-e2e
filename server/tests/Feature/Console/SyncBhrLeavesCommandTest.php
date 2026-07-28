<?php

namespace Tests\Feature\Console;

use Mockery;
use Tests\TestCase;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class SyncBhrLeavesCommandTest extends TestCase
{
    protected function tearDown()
    {
        Mockery::close();

        parent::tearDown();
    }


    private function mockRepositories($withCutoff = false)
    {
        $payrollRepository = Mockery::mock(PayrollCutoffRepositoryInterface::class);
        $bhrRepository = Mockery::mock(BhrRepositoryInterface::class);
        $dtrRepository = Mockery::mock(DtrRepositoryInterface::class);


        if ($withCutoff) {
            $payrollRepository
                ->shouldReceive('find')
                ->once()
                ->with(10)
                ->andReturn((object)[
                    'start_date' => '2026-07-01',
                    'end_date' => '2026-07-15',
                ]);
        } else {
            $payrollRepository
                ->shouldReceive('get_payroll_cutoff')
                ->once()
                ->andReturn((object)[
                    'start_date' => '2026-07-01',
                    'end_date' => '2026-07-15',
                ]);
        }


        $bhrRepository
            ->shouldReceive('get_leaves')
            ->once()
            ->with(
                '2026-07-01',
                '2026-07-15'
            )
            ->andReturn([
                (object)[
                    'id' => 2,
                    'status' => (object)[
                        'lastChanged' => 200
                    ]
                ],
                (object)[
                    'id' => 1,
                    'status' => (object)[
                        'lastChanged' => 100
                    ]
                ],
            ]);


        $dtrRepository
            ->shouldReceive('bind_leaves_to_dtr')
            ->once()
            ->with(
                Mockery::type('array'),
                Mockery::any(),
                '2026-07-01',
                '2026-07-15'
            )
            ->andReturn([
                'success' => true
            ]);


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
    }


    /** @test */
    public function it_syncs_bhr_leaves_for_bu_country()
    {
        $this->mockRepositories();

        $this->artisan('sync_bhr_leaves', [
            'country_code' => 'BU'
        ])
        ->assertExitCode(0);
    }


    /** @test */
    public function it_syncs_bhr_leaves_for_be_country()
    {
        $this->mockRepositories();

        $this->artisan('sync_bhr_leaves', [
            'country_code' => 'BE'
        ])
        ->assertExitCode(0);
    }


    /** @test */
    public function it_syncs_bhr_leaves_for_ph_country()
    {
        $this->mockRepositories();

        $this->artisan('sync_bhr_leaves', [
            'country_code' => 'PH'
        ])
        ->assertExitCode(0);
    }


    /** @test */
    public function it_syncs_bhr_leaves_using_cutoff_id()
    {
        $this->mockRepositories(true);

        $this->artisan('sync_bhr_leaves', [
            'country_code' => 'BU',
            '--cutoff-id' => 10
        ])
        ->assertExitCode(0);
    }


    /** @test */
    public function it_rejects_invalid_country_code()
    {
        $this->artisan('sync_bhr_leaves', [
            'country_code' => 'XX'
        ])
        ->assertExitCode(0);
    }
}