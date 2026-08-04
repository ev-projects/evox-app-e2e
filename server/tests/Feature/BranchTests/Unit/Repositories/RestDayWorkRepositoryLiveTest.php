<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\EvoxLevels;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Repositories\RestDayWorkRepository;
use App\Modules\User\Models\User;

/**
 * REAL RestDayWorkRepository (Menu=Requests Page=RestDayWork Actions=store/update/where/approve/
 * decline/destroy/find/pending/cancel). File was 48.3% covered (76 uncovered lines) — the branch
 * tests mock this repo at the controller seam, so its body never ran.
 *
 * No stored procedures in any path (verified). All writes roll back via DatabaseTransactions
 * (inner commits are savepoint releases). where() is a parameterized read.
 * Auth routing identical to ChangeScheduleRepositoryLiveTest: owner fast-path for
 * update/destroy/find/cancel; Admin/DivisionHead/Department Head level short-circuit for
 * approve/decline; Admin level only for approve-with-data (see BUG-078 note there).
 */
class RestDayWorkRepositoryLiveTest extends TestCase
{
    use DatabaseTransactions;

    /** @var RestDayWorkRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new RestDayWorkRepository();
    }

    private function payload(array $overrides = [])
    {
        return array_merge([
            'date'          => '2026-07-10',
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
            'employee_note' => 'rdw live note',
        ], $overrides);
    }

    private function ownedRdw()
    {
        return RestDayWork::whereHas('user')->orderBy('id', 'desc')->first();
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
    public function store_converts_times_and_defaults_user_to_auth()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $rdw = $this->repo->store($this->payload());

        $this->assertSame($user->id, $rdw->user_id);            // user_id fallback arm
        $this->assertSame('2026-07-10', (string) $rdw->date);
        $this->assertIsNumeric($rdw->start_time);               // time_to_seconds conversion arms
        $this->assertIsNumeric($rdw->break_time);
        $this->assertSame('rdw live note', $rdw->employee_note);
        $this->assertSame($user->id, $rdw->created_by);
    }

    /** @test */
    public function store_zeroes_times_and_accepts_explicit_user_id()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $rdw = $this->repo->store([
            'user_id' => $user->id,                              // explicit user_id arm
            'date'    => '2026-07-11',
        ]);

