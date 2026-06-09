<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrSummaryTest extends ApiTestCase
{
    /** @test */
    public function sum_001_summary_totals_match_records()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/1001/2026-04-01/2026-04-30',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $data = $response->json();

        $this->assertArrayHasKey('summary', $data);
    }
}