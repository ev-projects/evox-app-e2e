<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Providers\RequestServiceProvider;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;
use LogicException;

/**
 * Finishes App\Modules\Schedule\Models\Schedule — the six members that were never executed:
 *
 *   isTemporary()      0%      isChangeSchedule() 0%      owner()      85.71%
 *   change_schedule()  0%      updatedBy()        0%      createdBy()  0%
 *
 * ...plus App\Modules\Request\Providers\RequestServiceProvider (boot 0%, register 0%).
 *
 * WHY A USER CARES
 *  - `source_type` is the tag that tells payroll WHICH schedule governs a given day. A row tagged
 *    `temporary` is a one-off override; `change_schedule` is the schedule produced by an approved
 *    Change Schedule request. isTemporary()/isChangeSchedule() are the predicates the DTR engine
 *    reads to decide whether an employee is late. If either one started answering true for the
 *    wrong tag, permanent schedules would be treated as overrides and vice-versa.
 *  - owner() answers "who does this schedule belong to?" — an employee, or a whole department.
 *  - change_schedule() must return the APPROVED request only; a pending or declined request must
 *    never be treated as an active schedule change.
 *  - updatedBy()/createdBy() are the audit stamps shown on the Schedule screen.
 *
 * ARMS COVERED (success AND failure side of every branch)
 *  - isTemporary / isChangeSchedule: the true arm and the false arm of each ternary.
 *  - owner(): the "user" case, the "department" case, AND the unnamed fall-through (no default),
 *    which returns null.
 *  - change_schedule(): the approved-match arm and the non-approved-excluded arm.
 *  - updatedBy / createdBy: relation shape plus resolution on a live row, including the arm where
 *    the stamped id no longer maps to a user.
 *  - RequestServiceProvider: register() and boot() both driven, and the (empty) result asserted.
 *
 * READ-ONLY. Every predicate test builds an UNSAVED Schedule in memory; every relation test probes
 * exactly ONE row by descending primary key. Nothing is written, so no DatabaseTransactions trait
 * is needed, and no stored procedure is reached.
 *
 * FINDING SCH-1 (characterized, not fixed): Schedule::owner() is declared like a relationship but
 *   for bind_to = 'department' it returns EvoxDepartment::find($this->bind_id) — a MODEL, not an
 *   Illuminate Relation. Eloquent's dynamic accessor rejects that, so `$schedule->owner` throws
 *   LogicException on every department-bound schedule, and `Schedule::with('owner')` can never be
 *   eager-loaded. Only the explicit call `$schedule->owner()` works, and it returns two different
 *   shapes (Relation vs Model) depending on the row — so callers cannot treat it uniformly.
 *
 * FINDING SCH-2 (characterized, not fixed): the switch in owner() has no `default:` arm. Any
 *   bind_to that is not exactly 'user' or 'department' (including NULL, which template schedules
 *   carry) falls out of the switch and the method returns null. A caller doing
 *   `$schedule->owner()->first()` then dies with "Call to a member function first() on null".
 *
 * FINDING RSP-1 (characterized, not fixed): App\Modules\Request\Providers\RequestServiceProvider
 *   has empty boot() and register() bodies AND is not referenced anywhere — it is absent from
 *   config/app.php's provider list and Request\ModuleServiceProvider::register() only registers
 *   RouteServiceProvider. It is dead scaffolding: nothing binds, nothing boots.
 */
class ScheduleModelCompleteTest extends TestCase
{
    /** Unsaved Schedule carrying only the attributes the arm under test reads. */
    private function schedule(array $attrs = []): Schedule
    {
        $s = new Schedule();
        foreach ($attrs as $k => $v) {
            $s->$k = $v;
        }
        return $s;
    }

    // ===================================================== source_type predicates (in memory)

    /** @test */
    public function is_temporary_is_true_only_for_the_temporary_source_type()
    {
        // true arm
        $this->assertTrue($this->schedule(['source_type' => 'temporary'])->isTemporary());

        // false arm — every other tag the column carries, plus the unset case
        foreach (['default', 'template', 'change_schedule', '', null] as $other) {
            $this->assertFalse(
                $this->schedule(['source_type' => $other])->isTemporary(),
                'isTemporary() must not claim a ' . var_export($other, true) . ' schedule is temporary.'
            );
        }
    }

