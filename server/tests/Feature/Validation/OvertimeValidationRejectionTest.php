<?php
// Validation REJECTION tests — Overtime. Every case sends INVALID data and asserts the
// FormRequest blocks it (422). A rejected request writes NOTHING, so this is safe on the
// live-dump DB. Uses withoutMiddleware() to bypass the JWT/apiKey auth gate (which is not
// what we're testing here) so the request reaches OvertimeRequest validation. No seeding
// (the shared dump can't run UserTestSeeder), so we act as a real existing user.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class OvertimeValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestIncomplete('no user available in test DB');
        }
    }

    private function postOt(array $payload)
    {
        // user_id is supplied explicitly since we bypass the auth-derived user.
        $payload += ['user_id' => $this->user->id];
        return $this->actingAs($this->user)->postJson('/api/request/overtime', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'date'   => date('Y-m-d'),
            'type'   => 'Regular',
            'amount' => '02:00',
        ], $override);
    }

    /** @test */ public function rejects_missing_date()
    { $p = $this->base(); unset($p['date']); $this->postOt($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_date_format()
    { $this->postOt($this->base(['date' => '2026/01/01']))->assertStatus(422); }

    /** @test */ public function rejects_missing_type()
    { $p = $this->base(); unset($p['type']); $this->postOt($p)->assertStatus(422); }

    /** @test */ public function rejects_type_not_in_constant()
    { $this->postOt($this->base(['type' => 'NotARealType']))->assertStatus(422); }

    /** @test */ public function rejects_missing_amount()
    { $p = $this->base(); unset($p['amount']); $this->postOt($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_amount_format()
    { $this->postOt($this->base(['amount' => 'abc']))->assertStatus(422); }

    /** @test */ public function rejects_overlong_employee_note()
    { $this->postOt($this->base(['employee_note' => str_repeat('x', 256)]))->assertStatus(422); }
}
