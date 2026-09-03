<?php
/**
 * SOURCE UNDER TEST: app/Http/Controllers/EvaController.php
 * MENU PATH:         EVAssist -> EVA Survey / EVA Registration
 * MEASURED COVERAGE AT AUTHORING (lines-%): store 76.92, saveEvaRegistration 80.
 *
 * FINDINGS:
 *  // FINDING (already registered, not re-reported): both `catch (Exception $e)` arms are dead —
 *     EvaController is in namespace App\Http\Controllers and does not `use Exception;`. Those two
 *     unreachable pairs are the whole of the residual uncovered surface in saveEvaRegistration().
 *
 * NET-NEW COMPLEMENT to EVAssist\Eva\submit.EvaBranchTest.php, which covers the two happy paths.
 * This file adds store()'s "nothing pending" refusal — the arm that decides whether a user is even
 * allowed to answer — and pins the values both writes actually persist, which the existing file
 * only checks by status code. Every row it touches is created or deleted inside the transaction.
 */

namespace Tests\Feature\BranchTests\EVAssist\Eva;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\EvaSurvey;
use App\EvaRegistration;
use App\Modules\User\Models\User;

class EvaSurveyStateIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    /** The controller hard-codes the campaign it accepts answers for. */
    const EVA_YEAR    = 2025;
    const EVA_QUARTER = 3;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        $this->user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Remove any campaign row for this user so each arm starts from a known state. */
    private function clearSurveyRows()
    {
        DB::table('eva_survey')->where('user_id', $this->user->id)->delete();
    }

    private function seedOpenSurvey()
    {
        DB::table('eva_survey')->insert([
            'user_id'      => $this->user->id,
            'is_submitted' => 0,
            'eva_year'     => self::EVA_YEAR,
            'eva_quarter'  => self::EVA_QUARTER,
            'deleted_at'   => null,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }

    private function answers()
    {
        return [
            'attended_via'             => 'Onsite',
            'job_performance_clarity'  => 5,
            'work_output_contribution' => 4,
            'management_recognition'   => 3,
            'member_value'             => 5,
            'platform_link'            => 4,
            'program_flow'             => 5,
            'content_messages'         => 4,
            'information_usefulness'   => 3,
            'overall_satisfaction'     => 5,
            'opportunities'            => 'More breakout sessions',
            'questions'                => 'When is the next one?',
        ];
    }

    // ===================================================================== store()

    // Nothing pending: a user with no open survey row is told there is nothing to answer, and no
    // row is invented for them.
    /** @test */
    public function answering_when_no_survey_is_pending_is_refused_with_404()
    {
        $this->clearSurveyRows();

        $res = $this->postJson('/api/eva_survey', $this->answers());

        $res->assertStatus(404);
        $this->assertSame('No pending EVA survey found for this user.', $res->json('message'));
        $this->assertSame(0, EvaSurvey::where('user_id', $this->user->id)->count());
    }

    // An already-submitted row does not count as pending — the survey can only be answered once.
    /** @test */
    public function answering_a_survey_that_was_already_submitted_is_refused()
    {
        $this->clearSurveyRows();
        DB::table('eva_survey')->insert([
            'user_id'      => $this->user->id,
            'is_submitted' => 1,                      // already answered
            'eva_year'     => self::EVA_YEAR,
            'eva_quarter'  => self::EVA_QUARTER,
            'deleted_at'   => null,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $res = $this->postJson('/api/eva_survey', $this->answers());

        $res->assertStatus(404);
        $this->assertSame('No pending EVA survey found for this user.', $res->json('message'));
    }

    // The open row is filled in with every answer and flipped to submitted.
    /** @test */
    public function answering_an_open_survey_persists_every_answer_and_marks_it_submitted()
    {
        $this->clearSurveyRows();
        $this->seedOpenSurvey();

        $res = $this->postJson('/api/eva_survey', $this->answers());

        $res->assertStatus(200);
        $this->assertSame(
            'Thank you for completing the EVA Survey! Your response has been successfully submitted.',
            $res->json('message')
        );

        $row = EvaSurvey::where('user_id', $this->user->id)->first();
        $this->assertEquals(1, $row->is_submitted);
        foreach ($this->answers() as $field => $expected) {
            $this->assertEquals($expected, $row->{$field}, "field {$field} was not persisted");
        }
    }

    // ========================================================= saveEvaRegistration()

    // Registering stamps the current year and the hard-coded quarter, and marks attendance.
    /** @test */
    public function registering_interest_records_the_current_year_and_marks_attendance()
    {
        DB::table('eva_registration')->where('user_id', $this->user->id)->delete();

        $res = $this->postJson('/api/eva_registration');

        $res->assertStatus(200);
        $this->assertSame(
            'Thank you for your interest in our upcoming EVA! Your response has been successfully submitted.',
            $res->json('message')
        );

        $row = EvaRegistration::where('user_id', $this->user->id)->first();
        $this->assertNotNull($row);
        $this->assertEquals((int) date('Y'), $row->eva_year);
        $this->assertEquals(self::EVA_QUARTER, $row->eva_quarter);
        $this->assertEquals(1, $row->is_attending);
    }

}
