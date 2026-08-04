<?php

namespace Tests\Feature\API\AlterLog;

use Tests\ApiTestCase;

class AlterLogTest extends ApiTestCase
{
    /** @test */
    public function alterlog_001_request_validity_check()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $response = $this->json(
            'GET',
            '/api/request/request-validity-check/?date=2026-03-16',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'Result',
                    'StartDate',
                    'EndDate',
                ]
            ]);

        $this->assertContains(
            $response->json('content.Result'),
            ['0', '1', '2']
        );
    }

    /** @test */
    public function alterlog_002_submit_dispute_request()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $payload = [
            'method'            => 'store',
            'date'              => '2026-03-16',
            'user_id'           => $user_id,
            'current_time_in'   => '2026-03-16 10:45:18',
            'current_time_out'  => '2026-03-16 22:46:58',
            'new_time_in'       => '2026-03-16 11:00:00',
            'new_time_out'      => '2026-03-16 22:00:00',
            'employee_note'     => 'Test',
            'pov_new_time_in'   => 'Mon Mar 16 2026 11:00:00 GMT+0800 (Philippine Standard Time)',
            'pov_new_time_out'  => 'Mon Mar 16 2026 22:00:00 GMT+0800 (Philippine Standard Time)',
            'request_mode'      => 'dispute',
        ];

        $response = $this->json(
            'POST',
            '/api/request/alter_log',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(201)
            ->assertJson([
                'message' => 'Your dispute request has been successfully submitted.',
            ]);
    }

    /** @test */
    public function alterlog_003_submit_regular_request()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $payload = [
            'method' => 'store',
            'date' => $this->scenarioDate(),
            'user_id' => $user_id,
            'new_time_in' => $this->scenarioDate() .' 10:00:00',
            'new_time_out' => $this->scenarioDate(). ' 19:00:00',
            'employee_note' => 'Test',
            'pov_new_time_in' => 'Tue Jun 16 2026 11:00:00 GMT+0800 (Philippine Standard Time)',
            'pov_new_time_out' => 'Tue Jun 16 2026 20:00:00 GMT+0800 (Philippine Standard Time)',
            'request_mode' => 'regular',
        ];

        $response = $this->json(
            'POST',
            '/api/request/alter_log',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(201)
            ->assertJson([
                'message' => 'A new Alteration Request is now created!',
            ])
            ->assertJsonStructure([
                'message',
                'content' => [
                    'request_type',
                    'id',
                    'user_id',
                    'date',
                    'new_time_in',
                    'new_time_out',
                    'employee_note',
                ]
            ]);

        $this->assertEquals(
            'alter_log',
            $response->json('content.request_type')
        );

        $this->assertEquals(
            $this->scenarioDate(),
            $response->json('content.date')
        );
    }
}