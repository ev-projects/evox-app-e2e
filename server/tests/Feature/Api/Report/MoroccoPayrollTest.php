<?php

namespace Tests\Feature\API\Report;

use Tests\ApiTestCase;

class MoroccoPayrollTest extends ApiTestCase
{
    /** @test */
    public function moroccopayroll_001_get_payroll_filter_params()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/get_morocco_payroll_params',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'month',
                'year',
                'department',
            ]);

        $this->assertIsArray($response->json('month'));
        $this->assertIsArray($response->json('year'));
        $this->assertIsArray($response->json('department'));

        $this->assertNotEmpty($response->json('month'));
        $this->assertNotEmpty($response->json('year'));
        $this->assertNotEmpty($response->json('department'));
    }

    /** @test */
    public function moroccopayroll_002_get_timeoff_allocation_no_department_filter()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/timeoff_allocation?timeoff_year=2026&timeoff_month=1&department=&country=4',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'reports',
                ],
            ]);

        $this->assertIsArray(
            $response->json('content.reports')
        );
    }

    /** @test */
    public function moroccopayroll_003_get_timeoff_allocation_with_department_filter()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/timeoff_allocation?timeoff_year=2025&timeoff_month=1&department=222&country=4',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'reports',
                ],
            ]);

        $this->assertIsArray(
            $response->json('content.reports')
        );
    }
}