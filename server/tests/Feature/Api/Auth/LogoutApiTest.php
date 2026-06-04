<?php

namespace Tests\Feature\Api\Auth;

use Tests\ApiTestCase;

class LogoutApiTest extends ApiTestCase
{
    public function test_logout_001_successful_logout()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'POST',
            '/api/auth/logout',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }

    public function test_logout_002_reuse_blacklisted_token()
    {
        $token = $this->loginAndGetToken();

        $this->json(
            'POST',
            '/api/auth/logout',
            [],
            $this->authHeaders($token)
        )->assertStatus(200);

        $response = $this->json(
            'POST',
            '/api/auth/payload',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(401);
    }
}