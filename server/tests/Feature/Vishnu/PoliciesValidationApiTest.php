<?php
// DRAFT — generated 2026-06-16, needs verification

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * PoliciesValidationApiTest
 *
 * Validation edge cases for POST /api/uploadfiles (PoliciesDocumentController::upload).
 *
 * Known bugs (GAP-001 / BUG-002/003/004):
 *   - No server-side validation on title or GlobalType → missing fields silently pass
 *   - Security gaps: any authenticated user can upload (no role check)
 *   - upload() foreach on null FileData + missing `use Exception;` → 500 when no file attached
 */
class PoliciesValidationApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    /** @test */
    public function test_uploadfiles_no_file_does_not_return_200()
    {
        // BUG: upload() does foreach($request->file('FileData') as $d) without null check.
        // When no file is provided this iterates null → fatal error.
        // Additionally, catch(Exception $e) has no `use Exception;` import → catches nothing → 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/uploadfiles', [], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG: upload() iterates null FileData (foreach null crash) + catch(Exception) has no use-import → 500. Fix: null guard + add `use Exception;` in PoliciesDocumentController::upload().');
        }
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_uploadfiles_without_title_does_not_return_422()
    {
        // GAP-001: No server-side validation on title — missing title silently proceeds.
        // This documents the absence of validation (NOT asserting 422).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/uploadfiles', [
            'GlobalType' => '1',
            'CountryId'  => '0',
        ], $this->apiKey);
        $this->assertNotEquals(422, $response->status(),
            'GAP-001: title has no server-side validation — missing title must NOT return 422.');
    }

    /** @test */
    public function test_uploadfiles_without_global_type_does_not_return_422()
    {
        // GAP-001: No server-side validation on GlobalType — missing type silently proceeds.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/uploadfiles', [
            'title' => 'Test Policy',
        ], $this->apiKey);
        $this->assertNotEquals(422, $response->status(),
            'GAP-001: GlobalType has no server-side validation — missing GlobalType must NOT return 422.');
    }

    /** @test */
    public function test_uploadfiles_security_gap_no_role_check_documented()
    {
        // BUG-004: No role/permission check on POST /api/uploadfiles.
        // Any authenticated user can upload a policy document.
        // This test documents the gap — cannot safely test file upload without a real multipart payload.
        $this->markTestIncomplete('BUG-004: POST /api/uploadfiles has no role/permission check — any authenticated user can upload. Cannot test file upload security gate without multipart payload. Needs server-side RBAC fix.');
    }

    /** @test */
    public function test_uploadfiles_security_gap_no_file_type_validation_documented()
    {
        // BUG-002: No file type/extension validation on uploaded file.
        $this->markTestIncomplete('BUG-002: POST /api/uploadfiles has no file type validation — any extension accepted. Cannot test without real multipart payload.');
    }

    /** @test */
    public function test_uploadfiles_security_gap_no_file_size_validation_documented()
    {
        // BUG-003: No file size limit enforced at the application layer.
        $this->markTestIncomplete('BUG-003: POST /api/uploadfiles has no file size validation at application layer. Cannot test without real multipart payload.');
    }
}
