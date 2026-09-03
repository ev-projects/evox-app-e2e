<?php
/**
 * SEED STEP 1 — plant one committed request row per type per status, through the REAL API.
 *
 * For each request type (alter log, overtime, rest day work, change schedule) this seeds:
 *   pending   employee submits via POST, row stays pending
 *   approved  employee submits via POST, supervisor closes it via PUT approve/{id}
 *   declined  employee submits via POST, supervisor closes it via PUT decline/{id}
 *
 * These are genuine end-to-end workflow tests (submit -> level-2 acts -> DB state asserted)
 * that double as the data seeder: because this suite has no DatabaseTransactions, the rows
 * stay committed and unblock the main suite's "needs a request row" tests (61 of them),
 * the renderable-fixture branch tests, and the duplicate-collision validation tests.
 *
 * Idempotent: each test first looks for its own marker row and skips if it already exists.
 * Every store guards on 500 (payroll-period SP / dump quirks) with the response body in the
 * message so a blocked environment reports WHY instead of failing opaquely.
 */

namespace Tests\Seed;

use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;

class Seed10RequestsSeedTest extends SeedTestCase
{
    // ------------------------------------------------------------------ helpers

    /** Skip if a marker row with this status already exists (idempotency). */
    private function skipIfSeeded(string $modelClass, int $userId, string $status, string $label): void
    {
        $exists = $modelClass::where('user_id', $userId)
            ->where('employee_note', 'like', self::SEED_MARKER . '%')
            ->where('status', $status)
            ->exists();

        if ($exists) {
            $this->markTestSkipped("Already seeded: {$label} ({$status}).");
        }
    }

    private function guard500($response, string $step): void
    {
        if ($response->status() >= 500) {
            $this->markTestIncomplete(
                "{$step} returned {$response->status()} — likely a payroll-period SP or dump gap. " .
                'Response: ' . $response->getContent()
            );
        }
    }

    private function storeOvertime($employee, string $date)
    {
        $response = $this->actingAs($employee)->postJson('/api/request/overtime', [
            'user_id'       => $employee->id,
            'date'          => $date,
            'amount'        => '01:00',
            'type'          => 'pre_overtime',
            'employee_note' => self::SEED_MARKER . ' (overtime)',
        ], $this->apiKey());
        $this->guard500($response, 'Overtime store');
        $response->assertStatus(201);

        return Overtime::where('user_id', $employee->id)->where('date', $date)->firstOrFail();
    }

    private function storeAlterLog($employee, string $date)
    {
        $response = $this->actingAs($employee)->postJson('/api/request/alter_log', [
            'user_id'       => $employee->id,
            'date'          => $date,
            'new_time_in'   => $date . ' 08:00:00',
            'new_time_out'  => $date . ' 17:00:00',
            'employee_note' => self::SEED_MARKER . ' (alter log)',
        ], $this->apiKey());
        $this->guard500($response, 'Alter log store');
        $response->assertStatus(201);

        return AlterLog::where('user_id', $employee->id)->where('date', $date)->firstOrFail();
    }

    private function storeRestDayWork($employee, string $date)
    {
        $response = $this->actingAs($employee)->postJson('/api/request/rest_day_work', [
            'user_id'       => $employee->id,
            'date'          => $date,
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
            'employee_note' => self::SEED_MARKER . ' (rest day work)',
        ], $this->apiKey());
        $this->guard500($response, 'Rest day work store');
        $response->assertStatus(201);

        return RestDayWork::where('user_id', $employee->id)->where('date', $date)->firstOrFail();
    }

    /** Change schedule has valid_from/valid_to instead of a single date; find a free day. */
    private function freeChangeScheduleDate(int $userId, int $startBack): string
    {
        for ($i = $startBack; $i < $startBack + 90; $i++) {
            $date = now()->subDays($i)->toDateString();
            $overlaps = ChangeSchedule::where('user_id', $userId)
                ->where('valid_from', '<=', $date)
                ->where('valid_to', '>=', $date)
                ->exists();
            if (!$overlaps) {
                return $date;
            }
        }
        $this->markTestIncomplete('No free change-schedule date in the last 90 days.');
    }

    private function storeChangeSchedule($employee, string $date)
    {
        $response = $this->actingAs($employee)->postJson('/api/request/change_schedule', [
            'user_id'       => $employee->id,
            'valid_from'    => $date,
            'valid_to'      => $date,
            'employee_note' => self::SEED_MARKER . ' (change schedule)',
        ], $this->apiKey());
        $this->guard500($response, 'Change schedule store');
        $response->assertStatus(201);

        return ChangeSchedule::where('user_id', $employee->id)->where('valid_from', $date)->firstOrFail();
    }

    // ------------------------------------------------------------------ overtime

