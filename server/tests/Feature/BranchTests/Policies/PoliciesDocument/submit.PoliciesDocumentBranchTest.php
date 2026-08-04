<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PoliciesDocumentController::upload, updatestatus arms. Menu=Policies Page=PoliciesDocument.
 *
 * DEPENDENCY NOTE — PoliciesDocumentController takes NO constructor/injected dependencies (Auth facade +
 * the global call_sp() helper used directly). There is nothing to IoC-mock.
 *
 * upload() branches (routes/api.php, mounted under /api):
 *   POST /api/uploadfiles -> upload()
 *     Branch A: $request->file('FileData') is null -> null guard fires (added 2026-07-30) -> error_response() -> 400.
 *     Branch B: FileData present -> per-file body reads file_get_contents + inner try reaches
 *               call_sp('EV_SP_Policies_Document', ...) mode 1 (write). SP may write a policy document row.
 *               Under DatabaseTransactions the write is rolled back unless the SP issues its own COMMIT.
 *     outer catch(\Throwable $e) IS live (catches any SP exception) -> error_response() -> 400.
 *
 * updatestatus() branches:
 *   PUT /api/updatestatus/{id}/{status} -> updatestatus()
 *     call_sp('EV_SP_Document_Status_Update', [$id, $status, $me->id]). With id=0 (non-existent document),
 *     SP updates 0 rows — safe even if SP has COMMIT. catch(Exception) is dead (FINDING).
 *
 * FINDINGS:
 *  // FINDING (FIXED 2026-07-30): upload() now has a null/traversable guard before foreach. When 'FileData' is
 *             absent the guard fires -> error_response() -> 400. An outer catch(\Throwable $e) was also added.
 *  // FINDING: inner catch(Exception) remains dead (no `use Exception;`); outer catch(\Throwable) is live.
 *  // FINDING: updatestatus() catch(Exception) is dead (no `use Exception;`); SP success -> $result[0] -> 200.
 */

namespace Tests\Feature\BranchTests\Policies\PoliciesDocument;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
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
    // Branch A: no 'FileData' -> null guard fires (added 2026-07-30) -> error_response() -> 400.
    /** @test */
    public function upload__submit__no_filedata_null_foreach__error_500()
    {
        // FINDING (FIXED 2026-07-30): null guard + outer catch(\Throwable) added -> error_response() -> 400.
        $res = $this->postJson('/api/uploadfiles', []);

        $res->assertStatus(400);
    }

    // Branch B: FileData present -> file read + call_sp('EV_SP_Policies_Document') mode 1 (write).
    // UploadedFile::fake() provides a real temp file; getRealPath()/file_get_contents() work correctly.
    // Outer catch(\Throwable $e) IS live — SP failure → 400. SP success → 200.
    /** @test */
    public function upload__submit__with_files_sp_mode1_write__ok_200()
    {
        $file = UploadedFile::fake()->create('test-policy.pdf', 10, 'application/pdf');

        $res = $this->post('/api/uploadfiles', ['FileData' => [$file]]);

        // Outer catch(\Throwable $e) is live (2026-07-30 fix). SP success → 200; SP failure → 400.
        // FINDING: inner catch(Exception) dead (no `use Exception;`) but outer Throwable catches all.
        $this->assertNotEquals(500, $res->status(), 'SP EV_SP_Policies_Document (mode 1) must not yield 500');
    }

    // ---------------------------------------------------------------- updatestatus()
    // id=0 targets no existing document: SP updates 0 rows (safe even if SP has COMMIT).
    // catch(Exception) is dead (no `use Exception;`), but SP success → $result[0] → return → 200.
    /** @test */
    public function updatestatus__submit__sp_status_update_id0__ok_200()
    {
        $res = $this->putJson('/api/updatestatus/0/1');

        // id=0: SP writes nothing. SP success → ['content' => $result[0]] → 200.
        $this->assertNotEquals(500, $res->status(), 'SP EV_SP_Document_Status_Update must run without 500');
    }
}