    /** @test */
    public function is_change_schedule_is_true_only_for_the_change_schedule_source_type()
    {
        // true arm
        $this->assertTrue($this->schedule(['source_type' => 'change_schedule'])->isChangeSchedule());

        // false arm
        foreach (['default', 'template', 'temporary', '', null] as $other) {
            $this->assertFalse(
                $this->schedule(['source_type' => $other])->isChangeSchedule(),
                'isChangeSchedule() must not claim a ' . var_export($other, true) . ' schedule came from a request.'
            );
        }
    }

    /**
     * The business rule the DTR engine depends on: the four source types are mutually exclusive —
     * exactly one predicate answers true for any tagged schedule.
     *
     * @test
     */
    public function exactly_one_source_type_predicate_answers_true_for_each_tag()
    {
        $tags = ['default', 'template', 'temporary', 'change_schedule'];

        foreach ($tags as $tag) {
            $s      = $this->schedule(['source_type' => $tag]);
            $truths = [
                'default'         => $s->isDefault(),
                'template'        => $s->isTemplate(),
                'temporary'       => $s->isTemporary(),
                'change_schedule' => $s->isChangeSchedule(),
            ];

            $this->assertSame(
                1,
                count(array_filter($truths)),
                "source_type '{$tag}' must satisfy exactly one predicate, got: " . json_encode($truths)
            );
            $this->assertTrue($truths[$tag], "The '{$tag}' predicate must be the one that fires.");
        }
    }

    // ================================================================================== owner()

    /** @test */
    public function owner_is_a_user_has_one_keyed_on_bind_id_for_an_employee_bound_schedule()
    {
        $schedule = $this->schedule(['bind_to' => 'user', 'bind_id' => 12345]);

        $relation = $schedule->owner();

        $this->assertInstanceOf(HasOne::class, $relation);
        $this->assertInstanceOf(User::class, $relation->getRelated());
        // hasOne(User::class, 'id', 'bind_id') — match users.id against schedules.bind_id
        $this->assertSame('id', $relation->getForeignKeyName());
        $this->assertSame('bind_id', $relation->getLocalKeyName());
        $this->assertSame(12345, $relation->getParentKey());
    }

    /** @test */
    public function owner_resolves_the_bound_employee_on_a_live_user_bound_schedule()
    {
        $schedule = Schedule::where('bind_to', 'user')
            ->whereNotNull('bind_id')
            ->orderBy('id', 'desc')
            ->first();

        if (!$schedule) {
            $this->markTestSkipped('No user-bound schedule row in the test DB.');
        }

        $owner = $schedule->owner()->first();

        if ($owner === null) {
            // failure arm: the bound employee id no longer exists — must also be absent from users
            $this->assertNull(
                User::find($schedule->bind_id),
                'owner() returned nothing, so the bind_id must genuinely be missing from users.'
            );
            return;
        }

        $this->assertInstanceOf(User::class, $owner);
        $this->assertEquals(
            $schedule->bind_id,
            $owner->id,
            'A user-bound schedule must resolve to exactly the employee named by bind_id.'
        );

        // The dynamic accessor works for this shape (contrast with FINDING SCH-1 below).
        $this->assertEquals($owner->id, $schedule->owner->id);
    }

    /**
     * FINDING SCH-1 — characterization of today's behaviour, app code deliberately untouched.
     *
     * @test
     */
    public function owner_returns_a_bare_department_model_and_breaks_dynamic_access_FINDING_SCH_1()
    {
        $schedule = Schedule::where('bind_to', 'department')
            ->whereNotNull('bind_id')
            ->orderBy('id', 'desc')
            ->first();

        if (!$schedule) {
            $this->markTestSkipped('No department-bound schedule row in the test DB.');
        }

        $owner = $schedule->owner();

        // It is NOT a relation — that is the defect.
        $this->assertNotInstanceOf(
            Relation::class,
            $owner,
            'FINDING SCH-1: the department arm returns a Model today, not a Relation.'
        );

        if ($owner !== null) {
            $this->assertInstanceOf(EvoxDepartment::class, $owner);
            $this->assertEquals(
                $schedule->bind_id,
                $owner->Id,
                'A department-bound schedule must resolve to the department named by bind_id.'
            );
        } else {
            // failure arm of EvoxDepartment::find — the bound department no longer exists
            $this->assertNull(EvoxDepartment::find($schedule->bind_id));
        }

        // Consequence a user hits: the property form blows up instead of returning the department.
        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('owner must return a relationship instance');
        $schedule->owner;
    }

