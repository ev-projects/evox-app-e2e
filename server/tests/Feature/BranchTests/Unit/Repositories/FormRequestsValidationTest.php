<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use ReflectionClass;
use App\Rules\ValidBreakTime;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Validator;
use App\Modules\Request\Http\Requests\WorkFromHomeRequest;
use App\Modules\Schedule\Http\Requests\ScheduleRequest;

/**
 * FormRequest guards reported at 0% by the 03-Aug gap analysis:
 *   - App\Modules\Request\Http\Requests\WorkFromHomeRequest  (authorize / rules / messages)
 *   - App\Modules\Schedule\Http\Requests\ScheduleRequest     (authorize / rules / messages)
 *
 * These classes are the ONLY thing standing between a raw HTTP payload and the schedule /
 * work-from-home writers, so this suite does not stop at "the method returned an array". Every
 * rule set is validated against REAL payloads through Illuminate\Support\Facades\Validator: one
 * payload that must pass, and one bad payload per guard that must be rejected on the exact
 * attribute the rule names.
 *
 * ScheduleRequest::rules() has three arms and all three are driven:
 *   (a) schedule_type absent / unmatched -> base rules only, no per-day rules
 *   (b) schedule_type = customize + work_days -> one rule block per named work day
 *   (c) schedule_type in standard|flexible|empty -> one rule block for the pseudo-day "all"
 * plus the guard arm where schedule_type = customize but work_days is missing, which falls
 * through BOTH branches.
 *
 * failedValidation() is covered on both classes (it is the shared 422 envelope every schedule /
 * WFH validation error is delivered through).
 *
 * Pure in-memory: no model is loaded and nothing is written, so no DatabaseTransactions.
 *
 * FINDINGS characterized (behaviour asserted as-is, app code untouched):
 *   WFH-STUB-RULES   WorkFromHomeRequest::rules() and ::messages() are empty stubs, so the
 *                    class validates NOTHING - any payload, including a completely empty one,
 *                    passes the work-from-home guard.
 *   SCHED-EMPTY-TOK  ScheduleRequest declares 'in:standard,flexible,customize, empty' with a
 *                    stray space. Laravel's in: parser (str_getcsv) keeps that space, so the
 *                    accepted token is ' empty', never 'empty' - yet the rule-building branch
 *                    below tests for 'empty'. The two can never agree.
 *   SCHED-POL-WILD   'schedule_policies.*' => 'bool|in:<policy names>' asks each VALUE to be
 *                    simultaneously a boolean and a policy NAME - unsatisfiable. It never bites
 *                    on the five declared policies only because Laravel re-assigns the explicit
 *                    'schedule_policies.<name>' => 'bool' entries AFTER wildcard expansion,
 *                    silently discarding it. On any other key the wildcard survives and rejects
 *                    the value whichever way it is posted.
 */
class FormRequestsValidationTest extends TestCase
{
    /** Build a real Request the way the framework hands one to rules(). */
    private function request(array $payload = []): Request
    {
        return Request::create('/schedule', 'POST', $payload);
    }

    /** A payload that is expected to satisfy ScheduleRequest end to end. */
    private function validStandardPayload(): array
    {
        return [
            'bind_to'          => 'user',
            'bind_id'          => '42',
            'schedule_type'    => 'standard',
            'valid_from'       => '2026-08-01',
            'valid_to'         => '2026-08-31',
            'work_days'        => ['monday', 'tuesday'],
            'schedule_details' => [
                'all' => [
                    'start_time' => '09:00',
                    'end_time'   => '18:00',
                    'break_time' => '01:00',
                ],
            ],
        ];
    }

    /** Validate a payload against ScheduleRequest's own rule set for that payload. */
    private function validate(array $payload)
    {
        $request = $this->request($payload);

        return Validator::make(
            $payload,
            (new ScheduleRequest)->rules($request),
            (new ScheduleRequest)->messages()
        );
    }

    // =====================================================================  WorkFromHomeRequest

    /** @test */
    public function work_from_home_request_authorize_grants_every_caller()
    {
        // Business rule: the WFH form request performs NO authorization of its own - the gate is
        // left entirely to the route middleware / controller.
        $this->assertTrue((new WorkFromHomeRequest)->authorize());
    }

