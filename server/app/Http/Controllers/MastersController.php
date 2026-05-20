<?php

namespace App\Http\Controllers;

use Auth;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MastersController extends Controller
{
    /**
     * GET /api/masters/departments
     *
     * Returns the EVOX_DEPARTMENT list for use as a lookup table in the
     * Stefan Attendance API. The geo_id field is derived — EVOX_DEPARTMENT
     * has no native country column, so we resolve it as the most-represented
     * country_id among active users in each department. Null is returned for
     * departments with no active employees.
     *
     * EVOX-254 — Department master endpoint (Sprint 2, Stefan API).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function departments(Request $request)
    {
        try {
            /*
             * Correlated subquery: for each department, find the country_id
             * that appears most often among its active, non-deleted users.
             * This is read-only — no migrations needed.
             *
             * Why correlated subquery instead of GROUP BY + JOIN: a flat
             * GROUP BY would require a second round-trip or a window function
             * (unavailable in MySQL 5.7 InnoDB without a subquery wrapper).
             * The departments list is small (< 200 rows) so the per-row
             * subquery cost is acceptable.
             */
            $departments = DB::table('EVOX_DEPARTMENT as d')
                ->select([
                    'd.Id   as id',
                    'd.Name as name',
                    DB::raw('(
                        SELECT u.country_id
                        FROM   users u
                        WHERE  u.department_id = d.Id
                          AND  u.is_active = 1
                          AND  u.deleted_at IS NULL
                        GROUP  BY u.country_id
                        ORDER  BY COUNT(*) DESC
                        LIMIT  1
                    ) as geo_id'),
                ])
                ->orderBy('d.Name', 'asc')
                ->get();

            $data = $departments->map(function ($row) {
                return [
                    'id'     => (int) $row->id,
                    'name'   => (string) $row->name,
                    'geo_id' => $row->geo_id !== null ? (int) $row->geo_id : null,
                ];
            })->values()->all();

            return success_response(
                trans('messages.all_department_success'),
                $data
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e, JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
