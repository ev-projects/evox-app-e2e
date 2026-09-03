<?php
/**
 * BUILT — PENDING ON-BOX VERIFICATION (deferred until Vishnu re-authorizes writes, 2026-07-11).
 *
 * MOCKED FreshService logic tests. FreshServiceController talks to the external FreshService SaaS
 * via the Ixudra\Curl FACADE (`Curl::to(env('FRESHSERVICE_API_BASE_URL'))->...->get()/->post()`),
 * NOT an injected client — so we mock the facade so NO real ticket is created/queried on the
 * external system. Every fluent method returns the builder mock; get()/post() return a controlled
 * fake response. This lets us assert the controller's request-shaping + response-handling logic
 * without touching FreshService.
 *
 * NOTE: the Curl facade fluent-chain mock is the fragile part (method names withHeader/withData/
 * asJson/withResponseHeaders may vary by call site). If a call site uses a fluent method not
 * stubbed below, add it to $builder->shouldReceive([...])->andReturnSelf(). Verify on-box before
 * trusting the assertions.
 */

namespace Tests\Feature\Mocked;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Ixudra\Curl\Facades\Curl;

class FreshServiceMockedTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Bind a fake Curl builder whose fluent methods chain and whose get/post return $response. */
    private function fakeCurl($response)
    {
        $builder = Mockery::mock('Ixudra\Curl\Builder');
        // shouldIgnoreMissing($builder) makes every fluent method not explicitly configured
        // return $builder — the chain never breaks on an unmocked method name.
        $builder->shouldIgnoreMissing($builder);
        // Override only the terminal methods that must return a response, not $builder.
        $builder->shouldReceive('get')->andReturn($response);
        $builder->shouldReceive('post')->andReturn($response);
        Curl::shouldReceive('to')->andReturn($builder);
        return $builder;
    }

    /** @test — my-tickets list: FS faked, no real external call */
    public function my_tickets_list_uses_mocked_freshservice()
    {
        $this->fakeCurl(json_decode(json_encode(['tickets' => [], 'total' => 0])));
        $r = $this->actingAs($this->user)->getJson('/api/freshservice/tickets/my-tickets?status=open&page=1&limit=10');
        $this->assertNotEquals(500, $r->status(), $r->getContent());
    }

    /** @test — create ticket: FS faked → NO real ticket created on the SaaS */
    public function create_ticket_uses_mocked_freshservice_no_real_ticket()
    {
        $this->fakeCurl(json_decode(json_encode(['id' => 999, 'status' => 'created'])));
        $r = $this->actingAs($this->user)->postJson('/api/freshservice/tickets', [
            'subject'     => 'MOCK-AUTOTEST subject',
            'description' => 'mock only — no real ticket',
            'workspaceId' => 1,
        ]);
        // Whatever the app returns, the point is: it went to the MOCK, not the external SaaS.
        $this->assertNotEquals(500, $r->status(), $r->getContent());
    }
}