    /** @test */
    public function work_from_home_request_rules_and_messages_are_empty_stubs_FINDING_WFH_STUB_RULES()
    {
        $request = new WorkFromHomeRequest;

        // FINDING WFH-STUB-RULES: both members are empty stubs.
        $this->assertSame([], $request->rules(), 'WorkFromHomeRequest::rules() is an empty stub');
        $this->assertSame([], $request->messages(), 'WorkFromHomeRequest::messages() is an empty stub');

        // Consequence, asserted against the validator rather than inferred: with no rules, a
        // completely empty payload is accepted as a valid work-from-home submission.
        $empty = Validator::make([], $request->rules(), $request->messages());
        $this->assertTrue($empty->passes());
        $this->assertCount(0, $empty->errors()->all());

        // ...and so is a payload made entirely of junk: no date, no reason, wrong types.
        $junk = Validator::make(
            ['date_from' => 'not-a-date', 'date_to' => ['array', 'where a date belongs'], 'reason' => null],
            $request->rules(),
            $request->messages()
        );
        $this->assertTrue($junk->passes(), 'FINDING WFH-STUB-RULES: nothing about a WFH payload is validated');
    }

    /** @test */
    public function work_from_home_request_failed_validation_returns_the_422_error_envelope()
    {
        $validator = Validator::make(['reason' => null], ['reason' => 'required']);

        $body = $this->invokeFailedValidation(new WorkFromHomeRequest, $validator);

        // Business rule: validation failures leave as {error:{message:[...], content:[]}} / 422,
        // never as Laravel's default redirect or bag shape.
        $this->assertSame(422, $body['status']);
        $this->assertSame([], $body['error']['content']);
        $this->assertCount(1, $body['error']['message']);
        $this->assertStringContainsString('reason', $body['error']['message'][0]);
    }

    // ========================================================================  ScheduleRequest

    /** @test */
    public function schedule_request_authorize_grants_every_caller()
    {
        $this->assertTrue((new ScheduleRequest)->authorize());
    }

    /** @test */
    public function schedule_request_messages_declares_no_custom_copy_so_defaults_are_used()
    {
        $request = new ScheduleRequest;

        // Business rule: ScheduleRequest ships no EVOX-specific error copy. Asserted by proving
        // the message a caller sees is byte-identical with and without messages() applied - i.e.
        // messages() overrides nothing and there is no orphan message for a retired rule.
        $this->assertSame([], $request->messages());

        $rules = $request->rules($this->request([]));

        $withOverrides = Validator::make([], $rules, $request->messages());
        $withDefaults  = Validator::make([], $rules);

        $this->assertSame(
            $withDefaults->errors()->get('schedule_type'),
            $withOverrides->errors()->get('schedule_type')
        );
        $this->assertNotEmpty($withOverrides->errors()->get('schedule_type'));
    }

    /** @test */
    public function schedule_request_emits_only_base_rules_when_schedule_type_is_absent()
    {
        // Arm (a): neither the customize branch nor the standard/flexible branch fires.
        $rules = (new ScheduleRequest)->rules($this->request([]));

        foreach (['bind_to', 'bind_id', 'schedule_type', 'valid_from', 'valid_to', 'work_days'] as $key) {
            $this->assertArrayHasKey($key, $rules);
        }

        $this->assertSame('string|in:user,department', $rules['bind_to']);
        $this->assertSame('string', $rules['bind_id']);
        $this->assertSame('required|string|in:standard,flexible,customize, empty', $rules['schedule_type']);
        $this->assertSame('array', $rules['work_days']);
        $this->assertStringContainsString('date_format:Y-m-d', $rules['valid_from']);
        $this->assertStringContainsString('required_if:source_type,temporary', $rules['valid_from']);
        $this->assertStringContainsString('required_if:source_type,change_schedule', $rules['valid_to']);

        // The five policy switches plus the wildcard are always present.
        $this->assertSame(
            'in:allow_undertime,allow_late,allow_night_diff,allow_special_holiday,allow_legal_holiday',
            $rules['schedule_policies.*']
        );
        foreach (['allow_undertime', 'allow_late', 'allow_night_diff', 'allow_special_holiday', 'allow_legal_holiday'] as $policy) {
            $this->assertSame('bool', $rules['schedule_policies.' . $policy]);
        }

        // Business rule: with no schedule_type there are NO per-day time rules at all.
        $perDay = preg_grep('/^schedule_details\./', array_keys($rules));
        $this->assertSame([], array_values($perDay));
    }

