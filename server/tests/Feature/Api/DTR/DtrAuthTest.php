<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrAuthTest extends ApiTestCase
{
    /** @test */
    public function auth_001_missing_jwt()
    {
        $response = $this->json(
            'GET',
            '/api/dtr/1001/2026-04-01/2026-04-30',
            [],
            $this->headers()
        );

        $response->assertStatus(401);
    }

    /** @test */
    public function auth_004_missing_api_key()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/1001/2026-04-01/2026-04-30',
            [],
            [
                'Authorization' => 'Bearer '.$token
            ]
        );

        $response->assertStatus(401);
    }
}