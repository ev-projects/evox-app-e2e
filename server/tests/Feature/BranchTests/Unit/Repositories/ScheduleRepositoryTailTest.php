<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\User\Models\User;

/**
 * ScheduleRepository tail (69.9%, 101 unc lines) — the arms ChangeScheduleRepositoryLiveTest's
 * standard-store path never reaches: template/default valid-date arms, flexible + customize
 * schedule types (flexy-time details), real policy/holiday-policy persistence,
 * copy_schedule_to_user BOTH arms (replicate + build-default), destroy/list/show reads.
 * Zero SPs (verified); every write rolls back via DatabaseTransactions.
 */
class ScheduleRepositoryTailTest extends TestCase
{
    use DatabaseTransactions;

    /** @var ScheduleRepository */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new ScheduleRepository();
        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user in test DB');
        $this->be($this->user);
    }

    private function payload(array $overrides = [])
    {
        $policies = config('constants.SCHEDULE_POLICIES');
        $holidayPolicies = config('constants.SCHEDULE_HOLIDAY_POLICIES');
        $policyValues = [];
        foreach (array_merge($policies, $holidayPolicies) as $p) {
            $policyValues[$p] = 1;                                // real keys -> both save arms
        }
        return array_merge([
            'name'              => 'Tail Test Schedule',
            'source_type'       => 'template',
            'schedule_type'     => 'standard',
            'work_days'         => array_slice(config('constants.DAYS'), 1, 5),
            'schedule_details'  => ['all' => ['start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '01:00']],
            'schedule_policies' => $policyValues,
        ], $overrides);
    }

    // ------------------------------------------------------------ valid-date arms
    /** @test */
    public function template_source_nulls_dates_and_persists_both_policy_families()
    {
        $schedule = $this->repo->store($this->payload());

        $this->assertNull($schedule->valid_from);                  // template arm
        $this->assertNull($schedule->valid_to);
        $policyCount = count(config('constants.SCHEDULE_POLICIES'))
                     + count(config('constants.SCHEDULE_HOLIDAY_POLICIES'));
        $this->assertSame($policyCount, $schedule->schedule_policies()->count());
    }

    /** @test */
    public function default_source_keeps_only_valid_from()
    {
        $schedule = $this->repo->store($this->payload([
            'source_type' => 'default', 'valid_from' => '2026-08-01', 'valid_to' => '2026-08-31',
        ]));

        $this->assertSame('2026-08-01', (string) $schedule->valid_from);   // default arm
        $this->assertNull($schedule->valid_to);
    }

    // ------------------------------------------------------- flexible / customize types
    /** @test */
    public function flexible_type_persists_flexy_times()
    {
        $schedule = $this->repo->store($this->payload([
            'schedule_type'    => 'flexible',
            'schedule_details' => ['all' => [
                'start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '01:00',
                'start_flexy_time' => '08:00', 'end_flexy_time' => '10:00',
            ]],
        ]));

        $detail = $schedule->schedule_details()->first();
        $this->assertNotNull($detail->start_flexy_time);           // flexible arm
        $this->assertNotNull($detail->end_flexy_time);
    }

    /** @test */
    public function customize_type_stores_per_day_details_with_optional_flexy()
    {
        $days = array_slice(config('constants.DAYS'), 1, 2);       // two work days
        $details = [];
        $details[$days[0]] = ['start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '01:00',
                              'start_flexy_time' => '08:00', 'end_flexy_time' => '10:00'];  // isset arm
        $details[$days[1]] = ['start_time' => '10:00', 'end_time' => '19:00', 'break_time' => '00:30'];

        $schedule = $this->repo->store($this->payload([
            'schedule_type'    => 'customize',
            'work_days'        => $days,
            'schedule_details' => $details,
        ]));

        $this->assertSame(2, $schedule->schedule_details()->count());   // customize filter arm
        $this->assertEqualsCanonicalizing($days,
            $schedule->schedule_details()->pluck('day')->all());
    }

    // ------------------------------------------------------------ copy_schedule_to_user
    /** @test */
    public function copy_schedule_replicates_details_and_policies_for_the_user()
    {
        $source = $this->repo->store($this->payload());

        $copy = $this->repo->copy_schedule_to_user($source, $this->user);

        $this->assertNotSame($source->id, $copy->id);
        $this->assertSame('user', $copy->bind_to);                 // replicate arm
        $this->assertEquals($this->user->id, $copy->bind_id);
        $this->assertSame($source->schedule_details()->count(), $copy->schedule_details()->count());
        $this->assertSame($source->schedule_policies()->count(), $copy->schedule_policies()->count());
    }

    /** @test */
    public function copy_schedule_with_null_builds_the_default_schedule()
    {
        $copy = $this->repo->copy_schedule_to_user(null, $this->user);

        $this->assertSame('user', $copy->bind_to);                 // build-default arm
        $this->assertEquals($this->user->id, $copy->bind_id);
        $this->assertSame(3, $copy->schedule_policies()->count()); // allow_late/night_diff/undertime
        $this->assertGreaterThanOrEqual(1, $copy->schedule_details()->count());
        $this->assertStringContainsString($this->user->getFullName(), $copy->name);
    }

    // --------------------------------------------------------- destroy / list / show
    /** @test */
    public function destroy_removes_schedule_with_details_and_policies()
    {
        $schedule = $this->repo->store($this->payload());
        $id = $schedule->id;

        $this->assertTrue($this->repo->destroy($id));
        $this->assertNull(Schedule::find($id));
    }

    /** @test */
    public function list_show_and_template_lookup_read_correctly()
    {
        $schedule = $this->repo->store($this->payload());

        $this->assertEquals($schedule->id, $this->repo->show($schedule->id)->id);
        $this->assertNotNull($this->repo->list($this->user->id));  // paginated user schedules
        $this->assertNotNull($this->repo->get_template_schedules());
    }
}
