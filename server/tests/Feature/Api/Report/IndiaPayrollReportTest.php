<?php

namespace Tests\Feature\API\Report;

use Tests\ApiTestCase;

class IndiaPayrollReportTest extends ApiTestCase
{
    /** @test */
    public function indiapayrollreport_001_get_timeoff_allocation_report()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/timeoff_allocation?timeoff_year=2026&timeoff_month=6&country=1',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'timeoffItems',
                    'timeoffItemsnew',
                ],
            ]);

        $this->assertIsArray(
            $response->json('content.timeoffItems')
        );

        $this->assertNotEmpty(
            $response->json('content.timeoffItems')
        );
    }

    /** @test */
    public function indiapayrollreport_002_export_timeoff_allocation_report()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/timeoff_allocation?timeoff_year=2026&timeoff_month=6&export=1&country=1',
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);
    }
}