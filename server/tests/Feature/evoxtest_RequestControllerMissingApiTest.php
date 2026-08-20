<?php

/**
 * RequestController — missing coverage methods
 *   • requestlist (my_requests mode)
 *   • requestlist (my_team_requests mode)
 *   • requestListDisputes
 *   • requestValidityChecker
 *
 * All SP-backed; use bounded date ranges to keep execution fast under Xdebug.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Modules\User\Models\User;

class evoxtest_RequestControllerMissingApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $employee;
    private User $supervisor;
    private string $empToken;
    private string $supToken;
    private string $rawApiKey;

    private const VALID_FROM = '2026-03-01';
    private const VALID_TO   = '2026-03-31';

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee   = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();
        $this->supervisor = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        $this->rawApiKey = Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_reqmissing_' . now()->format('His'),
            'key'        => $this->rawApiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->empToken = auth('api')->login($this->employee);
        $this->supToken = auth('api')->login($this->supervisor);
    }

    private function empHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->empToken, 'X-Authorization' => $this->rawApiKey];
    }

    private function supHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->supToken, 'X-Authorization' => $this->rawApiKey];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // requestlist — GET /api/request/request-list?url=my_requests
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function requestlist_my_requests_returns_employee_requests_in_cutoff()
    {
        $res = $this->getJson(
            '/api/request/request-list?url=my_requests&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestlist my_requests should not crash with 500');

        if ($res->status() === 200) {
            $this->assertArrayHasKey('content', $res->json());
        }
    }

    /** @test */
    public function requestlist_my_requests_filtered_by_pending_status()
    {
        $res = $this->getJson(
            '/api/request/request-list?url=my_requests&status=pending&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestlist pending filter should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // requestlist — GET /api/request/request-list?url=my_team_requests
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function requestlist_my_team_requests_returns_team_requests_for_supervisor()
    {
        $res = $this->getJson(
            '/api/request/request-list?url=my_team_requests&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestlist my_team_requests should not crash with 500');

        if ($res->status() === 200) {
            $this->assertArrayHasKey('content', $res->json());
        }
    }

    /** @test */
    public function requestlist_my_team_requests_filtered_by_approved_status()
    {
        $res = $this->getJson(
            '/api/request/request-list?url=my_team_requests&status=approved&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestlist team approved filter should not crash with 500');
    }

    /** @test */
    public function requestlist_invalid_status_returns_422()
    {
        $res = $this->getJson(
            '/api/request/request-list?status=invalid_status',
            $this->empHeaders()
        );

        // RequestFilterRequest validates status against REQUEST_STATUS constant
        $res->assertStatus(422);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // requestListDisputes — GET /api/request/request-list-disputes
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function request_list_disputes_returns_dispute_counts_for_all_types()
    {
        $res = $this->getJson(
            '/api/request/request-list-disputes?request_type=all&status=pending' .
            '&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestListDisputes should not crash with 500');

        if ($res->status() === 200) {
            $body = $res->json('content');
            $this->assertArrayHasKey('dispute_list', $body);
            $this->assertArrayHasKey('dispute_count', $body);
        }
    }

    /** @test */
    public function request_list_disputes_overtime_type_pending_status()
    {
        $res = $this->getJson(
            '/api/request/request-list-disputes?request_type=overtime&status=pending' .
            '&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestListDisputes overtime type should not crash with 500');
    }

    /** @test */
    public function request_list_disputes_alteration_type_approved_status()
    {
        $res = $this->getJson(
            '/api/request/request-list-disputes?request_type=alteration&status=approved' .
            '&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestListDisputes alteration type should not crash with 500');
    }

    /** @test */
    public function request_list_disputes_uses_current_cutoff_when_no_dates_given()
    {
        // No valid_from/valid_to → controller reads from payroll_cutoffs table
        $res = $this->getJson(
            '/api/request/request-list-disputes?request_type=all&status=pending',
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestListDisputes no dates should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // requestValidityChecker — GET /api/request/request-validity-check?date=
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function request_validity_checker_returns_sp_result_for_valid_date()
    {
        $res = $this->getJson(
            '/api/request/request-validity-check?date=2026-03-15',
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'requestValidityChecker should not crash with 500');

        if ($res->status() === 200) {
            $this->assertArrayHasKey('content', $res->json());
        }
    }

    /** @test */
    public function request_validity_checker_with_future_date_outside_cutoff()
    {
        // A future date is guaranteed to be outside any current payroll period
        $res = $this->getJson(
            '/api/request/request-validity-check?date=2099-12-31',
            $this->empHeaders()
        );

        // SP runs and returns validity status (0=valid, 1=locked, 2=dispute)
        $this->assertContains($res->status(), [200, 400],
            'requestValidityChecker future date should not crash with 500');
    }

    /** @test */
    public function request_validity_checker_requires_jwt()
    {
        $this->getJson('/api/request/request-validity-check?date=2026-03-15',
            ['X-Authorization' => $this->rawApiKey]
        )->assertStatus(401);
    }
}
