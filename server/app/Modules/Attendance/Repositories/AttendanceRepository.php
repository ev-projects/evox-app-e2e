<?php

namespace App\Modules\Attendance\Repositories;

use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use App\Modules\User\Models\User;

/**
 *  Attendance read-only repository.
 *
 *  Source tables (existing — no migrations required):
 *    - users                  : country_id (geo), department_id, is_active
 *    - dtrs                   : per-day timelog (time_in, time_out, is_rest_day)
 *    - drt_summary_report     : per-day computed summary (rendered_hours,
 *                               late, undertime, overtime, on_leave, etc.)
 *                               NB: the actual table name is `drt_summary_report`
 *                               (typo preserved from the create migration —
 *                               see database/migrations/2023_01_04_155055_…)
 *    - holidays               : per-country holiday calendar
 *
 *  We deliberately query the underlying tables directly rather than going
 *  through the existing DtrSummary computation class — that class is
 *  per-DTR and recomputes from raw payroll items, which would be O(N×M)
 *  for a department-wide query. The drt_summary_report table is the
 *  pre-aggregated source of truth used by the existing exports
 *  (see ExportDTRSummary / EmployeeAttendanceReportExport).
 */
class AttendanceRepository implements AttendanceRepositoryInterface
{
    public function __construct() {}

    /**
     * {@inheritdoc}
     */
    public function byGeo(int $geoId, string $from, string $to, int $perPage): LengthAwarePaginator
    {
        try {
            return User::where('country_id', $geoId)
                ->where('is_active', 1)
                ->whereNull('deleted_at')
                ->orderBy('last_name', 'asc')
                ->orderBy('first_name', 'asc')
                ->paginate($perPage);
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     * {@inheritdoc}
     */
    public function byDepartment(int $departmentId, string $from, string $to, int $perPage): LengthAwarePaginator
    {
        try {
            return User::where('department_id', $departmentId)
                ->where('is_active', 1)
                ->whereNull('deleted_at')
                ->orderBy('last_name', 'asc')
                ->orderBy('first_name', 'asc')
                ->paginate($perPage);
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     * {@inheritdoc}
     *
     * Single LEFT JOIN of dtrs against drt_summary_report — one round-trip,
     * one row per calendar day that has either a DTR or a summary entry.
     * Returns plain stdClass arrays keyed for the AttendanceResource.
     */
    public function dailyForUser(int $userId, string $from, string $to): array
    {
        try {
            $rows = DB::table('dtrs')
                ->leftJoin('drt_summary_report as s', function ($join) {
                    $join->on('dtrs.user_id', '=', 's.user_id')
                         ->on('dtrs.date', '=', 's.login_date');
                })
                ->select([
                    'dtrs.id as dtr_id',
                    'dtrs.user_id',
                    'dtrs.date',
                    'dtrs.time_in',
                    'dtrs.time_out',
                    'dtrs.is_rest_day',
                    'dtrs.start_datetime',
                    'dtrs.end_datetime',
                    's.unpaid_leave',
                    's.on_leave',
                    's.reg_late',
                    's.reg_undertime',
                    's.reg_rendered_hours',
                    's.reg_night_diff',
                    's.reg_overtime',
                    's.rd_rendered_hours',
                    's.rd_overtime',
                    's.lh_rendered_hours',
                    's.sh_rendered_hours',
                ])
                ->where('dtrs.user_id', $userId)
                ->whereBetween('dtrs.date', [$from, $to])
                ->whereNull('dtrs.deleted_at')
                ->orderBy('dtrs.date', 'asc')
                ->get();

            $result = [];
            foreach ($rows as $r) {
                $rendered = (float) ($r->reg_rendered_hours ?? 0)
                          + (float) ($r->rd_rendered_hours ?? 0)
                          + (float) ($r->lh_rendered_hours ?? 0)
                          + (float) ($r->sh_rendered_hours ?? 0);

                $overtime = (float) ($r->reg_overtime ?? 0)
                          + (float) ($r->rd_overtime ?? 0);

                $hasLogIn  = !is_null($r->time_in);
                $hasLogOut = !is_null($r->time_out);
                $onLeave   = (float) ($r->on_leave ?? 0) > 0;
                $isHoliday = ((float) ($r->lh_rendered_hours ?? 0) > 0)
                          || ((float) ($r->sh_rendered_hours ?? 0) > 0);

                $status = $this->deriveStatus($r, $hasLogIn, $hasLogOut, $onLeave, $isHoliday, $rendered);

                $result[] = [
                    'date'           => $r->date,
                    'time_in'        => $hasLogIn  ? (int) $r->time_in  : null,
                    'time_out'       => $hasLogOut ? (int) $r->time_out : null,
                    'time_in_iso'    => $hasLogIn  ? gmdate('c', (int) $r->time_in)  : null,
                    'time_out_iso'   => $hasLogOut ? gmdate('c', (int) $r->time_out) : null,
                    'is_rest_day'    => (bool) $r->is_rest_day,
                    'on_leave'       => $onLeave,
                    'is_holiday'     => $isHoliday,
                    'rendered_hours' => round($rendered, 2),
                    'late_hours'     => round((float) ($r->reg_late ?? 0), 2),
                    'undertime_hours'=> round((float) ($r->reg_undertime ?? 0), 2),
                    'overtime_hours' => round($overtime, 2),
                    'status'         => $status,
                ];
            }

            return $result;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Compact status string suitable for the API response. Mirrors the
     *  semantic buckets used by Dtr::getDtrStatus() but does not require
     *  loading the full Dtr model graph.
     */
    private function deriveStatus($row, bool $hasIn, bool $hasOut, bool $onLeave, bool $isHoliday, float $rendered): string
    {
        if ($onLeave)               { return 'on_leave'; }
        if ($isHoliday && !$hasIn)  { return 'holiday'; }
        if ($row->is_rest_day && !$hasIn) { return 'rest_day'; }
        if ($hasIn && $hasOut)      { return 'present'; }
        if ($hasIn && !$hasOut)     { return 'incomplete'; }
        if (!$hasIn && !$hasOut && $rendered <= 0) { return 'absent'; }
        return 'unknown';
    }
}
