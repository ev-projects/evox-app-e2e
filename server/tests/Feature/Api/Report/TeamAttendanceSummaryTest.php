<?php

namespace Tests\Feature\API\Attendance;

use Tests\ApiTestCase;

class TeamAttendanceSummaryTest extends ApiTestCase
{
    /** @test */
    public function teamattendancesummary_001_filter_team_by_department()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $payload = [
            'departments' => [
                '117',
            ],
        ];

        $response = $this->json(
            'POST',
            sprintf(
                '/api/user/%s/team_list_all/',
                $user_id
            ),
            $payload,
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
    }

    /** @test */
    public function teamattendancesummary_002_get_summary_by_department_weekly()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $payload = [
            'scope_type' => 'week',
            'selectedDepartments' => [
                '117',
            ],
        ];

        $response = $this->json(
            'POST',
            '/api/report/team_attendance_summary/2026-06-16/2026-06-22',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'stdd',
                    'eddd',
                    'total_headcount',
                    'attendance',
                    'planned_leaves',
                    'unplanned_leaves',
                    'total_rest_day_work',
                    'total_overtime',
                ],
            ]);
    }

    /** @test */
    public function teamattendancesummary_003_get_summary_by_department_monthly()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $payload = [
            'scope_type' => 'month',
            'selectedDepartments' => [
                '117',
            ],
        ];

        $response = $this->json(
            'POST',
            '/api/report/team_attendance_summary/2026-06-01/2026-06-30',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'stdd',
                    'eddd',
                    'total_headcount',
                    'attendance',
                    'planned_leaves',
                    'unplanned_leaves',
                    'total_rest_day_work',
                    'total_overtime',
                ],
            ]);
    }

    /** @test */
    public function teamattendancesummary_004_get_summary_by_team_daily()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $payload = [
            'scope_type' => 'day',
            'selectedDepartments' => [
                '117',
            ],
            'selectedTeams' => [
                '403',
            ],
        ];

        $response = $this->json(
            'POST',
            '/api/report/team_attendance_summary/2026-06-22/2026-06-22',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'stdd',
                    'eddd',
                    'total_headcount',
                    'attendance',
                    'planned_leaves',
                    'unplanned_leaves',
                    'total_rest_day_work',
                    'total_overtime',
                ],
            ]);
    }

    /** @test */
    public function teamattendancesummary_005_get_summary_by_team_monthly()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $payload = [
            'scope_type' => 'month',
            'selectedDepartments' => [
                '117',
            ],
            'selectedTeams' => [
                '403',
            ],
        ];

        $response = $this->json(
            'POST',
            '/api/report/team_attendance_summary/2026-06-01/2026-06-30',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'stdd',
                    'eddd',
                    'total_headcount',
                    'attendance',
                    'planned_leaves',
                    'unplanned_leaves',
                    'total_rest_day_work',
                    'total_overtime',
                ],
            ]);
    }

    /** @test */
    public function teamattendancesummary_006_search_team_member_daily()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $payload = [
            'name' => 'glenn',
            'scope_type' => 'day',
            'selectedDepartments' => [
                '117',
            ],
            'selectedTeams' => [
                '403',
            ],
        ];

        $response = $this->json(
            'POST',
            '/api/report/team_attendance_summary/2026-06-22/2026-06-22',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'stdd',
                    'eddd',
                    'total_headcount',
                    'attendance',
                    'planned_leaves',
                    'unplanned_leaves',
                    'total_rest_day_work',
                    'total_overtime',
                ],
            ]);
    }

    /** @test */
    public function teamattendancesummary_007_search_team_member_monthly()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        $payload = [
            'name' => 'glenn',
            'scope_type' => 'month',
            'selectedDepartments' => [
                '117',
            ],
            'selectedTeams' => [
                '403',
            ],
        ];

        $response = $this->json(
            'POST',
            '/api/report/team_attendance_summary/2026-06-01/2026-06-30',
            $payload,
            $this->authHeaders($token)
        );

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'stdd',
                    'eddd',
                    'total_headcount',
                    'attendance',
                    'planned_leaves',
                    'unplanned_leaves',
                    'total_rest_day_work',
                    'total_overtime',
                ],
            ]);
    }

    /** @test */
    public function teamattendancesummary_008_export_weekly_summary()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        ob_start();
        $response = $this->get(
            '/api/report/attendance/summary/export/2026-06-16/2026-06-22?scope_type=week&selectedDepartments=117',
            $this->authHeaders($token)
        );
        ob_end_clean(); // export streams binary Excel; capture+discard to prevent PHPUnit risky flag

        $response->assertStatus(200);

        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    /** @test */
    public function teamattendancesummary_009_export_monthly_summary()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        ob_start();
        $response = $this->get(
            '/api/report/attendance/summary/export/2026-06-01/2026-06-30?scope_type=month&selectedDepartments=117',
            $this->authHeaders($token)
        );
        ob_end_clean();

        $response->assertStatus(200);

        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    /** @test */
    public function teamattendancesummary_010_export_team_daily_summary()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        ob_start();
        $response = $this->get(
            '/api/report/attendance/summary/export/2026-06-16/2026-06-22?scope_type=day&selectedDepartments=117&selectedTeams=403',
            $this->authHeaders($token)
        );
        ob_end_clean();

        $response->assertStatus(200);

        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    /** @test */
    public function teamattendancesummary_011_export_team_monthly_summary()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        ob_start();
        $response = $this->get(
            '/api/report/attendance/summary/export/2026-06-01/2026-06-30?scope_type=month&selectedDepartments=117&selectedTeams=403',
            $this->authHeaders($token)
        );
        ob_end_clean();

        $response->assertStatus(200);

        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    /** @test */
    public function teamattendancesummary_012_export_team_daily_with_name_filter()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        ob_start();
        $response = $this->get(
            '/api/report/attendance/summary/export/2026-06-16/2026-06-22?name=glenn&scope_type=day&selectedDepartments=117&selectedTeams=403',
            $this->authHeaders($token)
        );
        ob_end_clean();

        $response->assertStatus(200);

        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    /** @test */
    public function teamattendancesummary_012_export_team_monthly_with_name_filter()
    {
        $user_id = 404;
        $token = $this->tokenForUserId($user_id);

        ob_start();
        $response = $this->get(
            '/api/report/attendance/summary/export/2026-06-16/2026-06-22?name=glenn&scope_type=month&selectedDepartments=117&selectedTeams=403',
            $this->authHeaders($token)
        );
        ob_end_clean();

        $response->assertStatus(200);

        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }
}