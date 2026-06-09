<?php

namespace Tests\Feature\Api\Auth;

use Carbon\Carbon;
use Tests\ApiTestCase;

class JwtSecurityTest extends ApiTestCase
{
    public function test_jwt_001_token_expires_after_ttl()
{
        Carbon::setTestNow(Carbon::now());

        $token = $this->loginAndGetToken();

        $this->assertNotEmpty($token);

        // Simulate time passing beyond TTL
        Carbon::setTestNow(Carbon::now()->addMinutes(61));

        $response = $this->withHeaders([
            'Authorization' => "Bearer $token",
        ])->postJson('/api/auth/payload');

        $response->assertStatus(401); // or 403 depending on your auth setup
    }

    public function test_jwt_002_refresh_ttl_boundary()
    {
        Carbon::setTestNow(Carbon::now());

        $token = $this->loginAndGetToken();

        $this->assertNotEmpty($token);

        // Simulate near-expiry time
        Carbon::setTestNow(Carbon::now()->addMinutes(55)); // just before expiry

        $response = $this->withHeaders([
            'Authorization' => "Bearer $token",
        ])->postJson('/api/auth/refresh');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'content' => [
                    'access_token',
                    'expires_in',
                ]
            ]);
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