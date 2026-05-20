<?php

namespace App\Modules\Attendance\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 *  Single-day attendance row. The repository hands us a plain associative
 *  array (or stdClass) — JsonResource happily transforms either via
 *  `$this->resource[…]` access.
 */
class AttendanceResource extends JsonResource
{
    /**
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        $r = (array) $this->resource;

        return [
            'date'            => $r['date']            ?? null,
            'time_in'         => $r['time_in']         ?? null,
            'time_out'        => $r['time_out']        ?? null,
            'time_in_iso'     => $r['time_in_iso']     ?? null,
            'time_out_iso'    => $r['time_out_iso']    ?? null,
            'is_rest_day'     => (bool) ($r['is_rest_day'] ?? false),
            'on_leave'        => (bool) ($r['on_leave']    ?? false),
            'is_holiday'      => (bool) ($r['is_holiday']  ?? false),
            'rendered_hours'  => (float) ($r['rendered_hours'] ?? 0),
            'late_hours'      => (float) ($r['late_hours']     ?? 0),
            'undertime_hours' => (float) ($r['undertime_hours']?? 0),
            'overtime_hours'  => (float) ($r['overtime_hours'] ?? 0),
            'status'          => $r['status']          ?? 'unknown',
        ];
    }
}
