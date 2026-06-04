<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrCalculationTest extends ApiTestCase
{
    /** @test */
    public function calc_001_late_calculation()
    {
        $response = $this->json(
            'GET',
            '/api/dtr/1001/2026-04-01/2026-04-30',
            [],
            $this->authHeaders($this->loginAndGetToken())
        );

        $response->assertStatus(200);

        // assert summary late values
    }

    /** @test */
    public function calc_011_rendered_hours_calculation()
    {
        $response = $this->json(
            'GET',
            '/api/dtr/1001/2026-04-01/2026-04-30',
            [],
            $this->authHeaders($this->loginAndGetToken())
        );

        $response->assertStatus(200);

        // assert rendered hours
    }
}