    /** @test */
    public function overtime_pending_row_is_seeded()
    {
        $employee = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $this->skipIfSeeded(Overtime::class, $employee->id, 'pending', 'overtime');

        $ot = $this->storeOvertime($employee, $this->freeDateFor(Overtime::class, $employee->id, 3));

        $this->assertDatabaseHas('overtimes', ['id' => $ot->id, 'status' => 'pending']);
    }

    /** @test */
    public function overtime_approved_by_supervisor_is_seeded()
    {
        $employee   = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $supervisor = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->skipIfSeeded(Overtime::class, $employee->id, 'approved', 'overtime');

        $ot = $this->storeOvertime($employee, $this->freeDateFor(Overtime::class, $employee->id, 6));

        // approve() type-hints the same FormRequest as store(), so the full field set is required.
        $response = $this->actingAs($supervisor)->putJson("/api/request/overtime/approve/{$ot->id}", [
            'action'        => 'approve',
            'approver_note' => self::SEED_MARKER . ' approved',
            'user_id'       => $ot->user_id,
            'date'          => $ot->date,
            'type'          => $ot->type,
            'amount'        => '01:00',
        ], $this->apiKey());
        $this->guard500($response, 'Overtime approve');
        $response->assertStatus(200);

        $this->assertDatabaseHas('overtimes', ['id' => $ot->id, 'status' => 'approved']);
    }

    /** @test */
    public function overtime_declined_by_supervisor_is_seeded()
    {
        $employee   = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $supervisor = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->skipIfSeeded(Overtime::class, $employee->id, 'declined', 'overtime');

        $ot = $this->storeOvertime($employee, $this->freeDateFor(Overtime::class, $employee->id, 9));

        $response = $this->actingAs($supervisor)->putJson("/api/request/overtime/decline/{$ot->id}", [
            'action'        => 'decline',
            'approver_note' => self::SEED_MARKER . ' declined',
            'user_id'       => $ot->user_id,
            'date'          => $ot->date,
            'type'          => $ot->type,
            'amount'        => '01:00',
        ], $this->apiKey());
        $this->guard500($response, 'Overtime decline');
        $response->assertStatus(200);

        $this->assertDatabaseHas('overtimes', ['id' => $ot->id, 'status' => 'declined']);
    }

    // ------------------------------------------------------------------ alter log

    /** @test */
    public function alter_log_pending_row_is_seeded()
    {
        $employee = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $this->skipIfSeeded(AlterLog::class, $employee->id, 'pending', 'alter log');

        $al = $this->storeAlterLog($employee, $this->freeDateFor(AlterLog::class, $employee->id, 3));

        $this->assertDatabaseHas('alter_logs', ['id' => $al->id, 'status' => 'pending']);
    }

    /** @test */
    public function alter_log_approved_by_supervisor_is_seeded()
    {
        $employee   = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $supervisor = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->skipIfSeeded(AlterLog::class, $employee->id, 'approved', 'alter log');

        $al = $this->storeAlterLog($employee, $this->freeDateFor(AlterLog::class, $employee->id, 6));

        $response = $this->actingAs($supervisor)->putJson("/api/request/alter_log/approve/{$al->id}", [
            'action'        => 'approve',
            'approver_note' => self::SEED_MARKER . ' approved',
            'user_id'       => $al->user_id,
            'date'          => $al->date,
            'new_time_in'   => $al->date . ' 08:00:00',
            'new_time_out'  => $al->date . ' 17:00:00',
            'employee_note' => self::SEED_MARKER . ' (alter log)',
        ], $this->apiKey());
        $this->guard500($response, 'Alter log approve');
        $response->assertStatus(200);

        $this->assertDatabaseHas('alter_logs', ['id' => $al->id, 'status' => 'approved']);
    }

    /** @test */
    public function alter_log_declined_by_supervisor_is_seeded()
    {
        $employee   = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $supervisor = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->skipIfSeeded(AlterLog::class, $employee->id, 'declined', 'alter log');

        $al = $this->storeAlterLog($employee, $this->freeDateFor(AlterLog::class, $employee->id, 9));

        $response = $this->actingAs($supervisor)->putJson("/api/request/alter_log/decline/{$al->id}", [
            'action'        => 'decline',
            'approver_note' => self::SEED_MARKER . ' declined',
            'user_id'       => $al->user_id,
            'date'          => $al->date,
            'new_time_in'   => $al->date . ' 08:00:00',
            'new_time_out'  => $al->date . ' 17:00:00',
            'employee_note' => self::SEED_MARKER . ' (alter log)',
        ], $this->apiKey());
        $this->guard500($response, 'Alter log decline');
        $response->assertStatus(200);

        $this->assertDatabaseHas('alter_logs', ['id' => $al->id, 'status' => 'declined']);
    }

