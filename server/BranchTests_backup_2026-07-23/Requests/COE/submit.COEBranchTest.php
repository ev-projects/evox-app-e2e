<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for COEController::create arms. Menu=Requests Page=COE.
 *
 * SKIPPED arms (forbidden by SPEC):
 *   // SKIPPED-EXTERNAL bhr->get_user_bhr_field is a real BHR/external call -> ALWAYS IoC-mocked here.
 *   // SKIPPED-DESTRUCTIVE the $employee-truthy success arm reaches $this->coe->create(...) (writes a COE
 *      record), log_to_audit_trail (INSERT), Storage disk reads and PDF::loadView->stream(). Not authored.
 *   // NOTE: the foreach inner `if ($coef->subf_field_name && strlen>0)` only mutates the $additional_fields
 *      array passed to the mocked bhr call; both outcomes flow to the same return, so no distinct branch
 *      outcome is testable before the destructive region -> not separately authored.
 * Covered branches (all return BEFORE any destructive/external call):
 *   - employee_id provided (User::find)  + bhr returns falsy -> if(!$employee) -> error_response 404
 *   - employee_id empty (auth()->user()) + bhr returns falsy -> if(!$employee) -> error_response 404
 *   - catch(Exception) -> error_response default 400
 *
 * Route: POST /api/request/coe -> create(COERequest) [COERequest requires purpose_index]
 */

namespace Tests\Feature\BranchTests\Requests\COE;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Coe\Repositories\COERepositoryInterface;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class COESubmitBranchTest extends TestCase
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

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'purpose_index' => 0,
            'session_id'    => 1,
        ], $overrides);
    }

    // ---------------------------------------------------------------- create()
    // if(!empty(employee_id)) TRUE -> User::find; bhr falsy -> if(!$employee) -> error_response 404
    /** @test */
    public function create__submit__employee_id_provided__not_found_404()
    {
        $this->bindMock(COERepositoryInterface::class);
        $bhr = $this->bindMock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()->andReturn(null);

        $res = $this->postJson('/api/request/coe', $this->payload(['employee_id' => $this->user->id]));

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // if(!empty(employee_id)) FALSE -> auth()->user(); bhr falsy -> if(!$employee) -> error_response 404
    /** @test */
    public function create__submit__auth_user__not_found_404()
    {
        $this->bindMock(COERepositoryInterface::class);
        $bhr = $this->bindMock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()->andReturn(null);

        $res = $this->postJson('/api/request/coe', $this->payload());

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // catch arm: bhr->get_user_bhr_field throws -> error_response default 400
    /** @test */
    public function create__submit__exception__error_400()
    {
        $this->bindMock(COERepositoryInterface::class);
        $bhr = $this->bindMock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()->andThrow(new Exception('boom'));

        $res = $this->postJson('/api/request/coe', $this->payload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
