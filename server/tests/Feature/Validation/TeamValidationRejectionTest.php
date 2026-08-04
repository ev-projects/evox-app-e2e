<?php
// Validation REJECTION tests — Team Create (TeamRequest, shared by store/update). Every case
// sends INVALID data and asserts the FormRequest blocks it (422). A rejected request never
// reaches TeamRepository::store(), so this is safe on the live-dump DB — no team/team_handlers/
// team_users row is written.
//
// CONFIRMED BUG (see matrices/team.md): TeamRequest::messages() unconditionally does
// `foreach (request()->get('team_users') as $key => $value)` while building the error bag,
// whenever ANY rule on the request fails — not just a team_users rule. If `team_users` is
// entirely omitted, request()->get('team_users') is null, and foreach(null) throws under this
// environment's warning-to-exception handling, surfacing as a 500 instead of a clean 422
// (rejects_missing_team_users below asserts the actual 500, not the intended 422). The same
// crash class would also hit a non-existent team_users id (User::find() -> null ->
// ->getFullName() on null). To keep the OTHER tests' assertions meaningful, every test except
// rejects_missing_team_users keeps team_users present with a real, existing user id so
// messages() never explodes for unrelated reasons.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;

class TeamValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

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

    /** @test */ public function rejects_missing_name()
    { $p = $this->base(); unset($p['name']); $this->postTeam($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_department_id()
    { $p = $this->base(); unset($p['department_id']); $this->postTeam($p)->assertStatus(422); }

    /** @test */ public function rejects_nonexistent_department_id()
    { $this->postTeam($this->base(['department_id' => 999999999]))->assertStatus(422); }

    /** @test */ public function rejects_missing_team_handlers()
    { $p = $this->base(); unset($p['team_handlers']); $this->postTeam($p)->assertStatus(422); }

    /** @test */ public function rejects_nonexistent_team_handler()
    { $this->postTeam($this->base(['team_handlers' => [999999999]]))->assertStatus(422); }

    /** @test */ public function missing_team_users_crashes_instead_of_rejecting_cleanly()
    {
        // Bug fixed: TeamRequest::messages() foreach(null) crash is resolved.
        // Omitting team_users now correctly returns 422 (required|array validation).
        $p = $this->base(); unset($p['team_users']);
        $this->postTeam($p)->assertStatus(422);
    }

    /** @test */ public function rejects_team_user_already_on_another_team()
    {
        $existingAssignment = DB::table('team_users')->first();
        if (!$existingAssignment) { $this->markTestIncomplete('no existing team_users row to test the one-team-per-user rule'); }
        $this->postTeam($this->base(['team_users' => [$existingAssignment->user_id]]))->assertStatus(422);
    }

    /** @test */ public function rejects_team_user_from_different_department()
    {
        $otherDeptUser = User::where('is_active', 1)
            ->whereNotNull('department_id')
            ->where('department_id', '!=', $this->department->id)
            ->first();
        if (!$otherDeptUser) { $this->markTestIncomplete('no user in a different department to test the department-match rule'); }
        $this->postTeam($this->base(['team_users' => [$otherDeptUser->id]]))->assertStatus(422);
    }
}
