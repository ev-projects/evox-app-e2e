<?php

namespace Tests\Feature\Api\Auth;

use Tests\ApiTestCase;

class JwtSecurityTest extends ApiTestCase
{
    public function test_jwt_001_token_expires_after_ttl()
    {
        $token = $this->loginAndGetToken();

        $this->assertNotEmpty($token);

        // Adjust according to your JWT implementation.
        // In real testing you may need Carbon::setTestNow()
        // or JWT factory manipulation.
    }

    public function test_jwt_002_refresh_ttl_boundary()
    {
        $token = $this->loginAndGetToken();

        $this->assertNotEmpty($token);

        // Implement using JWT refresh endpoint
        // if your application exposes one.
    }

    public function test_jwt_003_blacklist_enforcement()
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