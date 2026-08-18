<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Repositories/AlterLogPunchRepository.php
 *     update, destroy, find, approve, decline, on_conflict
 *
 * MENU PATH
 *   Requests -> My Team Requests -> Multi-Punch Alteration (alter_log_punches_new)
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   update 96.67 | destroy 92.86 | find 87.5 | approve 58.33 | decline 91.67 | on_conflict 96.55
 *   AlterLogPunchRepositoryLiveTest already drives store(), the owner update arms, approve/decline
 *   with an EMPTY payload, destroy, find, pending, cancel and the single-sided on_conflict arms.
 *   What it never reached: the "approver edited the punches while approving" arm (a non-empty
 *   payload runs the nested update()), the rethrow arms, and the on_conflict case where the same
 *   request collides with BOTH neighbouring days and the two messages have to be joined.
 *
 * WHAT THIS FILE ADDS — only those arms. No scenario here is repeated from the Live test.
 *
 * FINDINGS
 *   FINDING_ALP_FIND_NULL — find() reads ->user_id off the result of AlterLogPunch::find() with no
 *     null check, so an unknown id raises inside the try and is rethrown instead of returning null.
 *     Same shape as FINDING_AL_FIND_NULL in AlterLogRepositoryCompleteTest.
 *
 * SAFETY
 *   DatabaseTransactions. No stored procedure on any path. on_conflict() reads are point lookups on
 *   (user_id, date); the fixture probe walks at most 60 recent punch rows and never scans the table.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use App\EvoxLevels;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Request\Models\AlterLogPunch;
use App\Modules\Request\Repositories\AlterLogPunchRepository;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Fluent;
use Tests\TestCase;

