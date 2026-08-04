<?php
// DEEPER validation — Change of Schedule CONTROLLER / BUSINESS / DB-layer rules (beyond the
// FormRequest datatype layer in ChangeScheduleValidationRejectionTest, which already covers the
// only cross-field rule that exists here: valid_to >= valid_from).
//
// Investigated and found: ChangeScheduleController@store has NO business-layer guard at all — no
// uniqueness check, no overlap check, no period/cutoff gate. It goes straight from FormRequest
// validation into ScheduleRepository::store($data), which is the documented validation gap (see
// matrices/change-schedule.md FINDING, FINDINGS-FOR-REVIEW.md A7): `$data['work_days']`,
// `$data['schedule_details']`, `$data['schedule_policies']` are read WITHOUT isset() guards, so a
// payload missing them is not guaranteed to be safely rejected — it could 500, or (worse) write a
// partial `schedules` row with nulls/garbage before failing. That makes it unsafe to probe here.
//
// There is therefore no additional safe rejection test to add beyond the shallow suite; this file
// exists to make that investigation result explicit and keep the per-form pattern consistent.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class ChangeScheduleBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
    }

    /** @test */
    public function unvalidated_schedule_payload_is_documented_not_tested()
    {
        $this->markTestIncomplete(
            'ChangeScheduleController@store has no business-layer guard beyond FormRequest; the ' .
            'entire schedule_details/schedule_policies/work_days payload is read from ScheduleRepository' .
            '::store() without isset() guards, so probing it here risks a 500 or a partial write on ' .
            'the live-dump DB. See matrices/change-schedule.md and FINDINGS-FOR-REVIEW.md A7. ' .
            'Coverable on a disposable DB.'
        );
    }
}
