<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for RequestController::bulkRequest /
 * change_request_status_via_hash_code (mutating "submit" arms). Menu=Requests Page=RequestList.
 *
 * Routes (mounted under /api):
 *   POST /api/request/bulk-request  -> bulkRequest()                          error=400 (default)
 *   POST /api/request/approval/     -> change_request_status_via_hash_code()  error=400 (default)  (auth.apikey)
 *
 * SKIPPED arms (invoke stored procedures / destructive repo writes -> forbidden on live-dump DB):
 *   // SKIPPED-SP bulkRequest() every switch approve/deny/dispute arm calls request_validity_checker()
 *      (call_sp) and/or repo approve()/decline() + insertTo*Dispute() (call_sp). The
 *      `if(bulk_action==='approve' && has_dispute)` message arm also needs the dispute (SP) path.
 *      Only the empty-list success arm and the pre-validity exception arm (overtime->find throw,
 *      which fires BEFORE any call_sp) are SP-free and authored.
 *   // SKIPPED-DESTRUCTIVE change_request_status_via_hash_code() per-table cases
 *      (overtimes/rest_day_works/alter_logs/change_schedules) need real encrypted-hash records and
 *      run repo approve()/decline() (save/update) + dtr apply/remove/compute. Only the switch no-match
 *      (default) arm and the exception arm (undecryptable hash) are authored.
 *
 * Note: the public helpers insertToAlterLogDispute()/insertToOvertimeDispute()/insertToRestDayWorkDispute()
 * are not routed and each unconditionally calls call_sp('EV_SP_PD_Autoamtion_*') -> // SKIPPED-SP (no
 * HTTP-reachable branch without a stored procedure).
 */

namespace Tests\Feature\BranchTests\Requests\RequestList;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;

class RequestListSubmitBranchTest extends TestCase
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

    // ================================================================= bulkRequest()
    // try -> foreach checkedList { switch } -> success_response 200 ; catch(Exception) -> 400

    /** @test  empty checkedList -> foreach never runs -> has_dispute false -> default message -> 200 */
    public function bulkRequest__submit__empty_list__success_200()
    {
        $res = $this->postJson('/api/request/bulk-request', [
            'checkedList' => [],
            'bulk_action' => 'approve',
        ]);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  case "overtimes" -> overtime->find() throws BEFORE request_validity_checker (no SP) -> catch -> 400 */
    public function bulkRequest__submit__exception__error_400()
    {
        $this->bindMock(OvertimeRepositoryInterface::class)->shouldReceive('find')->once()
             ->andThrow(new Exception('boom'));

        $res = $this->postJson('/api/request/bulk-request', [
            'checkedList' => ['5.overtimes'],
            'bulk_action' => 'approve',
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ================================== change_request_status_via_hash_code()
    // try -> parse hash -> auth login -> switch(table) -> logout -> success_response 200 ; catch -> 400

    /** @test  valid hash whose table segment matches no case -> switch default -> logout -> 200 */
    public function change_request_status_via_hash_code__submit__switch_no_match__success_200()
    {
        // parse_hash_code_to_request_detail_array() decrypts "table|id|recipient"; recipient must be findable.
        $hash = encrypt('unknown_table|1|' . $this->user->id);

        $res = $this->postJson('/api/request/approval/', [
            'hash_code' => $hash,
            'status'    => 'approved',
        ]);

        $res->assertStatus(200);
    }

    /** @test  undecryptable hash -> parse rethrows DecryptException -> catch(Exception) -> 400 */
    public function change_request_status_via_hash_code__submit__bad_hash_exception__error_400()
    {
        $res = $this->postJson('/api/request/approval/', [
            'hash_code' => 'not-a-valid-cipher-text',
            'status'    => 'approved',
        ]);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