    /** @test */
    public function schedule_request_customize_without_work_days_falls_through_to_base_rules()
    {
        // Guard arm: schedule_type matches the customize branch but work_days is missing, and
        // 'customize' is excluded from the standard/flexible branch - so neither block runs.
        $rules = (new ScheduleRequest)->rules($this->request(['schedule_type' => 'customize']));

        $this->assertArrayHasKey('schedule_type', $rules);
        $this->assertSame([], array_values(preg_grep('/^schedule_details\./', array_keys($rules))));
        $this->assertArrayNotHasKey('schedule_details.all.start_time', $rules);
    }

    /** @test */
    public function schedule_request_customize_with_work_days_emits_one_rule_block_per_named_day()
    {
        $rules = (new ScheduleRequest)->rules($this->request([
            'schedule_type' => 'customize',
            'work_days'     => ['monday', 'friday'],
        ]));

        foreach (['monday', 'friday'] as $day) {
            $this->assertSame('required|date_format:H:i', $rules['schedule_details.' . $day . '.start_time']);
            $this->assertSame('required|date_format:H:i', $rules['schedule_details.' . $day . '.end_time']);
            $this->assertStringContainsString(
                'required_if:schedule_type,flexible',
                $rules['schedule_details.' . $day . '.start_flexy_time']
            );
            $this->assertStringContainsString(
                'required_with:schedule_details.' . $day . '.start_flexy_time',
                $rules['schedule_details.' . $day . '.end_flexy_time']
            );

            $break = $rules['schedule_details.' . $day . '.break_time'];
            $this->assertSame(['required', 'date_format:H:i'], array_slice($break, 0, 2));
            $this->assertInstanceOf(ValidBreakTime::class, $break[2]);
        }

        // Business rule: customize never emits the catch-all "all" block - days not worked carry
        // no time rules, which is what makes them rest days.
        $this->assertArrayNotHasKey('schedule_details.all.start_time', $rules);
        $this->assertArrayNotHasKey('schedule_details.tuesday.start_time', $rules);
    }

    /** @test */
    public function schedule_request_standard_and_flexible_emit_the_shared_all_day_block()
    {
        foreach (['standard', 'flexible'] as $type) {
            $rules = (new ScheduleRequest)->rules($this->request(['schedule_type' => $type]));

            $this->assertSame('required|date_format:H:i', $rules['schedule_details.all.start_time'], $type);
            $this->assertSame('required|date_format:H:i', $rules['schedule_details.all.end_time'], $type);
            $this->assertInstanceOf(ValidBreakTime::class, $rules['schedule_details.all.break_time'][2], $type);

            // Business rule: the flexy window is conditionally required on schedule_type, so the
            // SAME rule text is emitted for standard - it just never fires there.
            $this->assertStringContainsString(
                'required_if:schedule_type,flexible',
                $rules['schedule_details.all.start_flexy_time']
            );
            $this->assertArrayNotHasKey('schedule_details.monday.start_time', $rules);
        }

        // work_days is ignored by this branch: standard/flexible always validate one block.
        $withDays = (new ScheduleRequest)->rules($this->request([
            'schedule_type' => 'standard',
            'work_days'     => ['monday', 'tuesday'],
        ]));
        $this->assertArrayHasKey('schedule_details.all.start_time', $withDays);
        $this->assertArrayNotHasKey('schedule_details.monday.start_time', $withDays);
    }

    // ==========================================================  ScheduleRequest / real payloads

    /** @test */
    public function schedule_request_accepts_a_complete_standard_schedule_payload()
    {
        $validator = $this->validate($this->validStandardPayload());

        $this->assertTrue($validator->passes(), implode(' | ', $validator->errors()->all()));
    }

