<?php

namespace Tests\Feature\API\RestDayWork;

use Tests\ApiTestCase;

class RestDayWorkTest extends ApiTestCase
{
    /** @test */
    public function restdaywork_001_submit_regular_request()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $payload = [
            'method' => 'store',
            'date' => '2026-06-20',
            'user_id' => $user_id,
            'start_time' => '13:00',
            'end_time' => '14:00',
            'break_time' => '00:00',
            'employee_note' => 'Test',
            'pov_start_time' => 'Mon Jun 22 2026 13:00:00 GMT+0800 (Philippine Standard Time)',
            'pov_end_time' => 'Mon Jun 22 2026 14:00:00 GMT+0800 (Philippine Standard Time)',
            'session_id' => session()->getId(),
            'request_mode' => 'regular',
        ];

        $response = $this->json(
            'POST',
            '/api/request/rest_day_work',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(201)
            ->assertJson([
                'message' => 'A new Rest Day Work Request is now created!',
            ])
            ->assertJsonStructure([
                'message',
                'content' => [
                    'request_type',
                    'id',
                    'user_id',
                    'date',
                    'start_time',
                    'end_time',
                    'break_time',
                    'employee_note',
                    'status',
                ],
            ]);

        $this->assertEquals(
            'rest_day_work',
            $response->json('content.request_type')
        );

        $this->assertEquals(
            '2026-06-20',
            $response->json('content.date')
        );

        $this->assertEquals(
            '13:00',
            $response->json('content.start_time')
        );

        $this->assertEquals(
            '14:00',
            $response->json('content.end_time')
        );

        $this->assertEquals(
            '00:00',
            $response->json('content.break_time')
        );

        $this->assertNotNull(
            $response->json('content.id')
        );
    }

    /** @test */
    public function restdaywork_002_submit_dispute_request()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $payload = [
            'method' => 'store',
            'date' => '2026-06-13',
            'user_id' => $user_id,
            'start_time' => '13:00',
            'end_time' => '15:00',
            'break_time' => '00:00',
            'employee_note' => 'Test',
            'pov_start_time' => 'Mon Jun 22 2026 13:00:00 GMT+0800 (Philippine Standard Time)',
            'pov_end_time' => 'Mon Jun 22 2026 15:00:00 GMT+0800 (Philippine Standard Time)',
            'session_id' => session()->getId(),
            'request_mode' => 'dispute',
        ];

        $response = $this->json(
            'POST',
            '/api/request/rest_day_work',
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

    /** @test */
    public function restdaywork_003_cannot_submit_request_on_non_rest_day()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $payload = [
            'method' => 'store',
            'date' => '2026-06-22',
            'user_id' => $user_id,
            'start_time' => '12:00',
            'end_time' => '19:00',
            'break_time' => '01:00',
            'employee_note' => 'Test',
            'pov_start_time' => 'Mon Jun 22 2026 12:00:00 GMT+0800 (Philippine Standard Time)',
            'pov_end_time' => 'Mon Jun 22 2026 19:00:00 GMT+0800 (Philippine Standard Time)',
            'session_id' => session()->getId(),
            'request_mode' => 'regular',
        ];

        $response = $this->json(
            'POST',
            '/api/request/rest_day_work',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(400)
            ->assertJson([
                'error' => [
                    'message' => 'The Date requested/targeted is not a restday, if its a work day make an alter log instead.',
                    'content' => [],
                ],
            ]);
    }
}