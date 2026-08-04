<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for RequestController::find / requestlistNumbers /
 * requestlistNumbers_dashboard (read/list "load" arms). Menu=Requests Page=RequestList.
 *
 * Routes (module prefix `request`, mounted under /api):
 *   GET /api/request/                           -> find()                          (RequestFilterRequest)  error=404 (HTTP_NOT_FOUND)
 *   GET /api/request/request-numbers            -> requestlistNumbers()            error=400 (default)
 *   GET /api/request/request-numbers_dashboard  -> requestlistNumbers_dashboard()  error=400 (default)
 *   GET /api/request/rest_day_work/myrequests   -> RequestController@allrequest    ** MISSING METHOD **
 *
 * FINDINGS:
 *   // FINDING (Bug): route request/rest_day_work/myrequests -> RequestController@allrequest, but the
 *     controller defines NO allrequest() method. Dispatch throws BadMethodCallException -> HTTP 500.
 *     allrequest__load__unimplemented__error_500() asserts CURRENT (buggy) reality.
 *
 * SKIPPED arms: none in this file (all load arms are SP-free once repos are IoC-mocked).
 *
 * NOTE: requestlistNumbers() success mocks the CONCRETE RequestRepository because the interface types
 * get_status_numbers(array $data,...) but the controller passes a Request object; an interface mock's
 * typed signature would raise a TypeError before the stub is hit.
 */

namespace Tests\Feature\BranchTests\Requests\RequestList;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Request\Repositories\RequestRepositoryInterface;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;

class RequestListLoadBranchTest extends TestCase
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
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Bind a Mockery mock for an interface into the container. */
    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ======================================================================= find()
    // if( isset(request_type) && isset($this->{request_type}) ) -> where() ; else foreach REQUEST_TYPES
    // try -> success_response 200 ; catch(Exception) -> error_response 404 (HTTP_NOT_FOUND)

    /** @test  if-branch taken (request_type=overtime valid + set property) -> where() -> 200 */
    public function find__load__request_type_set__success_200()
    {
        $this->mockDep(OvertimeRepositoryInterface::class)->shouldReceive('where')->once()->andReturn([]);

        $res = $this->getJson('/api/request/?request_type=overtime');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  if-branch -> where() throws -> catch(Exception) -> 404 */
    public function find__load__exception__error_404()
    {
        $this->mockDep(OvertimeRepositoryInterface::class)->shouldReceive('where')->once()
             ->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/request/?request_type=overtime');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test  else-branch (no request_type) -> foreach get_constant('REQUEST_TYPES') where() on each set repo -> 200 */
    public function find__load__no_request_type__success_200()
    {
        $this->mockDep(OvertimeRepositoryInterface::class)->shouldReceive('where')->once()->andReturn([]);
        $this->mockDep(AlterLogRepositoryInterface::class)->shouldReceive('where')->once()->andReturn([]);
        $this->mockDep(RestDayWorkRepositoryInterface::class)->shouldReceive('where')->once()->andReturn([]);
        $this->mockDep(ChangeScheduleRepositoryInterface::class)->shouldReceive('where')->once()->andReturn([]);
        $this->mockDep(AlterLogPunchRepositoryInterface::class)->shouldReceive('where')->once()->andReturn([]);

        $res = $this->getJson('/api/request/');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // =========================================================== requestlistNumbers()
    // try -> success_response 200 ; catch(Exception) -> error_response 400 (default)

    /** @test  success -> 200 */
    public function requestlistNumbers__load__success__success_200()
    {
        $reqRepo = Mockery::mock(\App\Modules\Request\Repositories\RequestRepository::class);
        $this->app->instance(RequestRepositoryInterface::class, $reqRepo);
        $reqRepo->shouldReceive('get_status_numbers')->once()->andReturn(['pending' => 0]);

        $this->mockDep(PayrollCutoffRepositoryInterface::class)->shouldReceive('get_payroll_cutoff')->once()
             ->andReturn((object) ['start_date' => '2026-07-01', 'end_date' => '2026-07-15']);

        $res = $this->getJson('/api/request/request-numbers');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  cutoff repo throws during arg evaluation -> catch -> 400 */
    public function requestlistNumbers__load__exception__error_400()
    {
        $this->mockDep(PayrollCutoffRepositoryInterface::class)->shouldReceive('get_payroll_cutoff')->once()
             ->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/request/request-numbers');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =================================================== requestlistNumbers_dashboard()
    // try -> success_response 200 ; catch(Exception) -> error_response 400 (default)
    // get_status_numbers_only($user,$cutoff) is untyped on the interface, so the interface mock is safe.

    /** @test  success -> 200 */
    public function requestlistNumbers_dashboard__load__success__success_200()
    {
        $this->mockDep(RequestRepositoryInterface::class)->shouldReceive('get_status_numbers_only')->once()
             ->andReturn(['pending' => 0]);

        $this->mockDep(PayrollCutoffRepositoryInterface::class)->shouldReceive('get_payroll_cutoff')->once()
             ->andReturn((object) ['start_date' => '2026-07-01', 'end_date' => '2026-07-15']);

        $res = $this->getJson('/api/request/request-numbers_dashboard');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  cutoff repo throws -> catch -> 400 */
    public function requestlistNumbers_dashboard__load__exception__error_400()
    {
        $this->mockDep(PayrollCutoffRepositoryInterface::class)->shouldReceive('get_payroll_cutoff')->once()
             ->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/request/request-numbers_dashboard');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ==================================================================== allrequest()
    // FINDING (Bug): route request/rest_day_work/myrequests -> RequestController@allrequest, but the
    // controller defines NO allrequest() method -> BadMethodCallException -> HTTP 500. Asserting reality.
    /** @test */
    public function allrequest__load__unimplemented__error_500()
    {
        $res = $this->getJson('/api/request/rest_day_work/myrequests');

        // FINDING: unimplemented controller method; should be 200 once implemented.
        $res->assertStatus(500);
    }
}
