<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for FreshServiceController submit-type arms.
 * Menu=EVAssist Page=FreshService.
 *
 * EXTERNAL-FACING CONTROLLER — extra caution. Every ticket CRUD method issues a real
 * Ixudra\Curl HTTP call to FreshService (env('FRESHSERVICE_API_BASE_URL')). Only arms that
 * RETURN before any Curl call are authored here. Nothing in this file fires an outgoing request.
 *
 * AUTHORED arms (all return before any external HTTP call):
 *   saveTicketImage()  -> hasFile('file')==false  -> log + error_response(...) 400  [no external at all]
 *   saveTicketImage()  -> hasFile('file')==true    -> mimes-valid -> local Storage::fake storeAs
 *                                                     -> success_response 200        [no external at all]
 *   saveAttachment()   -> hasFile('attachment')==false -> log + error_response(messages.error_default) 400
 *   saveAttachment()   -> hasFile==true but $request->validate() fails (missing workspace_id)
 *                         -> throws ValidationException -> catch(ValidationException) -> error_response 400
 *                         (validation throws BEFORE the file is processed / before Curl::post)
 *
 * SKIPPED-EXTERNAL (reach a real Curl call with no earlier safe return — author nothing):
 *   createTicket()          -> Curl::to(.../tickets)->post()   (no pre-call guard/return)
 *   sendTicketConversation()-> Curl::to(.../reply)->post()     (no pre-call guard/return)
 *   saveAttachment() hasFile + valid arm -> after finfo/base64 it reaches Curl::to(.../attachments)->post()
 *   getWorkspaces()   [load]     -> first stmt is call_sp("EV_FS_Get_Category") -> // SKIPPED-SP
 *   getMyTickets()    [load]     -> Curl::to(.../my-tickets)->get() (is_valid ternaries do not return)
 *   getTicket()       [load]     -> Curl::to(.../{id})->get()
 *   getTicketConversation() [load] -> Curl::to(.../conversations)->get()
 *   The generic catch(Exception) of saveTicketImage/saveAttachment is only reachable via the
 *   external/Storage path, so it is not force-tested here (would require reaching the Curl call).
 *
 * No FINDING bugs in this controller.
 *
 * Routes (routes/api.php, group prefix 'freshservice/', mounted under /api):
 *   POST /api/freshservice/tickets/upload-image -> saveTicketImage()
 *   POST /api/freshservice/tickets/attachments  -> saveAttachment()
 *   POST /api/freshservice/tickets/             -> createTicket()            (SKIPPED-EXTERNAL)
 *   POST /api/freshservice/tickets/{id}/reply   -> sendTicketConversation() (SKIPPED-EXTERNAL)
 */

namespace Tests\Feature\BranchTests\EVAssist\FreshService;

use Tests\TestCase;
use Mockery;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class FreshServiceSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        Storage::fake('local');                     // storeAs default disk = local (FILESYSTEM_DRIVER)
        $this->withoutMiddleware();                 // reach controller body past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestIncomplete('no user in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ----------------------------------------------------------- saveTicketImage()
    // Branch A: hasFile('file') == false -> log_to_file + error_response(...) default 400.
    /** @test */
    public function saveTicketImage__submit__no_file__error_400()
    {
        $res = $this->postJson('/api/freshservice/tickets/upload-image', []);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch B: hasFile('file') == true, mimes valid -> local storeAs on faked disk -> success_response 200.
    //           (No external HTTP call in this method.)
    /** @test */
    public function saveTicketImage__submit__has_file__ok_200()
    {
        $file = UploadedFile::fake()->create('ticket.jpg', 120, 'image/jpeg');

        $res = $this->post('/api/freshservice/tickets/upload-image', ['file' => $file], ['Accept' => 'application/json']);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ----------------------------------------------------------- saveAttachment()
    // Branch A: hasFile('attachment') == false -> log + error_response(messages.error_default) default 400.
    /** @test */
    public function saveAttachment__submit__no_file__error_400()
    {
        $res = $this->postJson('/api/freshservice/tickets/attachments', []);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch B: hasFile == true but validation fails (workspace_id required|integer missing)
    //           -> $request->validate() throws ValidationException BEFORE any file processing / Curl
    //           -> catch(ValidationException) -> error_response(...) 400.
    /** @test */
    public function saveAttachment__submit__validation_error__error_400()
    {
        $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        // workspace_id intentionally omitted -> validation throws before the external Curl call.
        $res = $this->post('/api/freshservice/tickets/attachments', ['attachment' => $file], ['Accept' => 'application/json']);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
