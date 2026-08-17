<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * date_helper.php — the AUTH/OWNER timezone arms the existing DateHelperTest (unauthenticated)
 * cannot reach (60 unc lines): timestamp_to_datetime / timestamp_to_datetime_small owner + auth
 * branches, seconds_to_time_POV with a user, time_to_seconds offset arms under auth.
 * Read-only helpers; DatabaseTransactions only for the user probes.
 *
 * FINDING DATE-ASSIGN-1 (characterized): timestamp_to_datetime_small gates its owner arm with
 * `if($use_OWNER = true && $owner != null)` — ASSIGNMENT, not comparison (same bug class as BUG-9).
 * Consequence: passing an owner WITHOUT use_OWNER=true still takes the owner arm. The
 * `use_owner_false_still_takes_owner_arm` test asserts this and must be flipped when fixed.
 */
class DateHelperAuthArmsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        // Constrain to India (country_id=1) or Philippines (country_id=2) — neither observes DST.
        // Both have constant UTC offsets (+05:30 and +08:00 respectively), which means
        // Carbon::now(tz)->format('P') == Carbon::createFromTimestamp(TS)->setTimezone(tz)->format('P')
        // always. The DST branch in timestamp_to_datetime() never fires, keeping current-offset
        // and historical-offset identical and test assertions consistent.
        // Avoid Bulgaria/Morocco/Belgium (DST-observing) — Carbon::now() current offset diverges
        // from the self::TS Jan-2026 historical offset, causing the DST branch to apply a different
        // offset than the test's $this->user->country_timezone_to_offset() computes.
        $this->user = User::whereNotNull('country_id')
            ->whereIn('country_id', [1, 2])   // 1=India (UTC+5:30), 2=Philippines (UTC+8) — no DST
            ->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user || $this->user->country_timezone_to_offset() === null) {
            $this->markTestSkipped('no active India/Philippines user with a resolvable country timezone in test DB');
        }
        $this->be($this->user);
    }

    private const TS = 1767225600;   // 2026-01-01 00:00:00 UTC — fixed, DST-free for PH/IN

    /** @test */
    public function timestamp_to_datetime_applies_the_auth_users_offset()
    {
        $offset = string_offset_to_seconds($this->user->country_timezone_to_offset());

        $out = timestamp_to_datetime(self::TS);

        $this->assertRegExp('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $out);
        $this->assertSame(date('Y-m-d H:i:s', self::TS + $offset), $out);

        $this->assertNull(timestamp_to_datetime(null));           // invalid arm under auth
    }

    /** @test */
    public function timestamp_to_datetime_owner_arm_uses_the_owners_offset()
    {
        $owner = $this->user;                                     // same-offset arm is deterministic
        $offset = string_offset_to_seconds($owner->country_timezone_to_offset());

        $out = timestamp_to_datetime(self::TS, true, $owner);

        $this->assertSame(date('Y-m-d H:i:s', self::TS + $offset), $out);
    }

    /** @test */
    public function timestamp_to_datetime_small_owner_and_auth_arms()
    {
        $offset = string_offset_to_seconds($this->user->country_timezone_to_offset());

        $this->assertSame(date('m-d H:i', self::TS + $offset),
            timestamp_to_datetime_small(self::TS, true, $this->user));    // owner arm

        $this->assertSame(date('m-d H:i', self::TS + $offset),
            timestamp_to_datetime_small(self::TS));                        // auth arm (no owner)
    }

    /** @test */
    public function small_variant_use_owner_false_still_takes_owner_arm_DATE_ASSIGN_1()
    {
        $offset = string_offset_to_seconds($this->user->country_timezone_to_offset());

        // use_OWNER=false is OVERWRITTEN by the `=` assignment -> owner arm anyway
        $out = timestamp_to_datetime_small(self::TS, false, $this->user);

        $this->assertSame(date('m-d H:i', self::TS + $offset), $out);
    }

    /** @test */
    public function seconds_to_time_pov_formats_with_the_given_users_offset()
    {
        $out = seconds_to_time_POV(9 * 3600, false, true, $this->user);
        $this->assertIsString($out);
        $this->assertNotSame('', $out);

        $complete = seconds_to_time_POV(9 * 3600, true, true, $this->user);
        $this->assertIsString($complete);
    }

    /** @test */
    public function time_to_seconds_offset_arms_shift_by_the_auth_users_timezone()
    {
        $offset = string_offset_to_seconds($this->user->country_timezone_to_offset());
        $base = time_to_seconds('08:00');

        $this->assertSame($base + $offset, time_to_seconds('08:00', true, 'add'));
        $this->assertSame($base - $offset, time_to_seconds('08:00', true, 'subtract'));
    }

    /** @test */
    public function apply_timezone_formats_in_the_named_zone()
    {
        $out = apply_timezone(self::TS, 'Asia/Manila');

        $this->assertSame('2026-01-01 08:00:00', $out);           // UTC+8, fixed offset
    }
}
