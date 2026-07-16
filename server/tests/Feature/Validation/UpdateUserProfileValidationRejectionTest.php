<?php
// Validation REJECTION tests — Update Profile. Every case sends INVALID data and asserts the
// FormRequest blocks it (422). A rejected request writes NOTHING, so this is safe on the
// live-dump DB. The base payload reuses the acting user's OWN current first_name/last_name/
// email/mobile_number — safe because Rule::unique(...)->ignore($this->route('id')) excludes the
// owner's own row, so resubmitting their own unchanged values never trips uniqueness. Every test
// then breaks exactly ONE field. NEVER send a fully valid payload — that would overwrite a real
// user's profile.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class UpdateUserProfileValidationRejectionTest extends TestCase
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

    private function putProfile(array $payload)
    {
        return $this->actingAs($this->user)->putJson('/api/user/' . $this->user->id . '/profile/', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'first_name'    => $this->user->first_name ?: 'RejectTest',
            'last_name'     => $this->user->last_name ?: 'RejectTest',
            'email'         => $this->user->email,
            'mobile_number' => $this->user->mobile_number ?: ('TESTMOBILE' . $this->user->id),
        ], $override);
    }

    /** @test */ public function rejects_missing_first_name()
    { $p = $this->base(); unset($p['first_name']); $this->putProfile($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_last_name()
    { $p = $this->base(); unset($p['last_name']); $this->putProfile($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_email()
    { $p = $this->base(); unset($p['email']); $this->putProfile($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_mobile_number()
    { $p = $this->base(); unset($p['mobile_number']); $this->putProfile($p)->assertStatus(422); }

    /** @test */ public function rejects_duplicate_email()
    {
        $other = User::where('is_active', 1)->where('id', '!=', $this->user->id)->whereNotNull('email')->first();
        if (!$other) { $this->markTestSkipped('no second user available to test duplicate email'); }
        $this->putProfile($this->base(['email' => $other->email]))->assertStatus(422);
    }

    /** @test */ public function rejects_duplicate_mobile_number()
    {
        $other = User::where('is_active', 1)->where('id', '!=', $this->user->id)->whereNotNull('mobile_number')->first();
        if (!$other) { $this->markTestSkipped('no second user with a mobile_number available to test duplicate'); }
        $this->putProfile($this->base(['mobile_number' => $other->mobile_number]))->assertStatus(422);
    }
}
