<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class QuickPunchIntegrationTest extends ApiTestCase
{
    /** @test */
    public function int_001_single_quickpunch_end_to_end()
    {
        $response = $this->authenticatedPost(
            '/api/dtr/quickpunch',
            [
                'quickpunch' => 'in'
            ]
        );

        $response->assertStatus(200);

        $this->assertDatabaseHas('biometrics', [
            'CheckType' => 'I'
        ]);
    }

    /** @test */
    public function int_002_multi_quickpunch_end_to_end()
    {
        $this->authenticatedPost(
            '/api/dtr/quickpunch_multi',
            ['quickpunch' => 'I']
        );

        $this->authenticatedPost(
            '/api/dtr/quickpunch_multi',
            ['quickpunch' => 'P']
        );

        $this->authenticatedPost(
            '/api/dtr/quickpunch_multi',
            ['quickpunch' => 'C']
        );

        $response = $this->authenticatedPost(
            '/api/dtr/quickpunch_multi',
            ['quickpunch' => 'O']
        );

        $response->assertStatus(200);
    }
}