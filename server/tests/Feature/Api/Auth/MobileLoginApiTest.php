<?php

namespace Tests\Feature\Api\Auth;

use Tests\ApiTestCase;

class MobileLoginApiTest extends ApiTestCase
{
    public function test_mobile_001_successful_mobile_login()
    {
        $response = $this->json(
            'POST',
            '/api/auth/login-mobile',
            [
                'username' => 'active.user',
                'password' => 'CorrectPassword123',
            ],
            $this->headers()
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'expires_in',
            ]);
    }
}