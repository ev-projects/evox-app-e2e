<?php

namespace Tests\Feature\BranchTests\Unit\Models;

use Tests\TestCase;
use App\Modules\Payroll\Models\Leave;

/**
 * Pure boolean-helper test.
 * Leave status helpers compare the status attribute; paid/unpaid helpers check
 * the type against the UNPAID_LEAVE_TYPES constant list. No DB access.
 */
class LeaveModelTest extends TestCase
{
    private function leave($attributes)
    {
        $model = new Leave();
        foreach ($attributes as $key => $value) {
            $model->{$key} = $value;
        }
        return $model;
    }

    public function test_is_requested()
    {
        $this->assertTrue($this->leave(['status' => 'requested'])->isRequested());
        $this->assertFalse($this->leave(['status' => 'approved'])->isRequested());
    }

    public function test_is_approved()
    {
        $this->assertTrue($this->leave(['status' => 'approved'])->isApproved());
        $this->assertFalse($this->leave(['status' => 'denied'])->isApproved());
    }

    public function test_is_denied()
    {
        $this->assertTrue($this->leave(['status' => 'denied'])->isDenied());
        $this->assertFalse($this->leave(['status' => 'approved'])->isDenied());
    }

    public function test_is_canceled()
    {
        $this->assertTrue($this->leave(['status' => 'canceled'])->isCanceled());
        $this->assertFalse($this->leave(['status' => 'requested'])->isCanceled());
    }

    public function test_is_paid_leave_for_regular_type()
    {
        // "Vacation Leave" is not in UNPAID_LEAVE_TYPES -> paid
        $leave = $this->leave(['type' => 'Vacation Leave']);

        $this->assertTrue($leave->isPaidLeave());
        $this->assertFalse($leave->isUnPaidLeave());
    }

    public function test_is_unpaid_leave_for_unpaid_type()
    {
        // "Unpaid Leave" is in UNPAID_LEAVE_TYPES
        $leave = $this->leave(['type' => 'Unpaid Leave']);

        $this->assertTrue($leave->isUnPaidLeave());
        $this->assertFalse($leave->isPaidLeave());
    }
}
