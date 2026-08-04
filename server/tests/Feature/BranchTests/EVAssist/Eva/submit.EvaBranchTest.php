<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for EvaController::store, saveEvaRegistration arms. Menu=EVAssist Page=Eva.
 *
 * DEPENDENCY NOTE — EvaController takes NO constructor/injected dependencies (Auth facade + Eloquent
 * models used directly). Both write methods use DatabaseTransactions-safe Eloquent writes.
 * setUp() inserts prerequisite fixture rows inside the transaction (via DB::table) to reach the
 * success path without hitting the null-pointer risk from missing survey/registration rows.
 *
 * FINDINGS:
 *  // FINDING: store() catch(Exception) — EvaController does NOT `use Exception;` (namespace App\Http\Controllers),
 *             so `Exception` resolves to the non-existent App\Http\Controllers\Exception. Any real throwable
 *             (incl. $user_eva->update() on a null $user_eva) is NOT caught -> uncaught 500. Mitigated by
 *             inserting the prerequisite row in the test method before calling the endpoint.
 *  // FINDING: saveEvaRegistration() catch(Exception) — same missing `use Exception;`; catch is dead, a throw -> 500.
 *             Mitigated by deleting any existing registration for the user before calling the endpoint.
 *  // FINDING: both methods have NO return when the write returns falsy — request falls through to empty 200.
 *
 * Routes (routes/api.php, mounted under /api):
 *   POST /api/eva_survey       -> store()               (2026-07-31 unlocked: fixture row seeded in test method)
 *   POST /api/eva_registration -> saveEvaRegistration() (2026-07-31 unlocked: existing registration deleted in test method)
 */

namespace Tests\Feature\BranchTests\EVAssist\Eva;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class EvaSubmitBranchTest extends TestCase
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
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // -------------------------------------------------------------------- store()
    // Inserts an open eva_survey row in the test method (within the DatabaseTransactions transaction)
    // so that EvaSurvey::where(...)->first() finds it. The endpoint then updates is_submitted→1.
    // DatabaseTransactions rolls back both the INSERT and the UPDATE at the end of the test.
    /** @test */
    public function store__submit__open_survey_found__ok_200()
    {
        // Seed prerequisite row within the transaction so the controller finds it.
        DB::table('eva_survey')->insert([
            'user_id'    => $this->user->id,
            'is_submitted' => 0,
            'eva_year'   => 2025,
            'eva_quarter' => 3,
            'deleted_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $res = $this->postJson('/api/eva_survey', [
            'attended_via'             => 'Virtual',
            'job_performance_clarity'  => 4,
            'work_output_contribution' => 4,
            'management_recognition'   => 4,
            'member_value'             => 4,
            'platform_link'            => 4,
            'program_flow'             => 4,
            'content_messages'         => 4,
            'information_usefulness'   => 4,
            'overall_satisfaction'     => 4,
            'opportunities'            => 'Looks good',
            'questions'                => 'None',
        ]);

        // FINDING: catch(Exception) dead (no `use Exception;`). Mitigated by seeding valid fixture row.
        $this->assertNotEquals(500, $res->status(), 'EVA store: EvaSurvey::update must not yield 500');
        $res->assertStatus(200);
    }

    // ----------------------------------------------------------- saveEvaRegistration()
    // Deletes any existing registration for user + current year + Q3 to avoid unique-constraint 500
    // (catch is dead). EvaRegistration::create() runs; DatabaseTransactions rolls back both the
    // DELETE and the INSERT at the end of the test.
    /** @test */
    public function saveEvaRegistration__submit__new_registration__ok_200()
    {
        // Remove any existing registration to prevent unique-key collision (catch is dead → would 500).
        DB::table('eva_registration')
            ->where('user_id', $this->user->id)
            ->where('eva_year', (int) date('Y'))
            ->where('eva_quarter', 3)
            ->delete();

        $res = $this->postJson('/api/eva_registration');

        // FINDING: catch(Exception) dead. EvaRegistration::create() success → response()->json(200).
        $this->assertNotEquals(500, $res->status(), 'EVA saveEvaRegistration: EvaRegistration::create must not yield 500');
        $res->assertStatus(200);
    }
}
