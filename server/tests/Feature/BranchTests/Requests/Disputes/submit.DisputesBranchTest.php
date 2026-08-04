<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DisputeController::store arms. Menu=Requests Page=Disputes.
 *
 * Top-level controller App\Http\Controllers\DisputeController (routes under /api, middleware
 * jwtauth + auth.apikey, disabled here via withoutMiddleware()). Sole constructor dep
 * PayrollCutoffRepositoryInterface is IoC-mocked in setUp; store() never touches it, so the
 * bare mock carries no expectations.
 *
 * Route covered:
 *   POST /api/storedispute -> store()
 *
 * SKIPPED arms (this file = submit/write actions):
 *   - UpdateDispute() [PUT /api/updatedispute/{id}] : first statement in try is
 *     call_sp('EV_SP_PD_Update_Dispute_Status', [...]) -- a dispute-status WRITE SP with no
 *     branch returning before it.  // SKIPPED-SP / SKIPPED-DESTRUCTIVE
 *
 * FINDING (namespace bug, still present in latest code) — DisputeController declares
 * `namespace App\Http\Controllers;` but never imports Exception (no `use Exception;`, no
 * leading backslash). Every `catch(Exception $e)` resolves to the NON-EXISTENT class
 * App\Http\Controllers\Exception, so a thrown \Exception is NOT caught: error_response(...)
 * (HTTP 400) is dead code and the exception would surface as a framework 500. store()'s catch
 * arm is therefore unreachable and is intentionally NOT authored as a forced-exception test.
 * // FINDING: catch(Exception) dead -> exception branch skipped
 */

namespace Tests\Feature\BranchTests\Requests\Disputes;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class DisputesSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();               // reach controller body past jwt/apikey
        $this->user = User::where('is_active', 1)->first();
        if (!$this->user) {
            $this->markTestIncomplete('no active user in test DB');
        }
        // Sole constructor dep — IoC-mocked so no real repo/SP is constructed.
        $this->app->instance(
            PayrollCutoffRepositoryInterface::class,
            Mockery::mock(PayrollCutoffRepositoryInterface::class)
        );
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------------- store()
    // Branch A: $validator->fails() == true -> return response()->json(['errors'=>...]) at the
    // default HTTP 200 (Laravel 5.7). employee_id + dispute_type are both `required`; sending an
    // empty payload fails the `required` rule before the exists:users,id DB lookup. No create, no SP.
    /** @test */
    public function store__submit__validation_fails__errors_200()
    {
        $res = $this->postJson('/api/storedispute', []);

        $res->assertStatus(200)->assertJsonStructure(['errors']);
    }

    // Branch B: validator passes (else arm) -> Dispute::create($request->all()) ->
    // response()->json(['message','dispute'], 201). Real INSERT into `disputes`, rolled back by
    // DatabaseTransactions (sanctioned write pattern; NOT truncate/delete/DDL/SP).
    // employee_id = a real active user so exists:users,id passes.
    /** @test */
    public function store__submit__valid__created_201()
    {
        $res = $this->postJson('/api/storedispute', [
            'employee_id'  => $this->user->id,
            'dispute_type' => 'Overtime',
            'description'  => 'branch test dispute',
            'status'       => 'Pending',
        ]);

        $res->assertStatus(201)->assertJsonStructure(['message', 'dispute']);
    }

    // store() catch(Exception $e) — see FINDING in docblock: catch type resolves to the
    // non-existent App\Http\Controllers\Exception, so error_response (HTTP 400) is dead code.
    // Not authored (unreachable + not forceable without a DB failure).  // FINDING
}
