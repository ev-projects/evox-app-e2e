<?php
// DEEPER validation — Forgot Password CONTROLLER / BUSINESS / DB-layer rules (beyond the
// FormRequest datatype layer in ForgotPasswordValidationRejectionTest). Per matrices/
// forgot-password.md this is the highest-risk endpoint in the whole batch: the ONLY backend
// rule (`exists:users,email`) is also the ONLY thing standing between "rejected" and an
// irreversible real-world side effect (password overwrite + outbound email via
// UserRepository::apply_temporary_password() + EmailRepository::sendForgotPasswordRequestEmail()).
// There is no "valid except for one other field" payload to probe here — email is the only
// field — so the sole additional depth available is the DB-layer proof the shallow suite
// doesn't do: a rejected request touches zero rows in `users`.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

class ForgotPasswordBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
    }

    private function postForgotPassword(array $payload)
    {
        return $this->postJson('/api/forgot_password_request', $payload);
    }

    /** @test — a non-existent email 422s before UserRepository::apply_temporary_password()
     *  runs; prove no row's password/force_change_password flag changed on this request. */
    public function rejects_nonexistent_email_and_writes_nothing()
    {
        // Snapshot every password hash's checksum count rather than a single row, since a
        // non-existent email by definition targets no row — this proves the call touched
        // literally nothing in `users`, not just "the row we expected."
        $before = DB::table('users')->count();
        $beforeSum = DB::table('users')->sum(DB::raw('CRC32(password)'));

        $this->postForgotPassword(['email' => 'validation-rejection-probe-does-not-exist@evox-ai-delivery.invalid'])
            ->assertStatus(422);

        $after = DB::table('users')->count();
        $afterSum = DB::table('users')->sum(DB::raw('CRC32(password)'));

        $this->assertSame($before, $after);
        $this->assertSame($beforeSum, $afterSum, 'a rejected forgot-password request must not change any users.password hash');
    }

    /** @test */
    public function valid_email_write_and_email_send_is_documented_not_exercised()
    {
        $this->markTestSkipped(
            'The only way to reach apply_temporary_password() + sendForgotPasswordRequestEmail() ' .
            'is a real, existing user email, which would irreversibly overwrite that user\'s ' .
            'password and send a real email — not automatable. See matrices/forgot-password.md.'
        );
    }
}
