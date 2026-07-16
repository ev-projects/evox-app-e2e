<?php
// Validation REJECTION tests — Change of Schedule. Every case sends INVALID data and asserts
// the FormRequest blocks it (422). A rejected request writes NOTHING — it never reaches
// ChangeScheduleRepository::store()/ScheduleRepository::store(), so this is safe on the
// live-dump DB. Uses withoutMiddleware() to bypass the JWT/apiKey auth gate so the request
// reaches ChangeScheduleRequest validation. No seeding (the shared dump can't run
// UserTestSeeder), so we act as a real existing user.
//
// NOTE: ChangeScheduleRequest only validates valid_from/valid_to/employee_note/approver_note.
// The nested cst_schedule_details/schedule_policies/work_days payload is NOT validated
// server-side at all (see matrices/change-schedule.md finding) — we deliberately do not send
// any schedule_details here since these tests only need to fail at the FormRequest layer,
// before the controller ever touches ScheduleRepository.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class ChangeScheduleValidationRejectionTest extends TestCase
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

    private function postCs(array $payload)
    {
        $payload += ['user_id' => $this->user->id];
        return $this->actingAs($this->user)->postJson('/api/request/change_schedule', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'valid_from' => date('Y-m-d'),
            'valid_to'   => date('Y-m-d', strtotime('+30 days')),
        ], $override);
    }

    /** @test */ public function rejects_missing_valid_from()
    { $p = $this->base(); unset($p['valid_from']); $this->postCs($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_valid_from_format()
    { $this->postCs($this->base(['valid_from' => '2026/01/01']))->assertStatus(422); }

    /** @test */ public function rejects_missing_valid_to()
    { $p = $this->base(); unset($p['valid_to']); $this->postCs($p)->assertStatus(422); }

    /** @test */ public function rejects_valid_to_before_valid_from()
    {
        $this->postCs($this->base([
            'valid_from' => date('Y-m-d'),
            'valid_to'   => date('Y-m-d', strtotime('-1 day')),
        ]))->assertStatus(422);
    }

    /** @test */ public function rejects_overlong_employee_note()
    { $this->postCs($this->base(['employee_note' => str_repeat('x', 256)]))->assertStatus(422); }

    /** @test */ public function rejects_overlong_approver_note()
    { $this->postCs($this->base(['approver_note' => str_repeat('x', 256)]))->assertStatus(422); }
}
