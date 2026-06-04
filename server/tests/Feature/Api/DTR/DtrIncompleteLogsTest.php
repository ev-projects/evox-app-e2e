<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrIncompleteLogsTest extends ApiTestCase
{
    /** @test */
    public function inc_001_retrieve_incomplete_logs()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/incomplete_logs',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }
}