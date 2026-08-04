<?php

namespace Tests\Feature\API\Overtime;

use Tests\ApiTestCase;

class OvertimeTest extends ApiTestCase
{
    /** @test */
    public function overtime_001_submit_regular_request()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $payload = [
            'method'        => 'store',
            'date'          => $this->scenarioDate(),
            'user_id'       => $user_id,
            'amount'        => '04:30',
            'type'          => 'post_overtime',
            'employee_note' => 'Test',
            'session_id'    => session()->getId(),
            'request_mode'  => 'regular',
        ];

        $response = $this->json(
            'POST',
            '/api/request/overtime',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'request_type',
                    'id',
                    'user_id',
                    'date',
                    'amount',
                    'type',
                    'employee_note',
                    'status',
                    'employee_name',
                ],
            ]);

        $this->assertEquals(
            'overtime',
            $response->json('content.request_type')
        );

        $this->assertEquals(
            $this->scenarioDate(),
            $response->json('content.date')
        );

        $this->assertEquals(
            '04:30',
            $response->json('content.amount')
        );

        $this->assertEquals(
            'post_overtime',
            $response->json('content.type')
        );

        $this->assertEquals(
            'pending',
            $response->json('content.status')
        );

        $this->assertNotNull(
            $response->json('content.id')
        );
    }

    /** @test */
    public function overtime_002_submit_dispute_request()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $payload = [
            'method'        => 'store',
            'date'          => '2026-06-15',
            'user_id'       => $user_id,
            'amount'        => '02:00',
            'type'          => 'post_overtime',
            'employee_note' => 'Test',
            'session_id'    => session()->getId(),
            'request_mode'  => 'dispute',
        ];

        $response = $this->json(
            'POST',
            '/api/request/overtime',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(201)
            ->assertJson([
                'message' => 'Your dispute request has been successfully submitted.',
                'content' => [],
            ]);
    }
}