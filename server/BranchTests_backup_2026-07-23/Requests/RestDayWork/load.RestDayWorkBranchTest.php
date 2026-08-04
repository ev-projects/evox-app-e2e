<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for RestDayWorkController::load arm (find). Menu=Requests Page=RestDayWork.
 *
 * SKIPPED arms: none.
 *
 * Routes (module prefix request/rest_day_work/, mounted under /api):
 *   GET /api/request/rest_day_work/{id} -> find()
 */

namespace Tests\Feature\BranchTests\Requests\RestDayWork;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class RestDayWorkLoadBranchTest extends TestCase
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

    private function restDayWorkModel(): RestDayWork
    {
        $m = new RestDayWork();
        $m->user_id       = $this->user->id;
        $m->date          = '2099-12-25';
        $m->start_time    = 32400;
        $m->end_time      = 64800;
        $m->break_time    = 1800;
        $m->employee_note = 'authored branch test';
        $m->approver_note = null;
        $m->status        = 'pending';
        return $m;
    }

    // ===================================================================== find()
    // Branches: try -> repo->find -> resource -> 200; catch -> error_response HTTP_NOT_FOUND 404.

    /** @test */
    public function find__load__success__ok_200()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('find')->once()->andReturn($this->restDayWorkModel());

        $res = $this->actingAs($this->user)->getJson('/api/request/rest_day_work/999999');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function find__load__exception__error_404()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('find')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->getJson('/api/request/rest_day_work/999999');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
