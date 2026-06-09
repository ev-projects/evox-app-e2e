<?php

namespace Tests;

use Illuminate\Foundation\Testing\DatabaseTransactions;

abstract class ApiTestCase extends TestCase
{
    use DatabaseTransactions;

    protected $apiKey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = env('CLIENT_API_KEY');

        $this->seed(\UserTestSeeder::class);
    }

    protected function headers(array $extra = [])
    {
        return array_merge([
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'X-Authorization' => $this->apiKey,
        ], $extra);
    }

    protected function authenticatedPost(string $uri, array $payload = [])
    {
        $token = $this->loginAndGetToken();

        return $this->json(
            'POST',
            $uri,
            $payload,
            $this->authHeaders($token)
        );
    }

    protected function loginAndGetToken(bool $returnArray = false, bool $useClientEnv = false)
    {
        $response = $this->json(
            'POST',
            '/api/auth/login',
            [
                'username' => $useClientEnv
                    ? env('CLIENT_USER_EMAIL', 'active.user')
                    : 'active.user',

                'password' => $useClientEnv
                    ? env('CLIENT_USER_PASSWORD', 'CorrectPassword123')
                    : 'CorrectPassword123',
            ],
            $this->headers()
        );

        $accessToken = $response->json('content.access_token');

        if ($returnArray) {
            return [
                $response->json('content.user.id'),
                $accessToken,
            ];
        }

        return $accessToken;
    }

    protected function authHeaders($token)
    {
        return $this->headers([
            'Authorization' => 'Bearer ' . $token,
        ]);
    }

    protected function headersWithoutApiKey()
    {
        return [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];
    }

    protected function headersWithInvalidApiKey()
    {
        return [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'X-Authorization' => 'invalid-api-key',
        ];
    }
}