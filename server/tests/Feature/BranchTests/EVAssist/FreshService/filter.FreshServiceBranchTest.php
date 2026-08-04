<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for FreshServiceController::getUserSuggestions.
 * Menu=EVAssist Page=FreshService.
 *
 * EXTERNAL-FACING CONTROLLER — extra caution. getUserSuggestions() is the ONE FreshService read
 * method that makes NO external HTTP call: it is a scoped Eloquent read over App\Modules\User\Models\User
 * (email LIKE %keyword% AND is_active=1) then response()->json($user_data).
 *
 * AUTHORED arms:
 *   getUserSuggestions() -> try succeeds -> response()->json($user_data) 200 (array).
 *     The query is scoped to a fixture user's exact email so it never scans the whole table.
 *
 * SKIPPED:
 *   getUserSuggestions() catch(Exception) -> not force-tested. It wraps a direct Eloquent query;
 *     forcing it would require breaking the query builder globally (no injected dep, no DB:: facade
 *     seam on the model chain), so per safety rules it is left uncovered rather than faked unsafely.
 *
 * Other FreshService reads (documented here for completeness — all reach an external call, author nothing):
 *   getWorkspaces()   [load] -> first stmt call_sp("EV_FS_Get_Category")            // SKIPPED-SP
 *   getMyTickets()    [load] -> Curl::to(.../my-tickets)->get()                     // SKIPPED-EXTERNAL
 *   getTicket()       [load] -> Curl::to(.../{id})->get()                           // SKIPPED-EXTERNAL
 *   getTicketConversation() [load] -> Curl::to(.../conversations)->get()            // SKIPPED-EXTERNAL
 *
 * No FINDING bugs.
 *
 * Route (routes/api.php, group prefix 'freshservice/', mounted under /api):
 *   GET /api/freshservice/users/suggestions?keyword=... -> getUserSuggestions()
 */

namespace Tests\Feature\BranchTests\EVAssist\FreshService;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class FreshServiceFilterBranchTest extends TestCase
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

    // ----------------------------------------------------------- getUserSuggestions()
    // Branch A: try succeeds -> scoped Eloquent read (keyword = fixture's exact email) -> json 200 array.
    /** @test */
    public function getUserSuggestions__filter__keyword_match__ok_200()
    {
        // Use the fixture's full (unique) email as keyword so the LIKE query is bounded to that row.
        $res = $this->getJson('/api/freshservice/users/suggestions?keyword=' . urlencode($this->user->email));

        $res->assertStatus(200);
        $this->assertIsArray($res->json());
    }
}
