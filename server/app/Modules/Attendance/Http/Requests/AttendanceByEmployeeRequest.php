<?php

namespace App\Modules\Attendance\Http\Requests;

class AttendanceByEmployeeRequest extends AttendanceRangeRequest
{
    /*
     * Inherits all rules from AttendanceRangeRequest. The per_page/page rules
     * are still validated for forward compatibility but the by-employee
     * endpoint does not paginate — the 90-day cap bounds response size.
     */
}
