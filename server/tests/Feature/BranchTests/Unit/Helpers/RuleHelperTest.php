<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. PURE UNIT tests for rule_helper.php.
 *
 * Source of truth (LATEST only):
 *   ...\coverage-max\latest-code\server\app\Helpers\rule_helper.php
 *   ...\coverage-max\latest-code\server\app\Helpers\user_helper.php  (request_validity_checker lives here)
 *
 * Functions under test:
 *   inherit_validation_rules($form_requests, Request $request):
 *       instantiates each class in $form_requests and array_merges the result of ->rules($request).
 *       PURE given stub "form request" classes (defined at the bottom of this file). Later sources
 *       override earlier ones on duplicate keys (array_merge semantics).
 *
 *   request_validity_checker($user_id, $target_date): ONLY the pre-SP guard arm is exercised:
 *       if (strtotime($target_date) < strtotime('-30 days')) return false;   // no SP, tested
 *       else  -> call_sp('EV_SP_Validate_Request_Payroll_Period', ...)       // SKIPPED-SP, NOT tested
 *
 * // SKIPPED-SP: the "within valid period" else-branch calls call_sp against the live-dump DB; only
 *   the >30-day-past short-circuit (returns false with no SP) is covered here.
 * NOTE: create_work_day_rule (listed under rule_helper in the brief) actually lives in
 *   schedule_helper.php and is covered in ScheduleHelperTest.
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;
use Illuminate\Http\Request;

class RuleHelperTest extends TestCase
{
    // ================================================== inherit_validation_rules()

    // Normal: rules from two sources are merged into one flat array.
    /** @test */
    public function inherit_validation_rules__merges_two_sources()
    {
        $request = Request::create('/', 'GET');

        $rules = inherit_validation_rules(
            [RuleHelperFakeRequestA::class, RuleHelperFakeRequestB::class],
            $request
        );

        $this->assertSame([
            'name'  => 'required',
            'email' => 'required|email',
        ], $rules);
    }

    // Edge: single source -> exactly that source's rules.
    /** @test */
    public function inherit_validation_rules__single_source()
    {
        $rules = inherit_validation_rules([RuleHelperFakeRequestA::class], Request::create('/', 'GET'));

        $this->assertSame(['name' => 'required'], $rules);
    }

    // Boundary: empty sources array -> empty rule set.
    /** @test */
    public function inherit_validation_rules__no_sources__empty_array()
    {
        $rules = inherit_validation_rules([], Request::create('/', 'GET'));

        $this->assertSame([], $rules);
    }

    // Edge: on duplicate keys, the LATER source overrides the earlier (array_merge semantics).
    /** @test */
    public function inherit_validation_rules__duplicate_key__later_source_wins()
    {
        $rules = inherit_validation_rules(
            [RuleHelperFakeRequestA::class, RuleHelperFakeRequestOverride::class],
            Request::create('/', 'GET')
        );

        // A gives name=>required; Override gives name=>nullable -> Override wins.
        $this->assertSame('nullable', $rules['name']);
    }

    // ================================================== request_validity_checker()

    // Normal (pre-SP guard): a target date far older than 30 days -> false, no SP reached.
    /** @test */
    public function request_validity_checker__date_older_than_30_days__false()
    {
        $this->assertFalse(request_validity_checker(1, '2000-01-01'));
    }

    // Boundary (pre-SP guard): 31 days ago is strictly before the -30 days cutoff -> false.
    /** @test */
    public function request_validity_checker__thirty_one_days_ago__false()
    {
        $target = date('Y-m-d', strtotime('-31 days'));

        $this->assertFalse(request_validity_checker(1, $target));
    }

    // Edge (pre-SP guard): a non-parseable date -> strtotime() === false, which is < the cutoff
    // timestamp -> returns false without ever calling the SP.
    /** @test */
    public function request_validity_checker__unparseable_date__false_without_sp()
    {
        $this->assertFalse(request_validity_checker(1, 'not-a-real-date'));
    }

    // SKIPPED-SP: target dates within the last 30 days (or future) fall into the else-branch which
    // calls call_sp('EV_SP_Validate_Request_Payroll_Period', ...) against the live-dump DB. Not tested.
}

/*
 |------------------------------------------------------------------------------
 | Stub "form request" classes for inherit_validation_rules() (pure, no framework
 | FormRequest base needed — the helper only does `(new $source)->rules($request)`).
 |------------------------------------------------------------------------------
 */

class RuleHelperFakeRequestA
{
    public function rules($request)
    {
        return ['name' => 'required'];
    }
}

class RuleHelperFakeRequestB
{
    public function rules($request)
    {
        return ['email' => 'required|email'];
    }
}

class RuleHelperFakeRequestOverride
{
    public function rules($request)
    {
        return ['name' => 'nullable'];
    }
}
