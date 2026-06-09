<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;


class QuickPunchSingleTest extends ApiTestCase
{
    protected $endpoint = '/api/dtr/quickpunch';

    /** @test */
    public function sqp_001_successful_clock_in()
    {
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'in'
            ]
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function sqp_002_successful_clock_out()
    {
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'out'
            ]
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function sqp_003_invalid_quickpunch_value()
    {
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'invalid'
            ]
        );

        $response->assertStatus(400);
    }


    /** @test */
    public function sqp_010_duplicate_clock_in()
    {
        $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'in']
        );

        $response = $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'in']
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function sqp_011_duplicate_clock_out()
    {
        $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'out']
        );

        $response = $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'out']
        );

        $response->assertStatus(200);
    }
}