    /**
     * FINDING SCH-2 — the switch has no default arm.
     *
     * @test
     */
    public function owner_falls_through_to_null_for_any_other_bind_to_FINDING_SCH_2()
    {
        // Template schedules are not bound to anyone, so bind_to is empty.
        foreach ([null, '', 'team', 'client'] as $bindTo) {
            $this->assertNull(
                $this->schedule(['bind_to' => $bindTo, 'bind_id' => 1])->owner(),
                'owner() silently returns null for bind_to=' . var_export($bindTo, true) . '.'
            );
        }

        // Consequence: the usual relation call style fatals on the null.
        $orphan = $this->schedule(['bind_to' => null, 'bind_id' => 1]);
        $this->expectException(\Throwable::class);
        $orphan->owner()->first();
    }

    // ========================================================================= change_schedule()

    /** @test */
    public function change_schedule_relation_is_pinned_to_approved_requests_only()
    {
        $relation = $this->schedule(['id' => 999999999])->change_schedule();

        $this->assertInstanceOf(HasOne::class, $relation);
        $this->assertInstanceOf(ChangeSchedule::class, $relation->getRelated());
        $this->assertSame('schedule_id', $relation->getForeignKeyName());
        $this->assertSame('id', $relation->getLocalKeyName());

        // The status filter is part of the relation definition, not something callers must add.
        $wheres  = $relation->getQuery()->getQuery()->wheres;
        $matched = array_filter($wheres, function ($w) {
            return isset($w['column'], $w['value'])
                && $w['column'] === 'status'
                && $w['value'] === 'approved';
        });

        $this->assertNotEmpty(
            $matched,
            'change_schedule() must constrain status = approved inside the relation itself.'
        );
    }

    /** @test */
    public function change_schedule_returns_the_approved_request_and_hides_the_unapproved_one()
    {
        $approvedRow = ChangeSchedule::where('status', 'approved')
            ->whereNotNull('schedule_id')
            ->orderBy('id', 'desc')
            ->first();

        if (!$approvedRow) {
            $this->markTestSkipped('No approved change_schedules row in the test DB.');
        }

        $schedule = Schedule::find($approvedRow->schedule_id);

        if (!$schedule) {
            $this->markTestSkipped('The approved request points at a schedule that is gone.');
        }

        // success arm — a row comes back, and it is approved
        $resolved = $schedule->change_schedule()->first();
        $this->assertNotNull($resolved, 'An approved request must surface through change_schedule().');
        $this->assertSame('approved', $resolved->status);
        $this->assertEquals($schedule->id, $resolved->schedule_id);

        // exclusion arm — everything the relation returns for this schedule is approved,
        // bounded to this one schedule_id (no table scan)
        $returned = $schedule->change_schedule()->get();
        foreach ($returned as $row) {
            $this->assertSame('approved', $row->status);
        }

        $allForSchedule = ChangeSchedule::where('schedule_id', $schedule->id)->get();
        $notApproved    = $allForSchedule->where('status', '!=', 'approved');

        foreach ($notApproved as $rejected) {
            $this->assertFalse(
                $returned->contains('id', $rejected->id),
                "Request #{$rejected->id} is '{$rejected->status}' and must never be returned as the active change."
            );
        }
    }

    /** @test */
    public function change_schedule_returns_nothing_for_a_schedule_with_no_approved_request()
    {
        $pending = ChangeSchedule::where('status', '!=', 'approved')
            ->whereNotNull('schedule_id')
            ->orderBy('id', 'desc')
            ->first();

        if (!$pending) {
            $this->markTestSkipped('No non-approved change_schedules row in the test DB.');
        }

        $schedule = Schedule::find($pending->schedule_id);

        if (!$schedule) {
            $this->markTestSkipped('The non-approved request points at a schedule that is gone.');
        }

        $resolved = $schedule->change_schedule()->first();

        $this->assertTrue(
            $resolved === null || $resolved->id !== $pending->id,
            "A '{$pending->status}' request must not be served as this schedule's active change."
        );
    }

