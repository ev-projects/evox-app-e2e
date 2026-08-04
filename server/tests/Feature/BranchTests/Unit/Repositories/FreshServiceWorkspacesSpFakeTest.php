<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Ixudra\Curl\Facades\Curl;
use App\Modules\User\Models\User;

/**
 * FreshServiceController uncovered tail (Menu=EVAssist Page=FreshService — 70 unc lines).
 * The existing EVAssist branch tests cover the ticket read/reply/error arms; what was left:
 *   getWorkspaces()        — pure SP cascade (workspace -> categories -> sub-categories), seam-faked
 *   createTicket() SUCCESS — Curl facade mocked (MsHelperTest builder pattern) AND the follow-up
 *                            EV_SP_FS_Ticket_Count seam-faked with its params asserted
 * No FreshService HTTP, no live SP. Routes under /api/freshservice/, middleware bypassed.
 */
class FreshServiceWorkspacesSpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->whereNotNull('email')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user in test DB');
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** Curl facade mock whose final verb returns the given response object (MsHelperTest pattern). */
    private function fakeCurl($response, $verb = 'post')
    {
        $builder = Mockery::mock();
        foreach (['withHeader', 'withTimeout', 'withConnectTimeout', 'returnResponseObject', 'withData', 'asJson'] as $chain) {
            $builder->shouldReceive($chain)->andReturnSelf();
        }
        $builder->shouldReceive($verb)->andReturn($response);
        Curl::shouldReceive('to')->andReturn($builder);
        return $builder;
    }

    /** @test */
    public function workspaces_cascade_fetches_categories_and_sub_categories()
    {
        CallSpFake::fake('EV_FS_Get_Category', function ($params) {
            if ($params[0] === 1) return [[(object) ['Id' => 10, 'Name' => 'IT Support']]];
            if ($params[0] === 2) return [[(object) ['Id' => 20, 'Name' => 'Hardware']]];
            return [[(object) ['Id' => 30, 'Name' => 'Laptop']]];          // level 3
        });

        $res = $this->actingAs($this->user)->getJson('/api/freshservice/workspaces');

        $res->assertStatus(200);
        $content = $res->json('content');
        $this->assertSame('IT Support', $content[0][0]['Name']);           // workspaces
        $this->assertSame('Hardware', $content[1]['10'][0]['Name']);       // categories by workspace
        $this->assertSame('Laptop', $content[2]['20'][0]['Name']);         // sub-categories by category

        $calls = CallSpFake::callsFor('EV_FS_Get_Category');
        $this->assertCount(3, $calls);                                     // 1 ws + 1 cat + 1 subcat
        $this->assertSame([2, 10, null], $calls[1]['params']);
        $this->assertSame([3, 10, 20], $calls[2]['params']);
    }

    /** @test */
    public function workspaces_empty_result_returns_empty_content()
    {
        CallSpFake::fake('EV_FS_Get_Category', [[]]);

        $res = $this->actingAs($this->user)->getJson('/api/freshservice/workspaces');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
        $this->assertCount(1, CallSpFake::calls());                        // cascade never entered
    }

    /** @test */
    public function create_ticket_success_posts_to_fs_and_records_ticket_count_sp()
    {
        $ticket = (object) [
            'id' => 5001, 'requester_id' => 42, 'created_at' => '2026-08-01T10:00:00Z',
            'workspace_id' => 10,
        ];
        $this->fakeCurl((object) ['status' => 200, 'content' => (object) ['ticket' => $ticket]]);
        CallSpFake::fake('EV_SP_FS_Ticket_Count', [[]]);

        $res = $this->actingAs($this->user)->postJson('/api/freshservice/tickets', [
            'description' => 'live seam ticket', 'priority' => '1', 'status' => '2',
            'subject' => 'Seam Test', 'workspace_id' => '10',
            'attachments' => [], 'cc_emails' => [],
        ]);

        $res->assertStatus(200);
        $this->assertSame(5001, $res->json('content.id'));

        $sp = CallSpFake::callsFor('EV_SP_FS_Ticket_Count');
        $this->assertCount(1, $sp);
        $this->assertSame([5001, 42, '2026-08-01T10:00:00Z', 10, $this->user->id], $sp[0]['params']);
    }
}
