<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Repositories/ChangeScheduleRepository.php
 *     destroy, find, approve, decline, where
 *
 * MENU PATH
 *   Requests -> My Requests / My Team Requests -> Change Schedule (change_schedules)
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   update 95 | destroy 92.86 | find 87.5 | approve 66.67 | decline 58.33 | where 50
 *   ChangeScheduleRepositoryLiveTest already covers store (including CS-TRIG-1), the owner update
 *   arms, approve with and without a payload, decline WITHOUT a payload, destroy, find, pending,
 *   cancel and update() against a missing id. Everything it leaves behind is here: the decline
 *   "approver edited the schedule" arm, the rethrow arms of approve/decline/destroy, the null-model
 *   arm of find(), and every filter arm of where() — which had only ever run with no filters.
 *
 * FINDINGS
 *   FINDING_CS_FIND_NULL — find() reads ->user_id off the result of ChangeSchedule::find() with no
 *     null check; an unknown id raises inside the try and is rethrown instead of returning null.
 *
 * OBSERVATION (not filed as a defect)
 *   where() compares BOTH date filters against change_schedules.valid_from — the valid_to filter
 *   bounds the START of the request, never its end. A request that starts before the window but
 *   runs into it is therefore not listed. The tests below assert that behaviour as written, since
 *   "requests STARTING in this window" is a defensible reading of the filter.
 *
 * SAFETY
 *   DatabaseTransactions. No stored procedure on any path: approve/decline with a payload use an
 *   Admin-level approver, whose users_handled() is a bounded whereNotNull('bhr_num') query rather
 *   than the SP-backed employee list the Head levels use. Every where() call carries show_owned.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use App\EvoxLevels;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Repositories\ChangeScheduleRepository;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\Feature\BranchTests\Support\DeadConnectionTrait;
use Tests\TestCase;

class ChangeScheduleRepositoryCompleteTest extends TestCase
{
    use DatabaseTransactions, DeadConnectionTrait;

    /** @var ChangeScheduleRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new ChangeScheduleRepository();
    }

    /** ScheduleRepository::update() reads these keys directly — they are not optional. */
    private function schedulePayload(array $overrides = [])
    {
        return array_merge([
            'name'              => 'CS Complete Schedule',
            'source_type'       => 'change_schedule',
            'schedule_type'     => 'standard',
            'valid_from'        => '2026-07-01',
            'valid_to'          => '2026-07-02',
            'work_days'         => array_slice(get_constant('DAYS'), 0, 5),
            'schedule_details'  => ['all' => ['start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '00:30']],
            'schedule_policies' => [],
        ], $overrides);
    }

    private function ownedCs()
    {
        return ChangeSchedule::whereHas('user')->whereHas('schedule')->orderBy('id', 'desc')->first();
    }

    private function approverUser()
    {
        $levelIds = EvoxLevels::whereIn('Name', ['Admin', 'DivisionHead', 'Department Head'])->pluck('LevelId');
        if ($levelIds->isEmpty()) return null;

        return User::whereIn('LevelId', $levelIds)->where('is_active', 1)->orderBy('id', 'desc')->first();
    }

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

    private function idsOf($resourceCollection)
    {
        $ids = [];
        foreach ($resourceCollection->collection as $row) {
            $ids[] = (int) $row->id;
        }
        return $ids;
    }

    // ═══════════════════════════════════════════════════════════ decline() with a payload

    /** @test declining while editing the request saves the approver note, then declines */
    public function declining_with_a_payload_saves_the_approver_note_before_declining()
    {
        $admin = $this->adminUser();
        if (!$admin) $this->markTestSkipped('no Admin-level user in test DB');
        // the Admin-level users_handled() filters on bhr_num, so the owner must carry one
        $cs = ChangeSchedule::whereHas('user', function ($q) { $q->whereNotNull('bhr_num'); })
            ->whereHas('schedule')->orderBy('id', 'desc')->first();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule owned by a bhr-numbered user');
        $this->be($admin);

        $out = $this->repo->decline($this->schedulePayload([
            'approver_note' => 'declined - clashes with the client coverage window',
        ]), $cs->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);
        $this->assertSame(
            'declined - clashes with the client coverage window',
            ChangeSchedule::find($cs->id)->approver_note
        );
        $this->assertSame('2026-07-01', (string) ChangeSchedule::find($cs->id)->valid_from);
        $this->assertSame($admin->id, ChangeSchedule::find($cs->id)->updated_by);
    }

    // ═══════════════════════════════════════════════════════════════════ rethrow arms

    /** @test approving a change schedule that is not in the database rolls back and rethrows */
    public function approving_an_unknown_change_schedule_rethrows_to_the_caller()
    {
        $approver = $this->approverUser();
        if (!$approver) $this->markTestSkipped('no approver-level user in test DB');
        $this->be($approver);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->approve([], -1);
    }

    /** @test declining a change schedule that is not in the database rolls back and rethrows */
    public function declining_an_unknown_change_schedule_rethrows_to_the_caller()
    {
        $approver = $this->approverUser();
        if (!$approver) $this->markTestSkipped('no approver-level user in test DB');
        $this->be($approver);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->decline([], -1);
    }

    /** @test deleting a change schedule that is not in the database rolls back and rethrows */
    public function deleting_an_unknown_change_schedule_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->destroy(-1);
    }

    /**
     * DEFECT (FINDING_CS_FIND_NULL): find() dereferences a null model. Pinned to current behaviour —
     * flip to assertNull() once the guard lands.
     *
     * @test reading a change schedule that is not in the database raises instead of returning null
     */
    public function reading_an_unknown_change_schedule_raises_instead_of_returning_null_FINDING_CS_FIND_NULL()
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

    /** @test show_owned restricts the list to the signed-in employee's own change schedules */
    public function show_owned_restricts_the_list_to_the_callers_own_change_schedules()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        $this->be($cs->user);

        $ids = $this->idsOf($this->repo->where(['show_owned' => true]));

        $this->assertContains((int) $cs->id, $ids);
        $this->assertCount(ChangeSchedule::where('user_id', $cs->user_id)->count(), $ids);
    }

