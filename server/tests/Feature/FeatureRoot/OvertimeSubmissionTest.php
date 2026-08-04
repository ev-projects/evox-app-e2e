<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class OvertimeSubmissionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_save_overtime_request()
    {
        $this->withoutMiddleware();
        $user = User::whereNotNull('country_id')->where('country_id', '>', 0)->first();

        if (!$user) {
            $this->markTestIncomplete('No users with country_id in test database.');
        }

        $response = $this->actingAs($user)->postJson('/api/request/overtime', [
            'user_id'       => $user->id,
            'date'          => '2026-08-15',
            'amount'        => '01:00',
            'type'          => 'post_overtime',
            'employee_note' => 'Playwright automated test — disregard',
            'approver_note' => '',
            'status'        => 'pending',
            'updated_by'    => $user->id,
            'created_by'    => $user->id,
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'content']);

        $this->assertDatabaseHas('overtimes', [
            'user_id' => $user->id,
            'type'    => 'post_overtime',
            'status'  => 'pending',
        ]);
    }
}