class AlterLogPunchRepositoryCompleteTest extends TestCase
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

    /** The nested update() runs get_authenticated_user(), which only clears an Admin for another
     *  employee's row — so the "payload supplied" arms need an Admin, not any approver level. */
    private function adminUser()
    {
        $levelIds = EvoxLevels::where('Name', 'Admin')->pluck('LevelId');
        if ($levelIds->isEmpty()) return null;

        return User::whereIn('LevelId', $levelIds)->where('is_active', 1)->orderBy('id', 'desc')->first();
    }

    private function anyActiveUser()
    {
        return User::where('is_active', 1)->whereNotNull('LevelId')->orderBy('id', 'desc')->first();
    }

    private function punchJson()
    {
        return json_encode([
            ['start_time' => '2026-07-10 09:00:00', 'end_time' => '2026-07-10 12:00:00',
             'project_name' => 'Approver edit', 'remarks' => 'corrected by approver'],
        ]);
    }

    // ══════════════════════════════════════════════ approve() / decline() with an edited payload

    /** @test approving while correcting the punches saves the correction, then approves */
    public function approving_with_corrected_punches_saves_the_edit_before_approving()
    {
        $admin = $this->adminUser();
        $alp   = $this->ownedAlp();
        if (!$admin || !$alp) $this->markTestSkipped('missing Admin-level user or AlterLogPunch fixture');
        $this->be($admin);

        $out = $this->repo->approve([
            'date'          => (string) $alp->date,
            'new_punch'     => $this->punchJson(),
            'approver_note' => 'approved with corrected punch times',
        ], $alp->id);

        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $out->status);

        $saved = AlterLogPunch::find($alp->id);
        $this->assertSame('approved with corrected punch times', $saved->approver_note);
        $this->assertCount(1, json_decode($saved->new_punch));         // the edit replaced the punch set
        $this->assertSame('Approver edit', json_decode($saved->new_punch)[0]->project_name);
        $this->assertSame($admin->id, $saved->updated_by);
    }

    /** @test declining while adding a reason saves the reason, then declines */
    public function declining_with_a_payload_saves_the_reason_before_declining()
    {
        $admin = $this->adminUser();
        $alp   = $this->ownedAlp();
        if (!$admin || !$alp) $this->markTestSkipped('missing Admin-level user or AlterLogPunch fixture');
        $this->be($admin);

        $out = $this->repo->decline([
            'date'          => (string) $alp->date,
            'new_punch'     => $this->punchJson(),
            'approver_note' => 'declined - no supporting ticket',
        ], $alp->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);
        $this->assertSame('declined - no supporting ticket', AlterLogPunch::find($alp->id)->approver_note);
    }

    // ═══════════════════════════════════════════════════════════════ rethrow arms

    /** @test approving a punch alteration that is not in the database rolls back and rethrows */
    public function approving_an_unknown_punch_alteration_rethrows_to_the_caller()
    {
        $approver = $this->approverUser();
        if (!$approver) $this->markTestSkipped('no approver-level user in test DB');
        $this->be($approver);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->approve([], -1);
    }

    /** @test declining a punch alteration that is not in the database rolls back and rethrows */
    public function declining_an_unknown_punch_alteration_rethrows_to_the_caller()
    {
        $approver = $this->approverUser();
        if (!$approver) $this->markTestSkipped('no approver-level user in test DB');
        $this->be($approver);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->decline([], -1);
    }

    /** @test updating a punch alteration that is not in the database rolls back and rethrows */
    public function updating_an_unknown_punch_alteration_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->update(['date' => '2026-07-10', 'new_punch' => $this->punchJson()], -1);
    }

    /** @test deleting a punch alteration that is not in the database rolls back and rethrows */
    public function deleting_an_unknown_punch_alteration_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->destroy(-1);
    }

    /**
     * DEFECT (FINDING_ALP_FIND_NULL): find() dereferences a null model. Pinned to current
     * behaviour — flip to assertNull() once the guard lands.
     *
     * @test reading a punch alteration that is not in the database raises instead of returning null
     */
    public function reading_an_unknown_punch_alteration_raises_instead_of_returning_null_FINDING_ALP_FIND_NULL()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $caught = null;
        try {
            $this->repo->find(-1);
        } catch (\Exception $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'find() returned instead of raising — the null guard has landed');
        $this->assertStringContainsString('user_id', $caught->getMessage());
    }

    // ═══════════════════════════════════════════════════════════ on_conflict(): both neighbours

    /**
     * Find a date D for one employee where the repository's own two probes both hit:
     *   yesterday: (D-1, user, is_active=1) ordered by id desc has a usable time_out
     *   tomorrow:  (D+1, user, is_active=1) first row has a usable time_in
     * Walks at most 60 recent punch rows; every lookup is a point query on (user_id, date).
     */
    private function findTwoSidedConflictDate()
    {
        $recent = DtrPunchHistory::where('is_active', 1)
            ->whereNotNull('time_out')->orderBy('id', 'desc')->limit(60)->get();

        foreach ($recent as $row) {
            $date  = Carbon::parse((string) $row->date)->addDays(1)->format('Y-m-d');
            $prev  = DtrPunchHistory::where('date', Carbon::parse($date)->subDays(1)->format('Y-m-d'))
                ->where('user_id', $row->user_id)->where('is_active', 1)->orderBy('id', 'desc')->first();
            $next  = DtrPunchHistory::where('date', Carbon::parse($date)->addDays(1)->format('Y-m-d'))
                ->where('user_id', $row->user_id)->where('is_active', 1)->first();

            if ($prev && $next && $prev->time_out > 100000 && $next->time_in > 100000) {
                return ['date' => $date, 'user_id' => $row->user_id, 'prev' => $prev, 'next' => $next];
            }
        }

        return null;
    }

    /** @test a punch alteration overlapping both neighbouring days reports both clashes in one message */
    public function an_alteration_overlapping_both_neighbouring_days_reports_both_clashes()
    {
        $fixture = $this->findTwoSidedConflictDate();
        if (!$fixture) {
            $this->markTestSkipped('no employee in the 60 most recent punch rows has logs on both '
                . 'the day before and the day after a common date');
        }
        $user = User::find($fixture['user_id']);
        if (!$user) $this->markTestSkipped('punch rows have no owning user');
        $this->be($user);

        // one entry spanning 1970 -> 2099: its start is before any previous day's time-out and its
        // end is after any next day's time-in, so both guards in on_conflict() must fire
        $message = $this->repo->on_conflict(new Fluent([
            'date'      => $fixture['date'],
            'user_id'   => $fixture['user_id'],
            'new_punch' => json_encode([
                ['start_time' => '1970-01-02 00:00:00', 'end_time' => '2099-01-01 23:00:00'],
            ]),
        ]));

        $this->assertStringContainsString('Time in conflicts with', $message);
        $this->assertStringContainsString('Time out conflicts with', $message);
        $this->assertStringContainsString(' and ', $message);          // the two halves are joined
        $this->assertStringContainsString(
            Carbon::parse($fixture['date'])->subDays(1)->format('Y-m-d'), $message
        );
        $this->assertStringContainsString(
            Carbon::parse($fixture['date'])->addDays(1)->format('Y-m-d'), $message
        );
        // and the joiner is only added once the first half is present
        $this->assertLessThan(
            strpos($message, 'Time out conflicts with'),
            strpos($message, ' and ')
        );
    }
}
