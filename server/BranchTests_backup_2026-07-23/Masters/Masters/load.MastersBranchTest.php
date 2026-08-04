<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for MastersController::departments arms.
 * Menu=Masters Page=Masters.
 *
 * DEPENDENCY NOTE — MastersController takes NO constructor/injected dependencies. departments()
 * uses the DB facade directly (read-only correlated subquery over EVOX_DEPARTMENT / users), so
 * there is nothing to IoC-mock. The SUCCESS arm runs the real read-only query under
 * DatabaseTransactions (no writes); the CATCH arm is forced with
 * DB::shouldReceive('table')->andThrow(new Exception('boom')).
 *
 * NOTE: the ->map() closure's `$row->geo_id !== null ? (int)$row->geo_id : null` ternary is a
 * pure data-transform over real rows; both arms depend on the live-dump data and are exercised
 * inside the success arm — not independently forceable without reaching data-control/SP paths.
 *
 * No SKIPPED / no FINDING arms.
 *
 * Route (routes/api.php, mounted under /api):
 *   GET /api/masters/departments -> departments()
 */

namespace Tests\Feature\BranchTests\Masters\Masters;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class MastersLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // reach controller body past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestSkipped('no user in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Force the try/catch(Exception) arm by throwing from the first DB facade call. */
    private function dbThrows(string $method): void
    {
        DB::shouldReceive($method)->andThrow(new Exception('boom'));
    }

    // ------------------------------------------------------------------- departments()
    // Branch A: try succeeds -> read-only EVOX_DEPARTMENT query + map -> success_response 200 {message,content}.
    /** @test */
    public function departments__load__success__ok_200()
    {
        $res = $this->getJson('/api/masters/departments');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: DB::table throws -> catch(Exception) -> error_response(...,$e,HTTP_INTERNAL_SERVER_ERROR)
    //           -> 500 {error:{message,content}}.
    /** @test */
    public function departments__load__exception__error_500()
    {
        $this->dbThrows('table');

        $res = $this->getJson('/api/masters/departments');

        $res->assertStatus(500)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
