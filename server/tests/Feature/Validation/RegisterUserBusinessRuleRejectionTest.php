<?php
// DEEPER validation — Register User CONTROLLER / BUSINESS / DB-layer rules (beyond the
// FormRequest datatype layer in RegisterUserValidationRejectionTest, which already collides
// on the ACTING user's own email). This file proves the `unique:users,email` rule is a true
// TABLE-WIDE check — not accidentally scoped to "self" — by colliding on a SECOND, unrelated
// existing user's email read straight from the DB (never inserted). Every assertion is wrapped
// with a users-row-count invariant to prove the rejection reaches zero rows written, which is
// the actual DB-layer guarantee this suite exists to verify. Still zero-write; DatabaseTransactions
// is belt-and-suspenders.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;

class RegisterUserBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;
    private $department;
    private $roleName;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        $this->department = Department::first();
        $this->roleName = DB::table('roles')->value('name'); // raw query — no Spatie dependency
        if (!$this->user || !$this->department || !$this->roleName) {
            $this->markTestIncomplete('no user/department/role available in test DB');
        }
    }

    private function postRegister(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/user/register', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'first_name'          => 'RejectTest',
            'last_name'           => 'RejectTest',
            'email'               => 'reject_test_' . time() . '_' . mt_rand(1000, 9999) . '@example.invalid',
            'departments_handled' => [$this->department->id],
            'roles'               => [$this->roleName],
        ], $override);
    }

    /** @test — unique:users,email is table-wide, not self-scoped; collide with a DIFFERENT
     *  existing user's email (read via raw DB, not the acting user) and prove zero rows written. */
    public function rejects_email_colliding_with_a_different_existing_user_and_writes_nothing()
    {
        $otherEmail = DB::table('users')
            ->where('id', '!=', $this->user->id)
            ->whereNotNull('email')
            ->value('email');
        if (!$otherEmail) { $this->markTestIncomplete('no second user with an email to collide with'); }

        $before = DB::table('users')->count();
        $this->postRegister($this->base(['email' => $otherEmail]))->assertStatus(422);
        $after = DB::table('users')->count();

        $this->assertSame($before, $after, 'a rejected register request must not insert a users row');
    }

    // REAL BUG (code-inspection only, see matrices/register-user.md) — RegisterUserRequest
    // validates email as `required|string|unique:users,email` with NO `email` format rule
    // (unlike the FE Yup schema). A payload that only breaks email FORMAT while keeping every
    // other field valid-and-unique would PASS all backend validation and create a real user +
    // send a real welcome email — that is exactly the write this suite must never trigger, so
    // the gap cannot be exercised live. Documented, not tested.
    /** @test */
    public function email_format_gap_is_documented_not_exercised()
    {
        $this->markTestIncomplete(
            'RegisterUserRequest has no email-format rule server-side; a syntactically-invalid-' .
            'but-unique "email" would pass validation and create a real user — unsafe to POST. ' .
            'See matrices/register-user.md REAL BUG section.'
        );
    }
}
