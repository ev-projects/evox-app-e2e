<?php
// Validation REJECTION tests — AlterLogPunch (multi-punch editor). This form has NO FormRequest
// and NO explicit $request->validate() call anywhere in AlterLogPunchController — confirmed by
// reading the controller/repository source (see matrices/alter-log-punch.md). Every "rejection"
// tested here is therefore NOT intentional validation: it is a raw PHP notice (undefined array
// key / null offset access) inside AlterLogPunchRepository::on_conflict()/store(), which Laravel's
// error handler converts into an ErrorException, caught by the controller's generic
// catch(Exception $e) and turned into a 400 "Sorry, something went wrong." response that leaks the
// raw PHP notice text in the `error.content` field. That is an accident of PHP semantics, not a
// validation contract — a slightly different malformed payload could just as easily NOT throw and
// proceed to write a garbage row (see matrices/alter-log-punch.md FINDING).
//
// Every case below was verified empirically on staging (a throwaway discovery test dumped the real
// response body) BEFORE being written as a hard assertion, specifically so this suite documents
// actual behavior rather than assumed behavior. All cases return HTTP 400 before
// AlterLogPunchRepository::store()/save() is ever reached, so nothing is written. The one genuine,
// intentional business rule this form has — the on_conflict() punch-overlap check — IS safely
// testable and IS testable as designed: it reads real existing DtrPunchHistory rows and submits an
// otherwise-well-formed punch that overlaps them, rather than relying on a PHP notice.
//
// DatabaseTransactions is belt-and-suspenders (rejections write nothing anyway; even the punch
// history conflict check returns before any write).

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AlterLogPunchValidationRejectionTest extends TestCase
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

    /** @test — NOT real validation: missing new_punch -> json_decode(null)[0] -> null offset
     * access -> ErrorException -> caught -> 400. Confirms there is no field-presence check. */
    public function rejects_missing_new_punch_field()
    {
        $resp = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch', [
            'user_id' => $this->user->id,
            'date'    => '2026-01-15',
        ]);
        $resp->assertStatus(400);
        $resp->assertJsonFragment(['content' => 'Trying to access array offset on value of type null']);
    }

    /** @test — NOT real validation: missing date -> AlterLogPunchRepository::store() does
     * $data['date'] on an array without that key -> "Undefined index: date" -> caught -> 400. */
    public function rejects_missing_date_field()
    {
        $resp = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch', [
            'user_id'   => $this->user->id,
            'new_punch' => json_encode([[
                'start_time'   => '2026-01-15 09:00:00',
                'end_time'     => '2026-01-15 18:00:00',
                'project_name' => 'EVOX',
                'remarks'      => 'x',
            ]]),
        ]);
        $resp->assertStatus(400);
        $resp->assertJsonFragment(['content' => 'Undefined index: date']);
    }

    /** @test — NOT real validation: a syntactically-valid empty punch array ("[]") -> on_conflict()
     * does $current_log[0] on an empty array -> "Undefined offset: 0" -> caught -> 400. */
    public function rejects_empty_new_punch_array()
    {
        $resp = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch', [
            'user_id'   => $this->user->id,
            'date'      => '2026-01-15',
            'new_punch' => json_encode([]),
        ]);
        $resp->assertStatus(400);
        $resp->assertJsonFragment(['content' => 'Undefined offset: 0']);
    }

    /** @test — completely empty payload; same failure mode as missing new_punch. */
    public function rejects_completely_empty_payload()
    {
        $resp = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch', []);
        $resp->assertStatus(400);
        $resp->assertJsonFragment(['content' => 'Trying to access array offset on value of type null']);
    }

    /** @test — the ONE genuine, intentional business rule on this form: on_conflict() rejects a
     * punch whose start time is before the previous day's recorded punch-out (an overnight-shift
     * DTR fixture). Uses real DtrPunchHistory rows already in the dump; asserted against a value
     * verified via a staging tinker run, not guessed. Returns 400 BEFORE
     * AlterLogPunchRepository::store() is called -> no write. */
    public function rejects_on_punch_time_conflict_with_previous_day_history()
    {
        $u = User::find(4391);
        if (!$u) {
            $this->markTestIncomplete('punch-history conflict fixture user (id=4391) not present in test DB');
        }

        $resp = $this->actingAs($u)->postJson('/api/request/alter_log_punch', [
            'user_id'   => 4391,
            'date'      => '2026-04-09',
            'new_punch' => json_encode([[
                'start_time'   => '2026-04-09 01:00:00',
                'end_time'     => '2026-04-09 10:00:00',
                'project_name' => 'EVOX',
                'remarks'      => 'conflict check',
            ]]),
        ]);
        $resp->assertStatus(400);
        $content = json_decode($resp->getContent(), true);
        $this->assertStringContainsString('Time in conflicts', $content['error']['message']);
    }
}
