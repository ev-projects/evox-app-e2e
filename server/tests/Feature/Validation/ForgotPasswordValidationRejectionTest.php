<?php
// Validation REJECTION tests — Forgot Password. HIGHEST-RISK endpoint in this batch: a
// VALID payload has an irreversible real-world side effect (overwrites the user's password
// with a random temp password AND sends a real email — UserController@forgot_password_request).
// So every case here uses either a missing email or a syntactically-valid-but-nonexistent
// email — never a real user's address — guaranteeing ForgotPasswordRequest (required|string|
// exists:users,email) rejects before UserRepository::apply_temporary_password() runs.
// See matrices/forgot-password.md.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class ForgotPasswordValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
    }

    private function postForgotPassword(array $payload)
    {
        return $this->postJson('/api/forgot_password_request', $payload);
    }

    /** @test */ public function rejects_missing_email()
    {
        $this->postForgotPassword([])->assertStatus(422);
    }

    /** @test */ public function rejects_nonexistent_email()
    {
        // Never a real seeded/live user's email — guaranteed not to match `exists:users,email`.
        $this->postForgotPassword(['email' => 'validation-rejection-probe-does-not-exist@evox-ai-delivery.invalid'])
            ->assertStatus(422);
    }
}
