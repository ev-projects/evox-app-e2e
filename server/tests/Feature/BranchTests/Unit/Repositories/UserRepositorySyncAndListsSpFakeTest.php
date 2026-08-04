<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Spatie\Permission\Models\Role;
use App\Modules\Department\Models\Department;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\User\Repositories\UserRepository;

/**
 * REAL UserRepository — the arms left open by UserRepositoryBhrSyncSpFakeTest (2026-07-28):
 * update_bhr_user_to_evox / update_bhr_user_country_to_evox (real row update, rolled back) and the
 * two SP-walled list builders new_get_my_team_list / get_dpa_list (Menu=MyTeam + Admin=DPA List).
 * App\Modules\User\Repositories is CallSpFake-shadowed; no live SP, no BHR HTTP (the $bhr_user
 * payload is a plain object exactly as syncBhrUsers builds it).
 *
 * FINDING USR-NULL-1: get_dpa_list returns $collection which is NEVER initialized when the SP
 * result has <= 1 row-blocks — undefined-variable notice on the empty path. Only the populated
 * arm is executed here.
 */
class UserRepositorySyncAndListsSpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var UserRepository */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = new UserRepository();

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

    private function bhrPayload(array $overrides = [])
    {
        return (object) array_merge([
            'bestEmail' => 'seam.update@evox.test',
            'employeeNumber' => '12',                  // 2-char -> zero-pad arm
            'id' => '99012',
            'firstName' => 'Seam', 'middleName' => null, 'lastName' => 'Updated',
            'employmentHistoryStatus' => 'Regular', 'nickname' => 'SU',
            'hireDate' => '2020-01-15',
            'terminationDate' => '0000-00-00',         // active arm + skip termination_date arm
            'jobTitle' => 'QA Engineer', 'mobilePhone' => '0917',
            'country' => null,                         // overridden per test
            'dateOfBirth' => '1990-05-05',             // birthdate-set arm
            'department' => null,                      // overridden per test
        ], $overrides);
    }

    // ------------------------------------------------------- update_bhr_user_to_evox
    /** @test */
    public function update_bhr_user_full_arm_pads_number_maps_country_and_department()
    {
        if (!Role::where('name', 'admin')->exists()) {
            $this->markTestSkipped('no admin role in test DB (department supervisor sync needs it)');
        }
        $utcRow = UtcTimelog::whereNotNull('country_name')->first();
        $dept = Department::whereNotNull('department_name')->first();
        if (!$utcRow || !$dept) $this->markTestSkipped('missing UtcTimelog/Department fixtures');

        $out = $this->repo->update_bhr_user_to_evox($this->user, $this->bhrPayload([
            'country' => $utcRow->country_name,        // UTC match arm
            'department' => $dept->department_name,    // existing-department arm
        ]), new UtcTimelog());

        $this->assertSame('012', $out->emp_num);       // zero-pad arm
        $this->assertSame('seam.update@evox.test', $out->email);
        $this->assertTrue((bool) $out->is_active);
        $this->assertEquals($utcRow->country_id, $out->country_id);
        $this->assertStringContainsString('1990-05-05', (string) $out->birthdate);
        $this->assertEquals($dept->id, $out->department_id);
        // persisted inside the txn
        $this->assertSame('012', User::find($this->user->id)->emp_num);
    }

    /** @test */
    public function update_bhr_user_without_email_skips_everything()
    {
        $originalEmpNum = $this->user->emp_num;

        $out = $this->repo->update_bhr_user_to_evox($this->user,
            $this->bhrPayload(['bestEmail' => null]), new UtcTimelog());

        $this->assertSame($originalEmpNum, $out->emp_num);   // skip arm — nothing touched
    }

    /** @test */
    public function update_bhr_user_country_variant_sets_country_only()
    {
        $utcRow = UtcTimelog::whereNotNull('country_name')->first();
        if (!$utcRow) $this->markTestSkipped('no UtcTimelog row in test DB');
        $originalEmpNum = $this->user->emp_num;

        $out = $this->repo->update_bhr_user_country_to_evox($this->user,
            $this->bhrPayload(['country' => $utcRow->country_name]), new UtcTimelog());

        $this->assertEquals($utcRow->country_id, $out->country_id);
        $this->assertSame($originalEmpNum, $out->emp_num);   // country variant leaves the rest alone
    }

    // --------------------------------------------------------- new_get_my_team_list
    /** 3 row-blocks: employees, pagination, filler — the count>2 shape the method expects. */
    private function teamListBlocks(array $names)
    {
        $emps = array_map(function ($n) {
            return (object) ['Employee_Name' => $n, 'job_title' => 'QA'];
        }, $names);
        return [
            $emps,
            [(object) ['PerPage' => 15, 'TotalCount' => 30, 'CurrentPage' => 1]],
            [],
        ];
    }

    /** @test */
    public function team_list_default_path_passes_filters_and_paginates_from_sp()
    {
        CallSpFake::fake('EH_SP_Employee_List', $this->teamListBlocks(['Alice', 'Bob']));
        request()->merge([
            'department_id' => 5, 'status' => 0, 'name' => 'ann', 'job_title' => 'QA', 'page' => 2,
        ]);

        $out = $this->repo->new_get_my_team_list($this->user->id);

        $this->assertCount(2, $out['data']);
        $this->assertSame('Alice', $out['data'][0]->Employee_Name);
        $this->assertSame(30, $out['pagination']['total']);
        $this->assertSame(1, $out['pagination']['current_page']);   // from the SP's CurrentPage
        $this->assertEquals(2, $out['pagination']['last_page']);    // ceil(30/15)

        $p = CallSpFake::callsFor('EH_SP_Employee_List')[0]['params'];
        $this->assertSame([$this->user->id, 5, null], [$p[0], $p[2], $p[3]]);
        $this->assertSame(0, $p[4]);                                // status filter
        $this->assertSame(['ann', 'QA', 2, 15], [$p[5], $p[6], $p[7], $p[8]]);
    }

    /** @test */
    public function team_list_order_by_fetches_all_rows_and_sorts_in_php()
    {
        CallSpFake::fake('EH_SP_Employee_List', $this->teamListBlocks(['Bob', 'Alice', 'Cara']));
        request()->merge(['order_by' => 'name:desc', 'page' => 1]);

        $out = $this->repo->new_get_my_team_list($this->user->id);

        $this->assertSame(['Cara', 'Bob', 'Alice'],
            array_map(function ($e) { return $e->Employee_Name; }, $out['data']));
        $this->assertSame(1, $out['pagination']['current_page']);   // from request page, not SP

        $p = CallSpFake::callsFor('EH_SP_Employee_List')[0]['params'];
        $this->assertSame(1, $p[7]);                                // page forced to 1
        $this->assertSame(99999, $p[8]);                            // fetch-all perpage
    }

    /** @test */
    public function team_list_short_response_returns_empty_collection()
    {
        CallSpFake::fake('EH_SP_Employee_List', [[], []]);          // count <= 2 arm

        $this->assertSame([], $this->repo->new_get_my_team_list($this->user->id));
    }

    // ----------------------------------------------------------------- get_dpa_list
    /** @test */
    public function dpa_list_maps_rows_and_pagination_with_export_all_widening()
    {
        CallSpFake::fake('EH_SP_Employee_DPA_List', [
            [
                (object) ['id' => 7, 'Employee_Number' => '007', 'Name' => 'IT',
                          'is_active' => '1', 'Employee_Name' => 'Alice', 'Status' => '2026-01-01'],
                (object) ['UserId' => 8, 'Employee_Number' => '008', 'Name' => null,
                          'is_active' => '0', 'Employee_Name' => 'Bob', 'Status' => null],
            ],
            [(object) ['TotalCount' => 2, 'PerPage' => 10, 'CurrentPage' => 1]],
        ]);
        request()->merge(['department_id' => 3, 'is_active' => 1, 'name' => 'a', 'page' => 1]);

        $out = $this->repo->get_dpa_list(request());

        $this->assertSame(7, $out['data'][0]->id);                  // id arm
        $this->assertSame(8, $out['data'][1]->id);                  // UserId fallback arm
        $this->assertSame('IT', $out['data'][0]->department);
        $this->assertNull($out['data'][1]->department);             // invalid-Name arm
        $this->assertSame(0, $out['data'][1]->is_active);
        $this->assertSame(2, $out['pagination']['total']);
        $this->assertSame(10, $out['pagination']['per_page']);
        $this->assertEquals(1, $out['pagination']['last_page']);

        $p = CallSpFake::callsFor('EH_SP_Employee_DPA_List')[0]['params'];
        $this->assertSame([3, 1, 'a'], [$p[2], $p[3], $p[4]]);
        $this->assertSame(10, $p[7]);                               // default perpage

        // export=all arm widens the page size
        request()->merge(['export' => 'all']);
        $this->repo->get_dpa_list(request());
        $p2 = CallSpFake::callsFor('EH_SP_Employee_DPA_List')[1]['params'];
        $this->assertSame(99999, $p2[7]);
    }
}
