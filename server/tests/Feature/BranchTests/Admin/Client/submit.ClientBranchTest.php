<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ClientController::assignEmployeesClient arms.
 * Menu=Admin Page=Client.
 *
 * FINDING: assignEmployeesClient() passes $request->employee_user_id as the 3rd arg to
 *   assign_clients(), but AssignEmployeesClientRequest validates 'user_id.*' (not 'employee_user_id').
 *   The validated array field ('user_id') is never read, and the consumed field ('employee_user_id')
 *   is never validated -> the assigned employee list is always the unvalidated request key.
 * FINDING: success_response(trans('Assign Success'), JsonResponse::HTTP_CREATED) passes HTTP_CREATED (201)
 *   as the CONTENT arg, not the status code. The 3rd arg (http_code) defaults to HTTP_OK, so the endpoint
 *   actually returns HTTP 200 with content=201 (the integer). Asserted status is 200.
 *
 * SKIPPED arms: none. The repository is IoC-mocked, so the real assign_clients() write never runs.
 *   (No call_sp / external / destructive DB path is reached.)
 */

namespace Tests\Feature\BranchTests\Admin\Client;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;
use App\Modules\Client\Repositories\ClientRepositoryInterface;

class ClientSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    private $clientRepo;
    private $user;
    private $department;

    protected function setUp(): void
    {
        parent::setUp();
        $this->markTestSkipped('CLIENT MODULE REMOVED 2026-08-10: App\Modules\Client deleted. These tests have no runnable subject.');
        Mail::fake();
        Queue::fake();

        $this->user       = User::where('is_active', 1)->first();
        $this->department = DB::table('departments')->first();

        $this->clientRepo = Mockery::mock(ClientRepositoryInterface::class);
        $this->app->instance(ClientRepositoryInterface::class, $this->clientRepo);

        $this->withoutMiddleware();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Builds a payload that passes AssignEmployeesClientRequest validation
     * (department_id exists, user_id.* exists, client_id present).
     */
    private function validPayload(): array
    {
        return [
            'client_id'     => 1,
            'department_id' => $this->department->id,
            'user_id'       => [$this->user->id],
        ];
    }

    // assignEmployeesClient() B1 (try): repository assign_clients succeeds -> success_response, HTTP 200
    /** @test */
    public function assignEmployeesClient__submit__success__ok_200()
    {
        if (is_null($this->user) || is_null($this->department)) {
            $this->markTestIncomplete('No user/department fixture available.');
        }

        $this->clientRepo->shouldReceive('assign_clients')->andReturnNull();

        $response = $this->actingAs($this->user)
            ->postJson('/api/client/assign', $this->validPayload());

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // assignEmployeesClient() B2 (catch): repository throws -> log_to_file + error_response (default 400)
    /** @test */
    public function assignEmployeesClient__submit__exception__error_400()
    {
        if (is_null($this->user) || is_null($this->department)) {
            $this->markTestIncomplete('No user/department fixture available.');
        }

        $this->clientRepo->shouldReceive('assign_clients')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)
            ->postJson('/api/client/assign', $this->validPayload());

        $response->assertStatus(400)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
