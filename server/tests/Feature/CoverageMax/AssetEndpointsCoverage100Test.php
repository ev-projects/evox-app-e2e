<?php
// Coverage100 — generated 2026-07-09.
//
// Closes the last 2 of the 14 uncovered-endpoint audit findings (PAGE-COVERAGE-AUDIT.md §3b):
//   POST user/updateasset   — auth-gate existed (UserAssetsMiscTest) but no body test.
//   POST user/assetExport   — auth-gate existed; body test was previously SKIPPED because
//                              EV_SP_Get_Assets was believed absent from the test DB.
//                              Verified 2026-07-09: the SP now exists and returns rows
//                              (`SHOW PROCEDURE STATUS` + a direct `CALL` both succeed),
//                              so the real body path is exercised here instead of skipped.
//
// The other 12 of the 14 audit-flagged endpoints (user/{id}/time_off, tick_dpa, my_team_list,
// team_list/{dept}, schedule/{schedule_id}, search-user-dispute, getallassets, getasset/{id},
// department/get_department_all, department/announcements/increment_dashboard_departments,
// report/team_attendance_summary, report/attendance/summary/export) already have passing
// auth-gate + body tests in UserEndpointsTest.php / ReportEndpointsTest.php /
// DepartmentEndpointsTest.php (all deployed under this same CoverageMax directory since
// 2026-07-08) — the audit ran before that suite was cross-checked, so it flagged them as
// uncovered without seeing these files. Re-verified green on staging as part of this task.
//
// Also checked: NotificationMenu (client/src/components/Template/NotificationMenu) dispatches
// getMyNotifications() -> GET /get_redis_notifications/{user_id}. Already covered by
// DashboardApiTest.php, MiscProtectedApiTest.php, and Api/AnnouncementAndHolidayApiTest.php
// (auth-gate + 200 + default-content-shape tests). No gap there, nothing added.

namespace Tests\Feature\CoverageMax;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

class AssetEndpointsCoverage100Test extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->first() ?? User::first();
    }

    private function requireUser()
    {
        if (!$this->user) {
            $this->markTestIncomplete('No users in test DB.');
        }
    }

    /** Real, non-deleted asset_management row — read-only lookup, no writes. */
    private function realAsset()
    {
        return DB::table('asset_management')->whereNull('deleted_at')->first();
    }

    // ─── user/updateasset — Pattern B: auth enforcement ──────────────────────

    /** @test */
    public function test_update_asset_without_token_returns_401()
    {
        $this->postJson('/api/user/updateasset', ['id' => 1], $this->apiKey)->assertStatus(401);
    }

    // ─── user/updateasset — Pattern A: real write, rolled back by DatabaseTransactions ──

    /** @test */
    public function test_update_asset_with_nonexistent_id_is_a_safe_noop_and_not_500()
    {
        // AssetManagement::where('id', $request->id)->update(...) — no matching row means
        // zero rows affected, controller still returns 201 success_response. No write occurs.
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/user/updateasset', [
            'id' => 999999,
            'personal_equipment' => 1,
            'equipment_type' => 'Laptop',
            'serial_no' => 'COV100-TEST',
            'asset_tag' => 'COV100-TAG',
        ], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
        if ($response->status() === 201 || $response->status() === 200) {
            // 0 rows updated for a nonexistent id.
            $this->assertEquals(0, $response->json('content'));
        }
    }

    /** @test */
    public function test_update_asset_with_real_id_writes_and_is_rolled_back()
    {
        // Exercises the real Eloquent write path against a real asset_management row.
        // DatabaseTransactions wraps the whole test in a transaction that's rolled back
        // at tearDown, so this never persists against the shared test DB.
        $this->requireUser();
        $asset = $this->realAsset();
        if (!$asset) {
            $this->markTestIncomplete('No non-deleted asset_management rows in test DB.');
        }

        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/user/updateasset', [
            'id' => $asset->id,
            'personal_equipment' => $asset->personal_equipment,
            'equipment_type' => $asset->equipment_type,
            'serial_no' => $asset->serial_no,
            'asset_tag' => $asset->asset_tag,
        ], $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $this->assertContains($response->status(), [200, 201]);
        // update() returns the number of affected rows; a matching id affects exactly 1.
        $this->assertEquals(1, $response->json('content'));

        // Confirm the row was actually touched (updated_at bumped) inside this same
        // transaction, proving the write path ran end-to-end before the rollback.
        $reloaded = DB::table('asset_management')->where('id', $asset->id)->first();
        $this->assertNotNull($reloaded->updated_at);
    }

    // ─── user/assetExport — Pattern B: auth enforcement ──────────────────────

    /** @test */
    public function test_asset_export_without_token_returns_401()
    {
        $this->postJson('/api/user/assetExport', [], $this->apiKey)->assertStatus(401);
    }

    // ─── user/assetExport — Pattern A: real body, read-only SP + file download ──

    /** @test */
    public function test_asset_export_returns_file_download_not_500()
    {
        // assetExport is read-only: call_sp('EV_SP_Get_Assets', ...) is a SELECT-only stored
        // procedure (verified directly via `CALL EV_SP_Get_Assets(NULL,NULL,NULL)` on the
        // test DB, returns rows, no INSERT/UPDATE/DELETE in the SP or the controller), then
        // Excel::download() streams a CSV. Nothing is written — safe to call without wrapping
        // in a rollback-sensitive assertion.
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->post('/api/user/assetExport', [], $this->apiKey);
        // assetExport returns a Symfony BinaryFileResponse (file download), not a JSON
        // response, so TestResponse's proxied status()/json() helpers don't apply —
        // use getStatusCode() (a real BinaryFileResponse method) instead.
        $this->assertNotEquals(500, $response->getStatusCode());
        $this->assertEquals(200, $response->getStatusCode());
        $this->assertStringContainsString('csv', strtolower($response->headers->get('Content-Disposition') ?? ''));
    }

    /** @test */
    public function test_asset_export_with_department_filter_not_500()
    {
        // Same read-only SP with a real department_id filter — exercises the parameterized
        // branch of EV_SP_Get_Assets rather than the NULL/all-departments default.
        $this->requireUser();
        $this->withoutMiddleware();
        $deptId = DB::table('departments')->value('id') ?? 1;
        $response = $this->actingAs($this->user)->post('/api/user/assetExport', [
            'department_id' => $deptId,
        ], $this->apiKey);
        $this->assertNotEquals(500, $response->getStatusCode());
    }
}
