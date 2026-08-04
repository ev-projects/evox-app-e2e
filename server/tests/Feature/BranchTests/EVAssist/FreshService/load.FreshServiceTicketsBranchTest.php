<?php

namespace Tests\Feature\BranchTests\EVAssist\FreshService;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Ixudra\Curl\Facades\Curl;
use App\Modules\User\Models\User;

/**
 * WAVE-2 REACHABILITY PASS (2026-07-27). Menu=EVAssist Page=FreshServiceTickets action=load/submit.
 * Covers the previously-untested ticket read/reply methods of FreshServiceController
 * (59% before this; the ticket methods were the uncovered pool):
 *   GET  /api/freshservice/tickets/my-tickets      -> getMyTickets
 *   GET  /api/freshservice/tickets/{id}/           -> getTicket
 *   GET  /api/freshservice/tickets/{id}/conversations -> getTicketConversation
 *   POST /api/freshservice/tickets/{id}/reply      -> sendTicketConversation
 *   POST /api/freshservice/tickets/                -> createTicket (error + catch arms only)
 *
 * EVERY arm incl. the catch blocks is covered: the Ixudra Curl FACADE is mocked per test
 * (success 200 / non-200 with message|title variants / to() THROWS -> catch -> error_response 400).
 * Zero live HTTP. Reachability: all five methods route-wired in routes/api.php:67-80.
 *
 * SKIPPED arms:
 *  - getWorkspaces: entirely SP-walled (EV_FS_Get_Category x3, call_sp inline). // SKIPPED-SP (BUG-078)
 *  - createTicket SUCCESS arm: fires call_sp('EV_SP_FS_Ticket_Count') after the Curl 200. // SKIPPED-SP
 *    (its non-200 + catch arms return BEFORE the SP and are covered here).
 */
