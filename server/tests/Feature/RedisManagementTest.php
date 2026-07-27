<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Mockery;
use Illuminate\Http\JsonResponse;
use App\Modules\User\Models\User;

class RedisManagementTest extends TestCase
{
    use DatabaseTransactions;
    
    public function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_it_returns_redis_notifications_successfully()
    {
        $this->withoutMiddleware();

        $userId = 1593;
        $user = User::find($userId);

        $mockResponse = (object)[
            'status' => 200,
            'content' => json_encode([
                'requestsForApproval' => [1, 2],
                'requestStatus' => [],
                'announcements' => [],
                'celebrations' => [],
                'missedDtr' => [],
            ]),
        ];

        $curlMock = Mockery::mock();
        $curlMock->shouldReceive('withHeader')->andReturnSelf();
        $curlMock->shouldReceive('withTimeout')->andReturnSelf();
        $curlMock->shouldReceive('withConnectTimeout')->andReturnSelf();
        $curlMock->shouldReceive('returnResponseObject')->andReturnSelf();
        $curlMock->shouldReceive('get')->andReturn($mockResponse);

        \Curl::shouldReceive('to')
            ->once()
            ->andReturn($curlMock);

        $response = $response = $this->actingAs($user, 'web')
            ->getJson("/api/get_redis_notifications/{$userId}");

        $response->assertOk();
    }
}