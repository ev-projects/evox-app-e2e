<?php
// HAPPY-PATH test — Assign Schedule. Submits a fully VALID "temporary" schedule assigned
// to the ACTING user (bind_to=user, bind_id=self) so get_authenticated_user() takes the
// self-assign branch and no admin/full_access role is required. Deliberately avoids
// bind_to=department — matrices/schedule-assign.md documents a TypeError crash risk there
// (EvoxDepartment lookup can return null into a typed param) that was never safe to exercise.
// DatabaseTransactions rolls back at the end — safe on the disposable DB.

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

class AssignScheduleHappyPathTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestIncomplete('no user available in test DB');
        }
    }

    /** @test */
    public function assigns_a_temporary_schedule_to_self_and_writes_the_schedule_row()
    {
        // Far-future, unlikely-to-collide window so this always takes the INSERT path in
        // ScheduleRepository::assign_to_user() rather than updating an existing row.
        $validFrom = '2031-02-01';
        $validTo = '2031-02-07';

        $payload = [
            'source_type' => 'temporary',
            'bind_to' => 'user',
            'bind_id' => (string) $this->user->id,
            'schedule_type' => 'standard',
            'valid_from' => $validFrom,
            'valid_to' => $validTo,
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

        $response = $this->actingAs($this->user)->postJson('/api/schedule/assign/', $payload);

        $response->assertStatus(200);

        $this->assertDatabaseHas('schedules', [
            'bind_to' => 'user',
            'bind_id' => $this->user->id,
            'source_type' => 'temporary',
            'valid_from' => $validFrom,
            'valid_to' => $validTo,
        ]);
    }
}