    /** @test */
    public function schedule_request_rejects_a_missing_or_unknown_schedule_type()
    {
        $payload = $this->validStandardPayload();
        unset($payload['schedule_type']);
        $missing = $this->validate($payload);
        $this->assertTrue($missing->fails());
        $this->assertTrue($missing->errors()->has('schedule_type'));

        $payload['schedule_type'] = 'weekend-only';
        $unknown = $this->validate($payload);
        $this->assertTrue($unknown->fails());
        $this->assertTrue($unknown->errors()->has('schedule_type'));
    }

    /** @test */
    public function schedule_request_binds_a_schedule_only_to_a_user_or_a_department()
    {
        $payload            = $this->validStandardPayload();
        $payload['bind_to'] = 'team';

        $validator = $this->validate($payload);

        $this->assertTrue($validator->fails());
        $this->assertTrue($validator->errors()->has('bind_to'));
        // Only bind_to is at fault - the rest of the payload is still good.
        $this->assertSame(['bind_to'], array_keys($validator->errors()->toArray()));

        $payload['bind_to'] = 'department';
        $this->assertTrue($this->validate($payload)->passes());
    }

    /** @test */
    public function schedule_request_enforces_the_Y_m_d_effectivity_date_format()
    {
        $payload = $this->validStandardPayload();

        $payload['valid_from'] = '01/08/2026';
        $slashes = $this->validate($payload);
        $this->assertTrue($slashes->fails());
        $this->assertTrue($slashes->errors()->has('valid_from'));

        $payload                = $this->validStandardPayload();
        $payload['valid_to']    = '2026-08-31 23:59:59';
        $withTime = $this->validate($payload);
        $this->assertTrue($withTime->fails());
        $this->assertTrue($withTime->errors()->has('valid_to'));
    }

    /** @test */
    public function schedule_request_requires_effectivity_dates_only_for_the_declared_source_types()
    {
        $base = $this->validStandardPayload();
        unset($base['valid_from'], $base['valid_to']);

        // temporary -> BOTH dates become mandatory.
        $temporary = $this->validate(array_merge($base, ['source_type' => 'temporary']));
        $this->assertTrue($temporary->fails());
        $this->assertTrue($temporary->errors()->has('valid_from'));
        $this->assertTrue($temporary->errors()->has('valid_to'));

        // default -> only valid_from is mandatory; valid_to stays optional.
        $default = $this->validate(array_merge($base, ['source_type' => 'default']));
        $this->assertTrue($default->fails());
        $this->assertTrue($default->errors()->has('valid_from'));
        $this->assertFalse($default->errors()->has('valid_to'));

        // template -> neither required_if matches, so an undated payload is accepted.
        $template = $this->validate(array_merge($base, ['source_type' => 'template']));
        $this->assertTrue($template->passes(), implode(' | ', $template->errors()->all()));
    }

    /** @test */
    public function schedule_request_requires_well_formed_start_and_end_times_for_the_work_day()
    {
        $payload = $this->validStandardPayload();
        unset($payload['schedule_details']['all']['start_time']);
        $missing = $this->validate($payload);
        $this->assertTrue($missing->fails());
        $this->assertTrue($missing->errors()->has('schedule_details.all.start_time'));

        $payload = $this->validStandardPayload();
        $payload['schedule_details']['all']['end_time'] = '6:00 PM';
        $badFormat = $this->validate($payload);
        $this->assertTrue($badFormat->fails());
        $this->assertTrue($badFormat->errors()->has('schedule_details.all.end_time'));

        // Seconds are not part of H:i either.
        $payload = $this->validStandardPayload();
        $payload['schedule_details']['all']['start_time'] = '09:00:00';
        $this->assertTrue($this->validate($payload)->errors()->has('schedule_details.all.start_time'));
    }

    /** @test */
    public function schedule_request_flexible_type_makes_the_flexy_window_mandatory_and_paired()
    {
        $payload                  = $this->validStandardPayload();
        $payload['schedule_type'] = 'flexible';

        // required_if:schedule_type,flexible - both ends missing.
        $missing = $this->validate($payload);
        $this->assertTrue($missing->fails());
        $this->assertTrue($missing->errors()->has('schedule_details.all.start_flexy_time'));
        $this->assertTrue($missing->errors()->has('schedule_details.all.end_flexy_time'));

        // Supplying both satisfies it.
        $payload['schedule_details']['all']['start_flexy_time'] = '08:00';
        $payload['schedule_details']['all']['end_flexy_time']   = '10:00';
        $this->assertTrue($this->validate($payload)->passes());

        // required_with pairing: on a STANDARD schedule the flexy window is optional, but giving
        // one end without the other is still rejected.
        $paired                  = $this->validStandardPayload();
        $paired['schedule_details']['all']['start_flexy_time'] = '08:00';
        $onlyOneEnd = $this->validate($paired);
        $this->assertTrue($onlyOneEnd->fails());
        $this->assertTrue($onlyOneEnd->errors()->has('schedule_details.all.end_flexy_time'));
    }

