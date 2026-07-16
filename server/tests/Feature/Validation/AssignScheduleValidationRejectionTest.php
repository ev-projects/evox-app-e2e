<?php
// Validation REJECTION tests — Assign Schedule. Every case sends INVALID data and asserts
// the FormRequest blocks it (422). A rejected request writes NOTHING (ScheduleRepository::
// assign() is never reached), so this is safe on the live-dump DB. Uses withoutMiddleware()
// to bypass the JWT/apiKey auth gate so the request reaches AssignScheduleRequest validation.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AssignScheduleValidationRejectionTest extends TestCase
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

    private function postAssign(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/schedule/assign/', $payload);
    }

    // Base payload deliberately omits `schedule_policies` — see the note in
    // ScheduleTemplateValidationRejectionTest about the wildcard bug.
    private function base(array $override = [])
    {
        return array_merge([
            'source_type'   => 'default',
            'bind_to'       => 'user',
            'bind_id'       => (string) $this->user->id,
            'schedule_type' => 'standard',
            'valid_from'    => date('Y-m-d'),
            'work_days'     => ['mon'],
            'schedule_details' => [
                'all' => [
                    'start_time' => '08:00',
                    'end_time'   => '17:00',
                    'break_time' => '00:30',
                ],
            ],
        ], $override);
    }

    /** @test */ public function rejects_missing_source_type()
    { $p = $this->base(); unset($p['source_type']); $this->postAssign($p)->assertStatus(422); }

    /** @test */ public function rejects_source_type_not_allowed_for_assign()
    {
        // 'template' is valid for Store but not in Assign's enum (default,temporary,change_schedule).
        $this->postAssign($this->base(['source_type' => 'template']))->assertStatus(422);
    }

    /** @test */ public function rejects_missing_valid_from_when_source_type_default()
    {
        $p = $this->base();
        unset($p['valid_from']);
        $this->postAssign($p)->assertStatus(422);
    }

    /** @test */ public function rejects_missing_valid_to_when_source_type_temporary()
    {
        $p = $this->base(['source_type' => 'temporary']);
        // valid_to intentionally omitted; valid_from present
        $this->postAssign($p)->assertStatus(422);
    }

    /** @test */ public function rejects_bad_valid_from_date_format()
    { $this->postAssign($this->base(['valid_from' => '2026/01/01']))->assertStatus(422); }

    /** @test */ public function rejects_invalid_schedule_type()
    { $this->postAssign($this->base(['schedule_type' => 'bogus']))->assertStatus(422); }

    /** @test */ public function rejects_invalid_bind_to()
    { $this->postAssign($this->base(['bind_to' => 'invalid_target']))->assertStatus(422); }

    /** @test */ public function rejects_missing_start_time_for_standard_work_day()
    {
        $p = $this->base();
        unset($p['schedule_details']['all']['start_time']);
        $this->postAssign($p)->assertStatus(422);
    }

    /** @test */ public function rejects_break_time_exceeding_one_hour()
    {
        $p = $this->base();
        $p['schedule_details']['all']['break_time'] = '02:00';
        $this->postAssign($p)->assertStatus(422);
    }

    /**
     * `schedule_policies.*` behavior is inherited from ScheduleRequest, shared with Schedule
     * Template. Verified: the wildcard `in:` rule is overwritten for the 5 documented keys
     * (see schedule-template.md finding) but still rejects an unrecognized key.
     * @test
     */
    public function rejects_unexpected_schedule_policies_key()
    {
        $p = $this->base([
            'schedule_policies' => [
                'allow_undertime' => true,
                'not_a_real_policy' => true,
            ],
        ]);
        $this->postAssign($p)->assertStatus(422);
    }
}
