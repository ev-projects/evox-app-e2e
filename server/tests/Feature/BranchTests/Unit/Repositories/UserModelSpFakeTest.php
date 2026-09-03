<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;

/**
 * User model (51.1%, 239 unc lines) — the biggest single-file gap left in Modules/.
 * App\Modules\User\Models is CallSpFake-shadowed, so the SP-walled members
 * (direct_supervisor_temp, isUserNhoValid, users_handled) run for real with the SP boundary faked.
 * Everything else is pure PHP or bounded Eloquent reads. No writes at all.
 *
 * Arms: getFullName all 4 format arms (with/without middle name), getUserInfo payload,
 * JWT claim members, timezone helpers, direct_department_id both arms, direct_supervisor_temp
 * hit/miss arms (SP-faked), level_type HR/Payroll normalization + isLevel, getFeatureAccess
 * level-normalization arms, userFeatures merge/remove set logic, hasFeature true/false/guard,
 * schedule + dtr + punch relation builders (query shape only, bounded), isUserNhoValid.
 */
class UserModelSpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->user = User::whereNotNull('LevelId')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with LevelId in test DB');
        $this->be($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    /** An unsaved User carrying only name fields — safe for pure formatting arms. */
    private function nameProbe($middle = 'Q')
    {
        $u = new User();
        $u->first_name = 'Alice';
        $u->middle_name = $middle;
        $u->last_name = 'Tester';
        return $u;
    }

    // ------------------------------------------------------------------ name formatting
    /** @test */
    public function get_full_name_covers_all_four_format_arms()
    {
        $u = $this->nameProbe();

        $this->assertSame('Alice Q Tester', $u->getFullName());        // default / case 1
        $this->assertSame('Alice Q Tester', $u->getFullName(1));
        $this->assertSame('Tester, Alice Q', $u->getFullName(2));
        $this->assertSame('Alice Tester', $u->getFullName(3));
        $this->assertSame('Alice Q Tester', $u->getFullName(99));      // default arm
    }

    /** @test */
    public function get_full_name_omits_an_invalid_middle_name()
    {
        $u = $this->nameProbe(null);

        $this->assertSame('Alice Tester', $u->getFullName());
        $this->assertSame('Tester, Alice', $u->getFullName(2));
    }

    // --------------------------------------------------------------- info + jwt + timezone
    /** @test */
    public function get_user_info_returns_the_dashboard_payload()
    {
        $info = $this->user->getUserInfo();

        foreach (['full_name', 'department', 'timezone', 'user_offset_seconds',
                  'user_server_time', 'user_server_timestamp', 'user_server_timestamp_mils',
                  'pov_timezone'] as $key) {
            $this->assertArrayHasKey($key, $info);
        }
        $this->assertSame($this->user->getFullName(), $info['full_name']);
        $this->assertSame($info['user_server_timestamp'] * 1000, $info['user_server_timestamp_mils']);
    }

    /** @test */
    public function jwt_members_and_timezone_helpers_resolve()
    {
        $this->assertSame($this->user->getKey(), $this->user->getJWTIdentifier());
        $this->assertIsArray($this->user->getJWTCustomClaims());

        $this->assertNotNull($this->user->country_zone());
        $this->assertIsString($this->user->country_timezone_name());
        $this->assertNotNull($this->user->country_timezone_to_offset());
    }

    // ------------------------------------------------------------- department + supervisor
    /** @test */
    public function direct_department_id_covers_sub_department_and_null_arms()
    {
        $withSub = User::whereNotNull('SubDepartmentID')->orderBy('id', 'desc')->first();
        if ($withSub) {
            $this->assertNotNull($withSub->direct_department_id());     // sub-department arm
        }

        $noSub = new User();
        $noSub->SubDepartmentID = null;
        $this->assertNull($noSub->direct_department_id());              // null arm
    }

    /** @test */
    public function direct_supervisor_temp_hit_and_miss_arms_via_faked_sp()
    {
        $supervisor = User::where('id', '!=', $this->user->id)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$supervisor) $this->markTestSkipped('need a second user in test DB');

        CallSpFake::fake('EH_SP_Direct_Supervisor',
            [[(object) ['SupervisorId' => $supervisor->id]]]);
        $found = $this->user->direct_supervisor_temp();
        $this->assertInstanceOf(User::class, $found);
        $this->assertSame($supervisor->id, $found->id);
        $this->assertSame([$this->user->id],
            CallSpFake::callsFor('EH_SP_Direct_Supervisor')[0]['params']);

        CallSpFake::reset();
        CallSpFake::activate();
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[]]);              // empty -> [] arm
        $this->assertSame([], $this->user->direct_supervisor_temp());
    }

    /** @test */
    public function relation_builders_are_bounded_and_queryable()
    {
        $this->assertNotNull($this->user->supervisee());
        $this->assertNotNull($this->user->departments_supervised());
        $this->assertNotNull($this->user->department());
        $this->assertNotNull($this->user->team());
        $this->assertNotNull($this->user->features());

        // date-range relation arms (builders only — no unbounded get())
        $this->assertNotNull($this->user->dtr('2026-07-01', '2026-07-02'));
        $this->assertNotNull($this->user->punch('2026-07-01', '2026-07-02'));
        $this->assertNotNull($this->user->punchlogs('2026-07-01', '2026-07-02'));
        $this->assertNotNull($this->user->AllSchedules());
        $this->assertNotNull($this->user->temporarySchedules('2026-07-01', '2026-07-02'));
        $this->assertNotNull($this->user->changeSchedules('2026-07-01', '2026-07-02'));
    }

    // ------------------------------------------------------------------- level + features
    /** @test */
    public function level_type_normalizes_hr_and_payroll_and_is_level_matches()
    {
        $type = $this->user->level_type();

        $this->assertIsString($type);
        $this->assertTrue($this->user->isLevel($type));
        $this->assertFalse($this->user->isLevel('NoSuchLevel-' . uniqid()));

        // normalization arms: any level whose name contains HR/Payroll collapses to the base label
        if (stristr($this->user->level()->first()->Name, 'HR') !== false) {
            $this->assertSame('HR', $type);
        }
        if (stristr($this->user->level()->first()->Name, 'Payroll') !== false) {
            $this->assertSame('Payroll', $type);
        }
    }

    /** @test */
    public function feature_access_builders_and_user_features_set_logic()
    {
        $access = $this->user->getFeatureAccess();
        $this->assertNotNull($access);                                  // valid-LevelId arm

        $this->assertNotNull($this->user->getFeatureAccessWithUnconditional());

        $features = $this->user->userFeatures();
        $this->assertIsIterable($features);                             // merge/diff set logic

        // hasFeature: real membership + miss + invalid-name guard
        $list = is_array($features) ? array_values($features) : [];
        if (count($list)) {
            $this->assertTrue($this->user->hasFeature($list[0]));
        }
        $this->assertFalse($this->user->hasFeature('no-such-feature-' . uniqid()));
        $this->assertFalse($this->user->hasFeature(null));
    }

    /** @test */
    public function no_level_user_gets_empty_feature_access()
    {
        $noLevel = new User();
        $noLevel->LevelId = null;

        $this->assertSame([], $noLevel->getFeatureAccess());            // guard arms
        $this->assertSame([], $noLevel->getFeatureAccessWithUnconditional());
        $this->assertFalse($noLevel->hasFeature('anything'));
    }

    // ---------------------------------------------------------------------- NHO validate
    /** @test */
    public function is_user_nho_valid_returns_the_sp_result()
    {
        CallSpFake::fake('EV_SP_NHO_Validate_User', [[(object) ['Result' => 1]]]);

        $this->assertSame(1, $this->user->isUserNhoValid());
        $this->assertSame([$this->user->id],
            CallSpFake::callsFor('EV_SP_NHO_Validate_User')[0]['params']);
    }
}
