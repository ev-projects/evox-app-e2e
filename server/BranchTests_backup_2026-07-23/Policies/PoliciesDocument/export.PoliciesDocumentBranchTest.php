<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PoliciesDocumentController::downloadPolicy arms. Menu=Policies Page=PoliciesDocument.
 *
 * DEPENDENCY NOTE — PoliciesDocumentController takes NO constructor/injected dependencies (Auth facade +
 * the global call_sp() helper used directly). downloadPolicy() invokes call_sp('EV_SP_Policies_Document')
 * as its FIRST statement, before any return, and its catch is dead (see FINDING). Nothing is authorable
 * to a passing assertion; the method is a skipped test.
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
    // FIRST statement call_sp('EV_SP_Policies_Document', ..., 6, $id): SKIPPED-SP; returns $result[0].
    /** @test */
    public function downloadPolicy__export__call_sp_and_dead_catch__skipped_sp()
    {
        // SKIPPED-SP
        $this->markTestSkipped(
            'SKIPPED-SP: downloadPolicy() first statement is call_sp("EV_SP_Policies_Document", ..., 6, $id) ' .
            'and returns $result[0]. FINDING: catch(Exception) is dead (no `use Exception;`). Method unauthorable.'
        );
    }
}