    /** @test a status filter narrows the owned list to that status only */
    public function a_status_filter_narrows_the_owned_list_to_that_status_only()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        $this->be($cs->user);

        $this->repo->cancel($cs->id);                                // pin the probe row's status

        $canceled = $this->repo->where([
            'show_owned' => true, 'request_status' => get_constant('REQUEST_STATUS.canceled'),
        ]);
        $pending = $this->repo->where([
            'show_owned' => true, 'request_status' => get_constant('REQUEST_STATUS.pending'),
        ]);

        $this->assertContains((int) $cs->id, $this->idsOf($canceled));
        $this->assertNotContains((int) $cs->id, $this->idsOf($pending));
    }

    /** @test the date filters bound the START date of the request in all three arms */
    public function the_three_date_filter_arms_each_bound_the_requests_start_date()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        if (!$cs->valid_from) $this->markTestSkipped('probe ChangeSchedule has no valid_from');
        $this->be($cs->user);

        $on    = (string) $cs->valid_from;
        $after = date('Y-m-d', strtotime($on . ' +1 day'));
        $prior = date('Y-m-d', strtotime($on . ' -1 day'));

        // both ends -> BETWEEN on valid_from
        $this->assertContains((int) $cs->id, $this->idsOf($this->repo->where(
            ['show_owned' => true, 'valid_from' => $prior, 'valid_to' => $after]
        )));
        $this->assertNotContains((int) $cs->id, $this->idsOf($this->repo->where(
            ['show_owned' => true, 'valid_from' => $after, 'valid_to' => $after]
        )));

        // start only -> valid_from >=
        $this->assertContains((int) $cs->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_from' => $on])));
        $this->assertNotContains((int) $cs->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_from' => $after])));

        // end only -> valid_from <= (see the OBSERVATION in the file header)
        $this->assertContains((int) $cs->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_to' => $on])));
        $this->assertNotContains((int) $cs->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_to' => $prior])));
    }

    /** @test the free-text user filter matches on the numeric user id */
    public function the_user_filter_matches_on_the_numeric_user_id()
    {
        $cs = $this->ownedCs();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule with user+schedule in test DB');
        if ((string) $cs->user->emp_num === '0') {
            $this->markTestSkipped('owner employee number is 0 — the no-match probe cannot be trusted');
        }
        $this->be($cs->user);

        $mine   = $this->idsOf($this->repo->where(['show_owned' => true, 'user' => $cs->user_id]));
        $nobody = $this->idsOf($this->repo->where(['show_owned' => true, 'user' => 'zzq-no-such-employee']));

        $this->assertContains((int) $cs->id, $mine);
        $this->assertSame([], $nobody);
    }

    /** @test a database failure while listing change schedules reaches the caller */
    public function a_database_failure_while_listing_change_schedules_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () {
            return $this->repo->where(['show_owned' => true]);
        });
    }
}
