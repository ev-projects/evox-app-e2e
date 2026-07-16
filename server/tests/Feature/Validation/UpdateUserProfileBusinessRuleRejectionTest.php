<?php
// DEEPER validation — Update Profile CONTROLLER / BUSINESS / DB-layer rules (beyond the
// FormRequest datatype layer in UpdateUserProfileValidationRejectionTest, which already
// collides on a second active user's email/mobile_number via the User model). This file reads
// the colliding row via a RAW DB::table query (independent of the User model's own scoping/
// casts) and wraps every rejection with a before/after snapshot of the TARGET user's own row,
// proving the reject path leaves first_name/last_name/email/mobile_number byte-for-byte
// unchanged — the actual DB-layer guarantee, not just the HTTP status. Zero-write;
// DatabaseTransactions is belt-and-suspenders.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class UpdateUserProfileBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) { $this->markTestSkipped('no user available in test DB'); }
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

    private function snapshot()
    {
        return DB::table('users')->where('id', $this->user->id)
            ->first(['first_name', 'last_name', 'email', 'mobile_number']);
    }

    /** @test — email uniqueness is app-scoped via Rule::unique(...)->ignore(own id); collide
     *  with a raw-DB-read second active user's email and prove the target row never changes. */
    public function rejects_duplicate_email_from_raw_db_row_and_writes_nothing()
    {
        $otherEmail = DB::table('users')
            ->where('id', '!=', $this->user->id)
            ->where('is_active', 1)
            ->whereNull('deleted_at')
            ->whereNotNull('email')
            ->value('email');
        if (!$otherEmail) { $this->markTestSkipped('no second active user with an email to collide with'); }

        $before = $this->snapshot();
        $this->putProfile($this->base(['email' => $otherEmail]))->assertStatus(422);
        $after = $this->snapshot();

        $this->assertEquals($before, $after, 'a rejected profile update must not touch the target row');
    }

    /** @test — same pattern for mobile_number uniqueness. */
    public function rejects_duplicate_mobile_number_from_raw_db_row_and_writes_nothing()
    {
        $otherMobile = DB::table('users')
            ->where('id', '!=', $this->user->id)
            ->where('is_active', 1)
            ->whereNull('deleted_at')
            ->whereNotNull('mobile_number')
            ->value('mobile_number');
        if (!$otherMobile) { $this->markTestSkipped('no second active user with a mobile_number to collide with'); }

        $before = $this->snapshot();
        $this->putProfile($this->base(['mobile_number' => $otherMobile]))->assertStatus(422);
        $after = $this->snapshot();

        $this->assertEquals($before, $after, 'a rejected profile update must not touch the target row');
    }

    // The `->ignore($this->route('id'))->whereNull('deleted_at')` scoping means a soft-deleted
    // user's email/mobile_number does NOT block a live user from taking it — that is an ACCEPT-
    // path nuance (uniqueness correctly does not fire), not a rejection, so there is nothing to
    // assert 422 against here; noted for completeness only.
    /** @test */
    public function soft_deleted_collision_is_accept_path_not_rejection_documented_only()
    {
        $this->markTestSkipped(
            'Rule::unique(...)->whereNull(\'deleted_at\') means a soft-deleted user\'s email/' .
            'mobile_number is excluded from the uniqueness check — that is an accept-path ' .
            'behavior (no 422), not testable as a rejection. See matrices/update-profile.md.'
        );
    }

    // REAL BUG (code-inspection only, see matrices/update-profile.md) — same pattern as
    // Register User: no `email` format rule server-side. Not exercised — a payload with only a
    // broken email format and every other field valid-and-unique would pass and overwrite a
    // real user's profile.
    /** @test */
    public function email_format_gap_is_documented_not_exercised()
    {
        $this->markTestSkipped(
            'UpdateUserProfileRequest has no email-format rule server-side; a syntactically-' .
            'invalid-but-unique "email" would pass validation and overwrite a real profile — ' .
            'unsafe to PUT. See matrices/update-profile.md REAL BUG section.'
        );
    }
}
