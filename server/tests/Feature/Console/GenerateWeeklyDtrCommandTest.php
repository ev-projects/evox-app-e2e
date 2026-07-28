<?php

namespace Tests\Feature\Console;

use Mockery;
use Tests\TestCase;
use Illuminate\Http\JsonResponse;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;

class GenerateWeeklyDtrCommandTest extends TestCase
{
    protected function tearDown()
    {
        Mockery::close();

        parent::tearDown();
    }

    /** @test */
    public function it_generates_weekly_dtr_successfully()
    {
        $users = new EloquentCollection([
            (object)[
                'id' => 1,
                'employee_number' => 'EMP001',
            ],
            (object)[
                'id' => 2,
                'employee_number' => 'EMP002',
            ],
        ]);

        $userRepository = Mockery::mock(UserRepositoryInterface::class);
        $dtrRepository = Mockery::mock(DtrRepositoryInterface::class);

        $userRepository
            ->shouldReceive('get_all_active_users')
            ->once()
            ->andReturn($users);

        $dtrRepository
            ->shouldReceive('generate_dtr')
            ->once()
            ->withArgs(function ($userCollection, $dateArray) use ($users) {
                return $userCollection === $users
                    && is_array($dateArray)
                    && count($dateArray) > 0;
            })
            ->andReturn([
                'generated' => 2,
            ]);

        $this->app->instance(UserRepositoryInterface::class, $userRepository);
        $this->app->instance(DtrRepositoryInterface::class, $dtrRepository);

        $this->artisan('generate_weekly_dtr')
            ->assertExitCode(0);
    }
}