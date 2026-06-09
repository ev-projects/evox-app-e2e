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

    /**
     * MS-003
     * Microsoft Graph /me failure (ms_call_api returns null)
     */
    public function test_ms_003_user_fetch_failure()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client?code=valid_but_bad_user',
            $this->headers()
        );

        $response
            ->assertStatus(404)
            ->assertJson([
                'error' => [
                    'message' => 'Microsoft login failed, please try again. 2',
                ]
            ]);
    }

    /**
     * MS-004
     * User found using mail field
     */
    public function test_ms_004_user_found_using_mail_field()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client?code=valid_mail_user',
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

    /**
     * MS-005
     * User found using userPrincipalName fallback
     *
     * NOTE: This will FAIL unless your controller supports fallback.
     */
    public function test_ms_005_user_found_using_user_principal_name()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client?code=valid_upn_user',
            $this->headers()
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'content' => [
                    'access_token',
                ]
            ]);
    }

    /**
     * MS-006
     * User not found in system
     */
    public function test_ms_006_user_not_found()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client?code=unknown_user',
            $this->headers()
        );

        $response
            ->assertStatus(404)
            ->assertJsonStructure([
                'error' => [
                    'message' => 'user_email_not_found',
                ]
            ]);
    }

    /**
     * MS-007
     * auth()->login failure
     *
     * Practically unreachable unless auth is mocked
     */
    public function test_ms_007_auth_login_failure()
    {
        $this->markTestIncomplete(
            'auth()->login() cannot be reliably forced to fail without mocking JWTAuth'
        );
    }

    /**
     * MS-008
     * Inactive user beyond grace period
     */
    public function test_ms_008_inactive_user_beyond_grace_period()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client?code=inactive_expired_user',
            $this->headers()
        );

        $response
            ->assertStatus(404)
            ->assertJsonStructure([
                'error' => [
                    'message' => 'user_not_active',
                ]
            ]);
    }

    /**
     * MS-009
     * Inactive user within grace period
     */
    public function test_ms_009_inactive_user_within_grace_period()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client?code=inactive_grace_user',
            $this->headers()
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'content' => [
                    'access_token',
                ]
            ]);
    }

    /**
     * MS-010
     * Successful login
     */
    public function test_ms_010_successful_microsoft_login()
    {
        $response = $this->get(
            '/api/auth/authenticate-ms-client?code=valid_user',
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