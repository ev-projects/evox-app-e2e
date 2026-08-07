<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\EvoxLevels;
use App\Features;
use App\RoleLevelFeatures;
use App\UserFeatures;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;

/**
 * CLASS-COMPLETION for App\Modules\User\Models\User — finishes the methods UserModelSpFakeTest
 * leaves partial, and asserts the BUSINESS RULE behind each arm instead of "it returned something":
 *
 *   getUserInfo                        both department arms + the exact timezone payload formula
 *   direct_supervisor                  hit arm + BOTH empty-shape guards + SP params
 *   direct_supervisor_temp             the inner (query[0][0] invalid) guard the sibling misses
 *   direct_department_id               value equals the sub-department's parent + null arm
 *   department / team                  relation wiring (keys + pivot table), then a bounded resolve
 *   evox_departments_handled(_strict)  Name/DepartmentName/neither mapping arms, empty-result arm,
 *                                      LevelId=0 and LevelId=null short-circuits (SP never called),
 *                                      and the strict flag (arg #3 = 0 vs 1) that separates the two
 *   level_type                         HR + Payroll normalisation arms and the pass-through arm
 *   getFeatureAccess                   HR/Payroll-flavoured levels resolve to the BASE level id,
 *                                      plain levels keep their own id, null-level guard
 *   getFeatureAccessWithUnconditional  scoped to this user + left-joined to features, guard arm
 *   userFeatures                       grant (merge) arm AND revoke (array_diff) arm, guard arm
 *
 * Safety: all SP traffic goes through CallSpFake (App\Modules\User\Models is shadowed), every read
 * is a single probed row or a small reference table, and the only write (one user_features row,
 * needed to drive userFeatures' remove-list) is rolled back by DatabaseTransactions.
 */
class UserModelCompleteTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();

        $this->user = User::whereNotNull('LevelId')->where('LevelId', '!=', 0)
            ->where('is_active', 1)->orderBy('id', 'desc')->first();

        if (!$this->user) {
            $this->user = User::whereNotNull('LevelId')->orderBy('id', 'desc')->first();
        }
        if (!$this->user) $this->markTestSkipped('no user with a LevelId in test DB');

        $this->be($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    /** A user carrying a sub-department AND a resolvable country zone, or null. */
    private function probeWithSubDepartment()
    {
        $u = User::whereNotNull('SubDepartmentID')->whereNotNull('country_id')
            ->where('is_active', 1)->orderBy('id', 'desc')->first();

        return ($u && $u->country_zone()) ? $u : null;
    }

    /** An unsaved User pinned to one EVOX level — enough for level()/level_type()/getFeatureAccess(). */
    private function userAtLevel($levelId)
    {
        $u = new User();
        $u->LevelId = $levelId;

        return $u;
    }

    /**
     * getFeatureAccess() dereferences EvoxLevels::where('Name', 'HR'|'Payroll')->first()->LevelId
     * without a null check — skip rather than fatal if the base row is absent in this dump.
     */
    private function skipUnlessBaseLevelExists($type)
    {
        if (($type === 'HR' || $type === 'Payroll') && !EvoxLevels::where('Name', $type)->first()) {
            $this->markTestSkipped("EVOX_LEVELS has no base '$type' row — getFeatureAccess would fatal");
        }
    }

    // ------------------------------------------------------------------------- getUserInfo
    /** @test */
    public function get_user_info_reports_the_sub_department_name_and_the_derived_timezone_payload()
    {
        $u = $this->probeWithSubDepartment();
        if (!$u) $this->markTestSkipped('no user with SubDepartmentID + utc_timelog row');

        $sub = EvoxSubDepartment::where('Id', $u->SubDepartmentID)->first();
        if (!$sub) $this->markTestSkipped('SubDepartmentID points at a missing EVOX_SUB_DEPARTMENT row');

        $zone   = $u->country_zone();
        $offset = $u->country_timezone_to_offset();
        $info   = $u->getUserInfo();

        // department arm: the SubDepartmentID is resolved to its NAME, not its id
        $this->assertSame($sub->Name, $info['department']);
        $this->assertSame($u->getFullName(), $info['full_name']);
        $this->assertSame($u->timezone, $info['timezone']);

        // the offset the UI clocks off is the user's country offset expressed in seconds
        $this->assertSame(string_offset_to_seconds($offset), $info['user_offset_seconds']);
        $this->assertSame(
            $zone->country_name . ' ' . $zone->country_time_zone . '(' . $zone->time_difference . ')',
            $info['pov_timezone']
        );

        // server timestamp = UTC now shifted by that offset; the _mils twin is exactly x1000
        $this->assertSame($info['user_server_timestamp'] * 1000, $info['user_server_timestamp_mils']);
        $this->assertLessThanOrEqual(
            5,
            abs((\Carbon\Carbon::now()->timestamp + string_offset_to_seconds($offset)) - $info['user_server_timestamp'])
        );
    }

    /** @test */
    public function get_user_info_reports_a_null_department_when_the_user_has_no_sub_department()
    {
        $probe = $this->probeWithSubDepartment();
        if (!$probe) $this->markTestSkipped('no user with SubDepartmentID + utc_timelog row');

        $u = $probe->replicate();                 // in-memory copy, never saved
        $u->SubDepartmentID = null;

        $info = $u->getUserInfo();

        $this->assertNull($info['department']);   // the is_valid() false arm
        $this->assertSame($probe->getFullName(), $info['full_name']);
    }

    // -------------------------------------------------------------------- direct_supervisor
    /** @test */
    public function direct_supervisor_returns_the_user_the_sp_names_and_passes_only_the_user_id()
    {
        $supervisor = User::where('id', '!=', $this->user->id)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$supervisor) $this->markTestSkipped('need a second user in test DB');

        CallSpFake::fake('EH_SP_Direct_Supervisor', [[(object) ['SupervisorId' => $supervisor->id]]]);

        $found = $this->user->direct_supervisor();

        $this->assertInstanceOf(User::class, $found);
        $this->assertSame($supervisor->id, $found->id);

        $calls = CallSpFake::callsFor('EH_SP_Direct_Supervisor');
        $this->assertCount(1, $calls);
        $this->assertSame([$this->user->id], $calls[0]['params']);
        $this->assertFalse($calls[0]['isExecute']);   // read, never an EXECUTE
    }

    /** @test */
    public function direct_supervisor_returns_an_empty_array_for_both_empty_sp_shapes()
    {
        // outer guard: no result set at all
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[]]);
        $this->assertSame([], $this->user->direct_supervisor());

        // inner guard: a result set that carries no first row
        CallSpFake::reset();
        CallSpFake::activate();
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[[]]]);
        $this->assertSame([], $this->user->direct_supervisor());
        $this->assertCount(1, CallSpFake::callsFor('EH_SP_Direct_Supervisor'));
    }

    /** @test */
    public function direct_supervisor_temp_also_falls_through_when_the_first_row_is_empty()
    {
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[[]]]);

        $this->assertSame([], $this->user->direct_supervisor_temp());
        $this->assertSame([$this->user->id],
            CallSpFake::callsFor('EH_SP_Direct_Supervisor')[0]['params']);
    }

    // ------------------------------------------------------------------ direct_department_id
    /** @test */
    public function direct_department_id_returns_the_parent_department_of_the_sub_department()
    {
        $u = User::whereNotNull('SubDepartmentID')->orderBy('id', 'desc')->first();
        if (!$u) $this->markTestSkipped('no user with a SubDepartmentID');

        $sub = EvoxSubDepartment::find($u->SubDepartmentID);
        if (!$sub) $this->markTestSkipped('SubDepartmentID points at a missing sub-department');

        $this->assertSame((int) $sub->DepartmentId, (int) $u->direct_department_id());

        $detached = $u->replicate();
        $detached->SubDepartmentID = null;
        $this->assertNull($detached->direct_department_id());   // null arm
    }

    // ------------------------------------------------------------------- department + team
    /** @test */
    public function department_relation_is_a_has_one_keyed_on_the_users_department_id()
    {
        $rel = $this->user->department();

        $this->assertInstanceOf(HasOne::class, $rel);
        $this->assertInstanceOf(Department::class, $rel->getRelated());
        $this->assertSame('departments.id', $rel->getQualifiedForeignKeyName());
        $this->assertSame('department_id', $rel->getLocalKeyName());

        $dept = $rel->first();                                   // bounded resolve
        if ($this->user->department_id && $dept) {
            $this->assertSame((int) $this->user->department_id, (int) $dept->id);
        } else {
            $this->assertNull($dept);
        }
    }

    /** @test */
    public function team_relation_is_a_many_to_many_through_the_team_users_pivot()
    {
        $rel = $this->user->team();

        $this->assertInstanceOf(BelongsToMany::class, $rel);
        $this->assertInstanceOf(Team::class, $rel->getRelated());
        $this->assertSame('team_users', $rel->getTable());
        $this->assertSame('user_id', $rel->getForeignPivotKeyName());
        $this->assertSame('team_id', $rel->getRelatedPivotKeyName());

        $teams = $rel->take(20)->get();                          // bounded resolve
        $this->assertLessThanOrEqual(20, $teams->count());
        foreach ($teams as $team) {
            $this->assertSame((int) $this->user->id, (int) $team->pivot->user_id);
        }
    }

    // ------------------------------------------------------- evox_departments_handled (+strict)
    /** @test */
    public function evox_departments_handled_maps_name_department_name_and_neither_and_asks_non_strict()
    {
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[
            (object) ['Id' => 11, 'Name' => 'Finance'],
            (object) ['Id' => 12, 'DepartmentName' => 'Information Technology'],
            (object) ['Id' => 13],
        ]]);

        $result = $this->user->evox_departments_handled();

        $this->assertCount(3, $result);
        $this->assertSame(11, $result[0]->id);
        $this->assertSame('Finance', $result[0]->department_name);              // Name arm
        $this->assertSame('Information Technology', $result[1]->department_name); // DepartmentName arm
        $this->assertNull($result[2]->department_name);                          // neither arm

        // arg #3 = 0 -> the permissive (non-strict) department list
        $this->assertSame([$this->user->id, null, 0, 1],
            CallSpFake::callsFor('EH_SP_Get_Department_By_UserId')[0]['params']);
    }

    /** @test */
    public function evox_departments_handled_strict_sends_the_strict_flag_but_maps_identically()
    {
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[
            (object) ['Id' => 21, 'DepartmentName' => 'Operations'],
            (object) ['Id' => 22, 'Name' => 'Legal'],
            (object) ['Id' => 23],
        ]]);

        $result = $this->user->evox_departments_handled_strict();

        $this->assertCount(3, $result);
        $this->assertSame(21, $result[0]->id);
        $this->assertSame('Operations', $result[0]->department_name);
        $this->assertSame('Legal', $result[1]->department_name);
        $this->assertNull($result[2]->department_name);

        // the ONLY difference from the non-strict twin is arg #3 = 1
        $this->assertSame([$this->user->id, null, 1, 1],
            CallSpFake::callsFor('EH_SP_Get_Department_By_UserId')[0]['params']);
    }

    /** @test */
    public function departments_handled_return_an_empty_list_when_the_sp_finds_nothing()
    {
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[]]);

        $this->assertSame([], $this->user->evox_departments_handled());
        $this->assertSame([], $this->user->evox_departments_handled_strict());
        $this->assertCount(2, CallSpFake::callsFor('EH_SP_Get_Department_By_UserId'));
    }

    /** @test */
    public function departments_handled_never_touch_the_sp_for_level_zero_or_a_missing_level()
    {
        $levelZero = $this->userAtLevel(0);
        $noLevel   = $this->userAtLevel(null);

        $this->assertSame([], $levelZero->evox_departments_handled());
        $this->assertSame([], $levelZero->evox_departments_handled_strict());
        $this->assertSame([], $noLevel->evox_departments_handled());
        $this->assertSame([], $noLevel->evox_departments_handled_strict());

        // business rule: an unlevelled user costs zero stored-procedure round-trips
        $this->assertSame([], CallSpFake::calls());
    }

    // ------------------------------------------------------------------------- level_type
    /** @test */
    public function level_type_collapses_every_hr_and_payroll_flavoured_level_to_its_base_label()
    {
        $checked = 0;

        foreach (EvoxLevels::where('Name', 'like', '%HR%')->take(20)->get() as $level) {
            $this->assertSame('HR', $this->userAtLevel($level->LevelId)->level_type(),
                "level '{$level->Name}' must report as HR");
            $checked++;
        }

        foreach (EvoxLevels::where('Name', 'like', '%Payroll%')->where('Name', 'not like', '%HR%')
                     ->take(20)->get() as $level) {
            $this->assertSame('Payroll', $this->userAtLevel($level->LevelId)->level_type(),
                "level '{$level->Name}' must report as Payroll");
            $checked++;
        }

        if (!$checked) $this->markTestSkipped('no HR/Payroll levels in EVOX_LEVELS');
    }

    /** @test */
    public function level_type_passes_other_level_names_through_untouched_and_drives_is_level()
    {
        $plain = EvoxLevels::where('Name', 'not like', '%HR%')
            ->where('Name', 'not like', '%Payroll%')->orderBy('LevelId')->first();
        if (!$plain) $this->markTestSkipped('every EVOX level is HR/Payroll flavoured');

        $u = $this->userAtLevel($plain->LevelId);

        $this->assertSame($plain->Name, $u->level_type());   // pass-through arm
        $this->assertTrue($u->isLevel($plain->Name));
        $this->assertFalse($u->isLevel('NoSuchLevel-' . uniqid()));
    }

    /**
     * FINDING USR-LEVELNORM-DEAD — getFeatureAccess() has two else-if arms
     *   `stripos($type,'payroll') !== false` / `stripos($type,'hr') !== false`
     * that can never run: level_type() already collapsed every such name to the exact strings
     * "Payroll"/"HR", which the FIRST arm consumes. Characterises today's behaviour; no app fix.
     *
     * @test
     */
    public function level_type_normalisation_makes_the_stripos_arms_of_get_feature_access_unreachable_FINDING_USR_LEVELNORM_DEAD()
    {
        $levels = EvoxLevels::orderBy('LevelId')->take(50)->get();
        if ($levels->isEmpty()) $this->markTestSkipped('EVOX_LEVELS is empty');

        foreach ($levels as $level) {
            $type = $this->userAtLevel($level->LevelId)->level_type();

            if (stripos($type, 'payroll') !== false) {
                $this->assertSame('Payroll', $type,
                    "level_type() must have normalised '{$level->Name}' before getFeatureAccess sees it");
            }
            if (stripos($type, 'hr') !== false) {
                $this->assertSame('HR', $type,
                    "level_type() must have normalised '{$level->Name}' before getFeatureAccess sees it");
            }
        }
    }

    // --------------------------------------------------------------------- getFeatureAccess
    /** @test */
    public function hr_and_payroll_flavoured_levels_inherit_the_base_levels_feature_set()
    {
        $checked = 0;

        foreach (['HR', 'Payroll'] as $type) {
            $base = EvoxLevels::where('Name', $type)->first();
            if (!$base) continue;

            $flavouredQuery = EvoxLevels::where('Name', 'like', '%' . $type . '%')
                ->where('Name', '!=', $type);
            if ($type === 'Payroll') {
                // a name carrying BOTH labels normalises to HR first — keep this arm unambiguous
                $flavouredQuery->where('Name', 'not like', '%HR%');
            }
            $flavoured = $flavouredQuery->first() ?: $base;

            $access   = $this->userAtLevel($flavoured->LevelId)->getFeatureAccess();
            $bindings = $access->getQuery()->getBindings();

            // the level filter is rewritten to the BASE level id
            $this->assertTrue(in_array($base->LevelId, $bindings),
                "getFeatureAccess for '{$flavoured->Name}' must filter on base $type level {$base->LevelId}");
            if ($flavoured->LevelId != $base->LevelId) {
                $this->assertFalse(in_array($flavoured->LevelId, $bindings),
                    "getFeatureAccess must NOT filter on the flavoured level {$flavoured->LevelId}");
            }
            $this->assertSame(
                RoleLevelFeatures::where('evox_levels_id', $base->LevelId)->count(),
                $access->count()
            );
            $checked++;
        }

        if (!$checked) $this->markTestSkipped('no base HR/Payroll level rows in EVOX_LEVELS');
    }

    /** @test */
    public function a_plain_level_keeps_its_own_id_and_a_user_without_a_level_gets_nothing()
    {
        $plain = EvoxLevels::where('Name', 'not like', '%HR%')
            ->where('Name', 'not like', '%Payroll%')->orderBy('LevelId')->first();

        if ($plain) {
            $access = $this->userAtLevel($plain->LevelId)->getFeatureAccess();
            $this->assertTrue(in_array($plain->LevelId, $access->getQuery()->getBindings()));
            $this->assertSame(
                RoleLevelFeatures::where('evox_levels_id', $plain->LevelId)->count(),
                $access->count()
            );
        }

        $this->assertSame([], $this->userAtLevel(null)->getFeatureAccess());       // guard arm
        $this->assertSame([], $this->userAtLevel(null)->getFeatureAccessWithUnconditional());
    }

    // ------------------------------------------------- getFeatureAccessWithUnconditional
    /** @test */
    public function unconditional_feature_access_is_scoped_to_this_user_and_left_joined_to_features()
    {
        $builder = $this->user->getFeatureAccessWithUnconditional();
        $query   = $builder->getQuery();

        $this->assertTrue(in_array($this->user->id, $query->getBindings()));
        $this->assertNotEmpty($query->joins);
        $this->assertSame('features', $query->joins[0]->table);
        $this->assertSame('left', $query->joins[0]->type);

        // every row it can return belongs to this user
        foreach ($builder->take(20)->get() as $row) {
            $this->assertSame((int) $this->user->id, (int) $row->user_id);
        }
    }

    // ------------------------------------------------------------------------ userFeatures
    /** @test */
    public function a_granted_feature_is_merged_in_and_an_explicitly_revoked_one_is_diffed_out()
    {
        $u = $this->user;
        if (!$u->level()->first()) $this->markTestSkipped('probe user LevelId has no EVOX_LEVELS row');
        $this->skipUnlessBaseLevelExists($u->level_type());

        $taken   = UserFeatures::where('user_id', $u->id)->pluck('feature_id')->toArray();
        $feature = Features::whereNotIn('id', $taken ?: [0])->orderBy('id')->first();
        if (!$feature) $this->markTestSkipped('no unassigned feature row available to toggle');

        // ---- grant: the conditional list is merged into the level defaults
        $row = new UserFeatures();
        $row->user_id    = $u->id;
        $row->feature_id = $feature->id;
        $row->has_access = 1;
        $row->save();

        $granted = array_values($u->userFeatures());
        $this->assertTrue(in_array($feature->feature_name, $granted),
            "granted feature '{$feature->feature_name}' must appear in userFeatures()");
        $this->assertTrue($u->hasFeature($feature->feature_name));

        // ---- revoke: has_access = false wins even when the level grants the feature
        $row->has_access = 0;
        $row->save();

        $revoked = array_values($u->userFeatures());
        $this->assertFalse(in_array($feature->feature_name, $revoked),
            "revoked feature '{$feature->feature_name}' must be diffed out of userFeatures()");
        $this->assertFalse($u->hasFeature($feature->feature_name));

        // and nothing else moved
        $this->assertSame(array_values(array_diff($granted, [$feature->feature_name])), $revoked);
    }

    /** @test */
    public function a_user_without_a_level_has_no_features_at_all()
    {
        $noLevel = $this->userAtLevel(null);

        $this->assertSame([], $noLevel->userFeatures());
        $this->assertFalse($noLevel->hasFeature('manage_overtime_request'));
        $this->assertFalse($noLevel->hasFeature(null));
    }
}
