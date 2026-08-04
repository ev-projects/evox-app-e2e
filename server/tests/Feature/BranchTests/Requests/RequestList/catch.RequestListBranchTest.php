<?php

namespace Tests\Feature\BranchTests\Requests\RequestList;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Repositories\RequestRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;

/**
 * WAVE-2 CATCH-ARM PASS (2026-07-27). Menu=Requests Page=RequestList action=catch.
 * Companion to load./filter./submit.RequestListBranchTest — covers the catch arms of
 * RequestController that the 07-22 report shows uncovered, by IoC-mocking the injected
 * repos to THROW at each endpoint's first repo touch:
 *
 *   find (GET /api/request/)                      repo->where() throws -> catch L97 -> 404 (!)
 *   requestlistNumbers (GET request-numbers)      payroll_cutoff->get_payroll_cutoff() throws -> 400
 *   requestlistNumbers_dashboard                  same seam -> catch -> 400
 *   bulkRequest (POST bulk-request)               overtime->find() throws -> catch -> 400
 *
 * NOTE the find() catch deliberately returns HTTP_NOT_FOUND (404) unlike the others (400) —
 * asserted as-is (characterization of the inconsistency).
 * SKIPPED: requestlist catch (L153) — its try body runs $user->requests_list(), a User-model
 * method that goes straight to a stored procedure; no injectable seam exists pre-SP.
 * // SKIPPED-SP (BUG-078; unlockable by the StoredProcRunner refactor).
 * SAFETY: all nine constructor repos IoC-mocked; nothing live is reachable.
 */
class RequestListCatchBranchTest extends TestCase
{
    use DatabaseTransactions;

    private $user;
    private $mocks = [];

    private const IFACES = [
        PayrollCutoffRepositoryInterface::class,
        OvertimeRepositoryInterface::class,
        RequestRepositoryInterface::class,
        RestDayWorkRepositoryInterface::class,
        AlterLogRepositoryInterface::class,
        AlterLogPunchRepositoryInterface::class,
        ChangeScheduleRepositoryInterface::class,
        DtrRepositoryInterface::class,
        EmailRepositoryInterface::class,
    ];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
        $this->actingAs($this->user);

        foreach (self::IFACES as $iface) {
            $this->mocks[$iface] = Mockery::mock($iface);
            $this->app->instance($iface, $this->mocks[$iface]);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_find_catch_arm_returns_404_not_400()
    {
        // no request_type param -> controller loops REQUEST_TYPES; whichever typed repo is
        // touched first throws. All of them are armed so the order doesn't matter.
        foreach (self::IFACES as $iface) {
            $this->mocks[$iface]->shouldReceive('where')
                                ->andThrow(new \Exception('forced repo failure'));
        }

        $r = $this->getJson('/api/request/');

        // characterization: find()'s catch uses HTTP_NOT_FOUND, unlike every sibling (400)
        $r->assertStatus(404);
        $this->assertSame(trans('messages.error_default'), $r->json('error.message'));
        $this->assertSame('forced repo failure', $r->json('error.content'));
    }

    public function test_request_numbers_catch_arm_via_cutoff_throw()
    {
        $this->mocks[PayrollCutoffRepositoryInterface::class]
             ->shouldReceive('get_payroll_cutoff')->once()
             ->andThrow(new \Exception('forced repo failure'));
        // get_status_numbers must never be reached once the cutoff throws
        $this->mocks[RequestRepositoryInterface::class]
             ->shouldReceive('get_status_numbers')->never();

        $r = $this->getJson('/api/request/request-numbers');

        $r->assertStatus(400);
        $this->assertSame('forced repo failure', $r->json('error.content'));
    }

    public function test_request_numbers_dashboard_catch_arm_via_cutoff_throw()
    {
        $this->mocks[PayrollCutoffRepositoryInterface::class]
             ->shouldReceive('get_payroll_cutoff')->once()
             ->andThrow(new \Exception('forced repo failure'));
        $this->mocks[RequestRepositoryInterface::class]
             ->shouldReceive('get_status_numbers_only')->never();

        $r = $this->getJson('/api/request/request-numbers_dashboard');

        $r->assertStatus(400);
        $this->assertSame('forced repo failure', $r->json('error.content'));
    }

    public function test_bulk_request_catch_arm_via_overtime_find_throw()
    {
        $this->mocks[OvertimeRepositoryInterface::class]
             ->shouldReceive('find')->once()->with('123')
             ->andThrow(new \Exception('forced repo failure'));

        $r = $this->postJson('/api/request/bulk-request', [
            'checkedList' => ['123.overtimes'],
            'bulk_action' => 'approve',
        ]);

        $r->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $r->json('error.message'));
        $this->assertSame('forced repo failure', $r->json('error.content'));
    }
}
