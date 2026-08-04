<?php
// Validation REJECTION tests — Generate DTR. Every case sends INVALID data (missing/bad
// required field) and asserts the FormRequest blocks it (422). Uses withoutMiddleware() to
// bypass the JWT/apiKey auth gate so the request reaches GenerateDtrRequest validation.
// No test sends a structurally-valid payload, per the coverage-max safety rule — the
// separate business-level gap (nonexistent user id in `ids` skips validation but is still
// caught before any dtrs write, per source review) is documented in matrices/generate-dtr.md
// instead of exercised here.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class GenerateDtrValidationRejectionTest extends TestCase
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

    private function postGenerate(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/generate/dtr/', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'start_date' => date('Y-m-d'),
            'end_date'   => date('Y-m-d', strtotime('+1 day')),
            'ids'        => [['value' => $this->user->id]],
        ], $override);
    }

    /** @test */ public function rejects_missing_start_date()
    { $p = $this->base(); unset($p['start_date']); $this->postGenerate($p)->assertStatus(422); }

    /** @test */ public function rejects_missing_end_date()
    { $p = $this->base(); unset($p['end_date']); $this->postGenerate($p)->assertStatus(422); }

    /** @test */ public function rejects_end_date_before_start_date()
    {
        $this->postGenerate($this->base([
            'start_date' => date('Y-m-d', strtotime('+10 days')),
            'end_date'   => date('Y-m-d'),
        ]))->assertStatus(422);
    }

    /** @test */ public function rejects_missing_ids()
    { $p = $this->base(); unset($p['ids']); $this->postGenerate($p)->assertStatus(422); }
}
