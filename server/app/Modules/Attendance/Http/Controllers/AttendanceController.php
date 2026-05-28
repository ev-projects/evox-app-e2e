<?php

namespace App\Modules\Attendance\Http\Controllers;

use Auth;
use Exception;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\Department\Models\Department;
use App\Modules\Attendance\Resources\AttendanceResource;
use App\Modules\Attendance\Resources\EmployeeAttendanceResource;
use App\Modules\Attendance\Repositories\AttendanceRepositoryInterface;
use App\Modules\Attendance\Http\Requests\AttendanceByGeoRequest;
use App\Modules\Attendance\Http\Requests\AttendanceByDepartmentRequest;
use App\Modules\Attendance\Http\Requests\AttendanceByEmployeeRequest;
use App\Modules\Attendance\Services\AttendanceGeoGate;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    /** @var AttendanceRepositoryInterface */
    private $attendance;

    /** @var AttendanceGeoGate */
    private $gate;

    public function __construct(AttendanceRepositoryInterface $attendance, AttendanceGeoGate $gate)
    {
        $this->attendance = $attendance;
        $this->gate = $gate;
    }

    /**
     * GET /api/attendance/by-geo/{geoId}
     *
     * Returns paginated attendance for every active employee in the given geo
     * (country) over the requested date range. Pagination keyed on the user
     * collection — each user object contains a "daily" array with one row
     * per date in the requested range.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function byGeo(AttendanceByGeoRequest $request, $geoId)
    {
        try {
            $me = Auth::user();

            # Verify the geo exists in the country master (utc_timelog row).
            $geo = UtcTimelog::where('country_id', (int) $geoId)->first();
            if (!$geo) {
                return error_response(
                    trans('messages.attendance_geo_not_found'),
                    [],
                    JsonResponse::HTTP_NOT_FOUND
                );
            }

            # Geo gating — caller must have access to this geo (own geo OR an admin override).
            if (!$this->gate->canAccessGeo($me, (int) $geoId)) {
                return error_response(
                    trans('messages.attendance_forbidden_geo'),
                    [],
                    JsonResponse::HTTP_FORBIDDEN
                );
            }

            list($from, $to) = $this->resolveRange($request);
            $perPage = $this->resolvePerPage($request);

            $paginated = $this->attendance->byGeo((int) $geoId, $from, $to, $perPage);

            return success_response(
                trans('messages.attendance_fetch_success'),
                [
                    'geo'        => [
                        'id'           => $geo->country_id,
                        'country_name' => $geo->country_name,
                        'time_zone'    => $geo->country_time_zone,
                    ],
                    'date_range' => ['from' => $from, 'to' => $to],
                    'pagination' => [
                        'total'        => $paginated->total(),
                        'per_page'     => $paginated->perPage(),
                        'current_page' => $paginated->currentPage(),
                        'last_page'    => $paginated->lastPage(),
                    ],
                    'employees'  => EmployeeAttendanceResource::collection(
                        collect($paginated->items())->map(function ($u) use ($from, $to) {
                            $u->_attendance_rows = $this->attendance->dailyForUser($u->id, $from, $to);
                            return $u;
                        })
                    ),
                ]
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e, JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /api/attendance/by-department/{departmentId}
     *
     * Same shape as byGeo, scoped to a department. Department membership is
     * read from users.department_id; geo-gating still applies — caller cannot
     * read a department that has no employee in any of the caller's allowed
     * geos.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function byDepartment(AttendanceByDepartmentRequest $request, $departmentId)
    {
        try {
            $me = Auth::user();

            $department = DB::table('EVOX_DEPARTMENT')->where('Id', (int) $departmentId)->first();
            if (!$department) {
                return error_response(
                    trans('messages.attendance_department_not_found'),
                    [],
                    JsonResponse::HTTP_NOT_FOUND
                );
            }

            if (!$this->gate->canAccessDepartment($me, (int) $departmentId)) {
                return error_response(
                    trans('messages.attendance_forbidden_department'),
                    [],
                    JsonResponse::HTTP_FORBIDDEN
                );
            }

            list($from, $to) = $this->resolveRange($request);
            $perPage = $this->resolvePerPage($request);

            $paginated = $this->attendance->byDepartment((int) $departmentId, $from, $to, $perPage);

            return success_response(
                trans('messages.attendance_fetch_success'),
                [
                    'department' => [
                        'id'              => $department->Id,
                        'department_name' => $department->Name,
                    ],
                    'date_range' => ['from' => $from, 'to' => $to],
                    'pagination' => [
                        'total'        => $paginated->total(),
                        'per_page'     => $paginated->perPage(),
                        'current_page' => $paginated->currentPage(),
                        'last_page'    => $paginated->lastPage(),
                    ],
                    'employees'  => EmployeeAttendanceResource::collection(
                        collect($paginated->items())->map(function ($u) use ($from, $to) {
                            $u->_attendance_rows = $this->attendance->dailyForUser($u->id, $from, $to);
                            return $u;
                        })
                    ),
                ]
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e, JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /api/attendance/by-employee/{employeeId}
     *
     * Returns the daily attendance series for a single employee. Caller must
     * have access to that employee's geo. No pagination — the date-range cap
     * (90 days) bounds the response size.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function byEmployee(AttendanceByEmployeeRequest $request, $employeeId)
    {
        try {
            $me = Auth::user();

            $employee = User::find((int) $employeeId);
            if (!$employee) {
                return error_response(
                    trans('messages.attendance_employee_not_found'),
                    [],
                    JsonResponse::HTTP_NOT_FOUND
                );
            }

            if (!$this->gate->canAccessEmployee($me, $employee)) {
                return error_response(
                    trans('messages.attendance_forbidden_employee'),
                    [],
                    JsonResponse::HTTP_FORBIDDEN
                );
            }

            list($from, $to) = $this->resolveRange($request);

            $rows = $this->attendance->dailyForUser($employee->id, $from, $to);

            return success_response(
                trans('messages.attendance_fetch_success'),
                [
                    'employee'   => [
                        'id'            => $employee->id,
                        'first_name'    => $employee->first_name,
                        'last_name'     => $employee->last_name,
                        'emp_num'       => $employee->emp_num,
                        'department_id' => $employee->department_id,
                        'country_id'    => $employee->country_id,
                    ],
                    'date_range' => ['from' => $from, 'to' => $to],
                    'daily'      => AttendanceResource::collection(collect($rows)),
                ]
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e, JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    ###########################################################################
    ############################# Private helpers #############################
    ###########################################################################

    /**
     *  Resolve the date range from the request, defaulting to "first day of
     *  the current month -> today". Validation already enforces a 90-day cap;
     *  this is a final defensive clamp.
     *
     * @return array [string $from, string $to]
     */
    private function resolveRange($request)
    {
        $from = $request->query('from') ?: date('Y-m-01');
        $to   = $request->query('to')   ?: date('Y-m-d');

        # Defensive: if a caller manages to slip past the FormRequest validator
        # (custom HTTP client, missing rule), enforce the cap here too.
        $fromTs = strtotime($from);
        $toTs   = strtotime($to);
        if ($fromTs && $toTs && ($toTs - $fromTs) > (90 * 86400)) {
            $from = date('Y-m-d', $toTs - (90 * 86400));
        }

        return [$from, $to];
    }

    /**
     *  Pagination size — default 50, hard-capped at 200 to protect the DB.
     */
    private function resolvePerPage($request)
    {
        $perPage = (int) $request->query('per_page', 50);
        if ($perPage < 1)  { $perPage = 50; }
        if ($perPage > 200) { $perPage = 200; }
        return $perPage;
    }
}
