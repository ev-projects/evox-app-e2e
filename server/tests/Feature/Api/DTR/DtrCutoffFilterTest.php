<?php

namespace Tests\Feature\API\DTR;

use Tests\ApiTestCase;

class DtrCutoffFilterTest extends ApiTestCase
{
    /** @test */
    public function cutoff_001_retrieve_cutoff_filters()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $response = $this->json(
            'GET',
            sprintf(
                '/api/payroll/cutoff/get_filter_for_dtr/%s',
                $user_id
            ),
            [],
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        $response->assertJsonStructure([
            'content' => [
                '*' => [
                    '*' => [
                        'label',
                        'data' => [
                            '*' => [
                                'id',
                                'name',
                                'start_date',
                                'end_date',
                                'year',
                                'month',
                                'month_label',
                            ],
                        ],
                    ],
                ],
            ],
        ]);
    }

    /** @test */
    public function cutoff_001_retrieve_cutoff_filters_02()
    {
        [$user_id, $token] = $this->loginAndGetToken(true, true);

        $response = $this->json(
            'GET',
            sprintf(
                '/api/payroll/cutoff/get_filter_for_dtr/%s',
                $user_id
            ),
            [],
            $this->authHeaders($token)
        );
        
        $response->assertStatus(200);

        $response->assertJsonStructure([
            'content' => [
                '*' => [
                    '*' => [
                        'label',
                        'data' => [
                            '*' => [
                                'id',
                                'name',
                                'start_date',
                                'end_date',
                                'year',
                                'month',
                                'month_label',
                            ],
                        ],
                    ],
                ],
            ],
        ]);
    }
}