        $this->assertSame($user->id, $rdw->user_id);
        $this->assertEquals(0, $rdw->start_time);                // is_valid-fallback zero arms
        $this->assertEquals(0, $rdw->end_time);
        $this->assertEquals(0, $rdw->break_time);
        $this->assertNull($rdw->employee_note);
    }

    // ---------------------------------------------------------------------- update()
    /** @test */
    public function update_as_owner_rewrites_row_and_resets_to_pending()
    {
        $rdw = $this->ownedRdw();
        if (!$rdw) $this->markTestSkipped('no RestDayWork with user in test DB');
        $this->be($rdw->user);

        // 23:30 start pushes the optimized timestamp across midnight for positive-offset
        // countries, exercising the optimze_rest_day() arm where live data allows
        $out = $this->repo->update($this->payload([
            'start_time'    => '23:30',
            'end_time'      => '23:45',
            'employee_note' => 'updated rdw note',
            'approver_note' => 'rdw approver note',
        ]), $rdw->id);

        $this->assertSame('updated rdw note', $out->employee_note);
        $this->assertSame('rdw approver note', $out->approver_note);
        $this->assertSame($rdw->user->id, $out->updated_by);
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $out->status);
    }

    /** @test */
    public function update_keeps_notes_when_payload_omits_them()
    {
        $rdw = $this->ownedRdw();
        if (!$rdw) $this->markTestSkipped('no RestDayWork with user in test DB');
        $this->be($rdw->user);
        $originalNote = $rdw->employee_note;

        $out = $this->repo->update(['date' => '2026-07-12'], $rdw->id);

        $this->assertSame($originalNote, $out->employee_note);   // fallback arm
        $this->assertEquals(0, $out->start_time);                // times zeroed when omitted
    }

    // ----------------------------------------------------------------------- where()
    /** @test */
    public function where_supports_every_filter_combination()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        // both dates + status + department + user + show_owned (all arms at once)
        $all = $this->repo->where([
            'valid_from'     => '2026-01-01',
            'valid_to'       => '2026-12-31',
            'request_status' => get_constant('REQUEST_STATUS.pending'),
            'department_id'  => $user->department_id ?: 1,
            'user'           => $user->id,
            'show_owned'     => true,
        ]);
        $this->assertNotNull($all);

        // single-sided date arms
        $from = $this->repo->where(['valid_from' => '2026-01-01', 'show_owned' => true]);
        $to   = $this->repo->where(['valid_to' => '2026-12-31', 'show_owned' => true]);
        $this->assertNotNull($from);
        $this->assertNotNull($to);

        // empty parameter arm (1=1 only) still bounded: show_owned keeps it to the auth user
        $owned = $this->repo->where(['show_owned' => true]);
        $this->assertNotNull($owned);
    }

    // ----------------------------------------------------------- approve() / decline()
    /** @test */
    public function approve_with_empty_data_sets_status_approved()
    {
        $approver = $this->approverUser();
        $rdw = $this->ownedRdw();
        if (!$approver || !$rdw) $this->markTestSkipped('missing approver-level user or RestDayWork fixture');
        $this->be($approver);

        $out = $this->repo->approve([], $rdw->id);

        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $out->status);
        $this->assertSame($approver->id, $out->updated_by);
    }

    /** @test */
    public function approve_with_data_runs_inner_update_via_instanceof_arm()
    {
        $adminLevelIds = EvoxLevels::where('Name', 'Admin')->pluck('LevelId');
        $approver = $adminLevelIds->isEmpty() ? null
            : User::whereIn('LevelId', $adminLevelIds)->where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$approver) $this->markTestSkipped('no Admin-level user in test DB');
        $rdw = RestDayWork::whereHas('user', function ($q) {
                $q->whereNotNull('bhr_num');
            })->orderBy('id', 'desc')->first();
        if (!$rdw) $this->markTestSkipped('no RestDayWork owned by a bhr-numbered user');
        $this->be($approver);

        $out = $this->repo->approve($this->payload(['approver_note' => 'rdw approved+updated']), $rdw->id);

        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $out->status);
        $this->assertSame('rdw approved+updated', $out->fresh()->approver_note);
    }

    /** @test */
    public function decline_with_empty_data_sets_status_declined()
    {
        $approver = $this->approverUser();
        $rdw = $this->ownedRdw();
        if (!$approver || !$rdw) $this->markTestSkipped('missing approver-level user or RestDayWork fixture');
        $this->be($approver);

        $out = $this->repo->decline([], $rdw->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);
    }

    // ------------------------------------------------- destroy() / find() / pending() / cancel()
    /** @test */
    public function destroy_as_owner_soft_deletes_and_returns_true()
    {
        $rdw = $this->ownedRdw();
        if (!$rdw) $this->markTestSkipped('no RestDayWork with user in test DB');
        $this->be($rdw->user);

        $this->assertTrue($this->repo->destroy($rdw->id));
        $this->assertTrue(RestDayWork::withTrashed()->find($rdw->id)->trashed());
    }

    /** @test */
    public function find_pending_cancel_as_owner()
    {
        $rdw = $this->ownedRdw();
        if (!$rdw) $this->markTestSkipped('no RestDayWork with user in test DB');
        $this->be($rdw->user);

        $this->assertEquals($rdw->id, $this->repo->find($rdw->id)->id);

        $out = $this->repo->pending($rdw->id);
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $out->status);

        $out = $this->repo->cancel($rdw->id);
        $this->assertSame(get_constant('REQUEST_STATUS.canceled'), $out->status);
    }

    /** @test */
    public function update_throws_model_not_found_for_missing_id()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        $this->repo->update($this->payload(), -1);
    }
}