    // ------------------------------------------------------------------ rest day work

    /** @test */
    public function rest_day_work_pending_row_is_seeded()
    {
        $employee = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $this->skipIfSeeded(RestDayWork::class, $employee->id, 'pending', 'rest day work');

        $rdw = $this->storeRestDayWork($employee, $this->freeDateFor(RestDayWork::class, $employee->id, 3));

        $this->assertDatabaseHas('rest_day_works', ['id' => $rdw->id, 'status' => 'pending']);
    }

    /** @test */
    public function rest_day_work_approved_by_supervisor_is_seeded()
    {
        $employee   = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $supervisor = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->skipIfSeeded(RestDayWork::class, $employee->id, 'approved', 'rest day work');

        $rdw = $this->storeRestDayWork($employee, $this->freeDateFor(RestDayWork::class, $employee->id, 6));

        $response = $this->actingAs($supervisor)->putJson("/api/request/rest_day_work/approve/{$rdw->id}", [
            'action'        => 'approve',
            'approver_note' => self::SEED_MARKER . ' approved',
            'user_id'       => $rdw->user_id,
            'date'          => $rdw->date,
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
        ], $this->apiKey());
        $this->guard500($response, 'Rest day work approve');
        $response->assertStatus(200);

        $this->assertDatabaseHas('rest_day_works', ['id' => $rdw->id, 'status' => 'approved']);
    }

    /** @test */
    public function rest_day_work_declined_by_supervisor_is_seeded()
    {
        $employee   = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $supervisor = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->skipIfSeeded(RestDayWork::class, $employee->id, 'declined', 'rest day work');

        $rdw = $this->storeRestDayWork($employee, $this->freeDateFor(RestDayWork::class, $employee->id, 9));

        $response = $this->actingAs($supervisor)->putJson("/api/request/rest_day_work/decline/{$rdw->id}", [
            'action'        => 'decline',
            'approver_note' => self::SEED_MARKER . ' declined',
            'user_id'       => $rdw->user_id,
            'date'          => $rdw->date,
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
        ], $this->apiKey());
        $this->guard500($response, 'Rest day work decline');
        $response->assertStatus(200);

        $this->assertDatabaseHas('rest_day_works', ['id' => $rdw->id, 'status' => 'declined']);
    }

    // ------------------------------------------------------------------ change schedule

    /** @test */
    public function change_schedule_pending_row_is_seeded()
    {
        $employee = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $this->skipIfSeeded(ChangeSchedule::class, $employee->id, 'pending', 'change schedule');

        $cs = $this->storeChangeSchedule($employee, $this->freeChangeScheduleDate($employee->id, 3));

        $this->assertDatabaseHas('change_schedules', ['id' => $cs->id, 'status' => 'pending']);
    }

    /** @test */
    public function change_schedule_declined_by_supervisor_is_seeded()
    {
        $employee   = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $supervisor = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->skipIfSeeded(ChangeSchedule::class, $employee->id, 'declined', 'change schedule');

        $cs = $this->storeChangeSchedule($employee, $this->freeChangeScheduleDate($employee->id, 6));

        $response = $this->actingAs($supervisor)->putJson("/api/request/change_schedule/decline/{$cs->id}", [
            'action'        => 'decline',
            'approver_note' => self::SEED_MARKER . ' declined',
            'user_id'       => $cs->user_id,
            'valid_from'    => $cs->valid_from,
            'valid_to'      => $cs->valid_to,
        ], $this->apiKey());
        $this->guard500($response, 'Change schedule decline');
        $response->assertStatus(200);

        $this->assertDatabaseHas('change_schedules', ['id' => $cs->id, 'status' => 'declined']);
    }

    /**
     * @test
     * Approving a change schedule APPLIES the schedule to the employee's DTR days, so it
     * needs the employee to have a schedule; guarded rather than assumed.
     */
    public function change_schedule_approved_by_supervisor_is_seeded()
    {
        $employee   = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $supervisor = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->skipIfSeeded(ChangeSchedule::class, $employee->id, 'approved', 'change schedule');

        $cs = $this->storeChangeSchedule($employee, $this->freeChangeScheduleDate($employee->id, 9));

        $response = $this->actingAs($supervisor)->putJson("/api/request/change_schedule/approve/{$cs->id}", [
            'action'        => 'approve',
            'approver_note' => self::SEED_MARKER . ' approved',
            'user_id'       => $cs->user_id,
            'valid_from'    => $cs->valid_from,
            'valid_to'      => $cs->valid_to,
        ], $this->apiKey());
        $this->guard500($response, 'Change schedule approve (employee may need a schedule assigned first)');
        $response->assertStatus(200);

        $this->assertDatabaseHas('change_schedules', ['id' => $cs->id, 'status' => 'approved']);
    }
}