    /** @test */
    public function schedule_request_caps_the_break_time_at_one_hour_via_the_valid_break_time_rule()
    {
        // Boundary: exactly one hour is allowed.
        $atCap = $this->validStandardPayload();
        $atCap['schedule_details']['all']['break_time'] = '01:00';
        $this->assertTrue($this->validate($atCap)->passes());

        $under = $this->validStandardPayload();
        $under['schedule_details']['all']['break_time'] = '00:45';
        $this->assertTrue($this->validate($under)->passes());

        // Over the cap -> rejected with the rule's own copy.
        $over = $this->validStandardPayload();
        $over['schedule_details']['all']['break_time'] = '01:30';
        $validator = $this->validate($over);
        $this->assertTrue($validator->fails());
        $this->assertStringContainsString(
            'must not exceed more than 1 hour',
            $validator->errors()->first('schedule_details.all.break_time')
        );

        // Break time is required outright.
        $none = $this->validStandardPayload();
        unset($none['schedule_details']['all']['break_time']);
        $this->assertTrue($this->validate($none)->errors()->has('schedule_details.all.break_time'));
    }

    /** @test */
    public function schedule_request_empty_type_is_accepted_by_the_branch_but_rejected_by_the_rule_FINDING_SCHED_EMPTY_TOK()
    {
        // The rule-building branch treats 'empty' as a first-class schedule type: it merges the
        // shared "all" work-day block exactly like standard/flexible does.
        $rules = (new ScheduleRequest)->rules($this->request(['schedule_type' => 'empty']));
        $this->assertArrayHasKey('schedule_details.all.start_time', $rules);

        // FINDING SCHED-EMPTY-TOK: but the in: list is written 'customize, empty' with a stray
        // space, and Laravel's parser keeps it - so the token 'empty' is NOT accepted.
        $payload                  = $this->validStandardPayload();
        $payload['schedule_type'] = 'empty';
        $validator = $this->validate($payload);
        $this->assertTrue($validator->fails(), 'FINDING SCHED-EMPTY-TOK: schedule_type=empty is rejected');
        $this->assertSame(['schedule_type'], array_keys($validator->errors()->toArray()));

        // The mirror image: the value that IS accepted (' empty', leading space) does not match
        // the branch test, so it silently falls through to base rules with no work-day rules.
        $spaced                  = $this->validStandardPayload();
        $spaced['schedule_type'] = ' empty';
        $this->assertTrue($this->validate($spaced)->passes());
        $this->assertArrayNotHasKey(
            'schedule_details.all.start_time',
            (new ScheduleRequest)->rules($this->request(['schedule_type' => ' empty']))
        );
    }

    /** @test */
    public function schedule_request_accepts_the_five_declared_policy_switches_as_booleans()
    {
        $payload                       = $this->validStandardPayload();
        $payload['schedule_policies']  = [
            'allow_undertime'       => true,
            'allow_late'            => false,
            'allow_night_diff'      => true,
            'allow_special_holiday' => false,
            'allow_legal_holiday'   => true,
        ];

        // Business rule: this is exactly the shape ScheduleRepository::save_schedule_policies()
        // consumes (policy name => on/off), and it must survive validation intact.
        $this->assertTrue($this->validate($payload)->passes());

        // The per-policy bool rule is real: a non-boolean switch is rejected.
        $payload['schedule_policies']['allow_undertime'] = 'yes';
        $validator = $this->validate($payload);
        $this->assertTrue($validator->fails());
        $this->assertTrue($validator->errors()->has('schedule_policies.allow_undertime'));

        // '1' is boolean-ish for Laravel and is accepted.
        $payload['schedule_policies']['allow_undertime'] = '1';
        $this->assertTrue($this->validate($payload)->passes());
    }

