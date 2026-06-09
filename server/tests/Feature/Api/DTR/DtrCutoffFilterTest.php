<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrCutoffFilterTest extends ApiTestCase
{
    /** @test */
    public function cutoff_001_retrieve_cutoff_filters()
    {
        $token = $this->loginAndGetToken();

        $response = $this->json(
            'GET',
            '/api/payroll/cutoff/get_filter_for_dtr/1001',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $response->assertJsonStructure([
            'years',
            'months',
            'cutoffs'
        ]);
    }
}