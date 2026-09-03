<?php
/**
 * SEED SUITE BASE — deliberately NO DatabaseTransactions.
 *
 * Every row a Seed test writes is meant to STAY in the database. This suite exists to plant
 * the committed baseline data (request rows in each status, per persona) that the main test
 * suite's 400+ DATA-SEEDABLE tests look for. The main suite keeps DatabaseTransactions; only
 * this directory commits.
 *
 * Safety rails:
 *  - Opt-in: every test skips unless RUN_SEED=1 is set in the environment. A plain
 *    `phpunit` run never seeds by accident.
 *  - Idempotent: every seed test checks whether its rows already exist (by the SEED_MARKER
 *    note) and skips instead of duplicating.
 *  - Traceable: every seeded row carries SEED_MARKER in its note field. cleanup-seed-data.sql
 *    in this directory removes everything this suite ever wrote.
 *  - Personas only: writes go to the dedicated E2E_USER_* accounts (see SEED-USERS.csv),
 *    never to real employees' records.
 *  - Mail::fake() + Queue::fake(): no real notification emails fire during seeding.
 *
 * Run with:  RUN_SEED=1 vendor/bin/phpunit --testsuite Seed
 */

namespace Tests\Seed;

use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;

abstract class SeedTestCase extends TestCase
{
    /** Marker stamped into employee_note of every seeded row; cleanup keys on it. */
    public const SEED_MARKER = 'SEED-E2E baseline row';

    protected function setUp(): void
    {
        parent::setUp();

        if (env('RUN_SEED') != '1') {
            $this->markTestSkipped(
                'Seed suite is opt-in because it COMMITS rows (no rollback). Set RUN_SEED=1 to run it.'
            );
        }

        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
    }

    protected function apiKey(): array
    {
        return ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
    }

    /** Resolve a persona from its E2E_USER_* env var (holds the account's email). */
    protected function persona(string $variant): ?User
    {
        $email = env('E2E_USER_' . strtoupper($variant));
        if (!$email) {
            return null;
        }

        return User::where('email', $email)->first();
    }

    /** Resolve a persona or stop with a message that tells the runner exactly what to set up. */
    protected function requirePersona(string $variant): User
    {
        $user = $this->persona($variant);
        if (!$user) {
            $this->markTestIncomplete(
                "Persona E2E_USER_{$variant} unavailable: create the account (see tests/Seed/SEED-USERS.csv) " .
                "and set E2E_USER_{$variant}=<its email> in .env, then re-run."
            );
        }

        return $user;
    }

    /**
     * Find a past date with no existing row for this user in $modelClass (which enforces
     * one-request-per-user-per-date). Starts $startBack days ago and walks backwards.
     */
    protected function freeDateFor(string $modelClass, int $userId, int $startBack): string
    {
        for ($i = $startBack; $i < $startBack + 90; $i++) {
            $date = now()->subDays($i)->toDateString();
            $taken = $modelClass::where('user_id', $userId)->where('date', $date)->exists();
            if (!$taken) {
                return $date;
            }
        }

        $this->markTestIncomplete("No free date in the last 90 days for {$modelClass} user {$userId}.");
    }
}
