<?php

namespace Tests\Feature\Console;

use Mockery;
use Tests\TestCase;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class SendSupervisorReminderInvalidCheckInsCommandTest extends TestCase
{
    protected function tearDown()
    {
        Mockery::close();

        parent::tearDown();
    }

    /** @test */
    public function it_sends_invalid_check_in_reminders_to_supervisors()
    {
        $supervisor = (object) [
            'id' => 1698,
            'name' => 'Gary Aure',
        ];

        $invalidCheckIns = [
            (object) [
                'id' => 1,
                'name' => 'Employee One',
            ],
        ];

        $userRepository = Mockery::mock(UserRepositoryInterface::class);
        $emailRepository = Mockery::mock(EmailRepositoryInterface::class);

        $userRepository
            ->shouldReceive('get_all_supervisors')
            ->once()
            ->andReturn([
                $supervisor,
            ]);

        $userRepository
            ->shouldReceive('get_users_under_supervisee_active_with_invalid_check_ins')
            ->once()
            ->with(1698)
            ->andReturn($invalidCheckIns);

        $emailRepository
            ->shouldReceive('sendSupervisorReminderInvalidCheckInsEmail')
            ->once()
            ->with([
                $supervisor,
                $invalidCheckIns,
            ]);

        $this->app->instance(UserRepositoryInterface::class, $userRepository);
        $this->app->instance(EmailRepositoryInterface::class, $emailRepository);

        $this->artisan('send_supervisor_reminder_invalid_check_ins')
            ->assertExitCode(0);
    }


    /** @test */
    public function it_does_not_send_email_when_supervisor_has_no_invalid_check_ins()
    {
        $supervisor = (object) [
            'id' => 1698,
            'name' => 'Gary Aure',
        ];

        $userRepository = Mockery::mock(UserRepositoryInterface::class);
        $emailRepository = Mockery::mock(EmailRepositoryInterface::class);

        $userRepository
            ->shouldReceive('get_all_supervisors')
            ->once()
            ->andReturn([
                $supervisor,
            ]);

        $userRepository
            ->shouldReceive('get_users_under_supervisee_active_with_invalid_check_ins')
            ->once()
            ->with(1698)
            ->andReturn([]);

        $emailRepository
            ->shouldNotReceive('sendSupervisorReminderInvalidCheckInsEmail');

        $this->app->instance(UserRepositoryInterface::class, $userRepository);
        $this->app->instance(EmailRepositoryInterface::class, $emailRepository);

        $this->artisan('send_supervisor_reminder_invalid_check_ins')
            ->assertExitCode(0);
    }
}