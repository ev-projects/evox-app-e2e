<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Repositories/AlterLogRepository.php
 *     store, update, destroy, find, approve, decline, pending, cancel, where
 *   app/Modules/Request/Traits/ApprovalTrait.php  (decline/pending reached through the repository)
 *
 * MENU PATH
 *   Requests -> My Requests / My Team Requests -> Alteration (alter_logs)
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   store 80 | update 95.45 | destroy 92.86 | find 87.5 | decline 0 | pending 0 | cancel 66.67
 *   where 50
 *   decline() and pending() had never executed at all: no suite drives the alter-log repository
 *   directly (the controller branch tests IoC-mock it), and where() only ever ran with an empty
 *   filter array, so every one of its six filter arms was unexecuted.
 *
 * WHAT THIS FILE ADDS
 *   The declined and pending transitions, the approve/decline "payload supplied" arms that run the
 *   nested update(), every where() filter arm, and the catch/rethrow arm of each method. Nothing
 *   here duplicates AlterLogPunchRepositoryLiveTest / ChangeScheduleRepositoryLiveTest /
 *   RestDayWorkRepositoryLiveTest — those cover the sibling repositories, not this one.
 *
 * FINDINGS
 *   FINDING_AL_FIND_NULL — AlterLogRepository::find() dereferences the result of AlterLog::find()
 *     without a null check, so asking for an id that does not exist raises an error inside the try
 *     and is rethrown as an exception rather than returning null. Characterised below; the
 *     controller turns it into a 404, so the user-visible behaviour is correct today.
 *
 * SAFETY
 *   DatabaseTransactions — every write (including the inner DB::commit() calls, which are savepoint
 *   releases inside the test transaction) is rolled back at test end. No stored procedure is reached
 *   on any path in this file. Every read is bounded: probes use orderBy('id','desc')->first(), and
 *   every where() call carries show_owned so it can never scan the whole table.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use App\EvoxLevels;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Repositories\AlterLogRepository;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\Feature\BranchTests\Support\DeadConnectionTrait;
use Tests\TestCase;

class AlterLogRepositoryCompleteTest extends TestCase
{
    use DatabaseTransactions, DeadConnectionTrait;

    /** @var AlterLogRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new AlterLogRepository();
    }

    /** The most recent alter log that still has an owning user row. */
    private function ownedAlterLog()
    {
        return AlterLog::whereHas('user')->orderBy('id', 'desc')->first();
    }

    /** A user whose level short-circuits is_under_supervisee() to true (approver). */
    private function approverUser()
    {
        $levelIds = EvoxLevels::whereIn('Name', ['Admin', 'DivisionHead', 'Department Head'])->pluck('LevelId');
        if ($levelIds->isEmpty()) return null;

        return User::whereIn('LevelId', $levelIds)->where('is_active', 1)->orderBy('id', 'desc')->first();
    }

    /**
     * An Admin. The "payload supplied" arms of approve()/decline() run the nested update(), and
     * update() calls get_authenticated_user() which only lets an Admin act on somebody else's row.
     */
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

    // ═══════════════════════════════════════════════════════════════════ decline()  (was 0%)

    /** @test declining an alteration with no edits moves it to declined and records the approver */
    public function declining_with_no_payload_sets_the_status_to_declined()
    {
        $approver  = $this->approverUser();
        $alter_log = $this->ownedAlterLog();
        if (!$approver || !$alter_log) $this->markTestSkipped('missing approver-level user or AlterLog fixture');
        $this->be($approver);

        $out = $this->repo->decline([], $alter_log->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);
        $this->assertSame($approver->id, $out->updated_by);
        $this->assertSame(get_constant('REQUEST_STATUS.declined'), AlterLog::find($alter_log->id)->status);
    }

    /** @test declining with a payload rewrites the approver note first, then declines */
    public function declining_with_a_payload_saves_the_approver_note_before_declining()
    {
        $admin     = $this->adminUser();
        $alter_log = $this->ownedAlterLog();
        if (!$admin || !$alter_log) $this->markTestSkipped('missing Admin-level user or AlterLog fixture');
        $this->be($admin);

        $out = $this->repo->decline([
            'date'          => (string) $alter_log->date,
            'approver_note' => 'declined - times do not match the biometric log',
        ], $alter_log->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);
        $this->assertSame('declined - times do not match the biometric log', $out->fresh()->approver_note);
    }

    /** @test declining an alteration that is not in the database is reported, not swallowed */
    public function declining_an_unknown_alteration_rethrows_to_the_caller()
    {
        $approver = $this->approverUser();
        if (!$approver) $this->markTestSkipped('no approver-level user in test DB');
        $this->be($approver);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->decline([], -1);
    }

    // ═══════════════════════════════════════════════════════════════════ pending()  (was 0%)

