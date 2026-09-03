<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Team/Repositories/TeamRepository.php — all(), list_via_department(),
 *   list_via_team_handler(), find(), store(), update(), destroy() and every catch(Exception) arm.
 *
 * MENU PATH   My Team -> Team (GET /api/team/all, GET /api/department/{id}/teams,
 *             GET /api/user/{id}/teams_handled, POST /api/team/, PUT /api/team/{id},
 *             DELETE /api/team/{id}).
 *
 * WHY THE REPOSITORY AND NOT THE ROUTE: TeamRequest enforces one-team-per-user across the WHOLE
 * team_users table plus a department match, so a route-level write test can only run when the dump
 * happens to contain an unteamed user in a department that already has a team — that is what makes
 * TeamHappyPathTest skip so often. update() had 0% coverage as a result. The repository is the unit
 * that carries the rules being asserted here (strip_tags, audit columns, sync semantics, rollback),
 * and every fixture below is created and torn down by this suite.
 *
 * FAILURE INJECTION: Team::creating / ::updating / ::deleting listeners throw, standing in for the
 * database refusing a write mid-transaction. Version-independent (identical on PHP 7.4 and 8.x) and
 * scoped to the test's own application instance.
 *
 * SAFETY: DatabaseTransactions; fixture users are chosen with bounded ->first()/limit(2) probes and
 * are only ever attached to THIS suite's team, so no existing team membership is disturbed. No SP,
 * no external call, no DDL. all() reads the whole (small) teams table because that is literally
 * what the method does — it is the method under test, not an incidental scan.
 *
 * FINDINGS
 *   FINDING BE-TEAM-DESTROY-AUDIT  destroy() (TeamRepository.php:155) assigns
 *     $team->updated_by = auth()->user()->id and then calls $team->delete() without saving. Laravel's
 *     SoftDeletes::runSoftDelete() writes ONLY deleted_at and updated_at, so the dirty updated_by is
 *     discarded: the teams row records WHEN it was deleted but never WHO deleted it. Contrast
 *     ScheduleRepository::destroy(), which calls $schedule->update() first and does persist it.
 *     Characterised by destroy__does_not_record_who_deleted_the_team_FINDING_BE_TEAM_DESTROY_AUDIT.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Exception;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\Team\Models\Team;
use App\Modules\Team\Repositories\TeamRepository;
use App\Modules\User\Models\User;

class TeamRepositoryCompleteTest extends TestCase
{
    use DatabaseTransactions;

    const INJECTED = 'injected storage failure';
    const MISSING_ID = 999999999;

    /** @var TeamRepository */
    private $repo;

    /** @var User */
    private $user;

    /** @var array two active users who belong to no team yet */
    private $members = [];

    /** @var array two active users used as team handlers */
    private $handlers = [];

    /** @var int */
    private $departmentId;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new TeamRepository();

