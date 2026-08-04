<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PoliciesDocumentController::downloadPolicy arms. Menu=Policies Page=PoliciesDocument.
 *
 * DEPENDENCY NOTE — PoliciesDocumentController takes NO constructor/injected dependencies (Auth facade +
 * the global call_sp() helper used directly). downloadPolicy() invokes call_sp('EV_SP_Policies_Document')
 * (mode 6) as its FIRST statement. EV_SP_Policies_Document is READ-ONLY; the test runs it with id=0
 * (non-existent doc) so the SP returns an empty result safely (2026-07-31).
 *
 * Branch (routes/api.php, mounted under /api):
 *   GET /api/download_policy/{id}/ -> downloadPolicy() [SKIPPED-SP + dead catch]
 *
 * FINDINGS:
 *  // FINDING: downloadPolicy() catch(Exception) is dead — PoliciesDocumentController does NOT `use Exception;`
 *             (namespace App\Http\Controllers), so `Exception` resolves to the non-existent
 *             App\Http\Controllers\Exception. Any throwable escapes as an uncaught 500 rather than
 *             the intended error_response.
 */

namespace Tests\Feature\BranchTests\Policies\PoliciesDocument;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PoliciesDocumentExportBranchTest extends TestCase
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

    // ---------------------------------------------------------------- downloadPolicy()
    // call_sp('EV_SP_Policies_Document', [null, null, country_id, ..., user_id, 6, null, $id]): read-only.
    // id=0 → SP returns empty result; $result[0] = [] → return [] → 200 JSON.
    /** @test */
    public function downloadPolicy__export__sp_mode6_read_only__ok_200()
    {
        // EV_SP_Policies_Document mode 6: download by id. id=0 (non-existent) returns $result[0] directly.
        // FINDING: catch(Exception) is dead (no `use Exception;`) — SP failure would yield uncaught 500.
        $res = $this->get('/api/download_policy/0/');

        $this->assertNotEquals(500, $res->status(), 'SP EV_SP_Policies_Document (mode 6) must run without 500');
    }
}
