<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Spatie\Permission\Models\Role;
use App\Modules\User\Repositories\UserRepository;
use App\Modules\User\Models\User;

/**
 * SP-FAKE SEAM ROLLOUT (2026-07-28) — UserRepository's BHR-sync bodies (the initial_sync_of_users /
 * sync_users cron core), REAL code, NO live BHR: the bhr_user input is a hand-built object shaped
 * exactly like BhrRepository's output (shape read from insert_bhr_user_to_evox itself). The $utc
 * parameter is a plain collection of {country_name, country_id} rows — no model dependency.
 * Seam ACTIVE as tripwire; show_via_bhr_number / insert / update are SP-free per static scan.
 * Everything transactional — the inserted user rolls back.
 */
class UserRepositoryBhrSyncSpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var UserRepository */
    private $repo;
    /** @var User */
    private $existing;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = app()->make(UserRepository::class);
        $this->existing = User::whereNotNull('bhr_num')->whereNotNull('email')->first();
        if (!$this->existing) $this->markTestIncomplete('no BHR-numbered user in test DB');
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    private function utc()
    {
        return collect([(object) ['country_name' => 'Philippine', 'country_id' => 1]]);
    }

    /** BHR-API-shaped user object (fields exactly as insert_bhr_user_to_evox reads them). */
    private function bhrUser(array $overrides = [])
    {
        $uniq = 'T' . substr(uniqid(), -6);
        $base = [
            'id' => 'BHRTEST-' . $uniq,             // bhr_num — guaranteed new
            'employeeNumber' => 'EVT-' . $uniq,
            'bestEmail' => "seamtest+$uniq@example.invalid",
            'firstName' => 'Seam', 'middleName' => 'F', 'lastName' => 'Test',
            'nickname' => 'seamy',
            'employmentHistoryStatus' => 'Regular',
            'hireDate' => '2026-01-05',
            'jobTitle' => 'QA Fixture',
            'mobilePhone' => '0900000000',
            'country' => 'Philippine',
            'dateOfBirth' => '1990-01-01',
            'terminationDate' => null,
            'department' => null,                    // null dept -> generate_department skipped arm
        ];
        return (object) array_merge($base, $overrides);
    }

    public function test_existing_bhr_number_returns_existing_user_without_insert()
    {
        $before = User::count();

        $result = $this->repo->insert_bhr_user_to_evox(
            $this->bhrUser(['id' => $this->existing->bhr_num]),
            $this->utc()
        );

        $this->assertSame($this->existing->id, $result->id);
        $this->assertSame($before, User::count());
        $this->assertSame([], CallSpFake::calls());
    }

    public function test_bhr_user_without_email_is_rejected_and_returns_null()
    {
        $before = User::count();

        $result = $this->repo->insert_bhr_user_to_evox(
            $this->bhrUser(['bestEmail' => null]),
            $this->utc()
        );

        $this->assertNull($result);
        $this->assertSame($before, User::count());
    }

    public function test_new_bhr_user_is_inserted_with_employee_role_and_country()
    {
        try { Role::findByName(get_constant('USER_ROLES.employee')); }
        catch (\Throwable $e) { $this->markTestIncomplete('employee role missing in test DB'); }

        $bhr = $this->bhrUser();

        $user = $this->repo->insert_bhr_user_to_evox($bhr, $this->utc());

        $this->assertNotNull($user);
        $this->assertNotNull($user->id);                       // persisted (rolls back after)
        $this->assertSame($bhr->id, $user->bhr_num);
        $this->assertSame($bhr->bestEmail, $user->email);
        $this->assertSame(1, $user->country_id);               // matched via the utc collection
        $this->assertTrue($user->hasRole(get_constant('USER_ROLES.employee')));
        $this->assertSame('1990-01-01', (string) $user->birthdate);
        $this->assertSame([], CallSpFake::calls());
    }

    public function test_two_char_employee_number_is_zero_padded()
    {
        try { Role::findByName(get_constant('USER_ROLES.employee')); }
        catch (\Throwable $e) { $this->markTestIncomplete('employee role missing in test DB'); }

        $user = $this->repo->insert_bhr_user_to_evox(
            $this->bhrUser(['employeeNumber' => '42']),
            $this->utc()
        );

        $this->assertSame('042', $user->emp_num);   // the strlen==2 padding arm
    }

    public function test_show_via_bhr_number_finds_and_misses()
    {
        $found = $this->repo->show_via_bhr_number($this->existing->bhr_num);
        $this->assertNotNull($found);
        $this->assertSame($this->existing->id, $found->id);

        $this->assertNull($this->repo->show_via_bhr_number('ZZ-NO-SUCH-' . uniqid()));
    }

    public function test_apply_user_supervisor_pivot_with_empty_array_returns_empty()
    {
        $this->assertSame([], $this->repo->apply_user_supervisor_pivot([]));
        $this->assertSame([], CallSpFake::calls());
    }

    public function test_apply_user_supervisor_pivot_links_supervisee_and_skips_unknown_bhr()
    {
        $result = $this->repo->apply_user_supervisor_pivot([
            $this->existing->bhr_num => [$this->existing->id],       // valid supervisor arm
            'ZZ-NO-SUCH-' . uniqid() => [999999],                     // unknown-supervisor skip arm
        ]);

        // only the valid supervisor lands in the result map (pivot write rolls back)
        $this->assertSame([$this->existing->id => [$this->existing->id]], $result);
    }
}
