<?php

namespace App\Modules\Attendance\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 *  Per-employee attendance bundle returned by the by-geo and by-department
 *  endpoints. Wraps a User model decorated with `_attendance_rows` (an
 *  array of daily rows produced by the repository).
 */
class EmployeeAttendanceResource extends JsonResource
{
    /**
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource)) {
            return null;
        }

        return [
            'id'            => $this->id,
            'first_name'    => $this->first_name,
            'last_name'     => $this->last_name,
            'emp_num'       => $this->emp_num,
            'department_id' => $this->department_id,
            'country_id'    => $this->country_id,
            'daily'         => AttendanceResource::collection(
                collect($this->_attendance_rows ?? [])
            ),
        ];
    }
}
