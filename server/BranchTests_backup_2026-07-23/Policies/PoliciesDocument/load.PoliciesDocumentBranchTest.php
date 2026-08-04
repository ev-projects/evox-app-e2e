<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PoliciesDocumentController::show, showlist, get_user_departments arms. Menu=Policies Page=PoliciesDocument.
 *
 * DEPENDENCY NOTE — PoliciesDocumentController takes NO constructor/injected dependencies (Auth facade +
 * the global call_sp() helper used directly). All three read methods invoke call_sp('EV_SP_Policies_Document')
 * as their FIRST statement, before any conditional or return, so every arm is behind the SP and each
 * catch is dead (see FINDING). Nothing is authorable to a passing assertion; all are skipped tests.
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
    // FIRST statement call_sp('EV_SP_Policies_Document', ..., 3, ...): SKIPPED-SP; if($result[0]) is behind it.
    /** @test */
    public function show__load__call_sp_and_dead_catch__skipped_sp()
    {
        // SKIPPED-SP
        $this->markTestSkipped(
            'SKIPPED-SP: show() first statement is call_sp("EV_SP_Policies_Document", ..., 3, ...); the ' .
            'if($result[0]) grouping arm is behind the SP. FINDING: catch(Exception) is dead (no ' .
            '`use Exception;`). Method unauthorable.'
        );
    }

    // -------------------------------------------------------------------- showlist()
    // FIRST statement call_sp('EV_SP_Policies_Document', ..., 5, ...): SKIPPED-SP.
    /** @test */
    public function showlist__load__call_sp_and_dead_catch__skipped_sp()
    {
        // SKIPPED-SP
        $this->markTestSkipped(
            'SKIPPED-SP: showlist() first statement is call_sp("EV_SP_Policies_Document", ..., 5, ...); ' .
            'the response is built straight from $result[0]. FINDING: catch(Exception) is dead ' .
            '(no `use Exception;`). Method unauthorable.'
        );
    }

    // ------------------------------------------------------------ get_user_departments()
    // FIRST statement call_sp('EV_SP_Policies_Document', ..., 4, ...): SKIPPED-SP.
    /** @test */
    public function get_user_departments__load__call_sp_and_dead_catch__skipped_sp()
    {
        // SKIPPED-SP
        $this->markTestSkipped(
            'SKIPPED-SP: get_user_departments() first statement is call_sp("EV_SP_Policies_Document", ' .
            '..., 4, ...) and returns $result[0]. FINDING: catch(Exception) is dead (no `use Exception;`). ' .
            'Method unauthorable.'
        );
    }
}
