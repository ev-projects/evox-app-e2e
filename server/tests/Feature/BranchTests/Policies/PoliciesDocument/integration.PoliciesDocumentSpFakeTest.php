<?php
/**
 * SOURCE UNDER TEST: app/Http/Controllers/PoliciesDocumentController.php
 * MENU PATH:         Policies -> Policy Documents
 * MEASURED COVERAGE AT AUTHORING (lines-%): upload 70.83, show 81.82, showlist 66.67,
 *   updatestatus 66.67, downloadPolicy 60, get_user_departments 66.67.
 *
 * FINDINGS:
 *  // FINDING (already registered, not re-reported): every `catch (Exception $e)` in this controller
 *     is dead. The class sits in namespace App\Http\Controllers and does NOT `use Exception;`, so the
 *     type resolves to the non-existent App\Http\Controllers\Exception and nothing ever matches it.
 *     A stored-procedure failure escapes as an uncaught 500 instead of the intended 400.
 *     Characterised once below (*_FINDING_DEAD_CATCH) rather than repeated per method.
 *     upload()'s OUTER `catch (\Throwable $e)` is fully qualified and therefore live.
 *
 * The existing Policies branch tests run these methods against the LIVE EV_SP_Policies_Document —
 * including mode 1, which WRITES. This file drives every arm through CallSpFake instead, so no
 * stored procedure executes and the exact parameter vectors (mode number, user scoping, per-file
 * metadata) can be asserted. Uploads use real temp files so the controller's content-based MIME
 * lookup behaves as it does in production.
 */

