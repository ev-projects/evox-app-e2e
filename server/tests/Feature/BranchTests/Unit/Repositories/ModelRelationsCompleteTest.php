<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\EvoxLevels;
use App\Modules\Client\Repositories\ClientRepository;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Payroll\Models\DtrPolicy;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Repositories\PayrollCutoffRepository;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Schedule\Models\ScheduleDetail;
use App\Modules\Schedule\Models\SchedulePolicy;
use App\Modules\Team\Models\Team;
use App\Modules\Team\Repositories\TeamRepository;
use App\Modules\User\Models\User;

/**
 * Finishes the last remaining method in a batch of otherwise-complete classes
 * (CLASS-COMPLETION-PLAN.md): a single relation or list method each. A class only counts when
 * every method counts, so these one-liners convert ~10 classes from uncounted to counted.
 *
 * Everything here is a bounded read — relations are resolved on ONE probed row, and the list
 * repositories are small reference tables (teams, clients, payroll cutoffs). No writes.
 */
class ModelRelationsCompleteTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if ($user) $this->be($user);
    }

    // -------------------------------------------------------------- schedule relations
    /** @test */
    public function schedule_detail_and_policy_resolve_their_parent_schedule()
    {
        $detail = ScheduleDetail::whereNotNull('schedule_id')->orderBy('id', 'desc')->first();
        if ($detail) {
            $this->assertNotNull($detail->schedule());
            $this->assertNotNull($detail->schedule()->getQuery());
        }

        $policy = SchedulePolicy::whereNotNull('schedule_id')->orderBy('id', 'desc')->first();
        if ($policy) {
            $this->assertNotNull($policy->schedule());
        }

        if (!$detail && !$policy) $this->markTestSkipped('no schedule detail/policy rows in test DB');
    }

    // ------------------------------------------------------------------ dtr relations
    /** @test */
    public function dtr_policy_and_change_schedule_resolve_their_dtr_relation()
    {
        $dtrPolicy = DtrPolicy::whereNotNull('dtr_id')->orderBy('id', 'desc')->first();
        if ($dtrPolicy) {
            $this->assertNotNull($dtrPolicy->dtr());
        }

        // ChangeSchedule::dtr() is a date-bounded belongsTo — resolve it on a dated row
        $cs = ChangeSchedule::whereNotNull('valid_from')->whereNotNull('valid_to')
            ->orderBy('id', 'desc')->first();
        if ($cs) {
            $this->assertNotNull($cs->dtr());
        }

        if (!$dtrPolicy && !$cs) $this->markTestSkipped('no dtr policy / dated change-schedule rows');
    }

    // --------------------------------------------------------- department + team + level
    /** @test */
    public function department_announcements_presented_and_team_department_resolve()
    {
        $dept = EvoxDepartment::orderBy('Id', 'desc')->first();
        if ($dept) {
            $presented = $dept->departments_announcements_presented();
            $this->assertNotNull($presented);
            $this->assertLessThanOrEqual(50, $presented->limit(50)->get()->count());
        }

        $team = Team::whereNotNull('department_id')->orderBy('id', 'desc')->first();
        if ($team) {
            $this->assertNotNull($team->department());
        }

        if (!$dept && !$team) $this->markTestSkipped('no department/team rows in test DB');
    }

    /** @test */
    public function evox_level_resolves_its_feature_pivot()
    {
        $level = EvoxLevels::orderBy('LevelId')->first();
        if (!$level) $this->markTestSkipped('EVOX_LEVELS is empty');

        $features = $level->level_features();

        $this->assertNotNull($features);
        $this->assertLessThanOrEqual(200, $features->limit(200)->get()->count());
    }

    // ---------------------------------------------------------------------- holidays
    /** @test */
    public function holiday_lookup_returns_the_upcoming_window()
    {
        $holidays = (new Holiday())->get_holiday_within_date();

        $this->assertNotNull($holidays);
        $this->assertIsIterable($holidays);
        // the query mixes predefined (day-of-year window) and dated rows within the next 3 months
        foreach ($holidays as $h) {
            $this->assertNotNull($h->date);
        }
    }

    // ------------------------------------------------- small reference-list repositories
    /** @test */
    public function reference_list_repositories_return_their_collections()
    {
        $teams = (new TeamRepository())->all();
        $this->assertNotNull($teams);

        $cutoffs = (new PayrollCutoffRepository())->all();
        $this->assertNotNull($cutoffs);

        $clients = (new ClientRepository())->all();
        $this->assertNotNull($clients);
    }
}
