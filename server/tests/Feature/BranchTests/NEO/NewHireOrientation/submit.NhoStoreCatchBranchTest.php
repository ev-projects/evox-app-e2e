<?php
/**
 * SOURCE FILE UNDER TEST
 *   app/Http/Controllers/NewHireOrientationController.php :: store()   (92.31% before this file)
 *
 * MENU PATH
 *   NEO -> New Hire Orientation survey. POST /api/nho_survey.
 *
 * WHAT THIS FILE ADDS
 *   submit.NewHireOrientationBranchTest and FeatureRoot/SurveySubmissionTest both drive the happy
 *   path. The remaining arm is the catch (lines 74-75). Unlike its neighbours in this controller
 *   tier, NewHireOrientationController DOES import Exception (line 13), so its catch is live — the
 *   correction already recorded in the existing suite's header. This file exercises it.
 *
 * WHY A USER CARES
 *   A survey row with no owner is worse than no row: HR's NEO report groups by user_id, so an
 *   ownerless submission is counted in the totals but attributable to nobody, and the new hire is
 *   still shown as not having answered. The rule is that a submission which cannot be attributed is
 *   REJECTED with a handled error and nothing is written.
 *
 * ARMS COVERED — both sides of the conditional
 *   - attributable submission -> written and acknowledged (owned by the existing suites; the
 *     validation gate is asserted here too so the rejection cannot be confused with a 422)
 *   - unattributable submission -> handled error envelope, and no row written
 *
 * SAFETY
 *   DatabaseTransactions. The rejection arm writes nothing by construction; the assertion that
 *   nothing was written is a bounded count on one sentinel date, not a table scan. No stored
 *   procedure is reachable from this controller.
 *
 * RESIDUE (honest): store() has no return when NhoSurvey::insert() answers anything other than 1.
 *   Eloquent's insert() returns true on success and throws otherwise, so that fall-through cannot be
 *   reached from any caller — if the one line this file does not close is that implicit return rather
 *   than the catch body, it is unreachable without an app change. See FINDING NHO-NORETURN-1.
 *
 * FINDINGS
 *   NHO-NORETURN-1 (characterized, not fixed): the `if ($nho == 1)` at line 71 has no else. Were
 *     insert() ever to answer falsy, the request would fall out of the method and the browser would
 *     receive an empty 200 — indistinguishable from success — with no row written.
 */

namespace Tests\Feature\BranchTests\NEO\NewHireOrientation;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;
use App\Modules\User\Models\User;

class NhoStoreCatchSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** A sentinel date no live survey can be carrying, so the row count assertion stays bounded. */
    const SENTINEL_DATE = '1990-06-11';

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // past jwtauth / auth.apikey to the controller body
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** A payload that satisfies every rule of the store() validator. */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'nho_date'                        => self::SENTINEL_DATE,
            'onboarding_exp_rating'           => 4,
            'recruitment_exp_rating'          => 4,
            'schedule_awareness_rating'       => 4,
            'topic_relevance_rating'          => 4,
            'facilitator_id'                  => 1,
            'facilitator_knowledge_rating'    => 4,
            'facilitator_presentation_rating' => 4,
            'facilitator_response_rating'     => 4,
            'equipment_rating'                => 4,
            'accessibility_rating'            => 4,
            'welcome_rating'                  => 4,
        ], $overrides);
    }

    private function sentinelRowCount(): int
    {
        return DB::table('nho_survey')->where('nho_date', self::SENTINEL_DATE)->count();
    }

    // ==============================================================  the unattributable submission

    /**
     * The catch arm. With nobody signed in the controller cannot resolve an owner for the survey, and
     * that failure must be reported through the standard error envelope with nothing written — not
     * saved against a null user, and not escalated to an unhandled 500.
     *
     * @test
     */
    public function a_submission_that_cannot_be_attributed_to_an_employee_is_rejected_and_writes_nothing()
    {
        $before = $this->sentinelRowCount();

        // Deliberately NO actingAs(): the owner lookup inside the try block cannot resolve.
        $res = $this->postJson('/api/nho_survey', $this->payload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));

        $this->assertSame(
            $before,
            $this->sentinelRowCount(),
            'a rejected submission must leave no survey row behind'
        );
    }

    /**
     * The contrasting arm, on the same payload: signed in, the identical submission is accepted and
     * the row is written and owned. This is what proves the rejection above is about attribution
     * rather than about the payload.
     *
     * @test
     */
    public function the_same_submission_from_a_signed_in_employee_is_accepted_and_owned()
    {
        $user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$user) {
            $this->markTestSkipped('no active user row in test DB to submit as');
        }

        $res = $this->actingAs($user)->postJson('/api/nho_survey', $this->payload([
            'suggestions'          => 'branch test suggestion',
            'nho_overall_feedback' => 'branch test feedback',
        ]));

        $res->assertStatus(200);
        $this->assertSame(200, $res->json('status'));

        $this->assertDatabaseHas('nho_survey', [
            'user_id'              => $user->id,
            'nho_date'            => self::SENTINEL_DATE,
            'suggestions'          => 'branch test suggestion',
            'nho_overall_feedback' => 'branch test feedback',
        ]);
    }

    /**
     * The validation gate, so a rejection for a bad payload cannot be mistaken for the attribution
     * rejection above: an out-of-range rating is refused with 422 before the controller body runs.
     *
     * @test
     */
    public function a_rating_outside_the_one_to_five_scale_is_refused_by_validation()
    {
        $user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$user) {
            $this->markTestSkipped('no active user row in test DB to submit as');
        }

        $before = $this->sentinelRowCount();

        $res = $this->actingAs($user)->postJson('/api/nho_survey', $this->payload(['welcome_rating' => 9]));

        $res->assertStatus(422);
        $this->assertSame($before, $this->sentinelRowCount(), 'an invalid survey must not be written');
    }
}
