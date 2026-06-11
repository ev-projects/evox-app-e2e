<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrRetrievalTest extends ApiTestCase
{
    /** @test */
    public function dtr_001_retrieve_dtr_records_successfully()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $response = $this->json(
            'GET',
            sprintf(
                '/api/dtr/%s/2026-04-01/2026-04-30',
                $user_id
            ),
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $response->assertJsonStructure([
            'content' => [
                'dtr_records',
                'summary'
            ]
        ]);
    }

    /** @test */
    public function dtr_002_empty_dtr_period()
    {
        [$user_id, $token] = $this->loginAndGetToken(true);
        
        $response = $this->json(
            'GET',
            sprintf(
                '/api/dtr/%s/2026-04-01/2026-04-30',
                $user_id
            ),
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $response->assertJsonStructure([
            'content' => [
                'dtr_records',
                'summary'
            ]
        ]);
    }

    /** @test */
    public function dtr_004_single_day_retrieval()
    {
        [$user_id, $token] = $this->loginAndGetToken(true);

        $response = $this->json(
            'GET',
            sprintf(
                '/api/dtr/%s/2026-04-01/2026-04-01',
                $user_id
            ),
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function dtr_005_large_date_range_retrieval()
    {
        [$user_id, $token] = $this->loginAndGetToken(true);

        $response = $this->json(
            'GET',
            sprintf(
                '/api/dtr/%s/2026-01-01/2026-04-30',
                $user_id
            ),
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }
}