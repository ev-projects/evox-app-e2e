<?php
// Validation REJECTION tests — Change Password. Every case sends data that either fails the
// ChangePasswordRequest FormRequest (422, before any password comparison happens) or fails the
// controller's current-password business check (404). Neither path writes to users.password, so
// this is safe on the live-dump DB. We deliberately NEVER send a payload where all three
// FormRequest rules pass AND current_password might coincidentally be the real one — every case
// breaks a FormRequest rule first (except the dedicated "wrong current password" business-rule
// test, which is safe because a wrong password never reaches the save() call).

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class ChangePasswordValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestSkipped('no user available in test DB');
        }
    }

    private function postChangePassword(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/user/' . $this->user->id . '/change_password', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'current_password'     => 'definitely-not-the-real-password',
            'new_password'         => 'NewPass123',
            'confirm_new_password' => 'NewPass123',
        ], $override);
    }

    /** @test */ public function rejects_missing_current_password()
    { $p = $this->base(); unset($p['current_password']); $this->postChangePassword($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_new_password()
    { $p = $this->base(); unset($p['new_password']); $this->postChangePassword($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_confirm_new_password()
    { $p = $this->base(); unset($p['confirm_new_password']); $this->postChangePassword($p)->assertStatus(422); }

    /** @test */ public function rejects_short_new_password()
    { $this->postChangePassword($this->base(['new_password' => 'ab1', 'confirm_new_password' => 'ab1']))->assertStatus(422); }

    /** @test */ public function rejects_short_current_password()
    { $this->postChangePassword($this->base(['current_password' => 'ab1']))->assertStatus(422); }

    /** @test */ public function rejects_mismatched_confirmation()
    { $this->postChangePassword($this->base(['confirm_new_password' => 'SomethingElse123']))->assertStatus(422); }

    /** @test */ public function rejects_wrong_current_password_business_rule()
    {
        // Passes the FormRequest (all fields present, min length ok, confirmation matches),
        // but current_password is wrong so auth()->attempt() fails in the repository and the
        // controller returns 404 without ever calling save(). No write occurs.
        $this->postChangePassword($this->base())->assertStatus(404);
    }
}
