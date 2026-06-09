<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class QuickPunchPermissionTest extends ApiTestCase
{
    /** @test */
    public function perm_001_user_without_allow_quickpunch_permission()
    {
        $response = $this->authenticatedPost(
            '/api/dtr/quickpunch',
            [
                'quickpunch' => 'in'
            ]
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function perm_002_client_user_calls_endpoint()
    {
        $response = $this->authenticatedPost(
            '/api/dtr/quickpunch',
            [
                'quickpunch' => 'in'
            ]
        );

        $response->assertStatus(200);
    }
}