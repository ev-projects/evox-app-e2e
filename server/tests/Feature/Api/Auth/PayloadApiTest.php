<?php

namespace Tests\Feature\Api\Auth;

use Tests\ApiTestCase;

class PayloadApiTest extends ApiTestCase
{
    public function test_payload_001_valid_token()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'POST',
            '/api/auth/payload',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'user',
                'constants',
                'settings',
            ]);
    }

    public function test_payload_002_expired_token()
    {
        $expiredToken = 'expired.jwt.token';

        $response = $this->json(
            'POST',
            '/api/auth/payload',
            [],
            $this->authHeaders($expiredToken)
        );

        $response
            ->assertStatus(401)
            ->assertJson([
                'message' => 'token_expired',
            ]);
    }

    public function test_payload_003_invalid_token()
    {
        $response = $this->json(
            'POST',
            '/api/auth/payload',
            [],
            $this->authHeaders('invalid-token')
        );

        $response
            ->assertStatus(401)
            ->assertJson([
                'message' => 'token_invalid',
            ]);
    }

    public function test_payload_004_missing_token()
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
                'message' => 'token_absent',
            ]);
    }
}