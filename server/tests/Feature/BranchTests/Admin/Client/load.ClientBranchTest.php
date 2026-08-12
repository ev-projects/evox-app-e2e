<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ClientController::users arms.
 * Menu=Admin Page=Client.
 *
 * Route: GET /api/client/{client_id}/{department_id}/users -> users($client_id, $department_id).
 * error_response in this method passes JsonResponse::HTTP_NOT_FOUND (404), NOT the default 400.
 *
 * SKIPPED arms: none. The repository find() is IoC-mocked; the count!=0 branch runs only the
 *   real User::whereIn('id', $user_ids)->get() read, scoped to a single fixture id (read-only).
 */

namespace Tests\Feature\BranchTests\Admin\Client;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Client\Repositories\ClientRepositoryInterface;

class ClientLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    private $clientRepo;
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->markTestSkipped('CLIENT MODULE REMOVED 2026-08-10: App\Modules\Client deleted. These tests have no runnable subject.');
        Mail::fake();
        Queue::fake();

        $this->user = User::where('is_active', 1)->first();

        $this->clientRepo = Mockery::mock(ClientRepositoryInterface::class);
        $this->app->instance(ClientRepositoryInterface::class, $this->clientRepo);

        $this->withoutMiddleware();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // users() B1 (try, count != 0): find() returns ids -> UserListResource collection -> success_response 200
    /** @test */
    public function users__load__has_users__ok_200()
    {
        if (is_null($this->user)) {
            $this->markTestIncomplete('No user fixture available.');
        }

        // Scoped to a single fixture id so User::whereIn(...)->get() stays bounded.
        $this->clientRepo->shouldReceive('find')->andReturn([$this->user->id]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/client/1/1/users');

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // users() B2 (try, count == 0): find() returns [] -> $user_collection stays [] -> success_response 200
    /** @test */
    public function users__load__no_users__ok_200()
    {
        if (is_null($this->user)) {
            $this->markTestIncomplete('No user fixture available.');
        }

        $this->clientRepo->shouldReceive('find')->andReturn([]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/client/1/1/users');

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // users() B3 (catch): find() throws -> error_response(..., HTTP_NOT_FOUND) -> 404
    /** @test */
    public function users__load__exception__not_found_404()
    {
        if (is_null($this->user)) {
            $this->markTestIncomplete('No user fixture available.');
        }

        $this->clientRepo->shouldReceive('find')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)
            ->getJson('/api/client/1/1/users');

        $response->assertStatus(404)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
