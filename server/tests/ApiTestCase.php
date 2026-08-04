<?php

namespace Tests;

use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tymon\JWTAuth\Facades\JWTAuth;

abstract class ApiTestCase extends TestCase
{
    use DatabaseTransactions;

    protected $apiKey;

    protected function setUp(): void
    {
        parent::setUp();

        // Runtime API key — never static (see project standing rule). auth.apikey middleware
        // (ejarnutowski/laravel-api-key) looks up X-Authorization against the api_keys table;
        // env('CLIENT_API_KEY') was never defined anywhere, so every route behind that
        // middleware rejected with a generic 401 regardless of JWT validity. DatabaseTransactions
        // rolls this insert back after each test.
        $this->apiKey = \Illuminate\Support\Str::random(64);
        \Illuminate\Support\Facades\DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_' . strtolower(class_basename(static::class)) . '_' . now()->format('His') . '_' . uniqid(),
            'key'        => $this->apiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->seed(\UserTestSeeder::class);

        // loginAndGetToken()/authenticatedPost() below hit the real /api/auth/login
        // route on every call, which runs AuthController::get_default_payload() ->
        // $this->bhr->get_user(...). The seeded 'active.user' fixture has no bhr_num,
        // so that call goes out to live BHR with an empty employee id on every one of
        // the 24+ test classes extending ApiTestCase. Bind the IoC mock here once so
        // none of them need their own binding.
        $this->app->bind(BhrRepositoryInterface::class, function () {
            return new \Tests\Feature\Api\evoxtest_BhrMock();
        });
    }

    protected function headers(array $extra = [])
    {
        return array_merge([
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'X-Authorization' => $this->apiKey,
        ], $extra);
    }

    protected function authenticatedPost(string $uri, array $payload = [])
    {
        $token = $this->tokenForUserId(1593);

        return $this->json(
            'POST',
            $uri,
            $payload,
            $this->authHeaders($token)
        );
    }

    protected function loginAndGetToken(bool $returnArray = false, bool $useClientEnv = false)
    {
        $response = $this->json(
            'POST',
            '/api/auth/login',
            [
                'username' => $useClientEnv
                    ? env('CLIENT_USER_EMAIL', 'active.user')
                    : 'active.user',

                'password' => $useClientEnv
                    ? env('CLIENT_USER_PASSWORD', 'CorrectPassword123')
                    : 'CorrectPassword123',
            ],
            $this->headers()
        );

        $accessToken = $response->json('content.access_token');

        if ($returnArray) {
            return [
                $response->json('content.user.id'),
                $accessToken,
            ];
        }

        return $accessToken;
    }

    protected function tokenForUserId(int $userId): string
    {
        $user = User::findOrFail($userId);

        return JWTAuth::fromUser($user);
    }

    protected function authHeaders($token)
    {
        return $this->headers([
            'Authorization' => 'Bearer ' . $token,
        ]);
    }

    protected function headersWithoutApiKey()
    {
        return [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];
    }

    protected function headersWithInvalidApiKey()
    {
        return [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'X-Authorization' => 'invalid-api-key',
        ];
    }

    protected function scenarioDate(): string
    {
        return getenv('PAYROLL_DATE')
            ?: ($_SERVER['PAYROLL_DATE'] ?? null)
            ?: ($_ENV['PAYROLL_DATE'] ?? null)
            ?: Carbon::today()->format('Y-m-d');
    }

    protected function disputeScenarioDate(): string
    {
        return getenv('DISPUTE_PAYROLL_DATE')
            ?: ($_SERVER['DISPUTE_PAYROLL_DATE']
                ?? $_ENV['DISPUTE_PAYROLL_DATE']
                ?? now()->subMonth()->toDateString());
    }
}