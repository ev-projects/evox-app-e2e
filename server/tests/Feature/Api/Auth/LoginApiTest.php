<?php

namespace Tests\Feature\Api\Auth;

use Tests\ApiTestCase;
use Tests\Support\TestUsers;

class LoginApiTest extends ApiTestCase
{
    public function test_login_001_successful_login_using_username()
    {
        $response = $this->json(
            'POST',
            '/api/auth/login',
            [
                'username' => TestUsers::ACTIVE_USERNAME,
                'password' => TestUsers::PASSWORD,
            ],
            $this->headers()
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'session_id',
                'user',
                'constants',
                'settings',
                'token_type',
                'expires_in',
            ]);
    }

    public function test_login_003_username_required()
    {
        $response = $this->json(
            'POST',
            '/api/auth/login',
            [
                'password' => TestUsers::PASSWORD,
            ],
            $this->headers()
        );

        $response->assertStatus(422);
    }

    public function test_login_007_incorrect_password()
    {
        $response = $this->json(
            'POST',
            '/api/auth/login',
            [
                'username' => TestUsers::ACTIVE_USERNAME,
                'password' => 'WrongPassword',
            ],
            $this->headers()
        );

        $response
            ->assertStatus(401)
            ->assertJson([
                'message' => 'user_password_incorrect',
            ]);
    }
}