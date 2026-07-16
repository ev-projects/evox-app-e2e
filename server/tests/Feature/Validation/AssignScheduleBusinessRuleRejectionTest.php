<?php
// DEEPER validation — Assign Schedule CONTROLLER / BUSINESS-layer rule (beyond the
// FormRequest datatype layer in AssignScheduleValidationRejectionTest). Zero-write: the
// nonexistent-bind_id case throws INSIDE ScheduleRepository::assign() (via get_authenticated_user)
// BEFORE ScheduleRepository::store()/update() or DtrRepository::apply_schedule_to_dtr() ever run,
// so nothing is written; the controller's catch(Exception $e) turns it into error_response().

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class AssignScheduleBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
    }

    /**
     * `bind_to`/`bind_id` are not `exists:`-validated by AssignScheduleRequest (bind_id is just
     * `string`), so a nonexistent bind_id reaches ScheduleController@assign ->
     * ScheduleRepository::assign() -> get_authenticated_user($bind_id) (Helpers/user_helper.php:12).
     * For a non-admin-full_access actor targeting a bind_id that isn't their own id,
     * get_authenticated_user does `User::findOrFail($user_id)` (line 32) BEFORE the supervisee
     * check — a bind_id with no matching `users` row throws ModelNotFoundException there,
     * regardless of the acting user's role (the admin/full_access branch also calls
     * User::findOrFail directly). Caught by ScheduleController@assign's catch(Exception $e) ->
     * error_response(trans('messages.error_default'), $e) — error_response defaults to HTTP 400
     * (api_response_helper.php:29) when no explicit code is passed, so this is 400, NOT 422 (the
     * request passed FormRequest validation) and NOT 201 (assign_to_user/store is never reached).
     * @test
     */
    public function rejects_assign_to_nonexistent_bind_id_user()
    {
        $max_id = DB::table('users')->max('id');
        $bogus_id = (string) ($max_id + 999999);

        $payload = [
            'source_type'   => 'default',
            'bind_to'       => 'user',
            'bind_id'       => $bogus_id,
            'schedule_type' => 'standard',
            'valid_from'    => date('Y-m-d'),
            'work_days'     => ['mon'],
            'schedule_details' => [
                'all' => [
                    'start_time' => '08:00',
                    'end_time'   => '17:00',
                    'break_time' => '00:30',
                ],
            ],
        ];

        $resp = $this->actingAs($this->user)->postJson('/api/schedule/assign/', $payload);

        $resp->assertStatus(400);
    }

    // NOT exercised (documented only, crash risk on shared staging): `bind_to=department` with a
    // nonexistent bind_id. ScheduleRepository::assign() does
    // `EvoxDepartment::where('id',$data['bind_id'])->first()` (returns null, no exception) then
    // immediately calls `assign_to_department(array $data, EvoxDepartment $department)` — a
    // strictly-typed parameter. Passing null into a typed-object parameter is a PHP TypeError
    // (extends Error, not Exception, in PHP 7/8) which the controller's `catch(Exception $e)`
    // does NOT catch — this traces to an uncaught fatal (likely a raw 500 without the app's
    // error_response envelope) rather than a graceful 400/422. Not run here to avoid an
    // unhandled-error path on the shared staging box; see FINDINGS-FOR-REVIEW.md (A18) and
    // matrices/schedule-assign.md.
}
