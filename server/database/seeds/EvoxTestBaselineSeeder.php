<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * EVOX TEST BASELINE SEEDER — PLAN-fixture-pipeline-to-90.md, Option A.
 *
 * Run ONCE before phpunit, outside any transaction:
 *     php artisan db:seed --class=EvoxTestBaselineSeeder
 * Every test then finds its preconditions and still rolls back its own writes
 * (DatabaseTransactions stays on for the ~3,300 isolated tests).
 *
 * DESIGN DECISIONS (Vishnu, 2026-08-07):
 *  - REUSE the existing role accounts (glenn -> gary etc.) rather than create fresh users —
 *    the dump already carries their role/permission/department mapping, which is the part
 *    that goes wrong when invented. The seeder therefore VERIFIES the user/schedule/DTR/cutoff
 *    layers and CREATES only the request rows the Incomplete tests hunt for.
 *  - ACCUMULATE: nothing here is deleted between runs. Rows are tagged 'E2E-TEST-BASELINE'
 *    in their note fields so they are always identifiable.
 *
 * IDEMPOTENT: keyed lookups before every insert; safe to re-run any number of times.
 *
 * DELIBERATE DEVIATIONS from the plan's raw chain (documented, not accidental):
 *  - users / supervisor links: verified (link inserted only if missing) — never invented.
 *  - schedules, payroll_cutoffs, dtrs: VERIFIED with loud warnings, never inserted. These are
 *    payroll-bearing tables for REAL accounts on a live-dump DB; the crons maintain them. If a
 *    warning fires, fix the account choice rather than fabricating payroll data.
 *  - COEs: not seeded — issuance consumes a legal sequence number (see R-172).
 */
class EvoxTestBaselineSeeder extends Seeder
{
    const TAG = 'E2E-TEST-BASELINE';

    /** employee-email => supervisor-email, per geo. Extend as lineage tests grow. */
    const PAIRS = [
        'glenn.macasarte@eastvantage.com' => 'gary.aure@eastvantage.com', // PH
    ];

    public function run()
    {
        foreach (self::PAIRS as $employeeEmail => $supervisorEmail) {
            $employee = $this->requireNamedActiveUser($employeeEmail);
            $supervisor = $this->requireNamedActiveUser($supervisorEmail);
            if (!$employee || !$supervisor) {
                continue; // requireNamedActiveUser already shouted
            }

            $this->ensureSupervisorLink($employee, $supervisor);
            $this->verifyPayrollLayers($employee);
            $this->seedRequests($employee, $supervisor);
        }

        // Announcements are DELIBERATELY not seeded: the AFTER INSERT trigger
        // (EV_NC_Announcement_Insert, register R-168) fans notifications out to every
        // targeted active employee — a seeded global row would notify all staff on staging.
        $this->command->info('[baseline] done — rows tagged ' . self::TAG . ' (accumulate policy: never deleted).');
    }

    /**
     * The pair must exist, be active, and carry non-empty first AND last names — the
     * AFTER INSERT triggers CONCAT the names into a NOT NULL column and a NULL name
     * fails the whole insert (CS-TRIG-1). Same rule RequestFlowTrait enforces.
     */
    private function requireNamedActiveUser($email)
    {
        $u = DB::table('users')->where('email', $email)->first();
        if (!$u || (int) $u->is_active !== 1 || trim((string) $u->first_name) === '' || trim((string) $u->last_name) === '') {
            $this->command->error("[baseline] MISSING/UNFIT user {$email} — fix the PAIRS list; nothing seeded for this pair.");
            return null;
        }
        return $u;
    }

    private function ensureSupervisorLink($employee, $supervisor)
    {
        $exists = DB::table('users_supervisors')
            ->where('user_id', $employee->id)
            ->where('supervisor_id', $supervisor->id)
            ->exists();
        if ($exists) {
            return;
        }
        DB::table('users_supervisors')->insert([
            'user_id' => $employee->id,
            'supervisor_id' => $supervisor->id,
        ]);
        $this->command->warn("[baseline] inserted missing supervisor link {$employee->email} -> {$supervisor->email}");
    }

