<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class QuickPunchMultiTest extends ApiTestCase
{
    protected $endpoint = '/api/dtr/quickpunch_multi';

    /** @test */
    public function mqp_001_initial_clock_in()
    {
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'I'
            ]
        );

        $response->assertStatus(200);

        $this->assertDatabaseHas('dtr_punch_history', [
            'punch_type' => 'I'
        ]);
    }

    /** @test */
    public function mqp_002_pause_active_session()
    {
        $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'I']
        );

        $response = $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'P']
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function mqp_003_continue_paused_session()
    {
        $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'I']
        );

        $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'P']
        );

        $response = $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'C']
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function mqp_004_clock_out_active_session()
    {
        $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'I']
        );

        $response = $this->authenticatedPost(
            $this->endpoint,
            ['quickpunch' => 'O']
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function mqp_009_invalid_punch_type()
    {
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'X'
            ]
        );

        $response->assertStatus(422);
    }
}