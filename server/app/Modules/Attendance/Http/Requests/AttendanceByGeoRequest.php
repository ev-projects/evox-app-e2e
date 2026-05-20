<?php

namespace App\Modules\Attendance\Http\Requests;

class AttendanceByGeoRequest extends AttendanceRangeRequest
{
    /*
     * Inherits all rules from AttendanceRangeRequest. Subclassed so the
     * controller signature documents intent and so geo-specific rules can
     * be added later without touching the shared parent.
     */
}
