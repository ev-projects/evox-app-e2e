<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class QuickPunchAuthTest extends ApiTestCase
{
    /** @test */
    public function auth_001_missing_jwt()
    {
        $response = $this->json(
            'POST',
            '/api/dtr/quickpunch',
            [
                'quickpunch' => 'in'
            ],
            $this->headers()
        );

        $response->assertStatus(401);
    }

    /** @test */
    public function auth_004_missing_api_key()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'POST',
            '/api/dtr/quickpunch',
            [
                'quickpunch' => 'in'
            ],
            [
                'Authorization' => 'Bearer '.$token
            ]
        );

        $response->assertStatus(401);
    }

    /** @test */
    public function auth_005_invalid_api_key()
    {
        $token = $this->loginAndGetToken();

        $headers = $this->headersWithInvalidApiKey();

        $headers['Authorization'] = 'Bearer '.$token;

        $response = $this->json(
            'POST',
            '/api/dtr/quickpunch',
            [
                'quickpunch' => 'in'
            ],
            $headers
        );

        $response->assertStatus(401);
    }
}