<?php
// Validation REJECTION tests — Schedule Template (Store + Update). Every case sends INVALID
// data and asserts the FormRequest blocks it (422). A rejected request writes NOTHING, so
// this is safe on the live-dump DB. Uses withoutMiddleware() to bypass the JWT/apiKey auth
// gate (not what we're testing) so the request reaches Store/UpdateScheduleRequest
// validation. No seeding — acts as a real existing user.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class ScheduleTemplateValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

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

    private function postStore(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/schedule/', $payload);
    }

    private function putUpdate(array $payload, $id = 999999)
    {
        return $this->actingAs($this->user)->putJson('/api/schedule/' . $id, $payload);
    }

    // Base payload deliberately omits `schedule_policies` — including it triggers the
    // `schedule_policies.*` wildcard bug (see rejects_schedule_policies_boolean_values_bug),
    // which would make every other single-field rejection test ambiguous about *why* it 422s.
    private function base(array $override = [])
    {
        return array_merge([
            'name'          => 'Test Template',
            'source_type'   => 'template',
            'schedule_type' => 'standard',
            'bind_to'       => 'user',
            'bind_id'       => (string) $this->user->id,
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

    // -------------------- Store --------------------

    /** @test */ public function rejects_missing_name()
    { $p = $this->base(); unset($p['name']); $this->postStore($p)->assertStatus(422); }

    /** @test */ public function rejects_overlong_name()
    { $this->postStore($this->base(['name' => str_repeat('x', 256)]))->assertStatus(422); }

    /** @test */ public function rejects_missing_source_type()
    { $p = $this->base(); unset($p['source_type']); $this->postStore($p)->assertStatus(422); }

    /** @test */ public function rejects_source_type_not_allowed_for_store()
    { $this->postStore($this->base(['source_type' => 'default']))->assertStatus(422); }

    /** @test */ public function rejects_missing_schedule_type()
    { $p = $this->base(); unset($p['schedule_type']); $this->postStore($p)->assertStatus(422); }

    /** @test */ public function rejects_invalid_schedule_type()
    { $this->postStore($this->base(['schedule_type' => 'bogus']))->assertStatus(422); }

    /** @test */ public function rejects_invalid_bind_to()
    { $this->postStore($this->base(['bind_to' => 'invalid_target']))->assertStatus(422); }

    /** @test */ public function rejects_non_array_work_days()
    { $this->postStore($this->base(['work_days' => 'monday']))->assertStatus(422); }

    /** @test */ public function rejects_missing_start_time_for_standard_work_day()
    {
        $p = $this->base();
        unset($p['schedule_details']['all']['start_time']);
        $this->postStore($p)->assertStatus(422);
    }

    /** @test */ public function rejects_bad_end_time_format()
    {
        $p = $this->base();
        $p['schedule_details']['all']['end_time'] = '5pm';
        $this->postStore($p)->assertStatus(422);
    }

    /** @test */ public function rejects_break_time_exceeding_one_hour()
    {
        $p = $this->base();
        $p['schedule_details']['all']['break_time'] = '02:00';
        $this->postStore($p)->assertStatus(422);
    }

    /** @test */ public function rejects_missing_valid_from_when_source_type_change_schedule()
    {
        $p = $this->base(['source_type' => 'change_schedule']);
        $p['valid_to'] = date('Y-m-d', strtotime('+1 day'));
        // valid_from intentionally omitted
        $this->postStore($p)->assertStatus(422);
    }

    /** @test */ public function rejects_bad_valid_from_date_format()
    {
        $p = $this->base(['source_type' => 'change_schedule']);
        $p['valid_from'] = '2026/01/01';
        $p['valid_to']   = '2026-02-01';
        $this->postStore($p)->assertStatus(422);
    }

    /** @test */ public function rejects_missing_valid_to_when_source_type_change_schedule()
    {
        $p = $this->base(['source_type' => 'change_schedule']);
        $p['valid_from'] = date('Y-m-d');
        // valid_to intentionally omitted
        $this->postStore($p)->assertStatus(422);
    }

    /**
     * `schedule_policies.*` (ScheduleRequest.php:42) is `bool|in:<5 documented policy names>`.
     * Verified on staging that this does NOT reject the 5 documented keys (the later explicit
     * per-key `bool` rules on lines 43-47 silently overwrite/supersede the wildcard's `in:`
     * constraint for those keys — a Laravel rule-merge order quirk, see schedule-template.md).
     * It DOES still reject any unrecognized key inside schedule_policies, since a boolean
     * value can never satisfy the `in:` allow-list for a key with no explicit override.
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
        $this->postStore($p)->assertStatus(422);
    }

    // -------------------- Update --------------------
    // UpdateScheduleRequest validates before the controller loads the schedule by {id},
    // so a nonexistent id is fine for exercising validation-layer rejections.

    /** @test */ public function rejects_missing_name_on_update()
    { $p = $this->base(); unset($p['name']); $this->putUpdate($p)->assertStatus(422); }

    /** @test */ public function rejects_source_type_not_allowed_for_update()
    {
        // change_schedule is valid for Store but NOT for Update (Update only allows 'template').
        $this->putUpdate($this->base(['source_type' => 'change_schedule']))->assertStatus(422);
    }
}
