<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use Carbon\Carbon;

class AdminScheduleManagementTest extends TestCase
{
    use DatabaseTransactions;

    public function test_supervisor_can_create_department_schedule()
    {
        $this->withoutMiddleware();

        $user = User::find(1698);

		$payload = [
            "action" => "update",
            "bind_to" => "department",
            "bind_id" => "117",
            "sorted_weekday" => [
                "mon", "tue", "wed", "thu", "fri", "sat", "sun"
            ],
            "wd" => [
                "mon" => ["index" => null],
                "tue" => ["index" => null],
                "wed" => ["index" => null],
                "thu" => ["index" => null],
                "fri" => ["index" => null],
                "sat" => ["index" => null],
                "sun" => ["index" => null],
            ],
            "from" => "2026-04-13T00:00:00.000Z",
            "to" => "2026-05-21T17:46:49.463Z",
            "std_schedule_details" => [
                [
                    "start_time" => "2020-01-01T06:00:00.000Z",
                    "end_time" => "2026-05-21T15:00:22.524Z",
                    "break_time" => "2026-05-20T17:00:22.524Z",
                    "start_flexy_time" => "2020-01-01T06:00:00.000Z",
                    "end_flexy_time" => "2026-05-21T15:00:22.524Z"
                ]
            ],
            "flx_schedule_details" => [],
            "cst_schedule_details" => [],
            "creation_type" => "customize",
            "source_type" => "default",
            "schedule_policies" => [
                "allow_late" => 1,
                "allow_undertime" => 1,
                "allow_night_diff" => 1,
                "allow_special_holiday" => 1,
                "allow_legal_holiday" => 1
            ],
            "schedule_type" => "standard",
            "work_days" => [
                "mon", "tue", "wed", "thu", "fri"
            ],
            "schedule_details" => [
                "all" => [
                    "start_time" => "14:00",
                    "end_time" => "23:00",
                    "break_time" => "01:00"
                ]
            ],
            "valid_from" => "2026-04-13",
            "valid_to" => "2026-05-22"
        ];

        $response = $this->actingAs($user)->postJson('/api/schedule/assign', $payload);

        // Assert HTTP status
        $response->assertOk();

        // Assert JSON response values
        $response->assertJson([
            'message' => 'Schedule successfully updated!',
            'content' => [
                'source_type' => 'default',
                'schedule_type' => 'standard',
                'valid_from' => '2026-04-13',
            ]
        ]);

        // Assert JSON structure
        $response->assertJsonStructure([
            'message',
            'content' => [
                'id',
                'name',
                'source_type',
                'schedule_type',
                'valid_from',
                'valid_to',
                'rest_day',
                'work_days',
                'schedule_details',
                'schedule_policies',
                'pov_schedule_details',
            ]
        ]);

        // Assert schedule exists in database
        $this->assertDatabaseHas('schedules', [
            'bind_to' => 'department',
            'bind_id' => 117,
            'schedule_type' => 'standard',
            'source_type' => 'default',
        ]);
    }

    public function test_applies_the_assigned_schedule_to_department_users_dtr()
    {
        $this->withoutMiddleware();

        $user = User::find(1698);

		$payload = [
            "action" => "update",
            "bind_to" => "department",
            "bind_id" => "117",
            "sorted_weekday" => [
                "mon", "tue", "wed", "thu", "fri", "sat", "sun"
            ],
            "wd" => [
                "mon" => ["index" => null],
                "tue" => ["index" => null],
                "wed" => ["index" => null],
                "thu" => ["index" => null],
                "fri" => ["index" => null],
                "sat" => ["index" => null],
                "sun" => ["index" => null],
            ],
            "from" => "2026-04-13T00:00:00.000Z",
            "to" => "2026-05-21T17:46:49.463Z",
            "std_schedule_details" => [
                [
                    "start_time" => "2020-01-01T06:00:00.000Z",
                    "end_time" => "2026-05-21T15:00:22.524Z",
                    "break_time" => "2026-05-20T17:00:22.524Z",
                    "start_flexy_time" => "2020-01-01T06:00:00.000Z",
                    "end_flexy_time" => "2026-05-21T15:00:22.524Z"
                ]
            ],
            "flx_schedule_details" => [],
            "cst_schedule_details" => [],
            "creation_type" => "customize",
            "source_type" => "default",
            "schedule_policies" => [
                "allow_late" => 1,
                "allow_undertime" => 1,
                "allow_night_diff" => 1,
                "allow_special_holiday" => 1,
                "allow_legal_holiday" => 1
            ],
            "schedule_type" => "standard",
            "work_days" => [
                "mon", "tue", "wed", "thu", "fri"
            ],
            "schedule_details" => [
                "all" => [
                    "start_time" => "14:00",
                    "end_time" => "23:00",
                    "break_time" => "01:00"
                ]
            ],
            "valid_from" => "2026-04-13",
            "valid_to" => "2026-05-22"
        ];

        $response = $this->actingAs($user)->postJson('/api/schedule/assign', $payload);

        $response->assertOk();

        // Fetch created schedule ID
        $scheduleId = $response->json('content.id');

        // Assert schedule exists
        $this->assertDatabaseHas('schedules', [
            'id' => $scheduleId,
            'bind_to' => 'department',
            'bind_id' => 117,
        ]);

        $dtr = Dtr::where('user_id', 1593)
            ->where('date', '2026-04-13')
            ->first();

        $this->assertNotNull($dtr);

        $this->assertEquals(
            1776065400,
            $dtr->start_datetime
        );

        $this->assertEquals(
            1776097800,
            $dtr->end_datetime
        );
    }
}
