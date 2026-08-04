<?php
// HAPPY-PATH test — Team Create. Uses real, verified-eligible ids from the staging dump:
// department 179, handler user 39 (not already a team member), team members 21 & 27
// (both department_id=179, neither already in team_users — required by TeamRequest's
// global one-team-per-user uniqueness + department-match rule). Avoids the messages()
// 500-crash bug documented in matrices/team.md (that bug only fires on a REJECTED
// request with missing/invalid team_users; this payload is fully valid so it never
// reaches that code path). DatabaseTransactions rolls back — safe on the disposable DB.

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

class TeamHappyPathTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestIncomplete('no user available in test DB');
        }

        // Re-verify eligibility at run time rather than trusting hardcoded ids blindly —
        // if the dump has changed, skip cleanly instead of false-failing.
        $alreadyTeamed = DB::table('team_users')->whereIn('user_id', [21, 27])->exists();
        $deptOk = DB::table('users')->whereIn('id', [21, 27])->where('department_id', 179)->count() === 2;
        if ($alreadyTeamed || !$deptOk) {
            $this->markTestIncomplete('fixture users 21/27 no longer eligible (already teamed or department changed) — re-pick from a fresh dump');
        }
    }

    /** @test */
    public function creates_a_team_and_syncs_handlers_and_members()
    {
        $name = 'HappyPath Team ' . time();

        $payload = [
            'name' => $name,
            'department_id' => 179,
            'team_handlers' => [39],
            'team_users' => [21, 27],
        ];

        $response = $this->actingAs($this->user)->postJson('/api/team/', $payload);

        $response->assertStatus(200);

        $teamId = DB::table('teams')->where('name', $name)->value('id');
        $this->assertNotNull($teamId, 'teams row was not written');

        $this->assertDatabaseHas('teams', ['id' => $teamId, 'department_id' => 179]);
        $this->assertDatabaseHas('team_handlers', ['team_id' => $teamId, 'user_id' => 39]);
        $this->assertDatabaseHas('team_users', ['team_id' => $teamId, 'user_id' => 21]);
        $this->assertDatabaseHas('team_users', ['team_id' => $teamId, 'user_id' => 27]);
    }
}
