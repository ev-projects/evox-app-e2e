<?php
// DEEPER validation — Schedule Template CONTROLLER / BUSINESS-layer rule (beyond the
// FormRequest datatype layer in ScheduleTemplateValidationRejectionTest). Still zero-write:
// the only business gate found on this flow is ScheduleController@update's isTemplate() check,
// which is a READ-only branch — when it fails, the controller returns success_response()
// WITHOUT ever calling ScheduleRepository::update(). We only SELECT an existing non-template
// schedule row (never insert/update) before the (gated) PUT.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class ScheduleTemplateBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
    }

    /**
     * ScheduleController@update (ScheduleController.php:49-71) loads the target schedule by
     * {id} and only calls ScheduleRepository::update() if $schedule->isTemplate() (source_type
     * === 'template'). Otherwise it returns `success_response(trans('messages.update_schedule_
     * not_auth'))` — HTTP 200 (success_response's default code), NOT a write, and NOT a 422.
     * This is a real business gate distinct from FormRequest validation: the PUT payload here is
     * otherwise fully valid (passes UpdateScheduleRequest), so a naive "assert not 2xx" rejection
     * test would be WRONG — the correct assertion is 200 + the not-authorized message, and that
     * ScheduleRepository::update() was never reached (traced from source; not directly observable
     * via HTTP, so we assert on the exact response body ScheduleController::update returns).
     * @test
     */
    public function update_on_non_template_schedule_is_gated_and_writes_nothing()
    {
        $existing = DB::table('schedules')
            ->whereNull('deleted_at')
            ->where('source_type', '!=', 'template')
            ->first();
        if (!$existing) {
            $this->markTestSkipped('no existing non-template schedule row to exercise the isTemplate() gate');
        }

        // Otherwise-valid Update payload (source_type must be 'template' per UpdateScheduleRequest's
        // own enum — that's the REQUEST's source_type, unrelated to the loaded row's actual DB value).
        $payload = [
            'name'          => 'Attempted Update',
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
        ];

        $resp = $this->actingAs($this->user)
            ->putJson('/api/schedule/' . $existing->id, $payload);

        $resp->assertStatus(200);
        $resp->assertJson([
            'message' => 'The schedule is not authorized to be updated!',
            'content' => [],
        ]);
    }

    // No uniqueness/overlap DB-layer rule exists for Schedule Template (verified against
    // ScheduleRepository::store/update — no unique index or custom validator on `name` or on
    // bind_to+bind_id+valid_from/to). Documented as a genuine absence, not a gap in this pass —
    // see matrices/schedule-template.md "Business/DB-layer rules" section.
}
