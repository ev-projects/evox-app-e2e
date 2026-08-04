<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Fluent;
use App\EvoxLevels;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Request\Models\AlterLogPunch;
use App\Modules\Request\Repositories\AlterLogPunchRepository;
use App\Modules\User\Models\User;

/**
 * REAL AlterLogPunchRepository (Menu=Requests Page=MultiPunch Alteration Actions=store/update/
 * approve/decline/destroy/find/pending/cancel/on_conflict). File was 56.6% covered (63 uncovered
 * lines) — controller branch tests mock this repo, so its punch-JSON formatting and conflict
 * detection never executed.
 *
 * No stored procedures in any path (verified). Auth::user()->punch(date,date) is a bounded
 * hasMany(DtrPunchHistory) date-range read. Writes roll back via DatabaseTransactions.
 * on_conflict() arms are driven DETERMINISTICALLY: probe one DtrPunchHistory row, then aim the
 * request date one day after it (yesterday-conflict arm, epoch start_time guarantees
 * alter_start < time_out) or one day before it (tomorrow-conflict arm, year-2099 end_time
 * guarantees alter_end > time_in), or far future (no-conflict arm).
 */
class AlterLogPunchRepositoryLiveTest extends TestCase
{
    use DatabaseTransactions;

    /** @var AlterLogPunchRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new AlterLogPunchRepository();
    }

    private function newPunchJson(array $rows = null)
    {
        return json_encode($rows ?? [
            ['start_time' => '2026-07-10 08:00:00', 'end_time' => '2026-07-10 12:00:00',
             'project_name' => 'Live Test Project', 'remarks' => 'am block'],
            ['start_time' => '2026-07-10 13:00:00'],   // missing keys -> null arms
        ]);
    }

    private function ownedAlp()
    {
        return AlterLogPunch::whereHas('user')->orderBy('id', 'desc')->first();
    }

    private function approverUser()
    {
        $levelIds = EvoxLevels::whereIn('Name', ['Admin', 'DivisionHead', 'Department Head'])->pluck('LevelId');
        if ($levelIds->isEmpty()) return null;
        return User::whereIn('LevelId', $levelIds)->where('is_active', 1)->orderBy('id', 'desc')->first();
    }

    private function anyActiveUser()
    {
        return User::where('is_active', 1)->whereNotNull('LevelId')->orderBy('id', 'desc')->first();
    }

    // ----------------------------------------------------------------------- store()
    /** @test */
    public function store_formats_new_punch_and_snapshots_old_punch()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $alp = $this->repo->store([
            'date'          => '2026-07-10',
            'new_punch'     => $this->newPunchJson(),
            'employee_note' => 'alp live note',
        ]);

        $this->assertSame($user->id, $alp->user_id);             // auth fallback arm
        $this->assertSame('2026-07-10', (string) $alp->date);
        $this->assertSame('alp live note', $alp->employee_note);

        $newPunch = json_decode($alp->new_punch);
        $this->assertCount(2, $newPunch);
        $this->assertIsInt($newPunch[0]->start_time);            // strtotime - offset applied
        $this->assertSame('Live Test Project', $newPunch[0]->project_name);
        $this->assertNull($newPunch[1]->end_time);               // missing-key null arms
        $this->assertNull($newPunch[1]->remarks);