namespace Tests\Feature\BranchTests\Policies\PoliciesDocument;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PoliciesDocumentSpFakeIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    /** @var string[] real temp files created for upload tests */
    private $tempPaths = [];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();
        $this->withoutMiddleware();

        $this->user = User::where('is_active', 1)->whereNotNull('country_id')
            ->orderBy('id', 'desc')->first()
            ?: User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        foreach ($this->tempPaths as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /**
     * A REAL UploadedFile (not UploadedFile::fake(), whose getMimeType() is overridden to derive
     * from the file NAME). The controller's `$d->getMimeType()` must do the same content-based
     * lookup it does in production for the CSV coercion arm to be exercised honestly.
     */
    private function realUpload($name, $contents)
    {
        $path = tempnam(sys_get_temp_dir(), 'polydoc');
        file_put_contents($path, $contents);
        $this->tempPaths[] = $path;

        return new UploadedFile($path, $name, null, null, true);
    }

    // ==================================================================== upload()

    // The absent-file guard: no FileData at all is refused before the loop, with the guard's own
    // wording (not the generic default), and no stored procedure is called.
    /** @test */
    public function uploading_with_no_file_at_all_is_refused_before_any_stored_procedure_runs()
    {
        $res = $this->postJson('/api/uploadfiles', ['GlobalType' => 1, 'title' => 'Handbook']);

        $res->assertStatus(400);
        $this->assertSame(
            'FileData is required and must be a file upload array.',
            $res->json('error.message')
        );
        $this->assertCount(0, CallSpFake::calls());
    }

    // Every file in the batch gets its own stored-procedure call, carrying that file's own name,
    // extension, MIME type and base64 body, plus the shared metadata and the uploader's id.
    /** @test */
    public function each_file_in_a_batch_is_stored_with_its_own_name_extension_and_base64_body()
    {
        CallSpFake::fake('EV_SP_Policies_Document', [[(object) ['DocumentId' => 1]]]);
        $csvBody = "hello world\n";
        $txtBody = "second document\n";

        $res = $this->post('/api/uploadfiles', [
            'FileData'            => [
                $this->realUpload('leave-policy.csv', $csvBody),
                $this->realUpload('dress-code.txt', $txtBody),
            ],
            'GlobalType'          => '1',
            'CountryId'           => '2',
            'selectedDepartments' => '3,4',
            'title'               => 'Employee Handbook',
        ], ['Accept' => 'application/json']);

        $res->assertStatus(200);
        $this->assertSame('File uploaded successfully!', $res->json('message'));

        $calls = CallSpFake::callsFor('EV_SP_Policies_Document');
        $this->assertCount(2, $calls);

        // File 1: content reads as text/plain but the .csv extension forces the CSV MIME type.
        $first = $calls[0]['params'];
        $this->assertSame('data:text/csv;base64,' . base64_encode($csvBody), $first[0]);
        $this->assertSame('1', $first[1]);                    // GlobalType
        $this->assertSame('2', $first[2]);                    // CountryId
        $this->assertSame($this->user->id, $first[3]);        // uploader
        $this->assertSame('leave-policy.csv', $first[4]);
        $this->assertSame('csv', $first[5]);
        $this->assertSame('text/csv', $first[6]);
        $this->assertNull($first[7]);
        $this->assertSame('3,4', $first[8]);                  // selectedDepartments
        $this->assertNull($first[9]);
        $this->assertSame(1, $first[10]);                     // mode 1 = write
        $this->assertSame('Employee Handbook', $first[11]);
        $this->assertNull($first[12]);

        // File 2: a .txt extension leaves the detected MIME type alone.
        $second = $calls[1]['params'];
        $this->assertSame('dress-code.txt', $second[4]);
        $this->assertSame('txt', $second[5]);
        $this->assertSame('text/plain', $second[6]);
        $this->assertSame('data:text/plain;base64,' . base64_encode($txtBody), $second[0]);
    }

    // upload()'s OUTER catch is `catch (\Throwable $e)` — fully qualified, so unlike every other
    // catch in this file it really does fire, and a stored-procedure failure becomes a 400.
    /** @test */
    public function a_stored_procedure_failure_during_upload_is_caught_by_the_outer_throwable_handler()
    {
        // EV_SP_Policies_Document intentionally NOT faked -> CallSpFake throws RuntimeException.
        $res = $this->post('/api/uploadfiles', [
            'FileData' => [$this->realUpload('leave-policy.csv', "hello world\n")],
            'title'    => 'Employee Handbook',
        ], ['Accept' => 'application/json']);

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ====================================================================== show()

    // Policies are grouped by their Name column so the UI can render one accordion per policy.
    /** @test */
    public function policies_are_grouped_by_name_for_the_reader_view()
    {
        CallSpFake::fake('EV_SP_Policies_Document', [[
            (object) ['Name' => 'Code of Conduct', 'DocumentId' => 1],
            (object) ['Name' => 'Code of Conduct', 'DocumentId' => 2],
            (object) ['Name' => 'Travel Policy',   'DocumentId' => 3],
        ]]);

        $res = $this->getJson('/api/show?GlobalType=1&selectedDepartments=7');

        $res->assertStatus(200);
        $this->assertCount(2, $res->json('content.Code of Conduct'));
        $this->assertCount(1, $res->json('content.Travel Policy'));
        $this->assertSame(3, $res->json('content.Travel Policy.0.DocumentId'));

        $params = CallSpFake::callsFor('EV_SP_Policies_Document')[0]['params'];
        $this->assertNull($params[0]);
        $this->assertSame('1', $params[1]);                       // GlobalType from the request
        $this->assertEquals($this->user->country_id, $params[2]); // country comes from the user, not the request
        $this->assertSame('7', $params[8]);
        $this->assertSame($this->user->id, $params[9]);
        $this->assertSame(3, $params[10]);                        // mode 3 = reader view
    }

    // Empty result set: the grouping loop is skipped and an empty map is returned, not a null.
    /** @test */
    public function a_reader_with_no_visible_policies_gets_an_empty_map()
    {
        CallSpFake::fake('EV_SP_Policies_Document', [[]]);

        $res = $this->getJson('/api/show');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
    }

    // ================================================================== showlist()

    /** @test */
    public function the_admin_document_list_uses_mode_5_scoped_to_the_callers_country()
    {
        CallSpFake::fake('EV_SP_Policies_Document', [[(object) ['DocumentId' => 11, 'Name' => 'Handbook']]]);

        $res = $this->getJson('/api/showlist?GlobalType=2');

        $res->assertStatus(200);
        $this->assertSame(11, $res->json('content.0.DocumentId'));

        $params = CallSpFake::callsFor('EV_SP_Policies_Document')[0]['params'];
        $this->assertSame('2', $params[1]);
        $this->assertEquals($this->user->country_id, $params[2]);
        $this->assertSame($this->user->id, $params[9]);
        $this->assertSame(5, $params[10]);                        // mode 5 = admin list
    }

    // FINDING (already registered): the catch is dead, so a stored-procedure failure escapes as an
    // uncaught 500 instead of the intended 400 error_response. Expected-current-behaviour; when
    // `use Exception;` is added this test fails and should be flipped to assert 400.
    /** @test */
    public function a_stored_procedure_failure_escapes_as_an_uncaught_500_FINDING_DEAD_CATCH()
    {
        // EV_SP_Policies_Document intentionally NOT faked -> CallSpFake throws RuntimeException,
        // which catch(App\Http\Controllers\Exception) cannot match.
        $res = $this->getJson('/api/showlist');

        $res->assertStatus(500);
    }

    // ============================================================== updatestatus()

    /** @test */
    public function toggling_a_document_status_passes_the_document_status_and_the_acting_user()
    {
        CallSpFake::fake('EV_SP_Document_Status_Update', [[(object) ['Updated' => 1]]]);

        $res = $this->putJson('/api/updatestatus/512/0');

        $res->assertStatus(200);
        $this->assertSame(1, $res->json('content.0.Updated'));
        $this->assertSame(
            ['512', '0', $this->user->id],
            CallSpFake::callsFor('EV_SP_Document_Status_Update')[0]['params']
        );
    }

    // ============================================================= downloadPolicy()

    // The download call ignores GlobalType/departments entirely: it is keyed on the document id in
    // the LAST parameter slot and scoped to the caller's own country and id.
    /** @test */
    public function downloading_a_policy_keys_on_the_document_id_in_the_last_parameter_slot()
    {
        CallSpFake::fake('EV_SP_Policies_Document', [[(object) ['FileName' => 'handbook.pdf']]]);

        $res = $this->getJson('/api/download_policy/909/');

        $res->assertStatus(200);
        $this->assertSame('handbook.pdf', $res->json('0.FileName'));

        $params = CallSpFake::callsFor('EV_SP_Policies_Document')[0]['params'];
        $this->assertNull($params[1]);                            // GlobalType not used here
        $this->assertEquals($this->user->country_id, $params[2]);
        $this->assertNull($params[8]);                            // departments not used here
        $this->assertSame($this->user->id, $params[9]);
        $this->assertSame(6, $params[10]);                        // mode 6 = download
        $this->assertSame('909', $params[12]);
    }

    // ======================================================= get_user_departments()

    // Unlike show()/showlist(), this one takes the country from the REQUEST, not from the user.
    /** @test */
    public function the_department_picker_takes_its_country_from_the_request_not_the_user()
    {
        CallSpFake::fake('EV_SP_Policies_Document', [[(object) ['Id' => 3, 'Name' => 'Finance']]]);

        $res = $this->getJson('/api/get_user_departments?GlobalType=1&CountryId=5');

        $res->assertStatus(200);
        $this->assertSame('Finance', $res->json('0.Name'));

        $params = CallSpFake::callsFor('EV_SP_Policies_Document')[0]['params'];
        $this->assertSame('1', $params[1]);
        $this->assertSame('5', $params[2]);                       // request CountryId, not user's
        $this->assertSame($this->user->id, $params[9]);
        $this->assertSame(4, $params[10]);                        // mode 4 = department picker
    }

    /** @test */
    public function the_department_picker_passes_a_null_country_when_the_request_omits_it()
    {
        CallSpFake::fake('EV_SP_Policies_Document', [[]]);

        $res = $this->getJson('/api/get_user_departments');

        $res->assertStatus(200);
        $params = CallSpFake::callsFor('EV_SP_Policies_Document')[0]['params'];
        $this->assertNull($params[1]);
        $this->assertNull($params[2]);
        $this->assertSame(4, $params[10]);
    }
}
