<?php
// HAPPY-PATH test — Schedule Template Create. Submits a fully VALID payload and asserts
// the write actually happens (201 + schedules/schedule_details/schedule_policies rows).
// DatabaseTransactions rolls everything back at the end of the test — safe on the
// disposable live-backup DB (Vishnu confirmed 2026-07-09). See matrices/schedule-template.md.

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

class ScheduleTemplateHappyPathTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestSkipped('no user available in test DB');
        }
    }

    /** @test */
    public function creates_a_standard_template_schedule_and_writes_all_three_tables()
    {
        $name = 'HappyPath Template ' . time();

        $payload = [
            'name' => $name,
            'source_type' => 'template',
            'schedule_type' => 'standard',
            'work_days' => ['mon', 'tue', 'wed', 'thu', 'fri'],
            'schedule_details' => [
                'all' => [
                    'start_time' => '09:00',
                    'end_time' => '18:00',
                    'break_time' => '00:30',
                ],
            ],
            'schedule_policies' => [
                'allow_undertime' => 0,
                'allow_late' => 0,
                'allow_night_diff' => 0,
                'allow_special_holiday' => 1,
                'allow_legal_holiday' => 1,
            ],
        ];

        $response = $this->actingAs($this->user)->postJson('/api/schedule/', $payload);

        $response->assertStatus(201);

        $scheduleId = DB::table('schedules')->where('name', $name)->value('id');
        $this->assertNotNull($scheduleId, 'schedules row was not written');

        $this->assertDatabaseHas('schedules', [
            'id' => $scheduleId,
            'name' => $name,
            'source_type' => 'template',
            'schedule_type' => 'standard',
        ]);

        $this->assertDatabaseHas('schedule_details', [
            'schedule_id' => $scheduleId,
            'day' => 'all',
        ]);

        $this->assertDatabaseHas('schedule_policies', [
            'schedule_id' => $scheduleId,
        ]);
    }
}
