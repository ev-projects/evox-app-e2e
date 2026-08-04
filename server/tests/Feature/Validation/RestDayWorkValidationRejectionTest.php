<?php
// Validation REJECTION tests — Rest Day Work. Every case sends INVALID data and asserts the
// FormRequest blocks it (422). A rejected request writes NOTHING, so this is safe on the
// live-dump DB. Uses withoutMiddleware() to bypass the JWT/apiKey auth gate (which is not
// what we're testing here) so the request reaches RestDayWorkRequest validation. No seeding
// (the shared dump can't run UserTestSeeder), so we act as a real existing user.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class RestDayWorkValidationRejectionTest extends TestCase
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

    private function postRdw(array $payload)
    {
        // user_id is supplied explicitly since we bypass the auth-derived user.
        $payload += ['user_id' => $this->user->id];
        return $this->actingAs($this->user)->postJson('/api/request/rest_day_work', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'date'       => date('Y-m-d'),
            'start_time' => '09:00',
            'end_time'   => '18:00',
            'break_time' => '01:00',
        ], $override);
    }

    /** @test */ public function rejects_missing_date()
    { $p = $this->base(); unset($p['date']); $this->postRdw($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_date_format()
    { $this->postRdw($this->base(['date' => '2026/01/01']))->assertStatus(422); }

    /** @test */ public function rejects_missing_start_time()
    { $p = $this->base(); unset($p['start_time']); $this->postRdw($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_start_time_format()
    { $this->postRdw($this->base(['start_time' => '25:99']))->assertStatus(422); }

    /** @test */ public function rejects_missing_end_time()
    { $p = $this->base(); unset($p['end_time']); $this->postRdw($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_end_time_format()
    { $this->postRdw($this->base(['end_time' => 'abc']))->assertStatus(422); }

    /** @test */ public function rejects_missing_break_time()
    { $p = $this->base(); unset($p['break_time']); $this->postRdw($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_break_time_format()
    { $this->postRdw($this->base(['break_time' => 'abc']))->assertStatus(422); }

    /** @test */ public function rejects_break_time_over_one_hour()
    { $this->postRdw($this->base(['break_time' => '02:00']))->assertStatus(422); }

    /** @test */ public function rejects_non_existent_user_id()
    { $this->postRdw($this->base(['user_id' => 999999999]))->assertStatus(422); }

    /** @test */ public function rejects_overlong_employee_note()
    { $this->postRdw($this->base(['employee_note' => str_repeat('x', 256)]))->assertStatus(422); }

    /** @test */ public function rejects_overlong_approver_note()
    { $this->postRdw($this->base(['approver_note' => str_repeat('x', 256)]))->assertStatus(422); }
}