class FreshServiceTicketsBranchTest extends TestCase
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
        $this->user = User::where('is_active', 1)->whereNotNull('email')->first() ?? User::first();
        if (!$this->user || empty($this->user->email)) {
            $this->markTestIncomplete('no active user with email in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Curl builder returning $response from $verb; every chain method self-returns. */
    private function curlReturns($response, $verb = 'get')
    {
        $builder = Mockery::mock();
        foreach (['withHeader', 'withTimeout', 'withConnectTimeout', 'returnResponseObject', 'withData', 'asJson'] as $m) {
            $builder->shouldReceive($m)->andReturnSelf();
        }
        $builder->shouldReceive($verb)->andReturn($response);
        Curl::shouldReceive('to')->andReturn($builder);
    }

    private function curlThrows()
    {
        Curl::shouldReceive('to')->andThrow(new \Exception('connection refused'));
    }

    // ---------------- getMyTickets ----------------

    public function test_my_tickets_success_returns_fs_payload()
    {
        $this->curlReturns((object) ['status' => 200, 'content' => (object) ['tickets' => [['id' => 1]]]]);

        $r = $this->getJson('/api/freshservice/tickets/my-tickets?status=open&page=1&limit=10');

        $r->assertStatus(200);
        $this->assertNotNull($r->json('content'));
    }

    public function test_my_tickets_non_200_uses_fs_message_and_returns_400()
    {
        $this->curlReturns((object) ['status' => 502, 'content' => (object) ['message' => 'FS upstream down']]);

        $r = $this->getJson('/api/freshservice/tickets/my-tickets?page=1&limit=10');

        $r->assertStatus(400);
        $this->assertSame('FS upstream down', $r->json('error.message'));
    }

    public function test_my_tickets_non_200_title_overrides_message()
    {
        $this->curlReturns((object) ['status' => 401, 'content' => (object) ['message' => 'm', 'title' => 'Auth failed']]);

        $r = $this->getJson('/api/freshservice/tickets/my-tickets?page=1&limit=10');

        $r->assertStatus(400);
        $this->assertSame('Auth failed', $r->json('error.message'));
    }

    public function test_my_tickets_curl_throw_hits_catch_arm()
    {
        $this->curlThrows();

        $r = $this->getJson('/api/freshservice/tickets/my-tickets?page=1&limit=10');

        $r->assertStatus(400);
        $this->assertSame('connection refused', $r->json('error.content'));
    }

    // ---------------- getTicket ----------------

    public function test_get_ticket_success()
    {
        $this->curlReturns((object) ['status' => 200, 'content' => (object) ['ticket' => ['id' => 5]]]);

        $this->getJson('/api/freshservice/tickets/5/')->assertStatus(200);
    }

    public function test_get_ticket_non_200_returns_400_with_default_error()
    {
        $this->curlReturns((object) ['status' => 404, 'content' => (object) []]);

        $r = $this->getJson('/api/freshservice/tickets/999999/');

        $r->assertStatus(400);
        $this->assertSame('Could not load ticket detais, please try again.', $r->json('error.message'));
    }

    public function test_get_ticket_curl_throw_hits_catch_arm()
    {
        $this->curlThrows();

        $this->getJson('/api/freshservice/tickets/5/')->assertStatus(400);
    }

    // ---------------- getTicketConversation ----------------

    public function test_conversations_success()
    {
        $this->curlReturns((object) ['status' => 200, 'content' => (object) ['conversations' => []]]);

        $this->getJson('/api/freshservice/tickets/5/conversations')->assertStatus(200);
    }

    public function test_conversations_non_200_returns_400()
    {
        $this->curlReturns((object) ['status' => 500, 'content' => (object) ['title' => 'FS 500']]);

        $r = $this->getJson('/api/freshservice/tickets/5/conversations');

        $r->assertStatus(400);
        $this->assertSame('FS 500', $r->json('error.message'));
    }

    public function test_conversations_curl_throw_hits_catch_arm()
    {
        $this->curlThrows();

        $this->getJson('/api/freshservice/tickets/5/conversations')->assertStatus(400);
    }

    // ---------------- sendTicketConversation ----------------

    public function test_reply_success_posts_body_and_returns_200()
    {
        $this->curlReturns((object) ['status' => 200, 'content' => (object) ['conversation' => ['id' => 9]]], 'post');

        $r = $this->postJson('/api/freshservice/tickets/5/reply', [
            'id' => 5, 'body' => 'reply text', 'requester_id' => 1, 'attachments' => [], 'cc_emails' => [],
        ]);

        $r->assertStatus(200);
    }

    public function test_reply_non_200_returns_400()
    {
        $this->curlReturns((object) ['status' => 422, 'content' => (object) ['message' => 'body missing']], 'post');

        $r = $this->postJson('/api/freshservice/tickets/5/reply', ['id' => 5]);

        $r->assertStatus(400);
        $this->assertSame('body missing', $r->json('error.message'));
    }

    public function test_reply_curl_throw_hits_catch_arm()
    {
        $this->curlThrows();

        $this->postJson('/api/freshservice/tickets/5/reply', ['id' => 5, 'body' => 'x'])->assertStatus(400);
    }

    // ---------------- createTicket (pre-SP arms only) ----------------

    public function test_create_ticket_non_200_returns_400_before_reaching_sp()
    {
        // non-200 arm returns BEFORE call_sp('EV_SP_FS_Ticket_Count') — safe.
        $this->curlReturns((object) ['status' => 429, 'content' => (object) ['message' => 'rate limited']], 'post');

        $r = $this->postJson('/api/freshservice/tickets/', [
            'subject' => 's', 'description' => 'd', 'priority' => 1, 'status' => 2, 'workspace_id' => 1,
        ]);

        $r->assertStatus(400);
        $this->assertSame('rate limited', $r->json('error.message'));
    }

    public function test_create_ticket_curl_throw_hits_catch_arm()
    {
        $this->curlThrows();

        $this->postJson('/api/freshservice/tickets/', ['subject' => 's'])->assertStatus(400);
    }

    // createTicket SUCCESS arm intentionally absent: // SKIPPED-SP EV_SP_FS_Ticket_Count (BUG-078)
    // getWorkspaces intentionally absent: // SKIPPED-SP EV_FS_Get_Category x3 (BUG-078)
}
