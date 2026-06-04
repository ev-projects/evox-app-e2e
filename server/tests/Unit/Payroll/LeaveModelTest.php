<?php

namespace Tests\Unit\Payroll;

use Tests\TestCase;
use App\Modules\Payroll\Models\Leave;

/**
 * Tests for Leave model status and type helper methods.
 * All methods operate solely on model attributes — no DB required.
 */
class LeaveModelTest extends TestCase
{
    private function make(array $attrs = []): Leave
    {
        return new Leave(array_merge([
            'status' => 'approved',
            'type'   => 'Vacation Leave',
            'amount' => 1.0,
        ], $attrs));
    }

    // --- Status checks ---

    public function test_isApproved_true_when_status_is_approved()
    {
        $this->assertTrue($this->make(['status' => 'approved'])->isApproved());
    }

    public function test_isApproved_false_when_status_is_requested()
    {
        $this->assertFalse($this->make(['status' => 'requested'])->isApproved());
    }

    public function test_isRequested_true_when_status_is_requested()
    {
        $this->assertTrue($this->make(['status' => 'requested'])->isRequested());
    }

    public function test_isRequested_false_when_status_is_approved()
    {
        $this->assertFalse($this->make(['status' => 'approved'])->isRequested());
    }

    public function test_isDenied_true_when_status_is_denied()
    {
        $this->assertTrue($this->make(['status' => 'denied'])->isDenied());
    }

    public function test_isCanceled_true_when_status_is_canceled()
    {
        $this->assertTrue($this->make(['status' => 'canceled'])->isCanceled());
    }

    public function test_isCanceled_false_when_status_is_approved()
    {
        $this->assertFalse($this->make(['status' => 'approved'])->isCanceled());
    }

    // --- Paid / unpaid classification (per UNPAID_LEAVE_TYPES constant) ---

    public function test_isPaidLeave_true_for_vacation_leave()
    {
        $this->assertTrue($this->make(['type' => 'Vacation Leave'])->isPaidLeave());
    }

    public function test_isPaidLeave_true_for_sick_leave()
    {
        $this->assertTrue($this->make(['type' => 'Sick Leave'])->isPaidLeave());
    }

    public function test_isPaidLeave_false_for_unpaid_leave()
    {
        $this->assertFalse($this->make(['type' => 'Unpaid Leave'])->isPaidLeave());
    }

    public function test_isPaidLeave_false_for_work_from_home()
    {
        $this->assertFalse($this->make(['type' => 'Work from home'])->isPaidLeave());
    }

    public function test_isPaidLeave_false_for_mgc_unpaid_call_out_days()
    {
        $this->assertFalse($this->make(['type' => 'MGC Unpaid Call Out Days'])->isPaidLeave());
    }

    public function test_isUnPaidLeave_true_for_unpaid_leave()
    {
        $this->assertTrue($this->make(['type' => 'Unpaid Leave'])->isUnPaidLeave());
    }

    public function test_isUnPaidLeave_true_for_work_from_home()
    {
        $this->assertTrue($this->make(['type' => 'Work from home'])->isUnPaidLeave());
    }

    public function test_isUnPaidLeave_false_for_paid_leave()
    {
        $this->assertFalse($this->make(['type' => 'Vacation Leave'])->isUnPaidLeave());
    }
}
