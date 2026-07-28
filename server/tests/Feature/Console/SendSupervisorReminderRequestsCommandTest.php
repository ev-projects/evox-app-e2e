<?php

namespace Tests\Feature\Console;

use Mockery;
use Tests\TestCase;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class SendSupervisorReminderRequestsCommandTest extends TestCase
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
    public function it_sends_request_reminder_email_to_supervisors()
    {
        $supervisor = $this->createUser(100, 'Supervisor One');

        $payrollCutoff = (object) [
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-15',
        ];

        $requests = new Collection([
            (object) [
                'id' => 1,
                'type' => 'Leave Request',
            ],
        ]);

        $payrollRepository = Mockery::mock(PayrollCutoffRepositoryInterface::class);
        $userRepository = Mockery::mock(UserRepositoryInterface::class);
        $emailRepository = Mockery::mock(EmailRepositoryInterface::class);


        $payrollRepository
            ->shouldReceive('get_payroll_cutoff')
            ->once()
            ->andReturn($payrollCutoff);


        $userRepository
            ->shouldReceive('get_all_supervisors')
            ->once()
            ->andReturn([
                $supervisor
            ]);


        $userRepository
            ->shouldReceive('get_users_under_supervisee_active_with_requests')
            ->once()
            ->with(
                $payrollCutoff->start_date,
                $payrollCutoff->end_date,
                $supervisor->id
            )
            ->andReturn($requests);


        $emailRepository
            ->shouldReceive('sendSupervisorReminderRequestsEmail')
            ->once()
            ->with([
                $supervisor,
                $requests
            ]);


        $this->app->instance(
            PayrollCutoffRepositoryInterface::class,
            $payrollRepository
        );

        $this->app->instance(
            UserRepositoryInterface::class,
            $userRepository
        );

        $this->app->instance(
            EmailRepositoryInterface::class,
            $emailRepository
        );


        $this->artisan('send_supervisor_reminder_requests')
            ->assertExitCode(0);
    }


    /** @test */
    public function it_does_not_send_email_when_supervisor_has_no_requests()
    {
        $supervisor = $this->createUser(100, 'Supervisor One');

        $payrollCutoff = (object) [
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-15',
        ];

        $requests = new Collection([]);


        $payrollRepository = Mockery::mock(PayrollCutoffRepositoryInterface::class);
        $userRepository = Mockery::mock(UserRepositoryInterface::class);
        $emailRepository = Mockery::mock(EmailRepositoryInterface::class);


        $payrollRepository
            ->shouldReceive('get_payroll_cutoff')
            ->once()
            ->andReturn($payrollCutoff);


        $userRepository
            ->shouldReceive('get_all_supervisors')
            ->once()
            ->andReturn([
                $supervisor
            ]);


        $userRepository
            ->shouldReceive('get_users_under_supervisee_active_with_requests')
            ->once()
            ->with(
                $payrollCutoff->start_date,
                $payrollCutoff->end_date,
                $supervisor->id
            )
            ->andReturn($requests);


        $emailRepository
            ->shouldNotReceive('sendSupervisorReminderRequestsEmail');


        $this->app->instance(
            PayrollCutoffRepositoryInterface::class,
            $payrollRepository
        );

        $this->app->instance(
            UserRepositoryInterface::class,
            $userRepository
        );

        $this->app->instance(
            EmailRepositoryInterface::class,
            $emailRepository
        );


        $this->artisan('send_supervisor_reminder_requests')
            ->assertExitCode(0);
    }
}