    /**
     * Verify (never create) the payroll-bearing layers. A warning here means the chosen
     * account cannot back the Incomplete tests — change the account, don't fabricate rows.
     */
    private function verifyPayrollLayers($employee)
    {
        if (!DB::table('schedules')->where('user_id', $employee->id)->exists()) {
            $this->command->warn("[baseline] WARN: {$employee->email} has NO schedule — schedule-dependent tests will still skip.");
        }
        $cutoff = DB::table('payroll_cutoffs')
            ->whereDate('start_date', '<=', Carbon::today())
            ->whereDate('end_date', '>=', Carbon::today())
            ->first();
        if (!$cutoff) {
            $this->command->warn('[baseline] WARN: no payroll cutoff covers today — window-validated submissions will fail.');
        }
        $fortnightAgo = Carbon::today()->subDays(14)->toDateString();
        $dtrCount = DB::table('dtrs')
            ->where('user_id', $employee->id)
            ->whereDate('date', '>=', $fortnightAgo)
            ->count();
        if ($dtrCount === 0) {
            $this->command->warn("[baseline] WARN: {$employee->email} has no DTRs in the last fortnight — DTR-dependent tests will still skip.");
        }
    }

    /**
     * One PENDING and one APPROVED request of each type for the employee, dated on distinct
     * recent days. Idempotency key: (table, user, status, tagged note). Dates walk backwards
     * from yesterday so the per-user unique-date rules are satisfied deterministically.
     */
    private function seedRequests($employee, $supervisor)
    {
        $day = Carbon::yesterday();
        $tables = [
            'overtimes' => function ($date, $status) use ($employee, $supervisor) {
                return [
                    'user_id' => $employee->id,
                    'date' => $date->toDateString(),
                    'amount' => 3600, // one hour
                    'type' => 'post_overtime',
                    'employee_note' => self::TAG . ' overtime ' . $status,
                    'approver_note' => $status === 'approved' ? self::TAG . ' approved by seeder' : null,
                    'created_by' => $employee->id,
                    'updated_by' => $status === 'approved' ? $supervisor->id : $employee->id,
                    'status' => $status,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            },
            'alter_logs' => function ($date, $status) use ($employee, $supervisor) {
                $in = $date->copy()->setTime(9, 0);
                $out = $date->copy()->setTime(18, 0);
                return [
                    'user_id' => $employee->id,
                    'date' => $date->toDateString(),
                    'current_time_in' => $in->timestamp,
                    'current_time_out' => $out->timestamp,
                    'new_time_in' => $in->copy()->addMinutes(30)->timestamp,
                    'new_time_out' => $out->copy()->addMinutes(30)->timestamp,
                    'employee_note' => self::TAG . ' alter_log ' . $status,
                    'approver_note' => $status === 'approved' ? self::TAG . ' approved by seeder' : null,
                    'created_by' => $employee->id,
                    'updated_by' => $status === 'approved' ? $supervisor->id : $employee->id,
                    'status' => $status,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            },
            'rest_day_works' => function ($date, $status) use ($employee, $supervisor) {
                return [
                    'user_id' => $employee->id,
                    'date' => $date->toDateString(),
                    'start_time' => $date->copy()->setTime(9, 0)->timestamp,
                    'end_time' => $date->copy()->setTime(13, 0)->timestamp,
                    'break_time' => 0,
                    'employee_note' => self::TAG . ' rest_day_work ' . $status,
                    'approver_note' => $status === 'approved' ? self::TAG . ' approved by seeder' : null,
                    'created_by' => $employee->id,
                    'updated_by' => $status === 'approved' ? $supervisor->id : $employee->id,
                    'status' => $status,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            },
            'change_schedules' => function ($date, $status) use ($employee, $supervisor) {
                // both dates ALWAYS set: the AFTER INSERT trigger CONCATs them into a
                // NOT NULL notification column and dies on NULL (CS-TRIG-1)
                return [
                    'user_id' => $employee->id,
                    'valid_from' => $date->toDateString(),
                    'valid_to' => $date->copy()->addDays(4)->toDateString(),
                    'employee_note' => self::TAG . ' change_schedule ' . $status,
                    'approver_note' => $status === 'approved' ? self::TAG . ' approved by seeder' : null,
                    'created_by' => $employee->id,
                    'updated_by' => $status === 'approved' ? $supervisor->id : $employee->id,
                    'status' => $status,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            },
        ];

        foreach ($tables as $table => $rowBuilder) {
            foreach (['pending', 'approved'] as $status) {
                $already = DB::table($table)
                    ->where('user_id', $employee->id)
                    ->where('status', $status)
                    ->where('employee_note', 'like', self::TAG . '%')
                    ->exists();
                if ($already) {
                    continue; // idempotent: this (table, status) slot is filled
                }
                // each row gets its own past day, walking backwards, so per-user
                // unique-date constraints never collide across types or re-runs
                $day = $day->subDay();
                DB::table($table)->insert($rowBuilder($day->copy(), $status));
                $this->command->info("[baseline] seeded {$table} {$status} for {$employee->email} on {$day->toDateString()}");
            }
        }
    }

}
