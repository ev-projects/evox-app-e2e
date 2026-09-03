<?php
/**
 * COVERAGE WAVE 2026-08-19 — ProfileRepository, the last User-module repository with an entirely
 * untested method.
 *
 * Source under test:
 *   server/app/Modules/User/Repositories/ProfileRepository.php   store, update
 * Menu -> Page:  Profile -> My Profile (edit)
 * Route: PUT /api/user/{id}/profile -> ProfileController@update -> ProfileRepository::update.
 *   store() has NO route — ProfileController@store was removed on 2026-08-13 — so it is exercised
 *   by direct call, which is the only way it can now be reached.
 *
 * Coverage before this file: store 0%, update 66.67%.
 *
 * SEAM: Support/UserModuleHelperFake.php shadows log_to_file() inside
 * App\Modules\User\Repositories. Both methods wrap their body in try/catch and the only statements
 * inside store()'s try are log_to_file() calls, so arming the logger to fail is the one way to
 * reach either catch arm. It also proves something worth proving: the catch does DB::rollback(),
 * so a logging failure AFTER the profile row was written must leave the row unchanged.
 *
 * SAFETY: the profile edited here is a throwaway copy of a real user created inside the
 * DatabaseTransactions transaction; no live employee row is touched, and everything rolls back.
 */

namespace Tests\Feature\BranchTests\Profile\Profile;

require_once __DIR__ . '/../../Support/UserModuleHelperFake.php';

use Exception;
use Tests\TestCase;
use Tests\Support\UserModuleHelperFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\ProfileRepository;

class ProfileRepositorySubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var ProfileRepository */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new ProfileRepository();

        $template = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$template) {
            $this->markTestSkipped('no active user with a LevelId in test DB');
        }
        $this->user = $this->throwawayCopyOf($template);

        // resolve the guard before the seam is armed — log_error() reads auth()->user()
        $this->be($this->user);
        UserModuleHelperFake::activate();
    }

    protected function tearDown(): void
    {
        UserModuleHelperFake::reset();
        parent::tearDown();
    }

    private function throwawayCopyOf(User $template)
    {
        $uniq = substr(uniqid(), -8);
        $user = $template->replicate();
        $user->email = 'profileres+' . $uniq . '@example.invalid';
        $user->username = 'profileres_' . $uniq;
        $user->emp_num = 'PR' . $uniq;
        $user->bhr_num = 'PR' . $uniq;
        $user->first_name = 'Original';
        $user->last_name = 'Name';
        $user->mobile_number = '0900000000';
        $user->password = Hash::make('SeamPass-2026!');
        $user->save();

        return $user;
    }

    private function editRequest(array $fields = [])
    {
        return new Request(array_merge([
            'first_name' => 'Edited',
            'last_name' => 'Surname',
            'email' => 'edited+' . substr(uniqid(), -8) . '@example.invalid',
            'mobile_number' => '0917111222',
        ], $fields));
    }

    // ========================================================================== update()

    /** The profile form writes exactly four fields and nothing else on the employee row. */
    /** @test */
    public function update__writes_only_the_four_profile_fields()
    {
        $request = $this->editRequest();
        $originalJobTitle = $this->user->job_title;
        $originalLevel = $this->user->LevelId;
        $originalEmpNum = $this->user->emp_num;

        $out = $this->repo->update($this->user, $request);

        $this->assertSame('Edited', $out->first_name);
        $this->assertSame('Surname', $out->last_name);
        $this->assertSame($request->email, $out->email);
        $this->assertSame('0917111222', $out->mobile_number);

        $stored = User::find($this->user->id);
        $this->assertSame('Edited', $stored->first_name);
        $this->assertSame($request->email, $stored->email);
        // the form cannot reach employment or access data
        $this->assertSame($originalJobTitle, $stored->job_title);
        $this->assertEquals($originalLevel, $stored->LevelId);
        $this->assertSame($originalEmpNum, $stored->emp_num);
    }

    /** Fields the form omits are cleared, not preserved — the other arm of the same write. */
    /** @test */
    public function update__omitted_fields__are_cleared_rather_than_kept()
    {
        $out = $this->repo->update($this->user, new Request([
            'first_name' => 'OnlyFirst',
        ]));

        $this->assertSame('OnlyFirst', $out->first_name);
        $this->assertNull($out->last_name);
        $this->assertNull($out->mobile_number);
    }

    /**
     * Catch arm: the write is rolled back when anything after it fails, so a half-saved profile is
     * impossible. Asserted by failing the logger that runs immediately after $user->update().
     */
    /** @test */
    public function update__failure_after_the_write__rolls_the_profile_back_and_rethrows()
    {
        UserModuleHelperFake::failLogToFileWhenMessageContains(
            'User Profile successfully updated', new Exception('log channel unavailable'));

        $thrown = null;
        try {
            $this->repo->update($this->user, $this->editRequest());
        } catch (Exception $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'the repository must rethrow, never swallow the failure');
        $this->assertSame('log channel unavailable', $thrown->getMessage());

        $stored = User::find($this->user->id);
        $this->assertSame('Original', $stored->first_name);      // rolled back
        $this->assertSame('Name', $stored->last_name);
        $this->assertSame('0900000000', $stored->mobile_number);
    }

    // =========================================================================== store()

    /**
     * store() is a placeholder kept for the unfinished profile module: it opens a transaction,
     * logs, commits and hands the user straight back without writing anything. Characterised so
     * the day it grows a body, this test says so.
     */
    /** @test */
    public function store__returns_the_user_untouched_and_writes_nothing()
    {
        $before = User::find($this->user->id)->toArray();

        $out = $this->repo->store($this->user, $this->editRequest());

        $this->assertSame($this->user->id, $out->id);
        $this->assertSame('Original', $out->first_name);         // the request is ignored entirely
        $this->assertEquals($before, User::find($this->user->id)->toArray());
    }

    /** Catch arm. */
    /** @test */
    public function store__logging_failure__is_rolled_back_and_rethrown()
    {
        UserModuleHelperFake::failLogToFileWhenMessageContains(
            'User Profile successfully updated', new Exception('log channel unavailable'));

        $thrown = null;
        try {
            $this->repo->store($this->user, $this->editRequest());
        } catch (Exception $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'the repository must rethrow, never swallow the failure');
        $this->assertSame('log channel unavailable', $thrown->getMessage());
        $this->assertSame('Original', User::find($this->user->id)->first_name);
    }
}
