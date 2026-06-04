<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrRetrievalTest extends ApiTestCase
{
    /** @test */
    public function dtr_001_retrieve_dtr_records_successfully()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/1001/2026-04-01/2026-04-30',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $response->assertJsonStructure([
            'dtr_records',
            'summary'
        ]);
    }

    /** @test */
    public function dtr_002_empty_dtr_period()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/999999/2026-04-01/2026-04-30',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $response->assertJsonStructure([
            'dtr_records',
            'summary'
        ]);
    }

    /** @test */
    public function dtr_004_single_day_retrieval()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/1001/2026-04-01/2026-04-01',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function dtr_005_large_date_range_retrieval()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/1001/2026-01-01/2026-04-30',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }
}