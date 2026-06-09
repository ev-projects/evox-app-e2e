<?php

namespace Tests\Feature\API\DTR;

use App\Modules\Payroll\Models\Dtr;
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

        $this->assertDatabaseHas('biometrics', [
            'CheckType' => 'I'
        ]);
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

        $this->assertDatabaseHas('biometrics', [
            'CheckType' => 'O'
        ]);
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

        $response->assertStatus(422);
    }

    /** @test */
    public function sqp_004_existing_dtr_record_found()
    {
        factory(Dtr::class)->create();

        $countBefore = Dtr::count();

        $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'in'
            ]
        );

        $this->assertEquals(
            $countBefore,
            Dtr::count()
        );
    }

    /** @test */
    public function sqp_008_checktype_mapping_in()
    {
        $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'in'
            ]
        );

        $this->assertDatabaseHas('biometrics', [
            'CheckType' => 'I'
        ]);
    }

    /** @test */
    public function sqp_009_checktype_mapping_out()
    {
        $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'out'
            ]
        );

        $this->assertDatabaseHas('biometrics', [
            'CheckType' => 'O'
        ]);
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