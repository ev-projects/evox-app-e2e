<?php
/**
 * HR Announcements — FEATURE RETIRED 2026-08-13.
 * app/Modules/Hr/ deleted entirely. Routes no longer registered → 404.
 */

namespace Tests\Feature\BranchTests\HR\Hr;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class HrDeleteBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::where('is_active', 1)->first();
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    /** @test */
    public function test_delete__feature_retired__returns_404()
    {
        $response = $this->deleteJson('/api/hr/announcements/1');
        $response->assertStatus(404);
    }

    /** @test */
    public function test_delete__not_found__feature_retired__returns_404()
    {
        $response = $this->deleteJson('/api/hr/announcements/999999999');
        $response->assertStatus(404);
    }
}
