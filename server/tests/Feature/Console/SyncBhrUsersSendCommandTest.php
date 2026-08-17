<?php

namespace Tests\Feature\Console;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class SyncBhrUsersSendCommandTest extends TestCase
{
    protected function tearDown()
    {
        Mockery::close();

        parent::tearDown();
    }

    /** @test */
    public function test_it_syncs_changed_users()
    {
        $bhrUser = (object) [
            'id' => 1,
            'employeeNumber' => '123',
            'bestEmail' => 'john@example.com',
            'firstName' => 'John',
            'middleName' => null,
            'lastName' => 'Doe',
            'nickname' => 'John',
            'employmentHistoryStatus' => 'Full-Time',
            'hireDate' => '2023-01-01',
            'terminationDate' => null,
            'status' => 'Active',
            'jobTitle' => 'Developer',
            'country' => 'PH',
            'dateOfBirth' => '1995-01-01',
            'department' => 'IT',
            'mobilePhone' => '09171234567',
            'supervisorEId' => null,
            'division' => 'Engineering',
            'lastChanged' => now()->toDateTimeString(),
        ];

        /*
         * Mock stored procedure calls used by call_sp()
         */
        $statement = Mockery::mock(\PDOStatement::class);

        $statement->shouldReceive('bindValue')
            ->andReturn(true);

        $statement->shouldReceive('execute')
            ->andReturn(true);

        $statement->shouldReceive('nextRowset')
            ->andReturn(false);

        // E3 fix: pdo_helper.php line 33 calls $stmt->closeCursor() OUTSIDE the fetchAll
        // try/catch. Without this mock, Mockery throws BadMethodCallException for an
        // unconfigured method. The exception is caught by handle()'s outer catch, which
        // short-circuits before get_changed_users() is ever called. Mockery::close() in
        // tearDown then fails the ->once() expectation → test marked ERROR.
        $statement->shouldReceive('closeCursor')
            ->andReturn(true);

        $fetchCount = 0;

        $statement->shouldReceive('fetchAll')
            ->andReturnUsing(function () use (&$fetchCount) {

                $fetchCount++;

                // EH_SP_Bhr_To_Evox_Sync_Logs
                if ($fetchCount === 1) {
                    return [
                        (object) [
                            'UDV_Sync_Date' => null,
                        ]
                    ];
                }

                // EH_SP_User_Logs
                if ($fetchCount === 2) {
                    return [];
                }

                // EH_SP_User_sync
                return [];
            });


        $pdo = Mockery::mock(\PDO::class);

        $pdo->shouldReceive('setAttribute')
            ->andReturn(true);

        $pdo->shouldReceive('prepare')
            ->andReturn($statement);


        $connection = Mockery::mock();

        $connection->shouldReceive('getPdo')
            ->andReturn($pdo);


        DB::shouldReceive('connection')
            ->andReturn($connection);


        /*
         * Mock BHR repository
         */
        $bhr = Mockery::mock(BhrRepositoryInterface::class);

        $bhr->shouldReceive('get_changed_users')
            ->once()
            ->andReturn([
                '123' => '123',
            ]);

        $bhr->shouldReceive('get_user')
            ->once()
            ->with('123', true)
            ->andReturn($bhrUser);


        $this->app->instance(
            BhrRepositoryInterface::class,
            $bhr
        );


        $this->artisan('sync_bhr_users:send')
            ->assertExitCode(0);
    }
}