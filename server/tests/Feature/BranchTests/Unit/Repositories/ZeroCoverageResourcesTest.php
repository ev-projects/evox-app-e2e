<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use App\Modules\Client\Resources\ClientResource;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Resources\DepartmentAnnouncementResource;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Payroll\Resources\DtrPunchLogResource;
use App\Modules\Request\Models\WorkFromHome;
use App\Modules\Request\Resources\WorkFromHomeResource;
use App\Modules\User\Models\User;

/**
 * Resource classes reported at 0% by the 03-Aug gap analysis. These are the API's OUTPUT
 * contracts — every one of them is what a screen actually receives, so a null-guard that
 * misfires here shows up as a blank field for a real user.
 *
 * Each resource follows the same house shape: `toArray()` guarded by
 * `if (! is_null($this->resource))`. Both arms are exercised: a real probed model (populated arm)
 * and `null` (guard arm). Read-only; DatabaseTransactions is belt-and-braces.
 *
 * FINDING RES-NULL-1 (characterized): DtrPunchLogResource declares `$result` INSIDE the
 * null-guard and returns it unconditionally — resolving the resource with a null payload raises
 * an undefined-variable error instead of returning null like every sibling resource does.
 */
class ZeroCoverageResourcesTest extends TestCase
{
    use DatabaseTransactions;

    /** @var Request */
    private $request;

    protected function setUp(): void
    {
        parent::setUp();
        $this->request = Request::create('/api/probe', 'GET');
        $user = User::where('is_active', 1)->whereNotNull('country_id')
            ->orderBy('id', 'desc')->first();
        if ($user) $this->be($user);
    }

    // ------------------------------------------------------------------ punch log
    /** @test */
    public function dtr_punch_log_resource_maps_a_real_row_with_owner_pov()
    {
        $punch = DtrPunchHistory::whereNotNull('time_in')->whereNotNull('time_out')
            ->orderBy('id', 'desc')->first();
        if (!$punch) $this->markTestSkipped('no DtrPunchHistory row in test DB');

        $out = (new DtrPunchLogResource($punch))->toArray($this->request);

        foreach (['date', 'time_in', 'time_out', 'log_in_type', 'log_out_type',
                  'duration', 'remarks', 'project_name', 'owner_POV'] as $key) {
            $this->assertArrayHasKey($key, $out);
        }
        $this->assertArrayHasKey('time_in', $out['owner_POV']);      // POV sub-array arm
    }

    /** @test */
    public function dtr_punch_log_resource_with_null_payload_errors_RES_NULL_1()
    {
        // $result is only declared inside the null-guard, so the guard arm returns an
        // undefined variable. FLIP this once $result is initialised to null like the siblings.
        $this->expectException(\Throwable::class);

        (new DtrPunchLogResource(null))->toArray($this->request);
    }

    // -------------------------------------------------------------------- client
    /** @test */
    public function client_resource_maps_department_handlers_and_users()
    {
        $this->markTestSkipped('CLIENT MODULE REMOVED 2026-08-10: App\Modules\Client\Resources\ClientResource deleted with client module.');
        $client = EvoxDepartment::orderBy('id', 'desc')->first();
        if (!$client) $this->markTestSkipped('no department row in test DB');

        $out = (new ClientResource($client))->toArray($this->request);

        $this->assertArrayHasKey('id', $out);
        $this->assertArrayHasKey('department_handlers', $out);
        $this->assertArrayHasKey('users', $out);

        $this->assertNull((new ClientResource(null))->toArray($this->request));   // guard arm
    }

    // ------------------------------------------------------------- announcements
    /** @test */
    public function department_announcement_resource_maps_a_row_and_guards_null()
    {
        $announcement = Announcement::whereNotNull('created_at')->orderBy('id', 'desc')->first();
        if (!$announcement) $this->markTestSkipped('no announcement row in test DB');

        $out = (new DepartmentAnnouncementResource($announcement))->toArray($this->request);

        foreach (['id', 'title', 'headline', 'thumbnail', 'content', 'category',
                  'release_date', 'status', 'dep_id', 'created_at'] as $key) {
            $this->assertArrayHasKey($key, $out);
        }
        // thumbnail arm: null stays null, a stored path becomes a full asset URL
        if ($announcement->thumbnail === null) {
            $this->assertNull($out['thumbnail']);
        } else {
            $this->assertStringContainsString('/storage/', $out['thumbnail']);
        }
        $this->assertRegExp('/^\d{4}-\d{2}-\d{2}$/', $out['created_at']);

        $this->assertNull((new DepartmentAnnouncementResource(null))->toArray($this->request));
    }

    // --------------------------------------------------------------- work from home
    /** @test */
    public function work_from_home_resource_maps_a_row_or_skips_cleanly()
    {
        $wfh = WorkFromHome::orderBy('id', 'desc')->first();
        if (!$wfh) $this->markTestSkipped('no WorkFromHome row in test DB (feature may be unused)');

        $out = (new WorkFromHomeResource($wfh))->toArray($this->request);

        $this->assertIsArray($out);
        $this->assertArrayHasKey('id', $out);
    }
}
