<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\EvoxLevels;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Repositories\ChangeScheduleRepository;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;

/**
 * REAL ChangeScheduleRepository + real ScheduleRepository + real ApprovalTrait
 * (Menu=Requests Page=ChangeSchedule Actions=store/update/approve/decline/destroy/find/pending/cancel).
 * File was 36.7% covered (62 uncovered lines) in the 29-07 run — the existing branch tests mock this
 * repository at the controller seam, so its own body never executed.
 *
 * No stored procedures anywhere in these paths (verified: ChangeScheduleRepository, ScheduleRepository,
 * ApprovalTrait contain no call_sp) — everything is Eloquent/DB writes, and every commit inside the
 * repo is a SAVEPOINT release inside this test's DatabaseTransactions envelope, so the staging dump
 * is untouched after the run.
 *
 * Auth routing (helpers verified in user_helper.php):
 *   update/destroy/find/cancel -> get_authenticated_user(owner): authenticate AS the row's owner
 *     (fast path, no users_handled() call — see FINDING REQ-UH-1 for why the non-owner path is a trap).
 *   approve/decline -> is_under_supervisee(): authenticate as an Admin/DivisionHead/Department Head
 *     LEVEL user — the level check short-circuits to true with no further query.
 *   approve-with-data -> inner update() runs get_authenticated_user(owner) as the Admin-level user:
 *     users_handled('Admin') is a bounded User::whereNotNull('bhr_num')->findOrFail(owner) — needs an
 *     owner with a bhr_num, probed accordingly.
 */
class ChangeScheduleRepositoryLiveTest extends TestCase
{
    use DatabaseTransactions;

    /** @var ChangeScheduleRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new ChangeScheduleRepository();
    }

    /** Full payload ScheduleRepository::store()/update() read directly (work_days et al. are unguarded). */
    private function schedulePayload(array $overrides = [])
    {
        return array_merge([
            'name'              => 'CS Repo Live Schedule',
            'source_type'       => 'change_schedule',
            'schedule_type'     => 'standard',
            'valid_from'        => '2026-07-01',
            'valid_to'          => '2026-07-02',
            'employee_note'     => 'repo live store note',
            'work_days'         => array_slice(get_constant('DAYS'), 0, 5),
            'schedule_details'  => ['all' => ['start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '00:30']],
            'schedule_policies' => [],
        ], $overrides);
    }

    /** ONE ChangeSchedule with a live user + schedule — bounded probe. */
    private function ownedCs()
    {
        return ChangeSchedule::whereHas('user')->whereHas('schedule')
            ->orderBy('id', 'desc')->first();
    }

    /** ONE user whose level short-circuits is_under_supervisee() to true. */
    private function approverUser()
    {
        $levelIds = EvoxLevels::whereIn('Name', ['Admin', 'DivisionHead', 'Department Head'])->pluck('LevelId');
        if ($levelIds->isEmpty()) return null;
        return User::whereIn('LevelId', $levelIds)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
    }

    private function anyActiveUser()
    {
        return User::where('is_active', 1)->whereNotNull('LevelId')->orderBy('id', 'desc')->first();
    }

    // ----------------------------------------------------------------------- store()
    /** @test */
    public function store_creates_schedule_and_change_schedule_for_authed_user()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $cs = $this->repo->store($this->schedulePayload());

        $this->assertSame($user->id, $cs->user_id);
        $this->assertSame('2026-07-01', (string) $cs->valid_from);
        $this->assertSame('2026-07-02', (string) $cs->valid_to);
        $this->assertSame('repo live store note', $cs->employee_note);
        $this->assertSame($user->id, $cs->created_by);

        $schedule = Schedule::find($cs->schedule_id);
        $this->assertNotNull($schedule);
        $this->assertSame('change_schedule', $schedule->source_type);
        $this->assertSame('2026-07-01', (string) $schedule->valid_from);
    }

    /** @test */
    public function store_nulls_optional_fields_when_not_supplied()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $payload = $this->schedulePayload();
        unset($payload['valid_from'], $payload['valid_to']);
        $cs = $this->repo->store($payload);

        $this->assertNull($cs->valid_from);
        $this->assertNull($cs->valid_to);
    }

