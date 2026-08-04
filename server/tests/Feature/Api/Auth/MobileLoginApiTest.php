<?php

namespace Tests\Feature\Api\Auth;

use Tests\ApiTestCase;

class MobileLoginApiTest extends ApiTestCase
{
    public function test_mobile_001_successful_mobile_login()
    {
        $email    = env('E2E_USER_EMPLOYEE_PHILIPPINES');
        $password = env('E2E_USER_EMPLOYEE_PHILIPPINES_PASSWORD');
        if (!$email || !$password) {
            $this->markTestIncomplete('E2E_USER_EMPLOYEE_PHILIPPINES or E2E_USER_EMPLOYEE_PHILIPPINES_PASSWORD not set in .env');
        }

        $response = $this->json(
            'POST',
            '/api/auth/login-mobile',
            [
                'username' => $email,
                'password' => $password,
            ],
            $this->headers()
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'content' => [
                    'access_token',
                    'token_type',
                    'expires_in',
                ]
            ]);
    }
}