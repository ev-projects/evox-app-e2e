<?php

namespace App\Modules\Attendance\Services;

use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;
use Illuminate\Support\Facades\DB;

/**
 *  AttendanceGeoGate
 *
 *  Centralised "is this caller allowed to read attendance for X?" check.
 *  The Stefan Attendance API spec (Apr 30 2026 standup, sprint-02-plan.md
 *  section 1) is "gated by geos" — a caller can read attendance for any
 *  employee whose country_id falls inside the caller's allowed-geo set.
 *
 *  Allowed-geo set rules (in priority order):
 *    1. Admin / HR / Payroll level → all geos
 *    2. A user with a `geo_attendance_api_all` permission/feature → all geos
 *       (left as a forward-compatibility hook — no row required today)
 *    3. Any other authenticated user → only their own country_id
 *
 *  Department gating: a caller can read a department iff at least one
 *  active employee in that department lives in one of the caller's
 *  allowed geos. This avoids leaking employee lists from regions the
 *  caller has no business seeing, while keeping the by-department endpoint
 *  useful for the common case (HR querying their own region's HR dept).
 */
class AttendanceGeoGate
{
    /**
     *  Return the set of country_id values the caller may read.
     *
     * @return int[]
     */
    public function allowedGeoIds(?User $user): array
    {
        if (!$user) {
            return [];
        }

        if ($this->isPrivileged($user)) {
            return DB::table('utc_timelog')->pluck('country_id')->map('intval')->all();
        }

        $own = (int) ($user->country_id ?? 0);
        return $own > 0 ? [$own] : [];
    }

    /**
     * @return bool
     */
    public function canAccessGeo(?User $user, int $geoId): bool
    {
        return in_array($geoId, $this->allowedGeoIds($user), true);
    }

    /**
     *  A department is accessible if any active employee in it sits in one
     *  of the caller's allowed geos. Privileged callers always pass.
     *
     * @return bool
     */
    public function canAccessDepartment(?User $user, int $departmentId): bool
    {
        if (!$user) { return false; }
        if ($this->isPrivileged($user)) { return true; }

        $allowed = $this->allowedGeoIds($user);
        if (empty($allowed)) { return false; }

        $exists = DB::table('users as u')
            ->join('EVOX_SUB_DEPARTMENT as sd', 'sd.Id', '=', 'u.SubDepartmentID')
            ->where('sd.DepartmentId', $departmentId)
            ->where('u.is_active', 1)
            ->whereIn('u.country_id', $allowed)
            ->whereNull('u.deleted_at')
            ->exists();

        return (bool) $exists;
    }

    /**
     *  An employee is accessible iff their country_id is in the caller's
     *  allowed-geo set, OR the caller is privileged.
     *
     * @return bool
     */
    public function canAccessEmployee(?User $user, ?User $employee): bool
    {
        if (!$user || !$employee) { return false; }
        if ($this->isPrivileged($user)) { return true; }
        if ((int) $user->id === (int) $employee->id) { return true; }

        return $this->canAccessGeo($user, (int) $employee->country_id);
    }

    ###########################################################################
    ############################# Private helpers #############################
    ###########################################################################

    /**
     *  Privileged = HR, Payroll, or Admin level. Mirrors the existing
     *  `isLevel()` checks in App\Modules\User\Models\User.
     */
    private function isPrivileged(User $user): bool
    {
        try {
            if (method_exists($user, 'isLevel')) {
                if ($user->isLevel('Admin'))   { return true; }
                if ($user->isLevel('HR'))      { return true; }
                if ($user->isLevel('Payroll')) { return true; }
            }
        } catch (\Throwable $e) {
            # If LevelId / isLevel blows up (e.g. user has no LevelId set in
            # a test fixture), fall through to the non-privileged path —
            # never silently grant access.
        }
        return false;
    }
}