    // =========================================================== updatedBy() / createdBy()

    /** @test */
    public function updated_by_and_created_by_are_user_relations_keyed_on_the_stamp_columns()
    {
        $schedule = $this->schedule(['created_by' => 11, 'updated_by' => 22]);

        $updated = $schedule->updatedBy();
        $created = $schedule->createdBy();

        $this->assertInstanceOf(HasOne::class, $updated);
        $this->assertInstanceOf(User::class, $updated->getRelated());
        $this->assertSame('id', $updated->getForeignKeyName());
        $this->assertSame('updated_by', $updated->getLocalKeyName());
        $this->assertSame(22, $updated->getParentKey());

        $this->assertInstanceOf(HasOne::class, $created);
        $this->assertInstanceOf(User::class, $created->getRelated());
        $this->assertSame('id', $created->getForeignKeyName());
        $this->assertSame('created_by', $created->getLocalKeyName());
        $this->assertSame(11, $created->getParentKey());
    }

    /** @test */
    public function audit_stamps_resolve_to_the_users_that_created_and_last_edited_the_schedule()
    {
        $schedule = Schedule::whereNotNull('created_by')
            ->whereNotNull('updated_by')
            ->orderBy('id', 'desc')
            ->first();

        if (!$schedule) {
            $this->markTestSkipped('No schedule row carrying both audit stamps.');
        }

        $creator = $schedule->createdBy()->first();
        $editor  = $schedule->updatedBy()->first();

        // success arm / missing-user arm, asserted per relation
        if ($creator !== null) {
            $this->assertInstanceOf(User::class, $creator);
            $this->assertEquals($schedule->created_by, $creator->id);
        } else {
            $this->assertNull(User::find($schedule->created_by),
                'createdBy() returned nothing, so created_by must be a dangling id.');
        }

        if ($editor !== null) {
            $this->assertInstanceOf(User::class, $editor);
            $this->assertEquals($schedule->updated_by, $editor->id);
        } else {
            $this->assertNull(User::find($schedule->updated_by),
                'updatedBy() returned nothing, so updated_by must be a dangling id.');
        }

        // These two ARE proper relations, so the dynamic accessor works on them.
        $this->assertSame(
            $creator === null ? null : $creator->id,
            $schedule->createdBy === null ? null : $schedule->createdBy->id
        );
    }

    // ============================================================== RequestServiceProvider

    /**
     * FINDING RSP-1 — characterization: both methods are empty and the provider is never loaded.
     *
     * @test
     */
    public function request_service_provider_registers_and_boots_nothing_FINDING_RSP_1()
    {
        $provider = $this->app->resolveProvider(RequestServiceProvider::class);

        $this->assertInstanceOf(ServiceProvider::class, $provider);
        $this->assertInstanceOf(RequestServiceProvider::class, $provider);

        $bindingsBefore = array_keys($this->app->getBindings());
        $loadedBefore   = array_keys($this->app->getLoadedProviders());

        $this->assertNull($provider->register(), 'register() is an empty stub today.');
        $this->assertNull($provider->boot(), 'boot() is an empty stub today.');

        $this->assertSame(
            $bindingsBefore,
            array_keys($this->app->getBindings()),
            'FINDING RSP-1: register() binds no service into the container.'
        );
        $this->assertSame(
            $loadedBefore,
            array_keys($this->app->getLoadedProviders()),
            'FINDING RSP-1: boot()/register() pull no other provider in behind them.'
        );

        // Nothing is deferred either, so there is no lazily-provided binding to resolve.
        $this->assertSame([], $provider->provides());

        // And the provider is not wired in: absent from config/app.php and never loaded.
        $this->assertNotContains(RequestServiceProvider::class, config('app.providers'));
        $this->assertArrayNotHasKey(RequestServiceProvider::class, $this->app->getLoadedProviders());
    }
}
