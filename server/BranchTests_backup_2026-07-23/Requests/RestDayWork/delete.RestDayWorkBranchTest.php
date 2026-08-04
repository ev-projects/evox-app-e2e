<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for RestDayWorkController::delete arm (destroy). Menu=Requests Page=RestDayWork.
 *
 * SKIPPED arms: none. (repo->destroy is IoC-mocked, so no real delete fires.)
 *
 * Routes (module prefix request/rest_day_work/, mounted under /api):
 *   DELETE /api/request/rest_day_work/{id} -> destroy()
 */

namespace Tests\Feature\BranchTests\Requests\RestDayWork;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class RestDayWorkDeleteBranchTest extends TestCase
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

    /** IoC-mock EVERY constructor dep. Returns [rest_day_work, dtr, email]. */
    private function mockAllDeps(): array
    {
        return [
            $this->bindMock(RestDayWorkRepositoryInterface::class),
            $this->bindMock(DtrRepositoryInterface::class),
            $this->bindMock(EmailRepositoryInterface::class),
        ];
    }

    // ================================================================== destroy()
    // Branches: try -> repo->destroy -> 200; catch -> error_response default 400.

    /** @test */
    public function destroy__delete__success__ok_200()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('destroy')->once()->andReturn(true);

        $res = $this->actingAs($this->user)->deleteJson('/api/request/rest_day_work/999999');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function destroy__delete__exception__error_400()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('destroy')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->deleteJson('/api/request/rest_day_work/999999');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
