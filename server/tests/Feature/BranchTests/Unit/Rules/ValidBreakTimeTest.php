<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. PURE UNIT tests for the ValidBreakTime validation Rule.
 *
 * Source of truth (LATEST only):
 *   ...\coverage-max\latest-code\server\app\Rules\ValidBreakTime.php
 *
 * Rule under test:
 *   passes($attribute, $value):
 *       if (!empty($value)) return (time_to_seconds($value) > get_constant("TIMESTAMP.hour")) ? false : true;
 *       // else: no explicit return -> null
 *   message(): fixed string.
 *
 * Dependencies are PURE in this context:
 *   - time_to_seconds($t) (date_helper) with NO authenticated user reduces to
 *     strtotime($t) - strtotime('today'), i.e. seconds-since-midnight for an "H:i" string.
 *   - get_constant("TIMESTAMP.hour") = 3600 (config/constants.php). Pinned via Config::set for
 *     determinism. NO DB / NO SP / NO external.
 *
 * Boundary of interest: the limit is EXCLUSIVE ( > 3600 fails ), so exactly 01:00 (3600s) PASSES.
 */

namespace Tests\Feature\BranchTests\Unit\Rules;

use Tests\TestCase;
use Illuminate\Support\Facades\Config;
use App\Rules\ValidBreakTime;

class ValidBreakTimeTest extends TestCase
{
    /** @var ValidBreakTime */
    private $rule;

    protected function setUp(): void
    {
        parent::setUp();
        // Pin the 1-hour threshold so the test never depends on config drift; no user is
        // authenticated so time_to_seconds() = seconds-since-midnight for an H:i string.
        Config::set('constants.TIMESTAMP.hour', 3600);
        $this->rule = new ValidBreakTime();
    }

    // Normal: a 30-minute break (1800s) is under the hour -> passes.
    /** @test */
    public function passes__thirty_minutes__true()
    {
        $this->assertTrue($this->rule->passes('break_time', '00:30'));
    }

    // Boundary (just under): 00:59 = 3540s <= 3600 -> passes.
    /** @test */
    public function passes__fifty_nine_minutes__true()
    {
        $this->assertTrue($this->rule->passes('break_time', '00:59'));
    }

    // Boundary (exact): 01:00 = 3600s, condition is strictly > 3600 -> passes.
    /** @test */
    public function passes__exactly_one_hour__true()
    {
        $this->assertTrue($this->rule->passes('break_time', '01:00'));
    }

    // Boundary (just over): 01:01 = 3660s > 3600 -> fails.
    /** @test */
    public function passes__one_hour_one_minute__false()
    {
        $this->assertFalse($this->rule->passes('break_time', '01:01'));
    }

    // Normal (well over): 01:30 = 5400s > 3600 -> fails.
    /** @test */
    public function passes__ninety_minutes__false()
    {
        $this->assertFalse($this->rule->passes('break_time', '01:30'));
    }

    // Edge: empty string is caught by !empty() guard -> function falls through -> returns null.
    /** @test */
    public function passes__empty_string__returns_null()
    {
        $this->assertNull($this->rule->passes('break_time', ''));
    }

    // Edge: null value -> !empty(null) is false -> returns null.
    /** @test */
    public function passes__null_value__returns_null()
    {
        $this->assertNull($this->rule->passes('break_time', null));
    }

    // Edge: '0' is treated as empty() in PHP -> guard is false -> returns null.
    // (documents PHP's empty('0') === true quirk for this rule)
    /** @test */
    public function passes__string_zero__returns_null()
    {
        $this->assertNull($this->rule->passes('break_time', '0'));
    }

    // message(): fixed, non-empty human-readable string mentioning the 1-hour cap.
    /** @test */
    public function message__returns_expected_string()
    {
        $this->assertSame('The :attribute must not exceed more than 1 hour.', $this->rule->message());
    }
}
