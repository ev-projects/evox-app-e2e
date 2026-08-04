<?php

namespace Tests;

use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

/**
 * Base class for all evoxtest_ API tests.
 *
 * WHY THIS EXISTS — Gary's ApiTestCase does DB::insert() in setUp() and relies on
 * DatabaseTransactions to roll it back after each test. That means one INSERT + ROLLBACK
 * per test, which balloons memory across 300+ tests.
 *
 * This class inserts the API key ONCE per test class by overriding setUpTraits().
 * Laravel's TestCase::setUp() runs refreshApplication() (boots Laravel) BEFORE
 * setUpTraits() (which is where DatabaseTransactions::beginDatabaseTransaction() fires).
 * Inserting in our setUpTraits() override — before calling parent::setUpTraits() — puts
 * the INSERT in MySQL auto-commit mode: it commits immediately and survives every
 * per-test rollback for the entire class.
 *
 * Cost: one INSERT per test class (not per test). The key row stays in api_keys
 * permanently across runs; updateOrInsert() makes this idempotent.
 */
abstract class evoxtest_ApiTestCase extends TestCase
{
    use DatabaseTransactions;

    protected static string $sharedApiKey;
    private static bool $keySeeded = false;

    protected function setUpTraits(): array
    {
        if (!static::$keySeeded) {
            static::$sharedApiKey = env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            );

            // Runs AFTER refreshApplication() so DB is available,
            // but BEFORE parent::setUpTraits() which starts the DatabaseTransactions
            // transaction. This insert therefore auto-commits and is never rolled back.
            DB::table('api_keys')->updateOrInsert(
                ['key' => static::$sharedApiKey],
                [
                    'name'       => 'evoxtest_shared_key',
                    'active'     => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            static::$keySeeded = true;
        }

        return parent::setUpTraits();
    }

    /**
     * Header array for requests that only need the API key (no JWT).
     * Use for Pattern B (auth enforcement) tests.
     */
    protected function apiKeyHeader(): array
    {
        return ['X-Authorization' => static::$sharedApiKey];
    }

    /**
     * Header array for fully authenticated requests (JWT + API key).
     * Use for Pattern A (controller logic) tests.
     */
    protected function authHeaders(string $token): array
    {
        return [
            'Authorization'   => "Bearer {$token}",
            'X-Authorization' => static::$sharedApiKey,
        ];
    }

    /**
     * Log in as the E2E employee and return a JWT token.
     * Pass $returnUserId = true to get [$userId, $token].
     */
    /** @return string|array */
    protected function loginAndGetToken(bool $returnUserId = false)
    {
        $email = env('E2E_USER_EMPLOYEE_PHILIPPINES');
        $user  = User::where('email', $email)->firstOrFail();
        $token = auth('api')->login($user);

        return $returnUserId ? [$user->id, $token] : $token;
    }

    protected function loginAs(string $envVar): array
    {
        $user  = User::where('email', env($envVar))->firstOrFail();
        $token = auth('api')->login($user);
        return [$user, $token];
    }
}
