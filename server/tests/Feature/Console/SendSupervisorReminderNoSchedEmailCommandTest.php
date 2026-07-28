<?php

namespace Tests\Feature\Console;

use Mockery;
use Tests\TestCase;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\User\Models\User;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class SendSupervisorReminderNoSchedEmailCommandTest extends TestCase
{
    protected function tearDown()
    {
        Mockery::close();

        parent::tearDown();
    }

    private function createUser($id, $name)
    {
        $user = new User();

        $user->id = $id;
        $user->name = $name;

        return $user;
    }

    /** @test */
    public function it_sends_no_schedule_reminder_email_to_supervisors()
    {
        $supervisor = $this->createUser(100, 'Supervisor One');

        $employeesWithoutSchedule = new Collection([
            $this->createUser(1, 'Employee One'),
            $this->createUser(2, 'Employee Two'),
        ]);

        $userRepository = Mockery::mock(UserRepositoryInterface::class);
        $emailRepository = Mockery::mock(EmailRepositoryInterface::class);

        $userRepository
            ->shouldReceive('get_all_supervisors')
            ->once()
            ->andReturn([
                $supervisor
            ]);

        $userRepository
            ->shouldReceive('get_users_under_supervisee_active_with_no_schedule')
            ->once()
            ->with($supervisor)
            ->andReturn($employeesWithoutSchedule);

        $emailRepository
            ->shouldReceive('sendSupervisorReminderNoSchedEmail')
            ->once()
            ->with([
                $supervisor,
                $employeesWithoutSchedule
            ]);

        $this->app->instance(
            UserRepositoryInterface::class,
            $userRepository
        );

        $this->app->instance(
            EmailRepositoryInterface::class,
            $emailRepository
        );

        $this->artisan('send_supervisor_reminder_no_sched')
            ->assertExitCode(0);
    }


    /** @test */
    public function it_does_not_send_email_when_supervisor_has_no_employee_without_schedule()
    {
        $supervisor = $this->createUser(100, 'Supervisor One');

        $employeesWithoutSchedule = new Collection([]);

        $userRepository = Mockery::mock(UserRepositoryInterface::class);
        $emailRepository = Mockery::mock(EmailRepositoryInterface::class);

        $userRepository
            ->shouldReceive('get_all_supervisors')
            ->once()
            ->andReturn([
                $supervisor
            ]);

        $userRepository
            ->shouldReceive('get_users_under_supervisee_active_with_no_schedule')
            ->once()
            ->with($supervisor)
            ->andReturn($employeesWithoutSchedule);

        $emailRepository
            ->shouldNotReceive('sendSupervisorReminderNoSchedEmail');

        $this->app->instance(
            UserRepositoryInterface::class,
            $userRepository
        );

        $this->app->instance(
            EmailRepositoryInterface::class,
            $emailRepository
        );

        $this->artisan('send_supervisor_reminder_no_sched')
            ->assertExitCode(0);
    }
}