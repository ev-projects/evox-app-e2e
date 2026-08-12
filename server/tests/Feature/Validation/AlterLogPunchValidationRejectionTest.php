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
use Illuminate\Support\Facades\DB;
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
        // Prefer the verified fixture user (id=4391); fall back to any user with an overnight
        // punch-history row (end_time crosses midnight into the next calendar day).
        $u      = User::find(4391);
        $userId = 4391;
        $date   = '2026-04-09';        // submission date
        $start  = '2026-04-09 01:00:00'; // conflicts with user 4391's 2026-04-08 overnight punch-out
        $end    = '2026-04-09 10:00:00';

        if (!$u) {
            // Dynamic fallback: find a punch-history row where the shift's end_time date is AFTER
            // the shift's date column (overnight shift that crossed midnight).
            $overnight = DB::table('dtr_collective_punch_history_new')
                ->whereNotNull('user_id')
                ->whereNotNull('date')
                ->whereNotNull('end_time')
                ->whereRaw('DATE(end_time) > date') // end_time spills into the next calendar day
                ->orderBy('id', 'desc')
                ->first();

            if (!$overnight) {
                $this->markTestIncomplete(
                    'punch-history conflict fixture unavailable: user 4391 absent and ' .
                    'dtr_collective_punch_history_new has no overnight-shift rows (DATE(end_time) > date)'
                );
            }

            $u = User::find($overnight->user_id);
            if (!$u) {
                $this->markTestIncomplete(
                    'overnight punch-history owner (id=' . $overnight->user_id . ') not resolvable'
                );
            }
            $userId = $u->id;
            // Submission date = the day end_time spilled into; start_time is 00:30 of that day,
            // which is before the overnight punch's end_time (guaranteed by DATE(end_time) > date).
            $date  = date('Y-m-d', strtotime($overnight->end_time));
            $start = $date . ' 00:30:00';
            $end   = $date . ' 09:00:00';
        }

        $resp = $this->actingAs($u)->postJson('/api/request/alter_log_punch', [
            'user_id'   => $userId,
            'date'      => $date,
            'new_punch' => json_encode([[
                'start_time'   => $start,
                'end_time'     => $end,
                'project_name' => 'EVOX',
                'remarks'      => 'conflict check',
            ]]),
        ]);
        $resp->assertStatus(400);
        $content = json_decode($resp->getContent(), true);
        $this->assertStringContainsString('Time in conflicts', $content['error']['message']);
    }
}
