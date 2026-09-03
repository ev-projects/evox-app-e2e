<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ReportController::submit arms. Menu=Reports Page=DTR.
 *
 * Only POST endpoint on the controller: team_attendance_summary. Constructor deps are IoC-mocked but not
 * exercised (the covered arms return before any repository/SP use). success_response => 200 {message,content};
 * error_response default => 400; the dept-guard returns response()->json([...],400) directly.
 *
 * SKIPPED arms (return would require firing a stored procedure — forbidden by SPEC):
 *   // SKIPPED-SP  team_attendance_summary success arm -> call_sp('EH_SP_Attendance_Summary') (x5)
 *
 * Route (module prefix report/, mounted under /api):
 *   POST /api/report/team_attendance_summary/{start_date}/{end_date} -> team_attendance_summary()
 */

namespace Tests\Feature\BranchTests\Reports\DTR;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class DTRSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // -------------------------------------------------- team_attendance_summary()
    // Branch: invalid date -> validate() throws -> catch(Exception) -> error_response 400
    /** @test */
    public function team_attendance_summary__submit__invalid_date__error_400()
    {
        $res = $this->actingAs($this->user)
                    ->postJson('/api/report/team_attendance_summary/NOT-A-DATE/2026-07-15', [
                        'selectedDepartments' => [1],
                    ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: valid dates but no selectedDepartments -> `if ($department_ids === null)` -> json 400 (before call_sp)
    // SKIPPED-SP: with a department selected the success arm fires call_sp('EH_SP_Attendance_Summary')
    /** @test */
    public function team_attendance_summary__submit__no_department__error_400()
    {
        $res = $this->actingAs($this->user)
                    ->postJson('/api/report/team_attendance_summary/2026-07-01/2026-07-15', []);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
