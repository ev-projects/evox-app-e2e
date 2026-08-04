<?php
// DEEPER validation — Team CONTROLLER / BUSINESS / DB-layer rules (beyond the FormRequest
// datatype layer in TeamValidationRejectionTest, which already exercises the one-team-per-user
// and department-match business rules via the User model). This file re-derives the colliding
// row with a RAW DB::table read (independent of the User/Team model scoping) and wraps every
// rejection with before/after row-count invariants on `teams` and `team_users`, proving
// TeamRepository::store() genuinely never runs — the actual DB-layer guarantee.
//
// The `messages()` foreach(null) 500-crash bug (see matrices/team.md) is already captured as
// its own asserting test in TeamValidationRejectionTest::missing_team_users_crashes_instead_of_
// rejecting_cleanly — not duplicated here to avoid two tests asserting the same crash.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;

class TeamBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;
    private $department;
    private $existingUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        $this->department = Department::first();
        $this->existingUser = User::where('is_active', 1)->whereNotNull('department_id')->first();
        if (!$this->user || !$this->department || !$this->existingUser) {
            $this->markTestIncomplete('no user/department available in test DB');
        }
    }

    private function postTeam(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/team/', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'name'          => 'Reject Test Team',
            'department_id' => $this->department->id,
            'team_handlers' => [$this->existingUser->id],
            'team_users'    => [$this->existingUser->id],
        ], $override);
    }

    private function counts()
    {
        return [DB::table('teams')->count(), DB::table('team_users')->count()];
    }

    /** @test — Rule::unique('team_users','user_id') is global (one team per user); collide via
     *  a RAW read of an existing team_users row (independent data source from the shallow
     *  suite) and prove zero teams/team_users rows are written. */
    public function rejects_user_already_on_a_team_via_raw_db_row_and_writes_nothing()
    {
        $existing = DB::table('team_users')->first();
        if (!$existing) { $this->markTestIncomplete('no existing team_users row to collide with'); }

        $before = $this->counts();
        $this->postTeam($this->base(['team_users' => [$existing->user_id]]))->assertStatus(422);
        $after = $this->counts();

        $this->assertSame($before, $after, 'a rejected team create must not write teams/team_users rows');
    }

    /** @test — department-match rule; same DB-layer proof. */
    public function rejects_user_from_different_department_and_writes_nothing()
    {
        $otherDeptUser = User::where('is_active', 1)
            ->whereNotNull('department_id')
            ->where('department_id', '!=', $this->department->id)
            ->first();
        if (!$otherDeptUser) { $this->markTestIncomplete('no user in a different department to test the department-match rule'); }

        $before = $this->counts();
        $this->postTeam($this->base(['team_users' => [$otherDeptUser->id]]))->assertStatus(422);
        $after = $this->counts();

        $this->assertSame($before, $after, 'a rejected team create must not write teams/team_users rows');
    }
}