        $this->assertNotNull(json_decode($alp->old_punch));      // old punch snapshot is valid JSON
    }

    // ---------------------------------------------------------------------- update()
    /** @test */
    public function update_as_owner_reformats_punches_and_resets_to_pending()
    {
        $alp = $this->ownedAlp();
        if (!$alp) $this->markTestSkipped('no AlterLogPunch with user in test DB');
        $this->be($alp->user);

        $out = $this->repo->update([
            'date'          => '2026-07-10',
            'new_punch'     => $this->newPunchJson(),
            'employee_note' => 'alp updated note',
            'approver_note' => 'alp approver note',
        ], $alp->id);

        $this->assertSame('alp updated note', $out->employee_note);
        $this->assertSame('alp approver note', $out->approver_note);
        $this->assertSame($alp->user->id, $out->updated_by);
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $out->status);
        $this->assertCount(2, json_decode($out->new_punch));
    }

    /** @test */
    public function update_keeps_notes_and_date_when_omitted()
    {
        $alp = $this->ownedAlp();
        if (!$alp) $this->markTestSkipped('no AlterLogPunch with user in test DB');
        $this->be($alp->user);
        $originalNote = $alp->employee_note;

        // date stays supplied: punch(null, null) would snapshot the user's ENTIRE punch history
        $out = $this->repo->update([
            'date'      => '2026-07-11',
            'new_punch' => $this->newPunchJson([]),               // empty punch set -> loop skipped
        ], $alp->id);

        $this->assertSame($originalNote, $out->employee_note);    // note keep arm
        $this->assertSame('[]', $out->new_punch);
    }

    // ----------------------------------------------------------- approve() / decline()
    /** @test */
    public function approve_and_decline_with_empty_data()
    {
        $approver = $this->approverUser();
        $alp = $this->ownedAlp();
        if (!$approver || !$alp) $this->markTestSkipped('missing approver-level user or AlterLogPunch fixture');
        $this->be($approver);

        $out = $this->repo->approve([], $alp->id);
        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $out->status);
        $this->assertSame($approver->id, $out->updated_by);

        $out = $this->repo->decline([], $alp->id);
        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);
    }

    // ------------------------------------------------- destroy() / find() / pending() / cancel()
    /** @test */
    public function destroy_as_owner_deletes_record_and_returns_true()
    {
        $alp = $this->ownedAlp();
        if (!$alp) $this->markTestSkipped('no AlterLogPunch with user in test DB');
        $this->be($alp->user);

        $this->assertTrue($this->repo->destroy($alp->id));
        // alter_log_punches_new has no deleted_at — destroy() is a hard delete
        $this->assertNull(AlterLogPunch::find($alp->id));
    }

    /** @test */
    public function find_pending_cancel_as_owner()
    {
        $alp = $this->ownedAlp();
        if (!$alp) $this->markTestSkipped('no AlterLogPunch with user in test DB');
        $this->be($alp->user);

        $this->assertEquals($alp->id, $this->repo->find($alp->id)->id);

        $out = $this->repo->pending($alp->id);
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $out->status);

        $out = $this->repo->cancel($alp->id);
        $this->assertSame(get_constant('REQUEST_STATUS.canceled'), $out->status);
    }

    // ------------------------------------------------------------------ on_conflict()
    /** @test */
    public function on_conflict_reports_yesterday_overlap()
    {
        $punch = DtrPunchHistory::where('is_active', 1)->whereNotNull('time_out')
            ->orderBy('id', 'desc')->first();
        if (!$punch) $this->markTestSkipped('no active DtrPunchHistory row in test DB');
        $user = User::find($punch->user_id);
        if (!$user) $this->markTestSkipped('punch row has no user');
        $this->be($user);

        // request date = punch date + 1 -> the probe row IS "yesterday"; epoch start < any time_out
        $message = $this->repo->on_conflict(new Fluent([
            'date'      => Carbon::parse((string) $punch->date)->addDays(1)->format('Y-m-d'),
            'user_id'   => $punch->user_id,
            'new_punch' => json_encode([
                ['start_time' => '1970-01-02 00:00:00', 'end_time' => '1970-01-02 01:00:00'],
            ]),
        ]));

        $this->assertStringContainsString('Time in conflicts with', $message);
    }

    /** @test */
    public function on_conflict_reports_tomorrow_overlap()
    {
        $punch = DtrPunchHistory::where('is_active', 1)->whereNotNull('time_in')
            ->orderBy('id', 'desc')->first();
        if (!$punch) $this->markTestSkipped('no active DtrPunchHistory row in test DB');
        $user = User::find($punch->user_id);
        if (!$user) $this->markTestSkipped('punch row has no user');
        $this->be($user);

        // request date = punch date - 1 -> the probe row IS "tomorrow"; 2099 end > any time_in
        $message = $this->repo->on_conflict(new Fluent([
            'date'      => Carbon::parse((string) $punch->date)->subDays(1)->format('Y-m-d'),
            'user_id'   => $punch->user_id,
            'new_punch' => json_encode([
                ['start_time' => '2099-01-01 00:00:00', 'end_time' => '2099-01-01 23:00:00'],
            ]),
        ]));

        $this->assertStringContainsString('Time out conflicts with', $message);
    }

    /** @test */
    public function on_conflict_returns_empty_message_when_no_neighbors()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $message = $this->repo->on_conflict(new Fluent([
            'date'      => '2093-06-15',                          // no punch history that far out
            'user_id'   => $user->id,
            'new_punch' => json_encode([
                ['start_time' => '2093-06-15 08:00:00', 'end_time' => '2093-06-15 17:00:00'],
            ]),
        ]));

        $this->assertSame('', $message);
    }
}
