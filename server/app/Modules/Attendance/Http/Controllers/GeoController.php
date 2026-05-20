<?php

namespace App\Modules\Attendance\Http\Controllers;

use Auth;
use Exception;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\User\Resources\CountryResource;
use App\Modules\Attendance\Services\AttendanceGeoGate;

class GeoController extends Controller
{
    /** @var AttendanceGeoGate */
    private $gate;

    public function __construct(AttendanceGeoGate $gate)
    {
        $this->gate = $gate;
    }

    /**
     * GET /api/attendance/geos
     *
     * Lists every geo (country) the caller is allowed to read attendance for.
     * The country master is the existing utc_timelog table — see the Apr 30
     * 2026 standup transcript for confirmation that "countries already done."
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        try {
            $me = Auth::user();

            $countries = UtcTimelog::orderBy('country_name')->get();

            $allowed = $countries->filter(function ($c) use ($me) {
                return $this->gate->canAccessGeo($me, (int) $c->country_id);
            })->values();

            return success_response(
                trans('messages.attendance_fetch_success'),
                CountryResource::collection($allowed)
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e, JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