    /** @test sending an alteration back to pending clears the previous decision */
    public function sending_an_alteration_back_to_pending_records_the_new_status()
    {
        $approver  = $this->approverUser();
        $alter_log = $this->ownedAlterLog();
        if (!$approver || !$alter_log) $this->markTestSkipped('missing approver-level user or AlterLog fixture');
        $this->be($approver);

        // decline first so pending() has a status to change; isPending() would otherwise no-op
        $this->repo->decline([], $alter_log->id);

        $out = $this->repo->pending($alter_log->id);

        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $out->status);
        $this->assertSame($approver->id, $out->updated_by);
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), AlterLog::find($alter_log->id)->status);
    }

    /** @test setting an unknown alteration to pending is reported, not swallowed */
    public function setting_an_unknown_alteration_to_pending_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->pending(-1);
    }

    // ═══════════════════════════════════════════════════════════════════ approve() / cancel()

    /** @test approving with a payload runs the nested update and lands on approved */
    public function approving_with_a_payload_saves_the_approver_note_before_approving()
    {
        $admin     = $this->adminUser();
        $alter_log = $this->ownedAlterLog();
        if (!$admin || !$alter_log) $this->markTestSkipped('missing Admin-level user or AlterLog fixture');
        $this->be($admin);

        $out = $this->repo->approve([
            'date'          => (string) $alter_log->date,
            'approver_note' => 'approved - matches the door log',
        ], $alter_log->id);

        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $out->status);
        $this->assertSame('approved - matches the door log', $out->fresh()->approver_note);
        $this->assertSame($admin->id, $out->updated_by);
    }

    /** @test approving an alteration that is not in the database is reported, not swallowed */
    public function approving_an_unknown_alteration_rethrows_to_the_caller()
    {
        $approver = $this->approverUser();
        if (!$approver) $this->markTestSkipped('no approver-level user in test DB');
        $this->be($approver);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->approve([], -1);
    }

    /** @test an owner can cancel their own alteration */
    public function the_owner_can_cancel_their_own_alteration()
    {
        $alter_log = $this->ownedAlterLog();
        if (!$alter_log) $this->markTestSkipped('no AlterLog with an owning user in test DB');
        $this->be($alter_log->user);

        $out = $this->repo->cancel($alter_log->id);

        $this->assertSame(get_constant('REQUEST_STATUS.canceled'), $out->status);
    }

    /** @test cancelling an alteration that is not in the database is reported, not swallowed */
    public function cancelling_an_unknown_alteration_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->cancel(-1);
    }

    // ═══════════════════════════════════════════════════════════════ update() / destroy() / find()

    /** @test updating an alteration that is not in the database rolls back and rethrows */
    public function updating_an_unknown_alteration_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->update(['date' => '2026-07-10'], -1);
    }

    /** @test deleting an alteration that is not in the database rolls back and rethrows */
    public function deleting_an_unknown_alteration_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->destroy(-1);
    }

    /** @test the owner can soft-delete their own alteration */
    public function the_owner_can_soft_delete_their_own_alteration()
    {
        $alter_log = $this->ownedAlterLog();
        if (!$alter_log) $this->markTestSkipped('no AlterLog with an owning user in test DB');
        $this->be($alter_log->user);

        $this->assertTrue($this->repo->destroy($alter_log->id));
        $this->assertNull(AlterLog::find($alter_log->id));
        $this->assertTrue(AlterLog::withTrashed()->find($alter_log->id)->trashed());
    }

    /** @test the owner can read back their own alteration */
    public function the_owner_can_read_back_their_own_alteration()
    {
        $alter_log = $this->ownedAlterLog();
        if (!$alter_log) $this->markTestSkipped('no AlterLog with an owning user in test DB');
        $this->be($alter_log->user);

        $this->assertEquals($alter_log->id, $this->repo->find($alter_log->id)->id);
    }

    /**
     * DEFECT (FINDING_AL_FIND_NULL): find() calls AlterLog::find($id) and then reads ->user_id off
     * the result without checking for null, so a missing id raises an error inside the try instead
     * of returning null. The assertion below pins the CURRENT behaviour (an exception reaches the
     * caller). When the null check is added this test fails, which is the signal to flip it to
     * assertNull().
     *
     * @test reading an alteration that is not in the database raises instead of returning null
     */
    public function reading_an_unknown_alteration_raises_instead_of_returning_null_FINDING_AL_FIND_NULL()
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

    // ═══════════════════════════════════════════════════════════════════ where()  (was 50%)

    /** Ids of the resources a where() call returned. */
    private function idsOf($resourceCollection)
    {
        $ids = [];
        foreach ($resourceCollection->collection as $row) {
            $ids[] = (int) $row->id;
        }
        return $ids;
    }

    /** @test show_owned restricts the list to the signed-in employee's own alterations */
    public function show_owned_restricts_the_list_to_the_callers_own_alterations()
    {
        $alter_log = $this->ownedAlterLog();
        if (!$alter_log) $this->markTestSkipped('no AlterLog with an owning user in test DB');
        $this->be($alter_log->user);

        $ids = $this->idsOf($this->repo->where(['show_owned' => true]));

        $this->assertContains((int) $alter_log->id, $ids);           // the caller's own row is in
        $this->assertCount(AlterLog::where('user_id', $alter_log->user_id)->count(), $ids);
    }

    /** @test a status filter narrows the owned list to that status only */
    public function a_status_filter_narrows_the_owned_list_to_that_status_only()
    {
        $alter_log = $this->ownedAlterLog();
        if (!$alter_log) $this->markTestSkipped('no AlterLog with an owning user in test DB');
        $this->be($alter_log->user);

        // pin the probe row to a known status so the filter has something to include and exclude
        $this->repo->cancel($alter_log->id);

        $canceled = $this->repo->where([
            'show_owned'     => true,
            'request_status' => get_constant('REQUEST_STATUS.canceled'),
        ]);
        $pending = $this->repo->where([
            'show_owned'     => true,
            'request_status' => get_constant('REQUEST_STATUS.pending'),
        ]);

        $this->assertContains((int) $alter_log->id, $this->idsOf($canceled));
        $this->assertNotContains((int) $alter_log->id, $this->idsOf($pending));
        foreach ($canceled->collection as $row) {
            $this->assertSame(get_constant('REQUEST_STATUS.canceled'), $row->status);
        }
    }

    /** @test both dates supplied filters on the closed range, one date supplied filters open-ended */
    public function the_three_date_filter_arms_each_bound_the_list_differently()
    {
        $alter_log = $this->ownedAlterLog();
        if (!$alter_log) $this->markTestSkipped('no AlterLog with an owning user in test DB');
        $this->be($alter_log->user);

        $on    = (string) $alter_log->date;
        $after = date('Y-m-d', strtotime($on . ' +1 day'));
        $prior = date('Y-m-d', strtotime($on . ' -1 day'));

        // both ends -> BETWEEN: the row's own date is inside the range, and outside a later one
        $inside  = $this->idsOf($this->repo->where(
            ['show_owned' => true, 'valid_from' => $prior, 'valid_to' => $after]
        ));
        $outside = $this->idsOf($this->repo->where(
            ['show_owned' => true, 'valid_from' => $after, 'valid_to' => $after]
        ));
        $this->assertContains((int) $alter_log->id, $inside);
        $this->assertNotContains((int) $alter_log->id, $outside);

        // start only -> date >=
        $this->assertContains((int) $alter_log->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_from' => $on])));
        $this->assertNotContains((int) $alter_log->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_from' => $after])));

        // end only -> date <=
        $this->assertContains((int) $alter_log->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_to' => $on])));
        $this->assertNotContains((int) $alter_log->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_to' => $prior])));
    }

    /** @test the free-text user filter matches on the numeric user id */
    public function the_user_filter_matches_on_the_numeric_user_id()
    {
        $alter_log = $this->ownedAlterLog();
        if (!$alter_log) $this->markTestSkipped('no AlterLog with an owning user in test DB');
        $this->be($alter_log->user);

        // an emp_num of 0 would be matched by the non-numeric probe below once MySQL coerces it
        if ((string) $alter_log->user->emp_num === '0') {
            $this->markTestSkipped('owner employee number is 0 — the no-match probe cannot be trusted');
        }

        $mine    = $this->idsOf($this->repo->where(['show_owned' => true, 'user' => $alter_log->user_id]));
        $nobody  = $this->idsOf($this->repo->where(['show_owned' => true, 'user' => 'zzq-no-such-employee']));

        $this->assertContains((int) $alter_log->id, $mine);
        $this->assertCount(AlterLog::where('user_id', $alter_log->user_id)->count(), $mine);
        $this->assertSame([], $nobody);                              // matches no name, e-mail or number
    }

    /** @test a database failure while listing alterations reaches the caller */
    public function a_database_failure_while_listing_alterations_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () {
            return $this->repo->where(['show_owned' => true]);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════ store()

    /** @test a database failure while storing an alteration rolls back and reaches the caller */
    public function a_database_failure_while_storing_an_alteration_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () use ($user) {
            return $this->repo->store([
                'user_id'          => $user->id,
                'date'             => '2026-07-10',
                'current_time_in'  => '2026-07-10 08:00:00',
                'current_time_out' => '2026-07-10 17:00:00',
                'new_time_in'      => '2026-07-10 07:30:00',
                'new_time_out'     => '2026-07-10 17:30:00',
                'employee_note'    => 'dead-connection probe',
            ]);
        });
    }
}