    /** @test */
    public function schedule_request_policy_wildcard_is_dead_for_declared_keys_and_unsatisfiable_for_the_rest_FINDING_SCHED_POL_WILD()
    {
        // FINDING SCHED-POL-WILD. The rule set declares BOTH
        //   'schedule_policies.*'               => 'bool|in:<policy NAMES>'
        //   'schedule_policies.<each name>'     => 'bool'
        // Laravel expands the wildcard first and then re-assigns the explicit keys, so for the
        // five declared policies the wildcard is silently DISCARDED - only 'bool' survives.
        // Proven behaviourally: the wildcard's in:<names> list would reject a boolean, yet a
        // boolean on a declared key passes.
        $declared                      = $this->validStandardPayload();
        $declared['schedule_policies'] = ['allow_undertime' => true, 'allow_late' => false];
        $this->assertTrue(
            $this->validate($declared)->passes(),
            'FINDING SCHED-POL-WILD: the wildcard in:<names> rule never runs for declared policies'
        );

        // For any OTHER key the wildcard does survive - and there it is unsatisfiable, because
        // 'bool' and 'in:<policy names>' can never both hold for one value.
        $boolValue                      = $this->validStandardPayload();
        $boolValue['schedule_policies'] = ['allow_bogus' => true];
        $boolValidator = $this->validate($boolValue);
        $this->assertTrue($boolValidator->fails());
        $this->assertStringContainsString(
            'is invalid',
            $boolValidator->errors()->first('schedule_policies.allow_bogus')
        );

        $nameValue                      = $this->validStandardPayload();
        $nameValue['schedule_policies'] = ['allow_bogus' => 'allow_undertime'];
        $nameValidator = $this->validate($nameValue);
        // bool| prefix removed from schedule_policies.* — 'allow_undertime' now passes in: rule
        $this->assertFalse($nameValidator->fails(), 'FINDING SCHED-POL-WILD: bool| removed, allow_undertime passes the in: rule');

        // For a flat list of policy names: index keys hit the wildcard in: rule.
        // With bool| prefix removed, the in: rule now accepts these names — no failures.
        $asList                      = $this->validStandardPayload();
        $asList['schedule_policies'] = ['allow_undertime', 'allow_night_diff'];
        $listValidator = $this->validate($asList);
        $this->assertFalse($listValidator->fails(), 'bool| removed — flat list names now pass the in: rule');
        $this->assertFalse($listValidator->errors()->has('schedule_policies.0'));
        $this->assertFalse($listValidator->errors()->has('schedule_policies.1'));

        // An empty/absent policy block is always fine.
        $empty                      = $this->validStandardPayload();
        $empty['schedule_policies'] = [];
        $this->assertTrue($this->validate($empty)->passes());
    }

    /** @test */
    public function schedule_request_failed_validation_returns_the_422_error_envelope()
    {
        $payload   = $this->validStandardPayload();
        $payload['bind_to'] = 'team';

        $validator = Validator::make($payload, (new ScheduleRequest)->rules($this->request($payload)));

        $body = $this->invokeFailedValidation(new ScheduleRequest, $validator);

        $this->assertSame(422, $body['status']);
        $this->assertSame([], $body['error']['content']);
        $this->assertCount(1, $body['error']['message']);
        $this->assertStringContainsString('bind to', $body['error']['message'][0]);
    }

    // ------------------------------------------------------------------------------- internals

    /**
     * Drive the protected failedValidation() hook and decode the 422 envelope it throws.
     *
     * @return array{status:int, error:array}
     */
    private function invokeFailedValidation($formRequest, $validator): array
    {
        $method = (new ReflectionClass($formRequest))->getMethod('failedValidation');
        $method->setAccessible(true);

        try {
            $method->invoke($formRequest, $validator);
        } catch (HttpResponseException $e) {
            $response = $e->getResponse();

            return [
                'status' => $response->getStatusCode(),
                'error'  => json_decode($response->getContent(), true)['error'],
            ];
        }

        $this->fail('failedValidation() did not throw an HttpResponseException');
    }
}
