<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Repositories/RestDayWorkRepository.php
 *     store, update, destroy, find, where, decline
 *
 * MENU PATH
 *   Requests -> My Requests / My Team Requests -> Rest Day Work (rest_day_works)
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   store 78.95 | update 92 | destroy 92.86 | find 87.5 | where 91.18 | decline 91.67
 *   RestDayWorkRepositoryLiveTest covers both store arms, the owner update arms, every where()
 *   filter, approve with and without a payload, decline WITHOUT a payload, destroy, find, pending,
 *   cancel and update() against a missing id. What is left is the failure side of each method plus
 *   the decline "approver edited the request" arm.
 *
 * FINDINGS
 *   FINDING_RDW_FIND_NULL — find() reads ->user_id off the result of RestDayWork::find() with no
 *     null check; an unknown id raises inside the try and is rethrown instead of returning null.
 *     Same shape as FINDING_AL_FIND_NULL / FINDING_CS_FIND_NULL / FINDING_ALP_FIND_NULL: four of
 *     the five request repositories share the defect, OvertimeRepository::find() does not.
 *
 * OBSERVATION (not filed as a defect — not reachable from the UI)
 *   update() only calls optimze_rest_day() when the request date differs from the timestamp it
 *   rebuilds from date + start_time + the OWNER's UTC offset. When the owner edits their own
 *   request, time_to_seconds() subtracted the SAME offset moments earlier, so the two always agree
 *   and the branch cannot fire. It can only fire when the acting user's country offset differs
 *   from the owner's, i.e. a cross-country approver — which no fixture in this database guarantees.
 *
 * SAFETY
 *   DatabaseTransactions. No stored procedure on any path: the decline-with-payload arm uses an
 *   Admin-level approver, whose users_handled() is a bounded whereNotNull('bhr_num') query.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use App\EvoxLevels;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Repositories\RestDayWorkRepository;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\Feature\BranchTests\Support\DeadConnectionTrait;
use Tests\TestCase;

class RestDayWorkRepositoryCompleteTest extends TestCase
{
    use DatabaseTransactions, DeadConnectionTrait;

    /** @var RestDayWorkRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new RestDayWorkRepository();
    }

    private function ownedRdw()
    {
        return RestDayWork::whereHas('user')->orderBy('id', 'desc')->first();
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

    // ═══════════════════════════════════════════════════════════ decline() with a payload

    /** @test declining while editing the hours saves the edit, then marks the request declined */
    public function declining_with_a_payload_saves_the_edit_before_declining()
    {
        $admin = $this->adminUser();
        if (!$admin) $this->markTestSkipped('no Admin-level user in test DB');
        // the Admin-level users_handled() filters on bhr_num, so the owner must carry one
        $rdw = RestDayWork::whereHas('user', function ($q) { $q->whereNotNull('bhr_num'); })
            ->orderBy('id', 'desc')->first();
        if (!$rdw) $this->markTestSkipped('no RestDayWork owned by a bhr-numbered user');
        $this->be($admin);

        $out = $this->repo->decline([
            'date'          => (string) $rdw->date,          // keep the date: update() nulls it if omitted
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
            'approver_note' => 'declined - the rest day was not worked',
        ], $rdw->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);

        $saved = RestDayWork::find($rdw->id);
        $this->assertSame('declined - the rest day was not worked', $saved->approver_note);
        $this->assertSame(3600, $saved->break_time);                 // 01:00 converted to seconds
        $this->assertSame($admin->id, $saved->updated_by);
    }

    // ═══════════════════════════════════════════════════════════════════ rethrow arms

    /** @test declining a rest day work request that is not in the database rolls back and rethrows */
    public function declining_an_unknown_rest_day_work_rethrows_to_the_caller()
    {
        $admin = $this->adminUser();
        if (!$admin) $this->markTestSkipped('no Admin-level user in test DB');
        $this->be($admin);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->decline([], -1);
    }

    /** @test approving a rest day work request that is not in the database rolls back and rethrows */
    public function approving_an_unknown_rest_day_work_rethrows_to_the_caller()
    {
        $admin = $this->adminUser();
        if (!$admin) $this->markTestSkipped('no Admin-level user in test DB');
        $this->be($admin);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->approve([], -1);
    }

    /** @test deleting a rest day work request that is not in the database rolls back and rethrows */
    public function deleting_an_unknown_rest_day_work_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->destroy(-1);
    }

    /**
     * DEFECT (FINDING_RDW_FIND_NULL): find() dereferences a null model. Pinned to current
     * behaviour — flip to assertNull() once the guard lands.
     *
     * @test reading a rest day work request that is not in the database raises instead of returning null
     */
    public function reading_an_unknown_rest_day_work_raises_instead_of_returning_null_FINDING_RDW_FIND_NULL()
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

    // ═══════════════════════════════════════════════════════ database-failure rethrow arms

    /** @test a database failure while storing a rest day work request rolls back and reaches the caller */
    public function a_database_failure_while_storing_a_rest_day_work_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () use ($user) {
            return $this->repo->store([
                'user_id'       => $user->id,
                'date'          => '2026-07-10',
                'start_time'    => '08:00',
                'end_time'      => '17:00',
                'break_time'    => '01:00',
                'employee_note' => 'dead-connection probe',
            ]);
        });
    }

    /** @test a database failure while listing rest day work requests reaches the caller */
    public function a_database_failure_while_listing_rest_day_work_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () {
            return $this->repo->where(['show_owned' => true]);
        });
    }

    /** @test a database failure while reading a rest day work request reaches the caller */
    public function a_database_failure_while_reading_a_rest_day_work_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () {
            return $this->repo->find(1);
        });
    }
}
