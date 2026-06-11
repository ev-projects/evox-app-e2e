<?php

namespace Tests\Feature\Api\Auth;

use Tests\ApiTestCase;

class MiddlewareTest extends ApiTestCase
{
    public function test_mw_001_missing_api_key()
    {
        $response = $this->json(
            'POST',
            '/api/auth/login',
            [],
            $this->headersWithoutApiKey()
        );

        $response->assertStatus(401);
    }

    public function test_mw_002_invalid_api_key()
    {
        $response = $this->json(
            'POST',
            '/api/auth/login',
            [],
            $this->headersWithInvalidApiKey()
        );

        $response->assertStatus(401);
    }

    public function test_mw_003_protected_endpoint_without_jwt()
    {
        $response = $this->json(
            'POST',
            '/api/auth/payload',
            [],
            $this->headers()
        );

        $response
            ->assertStatus(401)
            ->assertJson([
                'error' => [
                    'content' => [
                        'code' => 'token_absent',
                    ]
                ]
            ]);
    }
}