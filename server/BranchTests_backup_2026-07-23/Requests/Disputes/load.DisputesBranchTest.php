<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DisputeController read arms. Menu=Requests Page=Disputes.
 *
 * Top-level controller App\Http\Controllers\DisputeController. This file covers the read/load
 * routes (show / showExport / get*). Every one of them reaches a call_sp(...) with NO branch
 * returning before it, so under the project safety rules (no call_sp against the live-dump DB)
 * ALL arms are SKIPPED. No runnable branch remains; a documenting skipped test is included so
 * the class is valid and PASSES when run.
 *
 * Routes (mounted under /api, middleware jwtauth + auth.apikey):
 *   GET /api/getdispute                            -> show()             // SKIPPED-SP
 *   GET /api/getdisputeExport                      -> showExport()       // SKIPPED-SP
 *   GET /api/getuserdispute/{id}                   -> getEmployeeDispute()// SKIPPED-SP
 *   GET /api/getpayrollcutoff/{fromdate}/{todate}  -> getpayrollcutoff() // SKIPPED-SP
 *
 * SKIPPED arms (all reach an SP before any branch returns):
 *   - show()             : call_sp('EV_SP_Validate_Payroll_Level', [$me->id]) runs BEFORE the
 *                          if/else, so both the payroll-level arm (EV_SP_PD_Get_Payroll_Report)
 *                          and the individual arm (EV_SP_PD_Get_Pending_Request) are unreachable
 *                          without firing an SP.  // SKIPPED-SP
 *   - showExport()       : call_sp('EV_SP_PD_Get_Payroll_Report', [...]) runs before the
 *                          count()/foreach branch and the try/catch.  // SKIPPED-SP
 *   - getEmployeeDispute(): call_sp('EV_SP_PD_Get_Pending_Request', [...]) is the first
 *                          statement in the try.  // SKIPPED-SP
 *   - getpayrollcutoff() : call_sp('EV_SP_Get_Payroll_Cutoff', [...]) runs BEFORE the try/catch,
 *                          so no arm returns before the SP.  // SKIPPED-SP
 *
 * FINDING (namespace bug, latest code) — DisputeController never imports Exception
 * (`namespace App\Http\Controllers;`, no `use Exception;`). Every `catch(Exception $e)` in the
 * read methods resolves to the non-existent App\Http\Controllers\Exception, so those catch arms
 * are dead code regardless. No exception branch is authorable.  // FINDING
 */

namespace Tests\Feature\BranchTests\Requests\Disputes;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class DisputesLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @test */
    public function load__load__all_reach_call_sp__skipped()
    {
        $this->markTestSkipped(
            'show / showExport / getEmployeeDispute / getpayrollcutoff each reach call_sp(...) '
            . 'before any branch returns; no non-SP arm to exercise. See docblock. // SKIPPED-SP'
        );
    }
}
