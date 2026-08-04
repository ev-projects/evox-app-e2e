<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PoliciesDocumentController::upload, updatestatus arms. Menu=Policies Page=PoliciesDocument.
 *
 * DEPENDENCY NOTE — PoliciesDocumentController takes NO constructor/injected dependencies (Auth facade +
 * the global call_sp() helper used directly). There is nothing to IoC-mock.
 *
 * upload() branches (routes/api.php, mounted under /api):
 *   POST /api/uploadfiles -> upload()
 *     Branch A: $request->file('FileData') is null -> foreach(null) -> E_WARNING promoted to
 *               ErrorException by Laravel's HandleExceptions -> NOT caught (dead namespace catch,
 *               see FINDING) -> 500. AUTHORED as the observed reality.
 *     Branch B: FileData present -> per-file body reads file_get_contents + inner try reaches
 *               call_sp('EV_SP_Policies_Document', ...) [SKIPPED-SP / SKIPPED-DESTRUCTIVE write].
 *     inner catch(Exception) / outer catch(Exception) -> [dead, see FINDING].
 *
 * updatestatus() branches:
 *   PUT /api/updatestatus/{id}/{status} -> updatestatus()
 *     First statement is call_sp('EV_SP_Document_Status_Update', ...) [SKIPPED-SP]; catch dead (FINDING).
 *
 * FINDINGS:
 *  // FINDING: upload() foreach($request->file('FileData')) has NO null check. When 'FileData' is absent
 *             the argument is null; foreach(null) warns, and because the controller does NOT `use Exception;`
 *             (namespace App\Http\Controllers) the promoted ErrorException is caught by NEITHER the inner nor
 *             the outer catch(Exception) (both resolve to the non-existent App\Http\Controllers\Exception).
 *             Result: an uncaught 500 instead of the intended graceful error_response — two bugs compounding.
 *  // FINDING: with a proper null check + working catch this would return a 4xx error_response; instead the
 *             happy-path 'File uploaded successfully!' return is only reached when FileData is present (which
 *             immediately hits call_sp), so no non-destructive success arm exists.
 */

namespace Tests\Feature\BranchTests\Policies\PoliciesDocument;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PoliciesDocumentSubmitBranchTest extends TestCase
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

    // -------------------------------------------------------------------- upload()
    // Branch A: no 'FileData' -> foreach(null) -> promoted ErrorException -> dead catch -> 500 (reality).
    /** @test */
    public function upload__submit__no_filedata_null_foreach__error_500()
    {
        // FINDING: no null check on $request->file('FileData') + dead namespace catch => uncaught 500.
        $res = $this->postJson('/api/uploadfiles', []);

        $res->assertStatus(500);
    }

    // Branch B: FileData present -> file read + call_sp('EV_SP_Policies_Document'): SKIPPED-SP/DESTRUCTIVE.
    /** @test */
    public function upload__submit__with_files_call_sp__skipped_sp()
    {
        // SKIPPED-SP + SKIPPED-DESTRUCTIVE
        $this->markTestSkipped(
            'SKIPPED-SP: upload() Branch B (FileData present) reads each file then calls ' .
            'call_sp("EV_SP_Policies_Document", ...) which writes a document row; no return precedes it. ' .
            'FINDING: both inner and outer catch(Exception) are dead (no `use Exception;`).'
        );
    }

    // ---------------------------------------------------------------- updatestatus()
    // First statement is call_sp('EV_SP_Document_Status_Update', ...): SKIPPED-SP; catch dead (FINDING).
    /** @test */
    public function updatestatus__submit__call_sp_and_dead_catch__skipped_sp()
    {
        // SKIPPED-SP
        $this->markTestSkipped(
            'SKIPPED-SP: updatestatus() first statement is call_sp("EV_SP_Document_Status_Update", ' .
            '[$id, $staus, $me->id]) (a status-mutating SP); no return precedes it. FINDING: catch(Exception) ' .
            'is dead (no `use Exception;`). Method unauthorable.'
        );
    }
}
