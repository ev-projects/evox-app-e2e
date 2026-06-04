<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrPunchTest extends ApiTestCase
{
    /** @test */
    public function punch_001_retrieve_punch_records()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/punch/1001/2026-04-01/2026-04-30',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function dtrpunch_001_retrieve_dtr_with_punches()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/dtr/dtrpunch/1001/2026-04-01/2026-04-30',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }
}