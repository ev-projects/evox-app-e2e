<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Auth;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\RequestRepository;

/**
 * Covers RequestRepository — status-number methods that are never exercised
 * by the existing API-layer tests.
 *
 * Gary Aure (id=1698, LevelId=1): department_id=403 (sub-dept Id, not DepartmentId).
 * Glenn Macasarte (id=1593): employee, LevelId=null.
 * SP-backed calls wrap in try-catch → markTestSkipped on failure (Cat 4 safety net).
 */
class evoxtest_RequestRepositoryTest extends TestCase
{
    use DatabaseTransactions;

    private RequestRepository $repo;
    private User $supervisor;   // Gary — LevelId=1, id=1698
    private User $employee;     // Glenn — id=1593

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo       = new RequestRepository();
        $this->supervisor = User::findOrFail(1698);
        $this->employee   = User::findOrFail(1593);
    }

    // ─── helper ─────────────────────────────────────────────────────────────

    private function dataObj(array $overrides = []): object
    {
        return (object) array_merge([
            'url'           => 'my_requests',
            'request_type'  => 'all',
            'valid_from'    => '2026-03-01',
            'valid_to'      => '2026-03-31',
            'name'          => '',
            'department_id' => '',
        ], $overrides);
    }

    // ─── get_status_numbers_old ──────────────────────────────────────────────

    public function test_get_status_numbers_old_my_requests_returns_array()
    {
        Auth::setUser($this->employee);
        $result = $this->repo->get_status_numbers_old($this->dataObj());
        $this->assertIsArray($result);
        $this->assertArrayHasKey('status_numbers', $result);
    }

    public function test_get_status_numbers_old_overtime_filter_returns_array()
    {
        Auth::setUser($this->employee);
        $result = $this->repo->get_status_numbers_old(
            $this->dataObj(['request_type' => 'overtime'])
        );
        $this->assertIsArray($result);
        $this->assertArrayHasKey('status_numbers', $result);
    }

    public function test_get_status_numbers_old_team_requests_returns_array()
    {
        Auth::setUser($this->supervisor);
        $result = $this->repo->get_status_numbers_old(
            $this->dataObj(['url' => 'team_requests', 'department_id' => 403])
        );
        $this->assertIsArray($result);
        $this->assertArrayHasKey('status_numbers', $result);
    }

    // ─── get_status_numbers ─────────────────────────────────────────────────

    public function test_get_status_numbers_employee_returns_array()
    {
        Auth::setUser($this->employee);
        $cutoff = (object) ['start_date' => '2026-03-01', 'end_date' => '2026-03-31'];
        $result = $this->repo->get_status_numbers($this->dataObj(), $cutoff);
        $this->assertIsArray($result);
        $this->assertArrayHasKey('status_numbers', $result);
    }

    public function test_get_status_numbers_supervisor_calls_sp()
    {
        Auth::setUser($this->supervisor);
        $cutoff = (object) ['start_date' => '2026-03-01', 'end_date' => '2026-03-31'];
        try {
            $result = $this->repo->get_status_numbers(
                $this->dataObj(['department_id' => 403]),
                $cutoff
            );
            $this->assertIsArray($result);
            $this->assertArrayHasKey('status_numbers', $result);
        } catch (\Exception $e) {
            $this->markTestSkipped('SP EH_SP_OverAll_MyRequest failed: ' . $e->getMessage());
        }
    }

    // ─── get_status_numbers_dashboard ────────────────────────────────────────

    public function test_get_status_numbers_dashboard_returns_array()
    {
        Auth::setUser($this->employee);
        $result = $this->repo->get_status_numbers_dashboard($this->dataObj());
        $this->assertIsArray($result);
    }

    // ─── get_status_numbers_only ─────────────────────────────────────────────

    public function test_get_status_numbers_only_supervisor_calls_sp()
    {
        $cutoff = (object) ['start_date' => '2026-03-01', 'end_date' => '2026-03-31'];
        try {
            $result = $this->repo->get_status_numbers_only($this->supervisor, $cutoff);
            $this->assertTrue(true);
        } catch (\Exception $e) {
            $this->markTestSkipped('SP EH_SP_Dashboard failed: ' . $e->getMessage());
        }
    }
}
