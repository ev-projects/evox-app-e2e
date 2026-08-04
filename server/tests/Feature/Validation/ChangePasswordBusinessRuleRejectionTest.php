<?php
// DEEPER validation — Change Password CONTROLLER / BUSINESS / DB-layer rules (beyond the
// FormRequest datatype layer in ChangePasswordValidationRejectionTest, which already asserts
// the wrong-current-password path returns 404). This file adds the DB-layer proof that
// ChangePasswordValidationRejectionTest doesn't: the real bcrypt hash in `users.password` is
// byte-for-byte UNCHANGED after the business-rule rejection, confirming `change_password()`
// truly returns before calling save() (not just that the HTTP layer reports 404). Zero-write;
// DatabaseTransactions is belt-and-suspenders.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class ChangePasswordBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) { $this->markTestIncomplete('no user available in test DB'); }
    }

    private function postChangePassword(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/user/' . $this->user->id . '/change_password', $payload);
    }

    /** @test — wrong current_password passes the FormRequest but auth()->attempt() fails in
     *  the controller (business layer, not datatype), returns 404, and NEVER touches the hash. */
    public function rejects_wrong_current_password_and_leaves_hash_unchanged()
    {
        $hashBefore = DB::table('users')->where('id', $this->user->id)->value('password');

        $this->postChangePassword([
            'current_password'     => 'definitely-not-the-real-password-' . time(),
            'new_password'         => 'NewPass123',
            'confirm_new_password' => 'NewPass123',
        ])->assertStatus(404);

        $hashAfter = DB::table('users')->where('id', $this->user->id)->value('password');
        $this->assertSame($hashBefore, $hashAfter, 'a rejected change-password request must not touch users.password');
    }

    // The fully-valid path (real current_password + matching new_password) is the ONLY way to
    // reach save() and is intentionally never automated here — it would actually rotate a real
    // user's live password. See matrices/change-password.md.
    /** @test */
    public function correct_password_write_path_is_documented_not_exercised()
    {
        $this->markTestIncomplete(
            'The only way to reach UserRepository::change_password() save() is a correct ' .
            'current_password, which would really change a live user\'s password — not automatable. ' .
            'See matrices/change-password.md.'
        );
    }
}
