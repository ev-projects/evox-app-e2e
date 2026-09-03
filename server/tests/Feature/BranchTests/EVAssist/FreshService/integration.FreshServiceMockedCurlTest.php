<?php
/**
 * SOURCE UNDER TEST: app/Http/Controllers/FreshServiceController.php
 * MENU PATH:         EVAssist -> FreshService (tickets)
 * MEASURED COVERAGE AT AUTHORING (lines-%): getWorkspaces 88.89, createTicket 97.56, getTicket 92,
 *   sendTicketConversation 96.67, getTicketConversation 96, saveTicketImage 81.25,
 *   saveAttachment 19.61, getUserSuggestions 66.67.
 *
 * FINDINGS:
 *  // FINDING FS-ATT-OCTET (dead line, NOT a bug report): saveAttachment()'s
 *     `if (($mimeType == 'application/octet-stream') and ($extension == 'pdf'))` coercion cannot be
 *     reached through the route. The `mimes:...` rule that runs first resolves the upload with the
 *     SAME finfo magic lookup, so a payload finfo reports as application/octet-stream guesses the
 *     extension "bin", fails validation, and returns through the ValidationException arm long before
 *     the coercion line. Reaching it requires calling the method with a payload no upload form can
 *     produce, so it is left uncovered on purpose rather than tested by bypassing the UI.
 *
 * NO REAL HTTP: every outbound Ixudra\Curl call is replaced by a Mockery builder (the
 * FreshServiceWorkspacesSpFakeTest pattern); every stored procedure goes through CallSpFake.
 * saveAttachment() deliberately runs against the REAL local disk (Storage::fake would move the
 * disk root away from storage_path('app/...') that the controller reads back with finfo); the
 * controller deletes its own temp file and tearDown sweeps anything it left behind.
 */

namespace Tests\Feature\BranchTests\EVAssist\FreshService;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Ixudra\Curl\Facades\Curl;
use App\Modules\User\Models\User;

class FreshServiceMockedCurlIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    /** Absolute paths this test created on the real local disk. */
    private $tempPaths = [];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();
        $this->withoutMiddleware();

        $this->user = User::where('is_active', 1)->whereNotNull('email')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user with an email in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        foreach ($this->tempPaths as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Curl facade stub. $capture receives ['url' => ..., 'data' => ...] so the request the
     * controller SHAPES can be asserted, not merely that a call happened.
     */
    private function fakeCurl($response, $verb, &$capture = null)
    {
        $capture = ['url' => null, 'data' => null];
        $builder = Mockery::mock();
        foreach (['withHeader', 'withHeaders', 'withTimeout', 'withConnectTimeout',
                  'returnResponseObject', 'asJson'] as $chain) {
            $builder->shouldReceive($chain)->andReturnSelf();
        }
        $builder->shouldReceive('withData')->andReturnUsing(function ($data) use (&$capture, $builder) {
            $capture['data'] = $data;
            return $builder;
        });
        $builder->shouldReceive($verb)->andReturn($response);
        Curl::shouldReceive('to')->andReturnUsing(function ($url) use (&$capture, $builder) {
            $capture['url'] = $url;
            return $builder;
        });
        return $builder;
    }

    /** Curl facade stub whose very first call blows up — drives the catch(Exception) arms. */
    private function failingCurl($message = 'freshservice unreachable')
    {
        Curl::shouldReceive('to')->andThrow(new \Exception($message));
    }

    // ============================================================== getWorkspaces()

    // The stored procedure failing must be reported as a handled 400, never as an uncaught 500:
    // FreshServiceController DOES import Exception, so its catch is live (unlike the sibling
    // App\Http\Controllers classes whose catch(Exception) is dead).
    /** @test */
    public function workspaces_stored_procedure_failure_is_reported_as_a_handled_error()
    {
        // EV_FS_Get_Category intentionally NOT faked -> CallSpFake throws RuntimeException.
        $res = $this->getJson('/api/freshservice/workspaces');

        $res->assertStatus(400);
        $this->assertSame(
            'Could not load workspaces, please try again.',
            $res->json('error.message')
        );
    }

    // A workspace whose category lookup comes back empty must not add a categories entry, and the
    // sub-category cascade must not run for it.
    /** @test */
    public function workspace_with_no_categories_yields_empty_category_and_subcategory_maps()
    {
        CallSpFake::fake('EV_FS_Get_Category', function ($params) {
            if ($params[0] === 1) return [[(object) ['Id' => 77, 'Name' => 'Facilities']]];
            return [[]];                                   // level 2 empty -> level 3 never called
        });

        $res = $this->getJson('/api/freshservice/workspaces');

        $res->assertStatus(200);
        $content = $res->json('content');
        $this->assertSame('Facilities', $content[0][0]['Name']);
        $this->assertSame([], $content[1]);                // categories map empty
        $this->assertSame([], $content[2]);                // sub-categories map empty
        $this->assertCount(2, CallSpFake::calls());        // workspace + one category probe only
    }

    // ================================================================ createTicket()

    // A non-200 from FreshService must surface the upstream `title` (it is preferred over `message`)
    // and must NOT record a ticket count.
    /** @test */
    public function creating_a_ticket_rejected_upstream_returns_the_upstream_title_and_records_no_count()
    {
        $this->fakeCurl((object) [
            'status'  => 422,
            'content' => (object) ['message' => 'generic message', 'title' => 'Subject is required'],
        ], 'post', $capture);

        $res = $this->postJson('/api/freshservice/tickets', [
            'description' => 'body', 'priority' => '2', 'status' => '3',
            'subject' => '', 'workspace_id' => '4', 'attachments' => [], 'cc_emails' => [],
        ]);

        $res->assertStatus(400);
        $this->assertSame('Subject is required', $res->json('error.message'));
        $this->assertCount(0, CallSpFake::callsFor('EV_SP_FS_Ticket_Count'));
    }

    // The outgoing payload must coerce priority/status/workspace_id to integers and stamp the
    // authenticated user's own email, whatever the client posted.
    /** @test */
    public function creating_a_ticket_coerces_numeric_fields_and_stamps_the_callers_email()
    {
        $ticket = (object) [
            'id' => 8100, 'requester_id' => 11, 'created_at' => '2026-08-18T09:00:00Z', 'workspace_id' => 4,
        ];
        $this->fakeCurl((object) ['status' => 200, 'content' => (object) ['ticket' => $ticket]], 'post', $capture);
        CallSpFake::fake('EV_SP_FS_Ticket_Count', [[]]);

        $res = $this->postJson('/api/freshservice/tickets', [
            'description' => 'printer jammed', 'priority' => '2', 'status' => '3',
            'subject' => 'Printer', 'workspace_id' => '4',
            'attachments' => ['a.png'], 'cc_emails' => ['x@y.com'],
        ]);

        $res->assertStatus(200);
        $this->assertSame(2, $capture['data']['priority']);
        $this->assertSame(3, $capture['data']['status']);
        $this->assertSame(4, $capture['data']['workspace_id']);
        $this->assertSame($this->user->email, $capture['data']['email']);
        $this->assertSame(['a.png'], $capture['data']['attachments']);
        $this->assertSame(['x@y.com'], $capture['data']['cc_emails']);
        $this->assertStringContainsString('userEmail=' . urlencode($this->user->email), $capture['url']);
    }

    // Transport failure must become the generic default message, not the FreshService one.
    /** @test */
    public function creating_a_ticket_when_the_transport_fails_returns_the_default_error()
    {
        $this->failingCurl();

        $res = $this->postJson('/api/freshservice/tickets', [
            'description' => 'x', 'priority' => 1, 'status' => 2, 'subject' => 's', 'workspace_id' => 1,
        ]);

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertCount(0, CallSpFake::callsFor('EV_SP_FS_Ticket_Count'));
    }

    // =================================================================== getTicket()

    /** @test */
    public function fetching_a_ticket_returns_the_upstream_body_and_scopes_the_url_to_the_caller()
    {
        $this->fakeCurl((object) [
            'status'  => 200,
            'content' => (object) ['id' => 4242, 'subject' => 'Laptop replacement'],
        ], 'get', $capture);

        $res = $this->getJson('/api/freshservice/tickets/4242');

        $res->assertStatus(200);
        $this->assertSame(4242, $res->json('content.id'));
        $this->assertSame('Laptop replacement', $res->json('content.subject'));
        $this->assertStringContainsString('/tickets/4242?userEmail=' . urlencode($this->user->email), $capture['url']);
    }

    // Non-200 with only `message` set (no `title`) must surface `message`.
    /** @test */
    public function fetching_a_ticket_that_upstream_rejects_returns_the_upstream_message()
    {
        $this->fakeCurl((object) [
            'status' => 404, 'content' => (object) ['message' => 'Ticket not found'],
        ], 'get', $capture);

        $res = $this->getJson('/api/freshservice/tickets/999999');

        $res->assertStatus(400);
        $this->assertSame('Ticket not found', $res->json('error.message'));
    }

    // Non-200 with neither message nor title falls back to the controller's own wording.
    /** @test */
    public function fetching_a_ticket_with_an_opaque_upstream_failure_uses_the_fallback_wording()
    {
        $this->fakeCurl((object) ['status' => 503, 'content' => (object) []], 'get', $capture);

        $res = $this->getJson('/api/freshservice/tickets/12');

        $res->assertStatus(400);
        $this->assertSame('Could not load ticket detais, please try again.', $res->json('error.message'));
    }

    /** @test */
    public function fetching_a_ticket_when_the_transport_fails_returns_the_load_failure_message()
    {
        $this->failingCurl();

        $res = $this->getJson('/api/freshservice/tickets/12');

        $res->assertStatus(400);
        $this->assertSame('Could not load ticket details, please try again.', $res->json('error.message'));
    }

    // ====================================================== sendTicketConversation()

    /** @test */
    public function replying_to_a_ticket_sends_body_requester_attachments_and_cc_to_the_reply_endpoint()
    {
        $this->fakeCurl((object) [
            'status' => 200, 'content' => (object) ['id' => 55, 'body' => 'thanks'],
        ], 'post', $capture);

        $res = $this->postJson('/api/freshservice/tickets/4242/reply', [
            'id' => 4242, 'body' => 'thanks', 'requester_id' => 77,
            'attachments' => ['b.png'], 'cc_emails' => ['boss@y.com'],
        ]);

        $res->assertStatus(200);
        $this->assertSame(55, $res->json('content.id'));
        $this->assertSame('thanks', $capture['data']['body']);
        $this->assertSame(77, $capture['data']['user_id']);      // requester_id is re-keyed to user_id
        $this->assertSame(['b.png'], $capture['data']['attachments']);
        $this->assertSame(['boss@y.com'], $capture['data']['cc_emails']);
        $this->assertStringContainsString('/reply?userEmail=', $capture['url']);
    }

    /** @test */
    public function replying_to_a_ticket_rejected_upstream_returns_the_upstream_title()
    {
        $this->fakeCurl((object) [
            'status' => 400, 'content' => (object) ['title' => 'Body cannot be blank'],
        ], 'post', $capture);

        $res = $this->postJson('/api/freshservice/tickets/4242/reply', ['id' => 4242, 'body' => '']);

        $res->assertStatus(400);
        $this->assertSame('Body cannot be blank', $res->json('error.message'));
    }

    /** @test */
    public function replying_to_a_ticket_when_the_transport_fails_returns_the_reply_failure_message()
    {
        $this->failingCurl();

        $res = $this->postJson('/api/freshservice/tickets/4242/reply', ['id' => 4242, 'body' => 'hi']);

        $res->assertStatus(400);
        $this->assertSame('Could not create ticket reply, please try again.', $res->json('error.message'));
    }

    // ======================================================= getTicketConversation()

    /** @test */
    public function fetching_ticket_conversations_returns_the_upstream_list()
    {
        $this->fakeCurl((object) [
            'status'  => 200,
            'content' => (object) ['conversations' => [['id' => 1, 'body' => 'first']]],
        ], 'get', $capture);

        $res = $this->getJson('/api/freshservice/tickets/4242/conversations');

        $res->assertStatus(200);
        $this->assertSame('first', $res->json('content.conversations.0.body'));
        $this->assertStringContainsString('/conversations?userEmail=', $capture['url']);
    }

    /** @test */
    public function fetching_ticket_conversations_rejected_upstream_returns_the_upstream_message()
    {
        $this->fakeCurl((object) [
            'status' => 403, 'content' => (object) ['message' => 'Not your ticket'],
        ], 'get', $capture);

        $res = $this->getJson('/api/freshservice/tickets/4242/conversations');

        $res->assertStatus(400);
        $this->assertSame('Not your ticket', $res->json('error.message'));
    }

    /** @test */
    public function fetching_ticket_conversations_when_the_transport_fails_returns_the_load_message()
    {
        $this->failingCurl();

        $res = $this->getJson('/api/freshservice/tickets/4242/conversations');

        $res->assertStatus(400);
        $this->assertSame('Could not load ticket conversations, please try again.', $res->json('error.message'));
    }

    // ============================================================= saveTicketImage()

    // A non-image upload must be rejected: validate() throws, the catch turns it into the
    // size/type guidance message. (The no-file and happy arms live in submit.FreshServiceBranchTest.)
    /** @test */
    public function uploading_a_non_image_as_a_ticket_image_is_rejected_with_the_type_guidance()
    {
        $file = UploadedFile::fake()->create('contract.pdf', 40);

        $res = $this->post('/api/freshservice/tickets/upload-image',
            ['file' => $file], ['Accept' => 'application/json']);

        $res->assertStatus(400);
        $this->assertStringContainsString('jpeg, jpg, png', $res->json('error.message'));
    }

    // Over the 5MB ceiling the same guarded arm fires rather than a raw 422/500.
    /** @test */
    public function uploading_a_ticket_image_over_five_megabytes_is_rejected()
    {
        $file = UploadedFile::fake()->create('huge.jpg', 6000, 'image/jpeg');   // 6000 KB > max:5120

        $res = $this->post('/api/freshservice/tickets/upload-image',
            ['file' => $file], ['Accept' => 'application/json']);

        $res->assertStatus(400);
        $this->assertStringContainsString('not more than 5MB', $res->json('error.message'));
    }

    // ============================================================== saveAttachment()

    /** Real (non-faked) local-disk upload with deterministic content. */
    private function realUpload($name, $contents)
    {
        $file = UploadedFile::fake()->create($name, 1);
        file_put_contents($file->getRealPath(), $contents);
        $this->tempPaths[] = $file->getRealPath();
        return $file;
    }

    /** Files currently staged under storage/app/temp by saveAttachment(). */
    private function stagedUploads()
    {
        return glob(storage_path('app/temp/upload_*')) ?: [];
    }

    // The full happy path: the file is base64-encoded, named, typed and posted to the
    // workspace-scoped attachments endpoint, then the temp copy is removed from disk.
    /** @test */
    public function uploading_an_attachment_posts_base64_content_with_its_original_name_and_cleans_up()
    {
        $body = "line one\nline two\n";
        $file = $this->realUpload('runbook.txt', $body);
        $before = $this->stagedUploads();
        $this->fakeCurl((object) [
            'status' => 200, 'content' => (object) ['id' => 'att_1', 'name' => 'runbook.txt'],
        ], 'post', $capture);

        $res = $this->post('/api/freshservice/tickets/attachments',
            ['attachment' => $file, 'workspace_id' => 4], ['Accept' => 'application/json']);

        $res->assertStatus(200);
        $this->assertSame('att_1', $res->json('content.id'));

        // withData([$fileInfo]) — a single-element list holding the file descriptor.
        $this->assertCount(1, $capture['data']);
        $sent = $capture['data'][0];
        $this->assertSame('runbook.txt', $sent['fileName']);
        $this->assertSame(base64_encode($body), $sent['contentBase64']);
        $this->assertTrue($sent['exists']);
        $this->assertNotEmpty($sent['contentType']);
        $this->assertStringContainsString('/tickets/4/attachments', $capture['url']);

        // The staged copy under storage/app/temp is deleted before the response is built.
        $this->assertSame($before, $this->stagedUploads());
    }

    // Upstream rejection of an attachment surfaces the upstream message, not the local guidance.
    /** @test */
    public function an_attachment_rejected_upstream_returns_the_upstream_message()
    {
        $file = $this->realUpload('runbook.txt', 'payload');
        $this->fakeCurl((object) [
            'status' => 413, 'content' => (object) ['message' => 'Attachment too large for workspace'],
        ], 'post', $capture);

        $res = $this->post('/api/freshservice/tickets/attachments',
            ['attachment' => $file, 'workspace_id' => 4], ['Accept' => 'application/json']);

        $res->assertStatus(400);
        $this->assertSame('Attachment too large for workspace', $res->json('error.message'));
    }

    // A transport failure takes the generic catch, which echoes the raw exception message —
    // distinguishable from the ValidationException arm's fixed guidance text.
    /** @test */
    public function an_attachment_upload_whose_transport_fails_echoes_the_transport_error()
    {
        $file = $this->realUpload('runbook.txt', 'payload');
        $this->failingCurl('connection reset by peer');

        $res = $this->post('/api/freshservice/tickets/attachments',
            ['attachment' => $file, 'workspace_id' => 4], ['Accept' => 'application/json']);

        $res->assertStatus(400);
        $this->assertSame('connection reset by peer', $res->json('error.message'));
    }

    // Disallowed extension: validate() throws BEFORE any staging or transport work.
    // The ValidationException arm answers with ONE combined sentence covering both the size rule and
    // the type rule, so the assertion pins the TYPE clause — the rule this scenario actually broke.
    /** @test */
    public function an_attachment_with_a_disallowed_extension_is_rejected_before_any_upload()
    {
        $file = $this->realUpload('payload.exe', 'MZ');
        $before = $this->stagedUploads();
        Curl::shouldReceive('to')->never();          // rejection must precede any outbound call

        $res = $this->post('/api/freshservice/tickets/attachments',
            ['attachment' => $file, 'workspace_id' => 4], ['Accept' => 'application/json']);

        $res->assertStatus(400);
        $this->assertSame(
            'Could not upload your attachment, please make sure it is not more than 5MB in size. '
            . 'The file must be a type of: jpeg, jpg, png, gif, bmp, webp, pdf, doc, docx, xls, '
            . 'xlsx, txt, or csv.',
            $res->json('error.message')
        );
        $this->assertStringContainsString(
            'must be a type of: jpeg, jpg, png, gif, bmp, webp, pdf, doc, docx, xls, xlsx, txt, or csv',
            $res->json('error.message')
        );
        $this->assertSame($before, $this->stagedUploads());
    }

    // ========================================================== getUserSuggestions()

    // Each match is rendered as "First Last <email> - Job title".
    /** @test */
    public function user_suggestions_render_each_match_as_name_email_and_job_title()
    {
        Curl::shouldReceive('to')->never();          // the directory is local; FreshService is not asked

        $res = $this->getJson('/api/freshservice/users/suggestions?keyword=' . urlencode($this->user->email));

        $res->assertStatus(200);
        $suggestions = $res->json();
        $this->assertNotEmpty($suggestions);
        $this->assertContains(sprintf(
            '%s %s <%s> - %s',
            $this->user->first_name, $this->user->last_name, $this->user->email, $this->user->job_title
        ), $suggestions);
    }

    // No match -> an empty list, not an error and not the full directory.
    /** @test */
    public function user_suggestions_return_an_empty_list_when_nothing_matches()
    {
        Curl::shouldReceive('to')->never();          // a miss must not fall back to a remote lookup

        $res = $this->getJson('/api/freshservice/users/suggestions?keyword=zzz-no-such-mailbox-zzz');

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
    }
}
