<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrSummaryTest extends ApiTestCase
{
    /** @test */
    public function sum_001_dtr_summary()
    {
        $token = $this->tokenForUserId(1698); // Gary Aure — supervisor, IsPrimeHead=1, sub-dept 403

        $response = $this->json(
            'GET',
            '/api/report/dtr_summary/new_team',
            [
                'page'          => 1,
                'valid_from'    => '2026-01-16',
                'valid_to'      => '2026-02-15',
                'is_active'     => 1
            ],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
        
        $response->assertJsonStructure([
            'content' => [
                'current_page',
                'dtrItems',
                'has_next_page',
                'last_page'
            ]
        ]);
    }

    /** @test */
    public function sum_002_dtr_multi_logs_summary()
    {
        $token = $this->tokenForUserId(1698); // Gary Aure — LevelId=1, pass sub-dept id 403

        $response = $this->json(
            'GET',
            '/api/report/dtr_summary/multi_logs',
            [
                'page'          => 1,
                'valid_from'    => '2026-01-16',
                'valid_to'      => '2026-02-15',
                'is_active'     => 1,
                'department_id' => 403
            ],
            $this->authHeaders($token)
        );
        
        $response->assertStatus(200);

        $response->assertJsonStructure([
            'content' => [
                'current_page',
                'dtrItems',
                'has_next_page',
                'last_page'
            ]
        ]);
    }
}