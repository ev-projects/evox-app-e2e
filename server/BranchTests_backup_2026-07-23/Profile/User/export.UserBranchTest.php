<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for UserController::export arms. Menu=Profile Page=User.
 *
 * Covers export_dpa_list. This method is a single straight-line path (NO try/catch, NO if): it calls
 * dpa_list($request) -> $this->user->get_dpa_list($request), then Excel::download(...). The only branch
 * is the happy path. UserRepositoryInterface is IoC-mocked; Excel::fake() intercepts the download so no
 * file is written. There is no catch arm to author (no try/catch in the method).
 *
 * SKIPPED arms: none reachable to skip (no error/exception branch exists in export_dpa_list).
 *
 * Route (module api.php mounted under /api):
 *   GET /api/user/export_dpa_list -> export_dpa_list()
 */

namespace Tests\Feature\BranchTests\Profile\User;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;

class UserExportBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    protected function bindMock(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ========================================================== export_dpa_list()
    /** @test */
    public function export_dpa_list__export__ok__download_200()
    {
        Excel::fake();
        $user = $this->bindMock(UserRepositoryInterface::class);
        // dpa_list() returns $this->user->get_dpa_list(); export reads $result["data"].
        $user->shouldReceive('get_dpa_list')->once()->andReturn(['data' => []]);

        $res = $this->getJson('/api/user/export_dpa_list');

        $res->assertStatus(200);
    }
}