        $this->user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user in test DB');
        }
        $this->be($this->user);

        $this->departmentId = DB::table('departments')->orderBy('id')->value('id');
        if (!$this->departmentId) {
            $this->markTestSkipped('departments table is empty in test DB');
        }

        // Members must not already sit in a team: team membership is meant to be exclusive, and
        // attaching a teamed user would corrupt an assertion (and possibly a unique index).
        // whereNotNull inside the subquery guards the NOT IN () / NULL trap.
        $this->members = User::where('is_active', 1)
            ->whereNotIn('id', function ($q) {
                $q->select('user_id')->from('team_users')->whereNotNull('user_id');
            })
            ->orderBy('id', 'desc')
            ->limit(2)
            ->get()
            ->all();

        $this->handlers = User::where('is_active', 1)
            ->orderBy('id', 'asc')
            ->limit(2)
            ->get()
            ->all();

        if (count($this->members) < 2 || count($this->handlers) < 2) {
            $this->markTestSkipped('need two unteamed users and two active users as fixtures');
        }
    }

    private function payload(array $overrides = [])
    {
        return array_merge([
            'name'          => 'ZZ Team Repo ' . uniqid(),
            'department_id' => $this->departmentId,
            'team_handlers' => [$this->handlers[0]->id],
            'team_users'    => [$this->members[0]->id],
        ], $overrides);
    }

    /** A team row written directly, so store()'s own behaviour stays under test elsewhere. */
    private function makeTeam($name, $editorId = null)
    {
        $team = new Team();
        $team->name          = $name;
        $team->department_id = $this->departmentId;
        $team->created_by    = $editorId ?: $this->user->id;
        $team->updated_by    = $editorId ?: $this->user->id;
        $team->save();

        return $team;
    }

    private function failureFrom(callable $work)
    {
        $caught = null;
        try {
            $work();
        } catch (Exception $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'the repository must re-throw, never swallow, a write failure');

        return $caught;
    }

    // ====================================================================== all()

    /** @test */
    public function every_team_is_listed_in_alphabetical_order()
    {
        $second = $this->makeTeam('ZZ Team Repo BBB ' . uniqid());
        $first  = $this->makeTeam('ZZ Team Repo AAA ' . uniqid());

        $ids = $this->repo->all()->pluck('id')->all();

        $this->assertContains($first->id, $ids);
        $this->assertContains($second->id, $ids);
        $this->assertLessThan(
            array_search($second->id, $ids),
            array_search($first->id, $ids),
            'all() must sort by name, so AAA has to precede BBB regardless of insert order'
        );
    }

    // ====================================================== list_via_department()

    /** @test */
    public function a_department_lists_its_own_teams_and_nothing_else()
    {
        $mine = $this->makeTeam('ZZ Team Repo Dept ' . uniqid());

        $collection = $this->repo->list_via_department($this->departmentId);

        $this->assertContains($mine->id, $collection->pluck('id')->all());
        foreach ($collection as $team) {
            $this->assertEquals($this->departmentId, $team->department_id);
        }
    }

    /** @test */
    public function a_department_with_no_teams_answers_an_empty_list()
    {
        $collection = $this->repo->list_via_department(self::MISSING_ID);

        $this->assertCount(0, $collection);
    }

    // ==================================================== list_via_team_handler()

    /** @test */
    public function a_handler_sees_the_teams_they_handle()
    {
        $team = $this->makeTeam('ZZ Team Repo Handled ' . uniqid());
        $team->team_handlers()->sync([$this->handlers[0]->id]);

        $collection = $this->repo->list_via_team_handler($this->handlers[0]->id);

        $this->assertContains($team->id, $collection->pluck('id')->all());
    }

    /** @test */
    public function an_unknown_employee_handles_no_teams_instead_of_crashing()
    {
        $collection = $this->repo->list_via_team_handler(self::MISSING_ID);

        $this->assertInstanceOf(\Illuminate\Support\Collection::class, $collection);
        $this->assertCount(0, $collection);
    }

    // ===================================================================== find()

    /** @test */
    public function a_team_can_be_fetched_by_id_and_an_unknown_id_answers_null()
    {
        $team = $this->makeTeam('ZZ Team Repo Find ' . uniqid());

        $found = $this->repo->find($team->id);
        $this->assertNotNull($found);
        $this->assertSame($team->name, $found->name);

        $this->assertNull($this->repo->find(self::MISSING_ID));
    }

    // ==================================================================== store()

    /** @test */
    public function creating_a_team_records_the_author_strips_markup_and_syncs_both_rosters()
    {
        $payload = $this->payload([
            'name'          => '<b>ZZ Team Repo Store</b> ' . uniqid(),
            'team_handlers' => [$this->handlers[0]->id, $this->handlers[1]->id],
            'team_users'    => [$this->members[0]->id, $this->members[1]->id],
        ]);

        $team = $this->repo->store($payload);

        $this->assertSame(strip_tags($payload['name']), $team->name);
        $this->assertStringNotContainsString('<b>', $team->name);
        $this->assertEquals($this->departmentId, $team->department_id);
        $this->assertEquals($this->user->id, $team->created_by);
        $this->assertEquals($this->user->id, $team->updated_by);
        $this->assertEqualsCanonicalizing(
            [$this->handlers[0]->id, $this->handlers[1]->id],
            $team->team_handlers()->pluck('users.id')->all()
        );
        $this->assertEqualsCanonicalizing(
            [$this->members[0]->id, $this->members[1]->id],
            $team->team_users()->pluck('users.id')->all()
        );
    }

    /** @test */
    public function a_team_submitted_without_a_name_is_stored_with_no_name_at_all()
    {
        // The repository has no validation of its own: an empty name is written as NULL rather
        // than rejected. TeamRequest is what keeps this off the HTTP surface.
        $team = $this->repo->store($this->payload(['name' => '']));

        $this->assertNull($team->name);
    }

    /** @test */
    public function a_team_that_cannot_be_saved_leaves_no_row_and_no_roster_behind()
    {
        $payload = $this->payload();

        Team::creating(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($payload) {
            $this->repo->store($payload);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());
        $this->assertSame(0, Team::where('name', $payload['name'])->count());
    }

    // =================================================================== update()

    /** @test */
    public function updating_a_team_replaces_both_rosters_and_keeps_the_original_author()
    {
        $author = $this->handlers[1];
        $team = $this->makeTeam('ZZ Team Repo Update ' . uniqid(), $author->id);
        $team->team_handlers()->sync([$this->handlers[1]->id]);
        $team->team_users()->sync([$this->members[1]->id]);

        $updated = $this->repo->update($this->payload([
            'name'          => '<i>ZZ Team Repo Renamed</i>',
            'team_handlers' => [$this->handlers[0]->id],
            'team_users'    => [$this->members[0]->id],
        ]), $team->id);

        $this->assertSame('ZZ Team Repo Renamed', $updated->name);
        $this->assertEquals($this->user->id, $updated->updated_by, 'the editor is recorded');
        $this->assertEquals($author->id, $updated->created_by, 'the author must not be overwritten');

        // sync() is a replace, not an append: the previous handler and member are gone.
        $this->assertSame([$this->handlers[0]->id], $updated->team_handlers()->pluck('users.id')->all());
        $this->assertSame([$this->members[0]->id], $updated->team_users()->pluck('users.id')->all());
    }

    /** @test */
    public function a_failed_update_keeps_the_team_and_its_roster_exactly_as_they_were()
    {
        $team = $this->makeTeam('ZZ Team Repo NoUpdate ' . uniqid());
        $team->team_handlers()->sync([$this->handlers[1]->id]);
        $team->team_users()->sync([$this->members[1]->id]);
        $originalName = $team->name;

        Team::updating(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($team) {
            $this->repo->update($this->payload(['name' => 'ZZ Team Repo Should Not Stick']), $team->id);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());

        $fresh = Team::find($team->id);
        $this->assertNotNull($fresh);
        $this->assertSame($originalName, $fresh->name);
        $this->assertSame([$this->handlers[1]->id], $fresh->team_handlers()->pluck('users.id')->all());
        $this->assertSame([$this->members[1]->id], $fresh->team_users()->pluck('users.id')->all());
    }

    // ================================================================== destroy()

    /** @test */
    public function deleting_a_team_soft_deletes_it_and_clears_both_rosters()
    {
        $team = $this->makeTeam('ZZ Team Repo Destroy ' . uniqid());
        $team->team_handlers()->sync([$this->handlers[0]->id]);
        $team->team_users()->sync([$this->members[0]->id]);
        $id = $team->id;

        $this->repo->destroy($id);

        $this->assertNull(Team::find($id), 'the team must disappear from normal listings');
        $this->assertNotNull(Team::withTrashed()->find($id), 'and must be soft-deleted, not erased');
        $this->assertSame(0, DB::table('team_handlers')->where('team_id', $id)->count());
        $this->assertSame(0, DB::table('team_users')->where('team_id', $id)->count());
    }

    /**
     * FINDING BE-TEAM-DESTROY-AUDIT — destroy() sets updated_by and then soft-deletes without
     * saving, so SoftDeletes writes deleted_at/updated_at only and the "who deleted this team"
     * audit value is silently dropped. This test asserts today's behaviour: the column still holds
     * the previous editor. Flip it to assert the actor's id once destroy() saves before deleting.
     *
     * @test
     */
    public function destroy__does_not_record_who_deleted_the_team_FINDING_BE_TEAM_DESTROY_AUDIT()
    {
        $previousEditor = $this->handlers[1];
        if ($previousEditor->id == $this->user->id) {
            $this->markTestSkipped('fixture editor and acting user must differ to observe the column');
        }

        $team = $this->makeTeam('ZZ Team Repo Audit ' . uniqid(), $previousEditor->id);

        $this->repo->destroy($team->id);

        $row = DB::table('teams')->where('id', $team->id)->first();
        $this->assertNotNull($row->deleted_at, 'the soft delete itself is recorded');
        $this->assertEquals($previousEditor->id, $row->updated_by,
            'today the deleting user is NOT recorded — updated_by keeps the previous editor');
        $this->assertNotEquals($this->user->id, $row->updated_by);
    }

    /** @test */
    public function a_failed_delete_restores_the_team_and_its_roster()
    {
        $team = $this->makeTeam('ZZ Team Repo NoDestroy ' . uniqid());
        $team->team_handlers()->sync([$this->handlers[0]->id]);
        $team->team_users()->sync([$this->members[0]->id]);

        // destroy() detaches both rosters BEFORE deleting the team, so without the rollback a
        // failed delete would leave a live team with nobody in it.
        Team::deleting(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($team) {
            $this->repo->destroy($team->id);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());

        $fresh = Team::find($team->id);
        $this->assertNotNull($fresh, 'the team must survive a failed delete');
        $this->assertSame([$this->handlers[0]->id], $fresh->team_handlers()->pluck('users.id')->all());
        $this->assertSame([$this->members[0]->id], $fresh->team_users()->pluck('users.id')->all());
    }
}
