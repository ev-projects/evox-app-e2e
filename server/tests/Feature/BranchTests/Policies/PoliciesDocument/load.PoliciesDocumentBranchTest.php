<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PoliciesDocumentController::show, showlist, get_user_departments arms. Menu=Policies Page=PoliciesDocument.
 *
 * DEPENDENCY NOTE — PoliciesDocumentController takes NO constructor/injected dependencies (Auth facade +
 * the global call_sp() helper used directly). All three read methods invoke call_sp('EV_SP_Policies_Document')
 * as their FIRST statement. EV_SP_Policies_Document is READ-ONLY; tests run it on the live DB with valid
 * bounded params (country_id + user_id from the authenticated user) and assert non-500 (2026-07-31).
 *
 * Branches (routes/api.php, mounted under /api):
 *   GET /api/show                 -> show()                 [SKIPPED-SP + dead catch]
 *     - after the SP: if($result[0]) { foreach group } — both arms are behind call_sp.
 *   GET /api/showlist             -> showlist()             [SKIPPED-SP + dead catch]
 *   GET /api/get_user_departments -> get_user_departments() [SKIPPED-SP + dead catch]
 *
 * FINDINGS:
 *  // FINDING: every catch(Exception) here is dead — PoliciesDocumentController does NOT `use Exception;`
 *             (namespace App\Http\Controllers), so `Exception` resolves to the non-existent
 *             App\Http\Controllers\Exception. Any throwable escapes as an uncaught 500 instead of the
 *             intended error_response.
 */

namespace Tests\Feature\BranchTests\Policies\PoliciesDocument;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PoliciesDocumentLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $user = User::where('is_active', 1)->first() ?? User::first();
        if ($user) {
            $this->actingAs($user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // -------------------------------------------------------------------- show()
    // call_sp('EV_SP_Policies_Document', [null, GlobalType, country_id, ..., user_id, 3, ...]): read-only.
    // GlobalType and selectedDepartments can be null (optional request params). success_response => 200.
    /** @test */
    public function show__load__sp_mode3_read_only__ok_200()
    {
        // EV_SP_Policies_Document mode 3: returns policy list scoped to user's country_id. Read-only.
        // FINDING: catch(Exception) is dead (no `use Exception;`) — a SP failure would yield uncaught 500.
        $res = $this->getJson('/api/show');

        $this->assertNotEquals(500, $res->status(), 'SP EV_SP_Policies_Document (mode 3) must run without 500');
        $res->assertStatus(200);
    }

    // -------------------------------------------------------------------- showlist()
    // call_sp('EV_SP_Policies_Document', [..., user_id, 5, ...]): read-only list for admin.
    /** @test */
    public function showlist__load__sp_mode5_read_only__ok_200()
    {
        // EV_SP_Policies_Document mode 5: returns full document list. Read-only.
        // FINDING: catch(Exception) is dead (no `use Exception;`) — SP failure would yield uncaught 500.
        $res = $this->getJson('/api/showlist');

        $this->assertNotEquals(500, $res->status(), 'SP EV_SP_Policies_Document (mode 5) must run without 500');
        $res->assertStatus(200);
    }

    // ------------------------------------------------------------ get_user_departments()
    // call_sp('EV_SP_Policies_Document', [null, GlobalType, CountryId, ..., userId, 4, ...]): read-only.
    // CountryId from request (null if absent). Returns $result[0] directly → 200 array.
    /** @test */
    public function get_user_departments__load__sp_mode4_read_only__ok_200()
    {
        // EV_SP_Policies_Document mode 4: returns departments accessible to the user. Read-only.
        // FINDING: catch(Exception) is dead (no `use Exception;`) — SP failure would yield uncaught 500.
        $res = $this->getJson('/api/get_user_departments');

        $this->assertNotEquals(500, $res->status(), 'SP EV_SP_Policies_Document (mode 4) must run without 500');
        $res->assertStatus(200);
    }
}
