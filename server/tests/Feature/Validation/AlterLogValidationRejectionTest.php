<?php
// Validation REJECTION tests — Alter Log (single time-in/time-out edit). Every case sends
// INVALID data and asserts the FormRequest blocks it (422). A rejected request writes
// NOTHING, so this is safe on the live-dump DB. Uses withoutMiddleware() to bypass the
// JWT/apiKey auth gate (which is not what we're testing here) so the request reaches
// AlterLogRequest validation. No seeding (the shared dump can't run UserTestSeeder), so we
// act as a real existing user.
//
// NOTE: rejects_missing_employee_note confirms a real FE/BE mismatch — the FE Yup schema
// marks employee_note optional/nullable, but AlterLogRequest requires it. See
// matrices/alter-log.md finding.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AlterLogValidationRejectionTest extends TestCase
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

    private function postAl(array $payload)
    {
        $payload += ['user_id' => $this->user->id];
        return $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'date'          => date('Y-m-d'),
            'new_time_in'   => date('Y-m-d') . ' 09:00:00',
            'new_time_out'  => date('Y-m-d') . ' 18:00:00',
            'employee_note' => 'Missed punch correction',
        ], $override);
    }

    /** @test */ public function rejects_missing_date()
    { $p = $this->base(); unset($p['date']); $this->postAl($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_date_format()
    { $this->postAl($this->base(['date' => '2026/01/01']))->assertStatus(422); }

    /** @test */ public function rejects_missing_new_time_in()
    { $p = $this->base(); unset($p['new_time_in']); $this->postAl($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_new_time_in_format()
    { $this->postAl($this->base(['new_time_in' => 'abc']))->assertStatus(422); }

    /** @test */ public function rejects_missing_new_time_out()
    { $p = $this->base(); unset($p['new_time_out']); $this->postAl($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_new_time_out_format()
    { $this->postAl($this->base(['new_time_out' => 'abc']))->assertStatus(422); }

    /** @test */ public function rejects_bad_current_time_in_format()
    { $this->postAl($this->base(['current_time_in' => 'not-a-datetime']))->assertStatus(422); }

    /** @test */ public function rejects_missing_employee_note()
    { $p = $this->base(); unset($p['employee_note']); $this->postAl($p)->assertStatus(422); }

    /** @test */ public function rejects_overlong_employee_note()
    { $this->postAl($this->base(['employee_note' => str_repeat('x', 256)]))->assertStatus(422); }

    /** @test */ public function rejects_overlong_approver_note()
    { $this->postAl($this->base(['approver_note' => str_repeat('x', 256)]))->assertStatus(422); }

    /** @test */ public function rejects_non_existent_user_id()
    { $this->postAl($this->base(['user_id' => 999999999]))->assertStatus(422); }
}
