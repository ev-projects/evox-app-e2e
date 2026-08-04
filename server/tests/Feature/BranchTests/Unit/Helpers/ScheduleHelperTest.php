<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. PURE UNIT tests for schedule_helper.php.
 *
 * Source of truth (LATEST only):
 *   ...\coverage-max\latest-code\server\app\Helpers\schedule_helper.php
 *
 * Functions under test (PURE arms only):
 *   create_work_day_rule($work_day) -> builds the per-day validation-rule array. Fully pure
 *       (string interpolation + a `new ValidBreakTime` instance); no DB, no config.
 *   generate_schedule_name(array $data) -> only the arms that DO NOT touch the DB:
 *       - source/schedule not both set          -> 'Schedule'
 *       - both set, bind_to not user/department  -> '[SOURCE] - SCHEDULE'
 *       - bind_to='user'  but source_type NOT in {default,temporary} -> default format (no User::findOrFail)
 *       - bind_to='department' but source_type NOT 'default'         -> default format (no Evox lookup)
 *
 * // SKIPPED-DB (documented, not executed): the DB-writing / model-lookup arms of
 *   generate_schedule_name:
 *     - bind_to='user'       + source_type in {default,temporary} -> User::findOrFail($bind_id)
 *     - bind_to='department' + source_type == 'default'           -> EvoxDepartment::where(...)->first()
 *   These hit Eloquent/the live-dump DB and are out of scope for pure unit tests.
 *
 * NOTE: create_work_day_rule also physically lives here (schedule_helper.php), not in rule_helper.php
 * as the task brief listed it; it is covered here at its true source location.
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;
use App\Rules\ValidBreakTime;

class ScheduleHelperTest extends TestCase
{
    // =================================================== create_work_day_rule()

    // Normal: returns exactly the five expected rule keys for the given work day.
    /** @test */
    public function create_work_day_rule__returns_expected_keys()
    {
        $rules = create_work_day_rule('mon');

        $this->assertIsArray($rules);
        $this->assertSame([
            'schedule_details.mon.start_time',
            'schedule_details.mon.end_time',
            'schedule_details.mon.start_flexy_time',
            'schedule_details.mon.end_flexy_time',
            'schedule_details.mon.break_time',
        ], array_keys($rules));
    }

    // Normal: start/end time rules are the fixed required + H:i format strings.
    /** @test */
    public function create_work_day_rule__start_end_time_rules()
    {
        $rules = create_work_day_rule('mon');

        $this->assertSame('required|date_format:H:i', $rules['schedule_details.mon.start_time']);
        $this->assertSame('required|date_format:H:i', $rules['schedule_details.mon.end_time']);
    }

    // Normal: flexy-time rules include the flexible-schedule conditional + paired requirement.
    /** @test */
    public function create_work_day_rule__flexy_time_rules_are_conditional()
    {
        $rules = create_work_day_rule('mon');

        $this->assertSame(
            'required_if:schedule_type,flexible|required_with:schedule_details.mon.end_flexy_time|date_format:H:i',
            $rules['schedule_details.mon.start_flexy_time']
        );
        $this->assertSame(
            'required_if:schedule_type,flexible|required_with:schedule_details.mon.start_flexy_time|date_format:H:i',
            $rules['schedule_details.mon.end_flexy_time']
        );
    }

    // Normal: break_time rule is [required, date_format:H:i, <ValidBreakTime instance>].
    /** @test */
    public function create_work_day_rule__break_time_carries_valid_break_time_rule()
    {
        $rules = create_work_day_rule('mon');
        $breakRule = $rules['schedule_details.mon.break_time'];

        $this->assertIsArray($breakRule);
        $this->assertSame('required', $breakRule[0]);
        $this->assertSame('date_format:H:i', $breakRule[1]);
        $this->assertInstanceOf(ValidBreakTime::class, $breakRule[2]);
    }

    // Edge: the $work_day token is interpolated into every key (different day).
    /** @test */
    public function create_work_day_rule__interpolates_the_work_day_token()
    {
        $rules = create_work_day_rule('sun');

        $this->assertArrayHasKey('schedule_details.sun.start_time', $rules);
        $this->assertArrayHasKey('schedule_details.sun.break_time', $rules);
        $this->assertArrayNotHasKey('schedule_details.mon.start_time', $rules);
    }

    // Boundary: empty work-day string still produces well-formed (if odd) keys.
    /** @test */
    public function create_work_day_rule__empty_work_day__keys_use_empty_segment()
    {
        $rules = create_work_day_rule('');

        $this->assertArrayHasKey('schedule_details..start_time', $rules);
        $this->assertCount(5, $rules);
    }

    // =================================================== generate_schedule_name()

    // Boundary: empty data (neither source_type nor schedule_type set) -> default literal 'Schedule'.
    /** @test */
    public function generate_schedule_name__empty_data__returns_schedule_literal()
    {
        $this->assertSame('Schedule', generate_schedule_name([]));
    }

    // Edge: only source_type set (schedule_type missing) -> guard requires BOTH -> 'Schedule'.
    /** @test */
    public function generate_schedule_name__only_source_type__returns_schedule_literal()
    {
        $this->assertSame('Schedule', generate_schedule_name(['source_type' => 'default']));
    }

    // Normal (pure): both set, bind_to is neither user nor department -> '[SOURCE] - SCHEDULE'.
    /** @test */
    public function generate_schedule_name__unbound__default_format()
    {
        $name = generate_schedule_name([
            'source_type'   => 'temporary',
            'schedule_type' => 'flexible',
            'bind_to'       => 'client',
            'bind_id'       => null,
        ]);

        $this->assertSame('[TEMPORARY] - FLEXIBLE', $name);
    }

    // Pure arm: bind_to='user' but source_type NOT in {default,temporary} -> no User::findOrFail,
    // falls back to the default '[SOURCE] - SCHEDULE' format.
    /** @test */
    public function generate_schedule_name__user_bind_non_db_source__default_format()
    {
        $name = generate_schedule_name([
            'source_type'   => 'change_schedule',
            'schedule_type' => 'standard',
            'bind_to'       => 'user',
            'bind_id'       => 999999,
        ]);

        $this->assertSame('[CHANGE_SCHEDULE] - STANDARD', $name);
    }

    // Pure arm: bind_to='department' but source_type NOT 'default' -> no Evox lookup,
    // falls back to the default format.
    /** @test */
    public function generate_schedule_name__department_bind_non_default_source__default_format()
    {
        $name = generate_schedule_name([
            'source_type'   => 'temporary',
            'schedule_type' => 'standard',
            'bind_to'       => 'department',
            'bind_id'       => 999999,
        ]);

        $this->assertSame('[TEMPORARY] - STANDARD', $name);
    }

    // Edge: source_type value is upper-cased in the output tag.
    /** @test */
    public function generate_schedule_name__lowercase_inputs__upper_cased_in_output()
    {
        $name = generate_schedule_name([
            'source_type'   => 'adhoc',
            'schedule_type' => 'flexible',
            'bind_to'       => 'none',
            'bind_id'       => null,
        ]);

        $this->assertSame('[ADHOC] - FLEXIBLE', $name);
    }

    // SKIPPED-DB: bind_to='user' + source_type in {default,temporary}  (User::findOrFail)
    // SKIPPED-DB: bind_to='department' + source_type == 'default'      (EvoxDepartment lookup)
    // Both require Eloquent + the live-dump DB; intentionally not executed here.
}
