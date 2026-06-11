<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrPunchTest extends ApiTestCase
{
    /** @test */
    public function punch_001_retrieve_punch_records()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $response = $this->json(
            'GET',
            sprintf(
                '/api/dtr/punch/%s/2026-04-01/2026-04-30',
                $user_id
            ),
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function dtrpunch_001_retrieve_dtr_with_punches()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $response = $this->json(
            'GET',
            sprintf(
                '/api/dtr/dtrpunch/%s/2026-04-01/2026-04-30',
                $user_id
            ),
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }
}