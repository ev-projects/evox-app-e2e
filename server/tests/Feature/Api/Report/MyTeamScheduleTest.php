<?php

namespace Tests\Feature\API\Schedule;

use Tests\ApiTestCase;

class MyTeamScheduleTest extends ApiTestCase
{
    /** @test */
    public function myteamschedule_001_get_sub_department_list()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/user/404/sub_department/117',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    '*' => [
                        'Id',
                        'Name',
                    ],
                ],
            ]);

        $this->assertNotEmpty(
            $response->json('content')
        );

        // Optional: verify at least one known department exists
        $this->assertTrue(
            collect($response->json('content'))
                ->pluck('Id')
                ->contains('403')
        );
    }

    /** @test */
    public function myteamschedule_002_get_team_schedule_daily()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/team_schedule?link=team_schedule&start_date=2026-06-22&end_date=2026-06-22&department_id=117&scope_type=day',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'data',
                ],
            ]);

        $this->assertIsArray(
            $response->json('content.data')
        );
    }

    /** @test */
    public function myteamschedule_003_get_team_schedule_weekly()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/team_schedule?link=team_schedule&start_date=2026-06-22&end_date=2026-06-28&department_id=117&scope_type=week&page=1',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'data',
                    'date_list',
                    'holiday_list',
                ],
            ]);

        $this->assertIsArray(
            $response->json('content.data')
        );

        $this->assertNotEmpty(
            $response->json('content.data')
        );

        $this->assertIsArray(
            $response->json('content.date_list')
        );

        $this->assertIsArray(
            $response->json('content.holiday_list')
        );
    }

    /** @test */
    public function myteamschedule_004_get_team_schedule_monthly()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/team_schedule?link=team_schedule&start_date=2026-06-01&end_date=2026-06-30&department_id=117&scope_type=month&page=1',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'data',
                    'date_list',
                    'week_list',
                    'holiday_list',
                ],
            ]);

        $this->assertIsArray(
            $response->json('content.data')
        );

        $this->assertNotEmpty(
            $response->json('content.data')
        );

        $this->assertIsArray(
            $response->json('content.date_list')
        );

        $this->assertIsArray(
            $response->json('content.week_list')
        );

        $this->assertIsArray(
            $response->json('content.holiday_list')
        );
    }

    /** @test */
    public function myteamschedule_005_get_team_schedule_custom_range()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $response = $this->json(
            'GET',
            '/api/report/team_schedule?link=team_schedule&start_date=2026-05-22&end_date=2026-06-22&department_id=117&scope_type=custom&page=1',
            [],
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'data',
                    'date_list',
                    'week_list',
                    'holiday_list',
                ],
            ]);

        $this->assertIsArray(
            $response->json('content.data')
        );

        $this->assertNotEmpty(
            $response->json('content.data')
        );

        $this->assertIsArray(
            $response->json('content.date_list')
        );

        $this->assertIsArray(
            $response->json('content.week_list')
        );

        $this->assertIsArray(
            $response->json('content.holiday_list')
        );
    }
}