    // ---------------------------------------------------------------------- update()
    /** @test */
    public function update_as_owner_rewrites_notes_and_resets_status_to_pending()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        $this->be($cs->user);

        $out = $this->repo->update($this->schedulePayload([
            'employee_note' => 'updated by live test',
            'approver_note' => 'approver live note',
        ]), $cs->id);

        $this->assertSame('updated by live test', $out->employee_note);
        $this->assertSame('approver live note', $out->approver_note);
        $this->assertSame($cs->user->id, $out->updated_by);
        // update() ends with ->pending(): already-pending rows stay, others are reset
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $out->status);
    }

    /** @test */
    public function update_keeps_existing_values_when_payload_omits_them()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        $this->be($cs->user);
        $originalNote = $cs->employee_note;

        $payload = $this->schedulePayload();
        unset($payload['employee_note'], $payload['approver_note'], $payload['valid_from'], $payload['valid_to']);
        $out = $this->repo->update($payload, $cs->id);

        $this->assertSame($originalNote, $out->employee_note);   // fallback arm
        $this->assertEquals($cs->valid_from, $out->valid_from);
    }

    // ----------------------------------------------------------- approve() / decline()
    /** @test */
    public function approve_with_empty_data_sets_status_approved()
    {
        $approver = $this->approverUser();
        $cs = $this->ownedCs();
        if (!$approver || !$cs) $this->markTestSkipped('missing approver-level user or ChangeSchedule fixture');
        $this->be($approver);

        $out = $this->repo->approve([], $cs->id);

        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $out->status);
        $this->assertSame($approver->id, $out->updated_by);
    }

    /** @test */
    public function approve_with_data_runs_inner_update_via_instanceof_arm()
    {
        // Admin LEVEL only: inner update() -> get_authenticated_user -> users_handled(), and for
        // DivisionHead/Department Head that path calls a LIVE stored procedure (BUG-078 class).
        // Admin's users_handled() is a bounded whereNotNull('bhr_num') query — safe.
        $adminLevelIds = EvoxLevels::where('Name', 'Admin')->pluck('LevelId');
        $approver = $adminLevelIds->isEmpty() ? null
            : User::whereIn('LevelId', $adminLevelIds)->where('is_active', 1)
                ->orderBy('id', 'desc')->first();
        if (!$approver) $this->markTestSkipped('no Admin-level user in test DB');
        // owner needs a bhr_num: the Admin-level users_handled() query filters on it
        $cs = ChangeSchedule::whereHas('user', function ($q) {
                $q->whereNotNull('bhr_num');
            })->whereHas('schedule')->orderBy('id', 'desc')->first();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule owned by a bhr-numbered user');
        $this->be($approver);

        $out = $this->repo->approve($this->schedulePayload([
            'approver_note' => 'approved with note',
        ]), $cs->id);

        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $out->status);
        $this->assertSame('approved with note', $out->fresh()->approver_note);
    }

    /** @test */
    public function decline_with_empty_data_sets_status_declined()
    {
        $approver = $this->approverUser();
        $cs = $this->ownedCs();
        if (!$approver || !$cs) $this->markTestSkipped('missing approver-level user or ChangeSchedule fixture');
        $this->be($approver);

        $out = $this->repo->decline([], $cs->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);
    }

    // ------------------------------------------------- destroy() / find() / pending() / cancel()
    /** @test */
    public function destroy_as_owner_soft_deletes_and_returns_true()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        $this->be($cs->user);

        $this->assertTrue($this->repo->destroy($cs->id));
        $this->assertTrue(ChangeSchedule::withTrashed()->find($cs->id)->trashed());
    }

    /** @test */
    public function find_as_owner_returns_the_row()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        $this->be($cs->user);

        $this->assertEquals($cs->id, $this->repo->find($cs->id)->id);
    }

    /** @test */
    public function pending_resets_status_and_cancel_sets_canceled_for_owner()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        $this->be($cs->user);

        $out = $this->repo->pending($cs->id);
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $out->status);

        $out = $this->repo->cancel($cs->id);
        $this->assertSame(get_constant('REQUEST_STATUS.canceled'), $out->status);
        $this->assertSame($cs->user->id, $out->updated_by);
    }

    /** @test */
    public function find_or_fail_arms_throw_for_missing_ids()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        $this->repo->update($this->schedulePayload(), -1);
    }
}
