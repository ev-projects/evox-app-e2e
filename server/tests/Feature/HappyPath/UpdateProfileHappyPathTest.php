<?php
// HAPPY-PATH test — Update Profile. Resubmits the acting user's OWN email/mobile_number
// (uniqueness rule ignores the owner's own row, so this can never false-reject) but
// changes first_name to a distinguishable value, to prove the write really executes
// (not just an accepted-but-no-op idempotent resend). DatabaseTransactions rolls the
// whole thing back at the end of the test — the real user's row is restored automatically,
// nothing escapes the transaction. See matrices/update-profile.md.

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class UpdateProfileHappyPathTest extends TestCase
{
    use DatabaseTransactions;

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

    /** @test */
    public function updates_own_profile_first_name_and_writes_the_row()
    {
        $newFirstName = 'HappyPathTest' . time();

        $payload = [
            'first_name' => $newFirstName,
            'last_name' => $this->user->last_name,
            'email' => $this->user->email,
            'mobile_number' => $this->user->mobile_number,
        ];

        $response = $this->actingAs($this->user)->putJson('/api/user/' . $this->user->id . '/profile/', $payload);

        $response->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'first_name' => $newFirstName,
        ]);
    }
}
