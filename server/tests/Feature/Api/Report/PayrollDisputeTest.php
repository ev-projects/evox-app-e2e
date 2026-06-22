<?php

namespace Tests\Feature\API\Report;

use Tests\ApiTestCase;

class PayrollDisputeTest extends ApiTestCase
{
    /** @test */
    public function payrolldispute_001_get_department_filter_loading()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/department/get_department_all',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'content',
            ]);

        $this->assertIsArray(
            $response->json('content')
        );
    }

    /** @test */
    public function payrolldispute_002_get_pending_disputes_list()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/getdispute?department=113&disputeType=&startDate=2026-06-16&endDate=2026-07-15&status=&geo=',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'content',
            ]);

        $this->assertIsArray(
            $response->json('content')
        );
    }

    /** @test */
    public function payrolldispute_003_get_approved_disputes_list()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/getdispute',
            [
                'department'   => 113,
                'disputeType'  => '',
                'startDate'    => '2026-06-16',
                'endDate'      => '2026-07-15',
                'status'       => 1,
                'geo'          => '',
            ],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $response->assertJsonStructure([
            'message',
            'content',
        ]);

        $data = $response->json('content');

        // Ensure content is an array (even if empty)
        $this->assertIsArray($data);
    }

    /** @test */
    public function payrolldispute_004_get_rejected_disputes_list()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/getdispute',
            [
                'department'   => 113,
                'disputeType'  => '',
                'startDate'    => '2026-06-16',
                'endDate'      => '2026-07-15',
                'status'       => 2,
                'geo'          => '',
            ],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $response->assertJsonStructure([
            'message',
            'content',
        ]);

        $data = $response->json('content');

        // Ensure content is an array (even if empty)
        $this->assertIsArray($data);
    }
}