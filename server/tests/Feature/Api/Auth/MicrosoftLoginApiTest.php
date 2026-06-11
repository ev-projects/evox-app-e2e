<?php

namespace Tests\Feature\Api\Auth;

use Tests\ApiTestCase;

class MicrosoftLoginApiTest extends ApiTestCase
{
    /**
     * MS-001
     * Missing authorization code
     */
    public function test_ms_001_missing_authorization_code()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client',
            $this->headers()
        );

        $response
            ->assertStatus(403)
            ->assertJsonStructure([
                'error' => [
                    'message',
                ]
            ]);
    }

    /**
     * MS-002
     * Invalid / failed token exchange (ms_get_access_token returns null)
     */
    public function test_ms_002_token_exchange_failure()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client?code=invalid_code',
            $this->headers()
        );

        $response
            ->assertStatus(403)
            ->assertJson([
                'error' => [
                    'message' => 'Microsoft login failed, please try again. 1',
                ]
            ]);
    }
}