<?php

namespace App\Modules\Attendance\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface AttendanceRepositoryInterface
{
    /**
     * Paginate active employees in a geo (country). Each item is a User row
     * — the controller is responsible for joining daily attendance via
     * dailyForUser().
     */
    public function byGeo(int $geoId, string $from, string $to, int $perPage): LengthAwarePaginator;

    /**
     * Paginate active employees in a department.
     */
    public function byDepartment(int $departmentId, string $from, string $to, int $perPage): LengthAwarePaginator;

    /**
     * Daily attendance rows for a single user across the date range. Each row:
     *   ['date' => 'YYYY-MM-DD', 'time_in' => epoch|null, 'time_out' => epoch|null,
     *    'status' => string, 'rendered_hours' => float, 'late' => float,
     *    'undertime' => float, 'overtime' => float, 'is_rest_day' => bool,
     *    'on_leave' => bool, 'is_holiday' => bool ]
     *
     * @return array<int,array<string,mixed>>
     */
    public function dailyForUser(int $userId, string $from, string $to): array;
}
