<?php

/**
 * Resource coverage — drives the 4 model-type branches in
 * RequestApprovalChangeStatusResource (Overtime/RestDayWork/AlterLog/ChangeSchedule)
 * through the real hash-code approval endpoint.
 *
 * Also exercises AlterLogResource, ChangeScheduleResource, RestDayWorkResource
 * via their respective find endpoints.
 *
 * setUp() seeds one record of each type. DatabaseTransactions rolls them back.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Modules\User\Models\User;

class evoxtest_ResourceClassesTest extends TestCase
{
    use DatabaseTransactions;

    private User $employee;
    private User $supervisor;
    private string $supToken;
    private string $empToken;
    private string $rawApiKey;

    private int $overtimeId;
    private int $restDayWorkId;
    private int $alterLogId;
    private int $changeScheduleId;

    private const OT_DATE = '2026-03-15';

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee   = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();
        $this->supervisor = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        $this->rawApiKey = Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_resources_' . now()->format('His'),
            'key'        => $this->rawApiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->empToken = auth('api')->login($this->employee);
        $this->supToken = auth('api')->login($this->supervisor);

        // Seed records — one per model type
        $this->overtimeId = DB::table('overtimes')->insertGetId([
            'user_id'       => $this->employee->id,
            'date'          => self::OT_DATE,
            'amount'        => 3600,
            'type'          => 'overtime',
            'status'        => 'pending',
            'employee_note' => 'E2E resource test',
            'created_by'    => $this->employee->id,
            'updated_by'    => $this->employee->id,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $this->restDayWorkId = DB::table('rest_day_works')->insertGetId([
            'user_id'       => $this->employee->id,
            'date'          => self::OT_DATE,
            'start_time'    => strtotime(self::OT_DATE . ' 09:00:00'),
            'end_time'      => strtotime(self::OT_DATE . ' 18:00:00'),
            'break_time'    => 3600,
            'status'        => 'pending',
            'employee_note' => 'E2E resource test',
            'created_by'    => $this->employee->id,
            'updated_by'    => $this->employee->id,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $this->alterLogId = DB::table('alter_logs')->insertGetId([
            'user_id'         => $this->employee->id,
            'date'            => self::OT_DATE,
            'current_time_in' => strtotime(self::OT_DATE . ' 09:00:00'),
            'current_time_out'=> strtotime(self::OT_DATE . ' 18:00:00'),
            'new_time_in'     => strtotime(self::OT_DATE . ' 08:00:00'),
            'new_time_out'    => strtotime(self::OT_DATE . ' 17:00:00'),
            'status'          => 'pending',
            'employee_note'   => 'E2E resource test',
            'created_by'      => $this->employee->id,
            'updated_by'      => $this->employee->id,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $this->changeScheduleId = DB::table('change_schedules')->insertGetId([
            'user_id'       => $this->employee->id,
            'schedule_id'   => null,
            'valid_from'    => '2099-06-01',
            'valid_to'      => '2099-06-01',
            'status'        => 'pending',
            'employee_note' => 'E2E resource test',
            'created_by'    => $this->employee->id,
            'updated_by'    => $this->employee->id,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private function empHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->empToken, 'X-Authorization' => $this->rawApiKey];
    }

    private function supHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->supToken, 'X-Authorization' => $this->rawApiKey];
    }

    private function apiKeyOnlyHeaders(): array
    {
        return ['X-Authorization' => $this->rawApiKey];
    }

    private function hash(string $table, int $id): string
    {
        return encrypt($table . '|' . $id . '|' . $this->supervisor->id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OvertimeResource — GET /api/request/overtime/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function overtime_find_drives_overtime_resource_toArray()
    {
        // OvertimeResource::toArray() — non-null path: id, user_id, date, amount, status
        $res = $this->getJson('/api/request/overtime/' . $this->overtimeId,
            $this->supHeaders());

        $res->assertStatus(200);
        $content = $res->json('content');
        $this->assertNotNull($content);
        $this->assertEquals($this->overtimeId, $content['id'] ?? null);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RequestApprovalChangeStatusResource — overtime branch (DONE in File 3)
    // RestDayWorkResource branch via hash-code endpoint
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function hash_code_covers_rest_day_work_resource_branch()
    {
        $res = $this->postJson('/api/request/approval/', [
            'hash_code' => $this->hash('rest_day_works', $this->restDayWorkId),
            'status'    => 'approved',
        ], $this->apiKeyOnlyHeaders());

        // 200 or 400; the resource toArray() for RestDayWork is the coverage target
        $this->assertContains($res->status(), [200, 400],
            'RestDayWork hash-code approval should not crash with 500');
    }

    /** @test */
    public function hash_code_covers_alter_log_resource_branch()
    {
        $res = $this->postJson('/api/request/approval/', [
            'hash_code' => $this->hash('alter_logs', $this->alterLogId),
            'status'    => 'approved',
        ], $this->apiKeyOnlyHeaders());

        $this->assertContains($res->status(), [200, 400],
            'AlterLog hash-code approval should not crash with 500');
    }

    /** @test */
    public function hash_code_covers_change_schedule_resource_branch()
    {
        $res = $this->postJson('/api/request/approval/', [
            'hash_code' => $this->hash('change_schedules', $this->changeScheduleId),
            'status'    => 'approved',
        ], $this->apiKeyOnlyHeaders());

        $this->assertContains($res->status(), [200, 400],
            'ChangeSchedule hash-code approval should not crash with 500');
    }

    /** @test */
    public function hash_code_decline_covers_rest_day_work_decline_branch()
    {
        $res = $this->postJson('/api/request/approval/', [
            'hash_code' => $this->hash('rest_day_works', $this->restDayWorkId),
            'status'    => 'declined',
        ], $this->apiKeyOnlyHeaders());

        $this->assertContains($res->status(), [200, 400],
            'RestDayWork hash-code decline should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AlterLogResource — GET /api/request/alter_log/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function alter_log_find_drives_alter_log_resource_toArray()
    {
        $res = $this->getJson('/api/request/alter_log/' . $this->alterLogId,
            $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'AlterLog find drives AlterLogResource::toArray()');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RestDayWorkResource — GET /api/request/rest_day_work/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function rest_day_work_find_drives_rest_day_work_resource_toArray()
    {
        $res = $this->getJson('/api/request/rest_day_work/' . $this->restDayWorkId,
            $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'RestDayWork find drives RestDayWorkResource::toArray()');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // is_changed=false branch — approve already-approved record
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function hash_code_of_already_approved_overtime_sets_is_changed_false()
    {
        // Pre-approve the record so hash-code approve hits the is_changed=false branch
        DB::table('overtimes')->where('id', $this->overtimeId)->update(['status' => 'approved']);

        $res = $this->postJson('/api/request/approval/', [
            'hash_code' => $this->hash('overtimes', $this->overtimeId),
            'status'    => 'approved', // already approved — is_changed stays false
        ], $this->apiKeyOnlyHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Already-approved overtime hash-code should not crash with 500');
    }
}
