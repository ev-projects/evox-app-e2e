# EVOX Backend Coverage Run — Issues & Fixes
**Date:** 2026-08-05  
**File affected:** `tests/Feature/Vishnu/SchedulerCronCommandsTest.php`

---

## Issue 1 — OOM Crash at Test 2013/3567 (Full Run)

**What happened:**  
The full PHPUnit run (`evoxtest_phpunit.xml`) crashed mid-run with `VirtualAlloc() failed` — Windows virtual memory exhausted. Xdebug accumulates branch coverage data for every test class it runs; by test 2013 the process had consumed all available RAM (~0.9 GB free at run start).

**Error output (summary):**
```
Fatal error: Out of memory (VirtualAlloc() failed) ...
```

**Fix applied:**  
Split the run into two halves:
- `generated/evoxtest_phpunit_part1.xml` — Unit + Feature/Api + Feature/Vishnu + Feature/FeatureRoot + Feature/happy-path + Feature/mocked + Feature/negative + Feature/DisputeLogic  
- `generated/evoxtest_phpunit_part2.xml` — Feature/BranchTests + Feature/CoverageMax + Feature/Validation  

Each part writes a `.cov` serialized coverage file (no HTML). A merge script (`generated/evoxtest_merge_coverage.php`) combines both `.cov` files into the final HTML + clover XML report.

---

## Issue 2 — Hang: `test_generate_weekly_dtr_runs_successfully`

**Test:** `SchedulerCronCommandsTest::test_generate_weekly_dtr_runs_successfully`  
**Command under test:** `generate_weekly_dtr`

**What happened:**  
Test hung for 2+ hours. DB process list showed these queries firing repeatedly:
```sql
select * from `utc_timelog` where `user_id` = ? and `date` between ? and ?
select * from `rest_day_works` where `schedule_id` = ?
select * from `alter_logs` where `user_id` = ? and `date` = ?
select * from `leaves` where `user_id` = ? ...
```

**Root cause:**  
`generateWeeklyDtr::handle()` calls `$this->dtr->generate_dtr($users, $dates)`.  
`DtrRepository::generate_dtr()` batch-inserts DTR rows then enters a per-row loop: for each DTR it calls `getBestSchedule()` → `getParsedDetailToDate()` → lazy-loads `rest_day_work()`, `policies()`, `alter_logs`, `leaves`, `utc_timelog`. With 2 real users × ~30 days that is 60+ iterations, each firing 4–6 sub-queries.

**Fix applied:**
```php
$dtrMock = Mockery::mock(DtrRepositoryInterface::class);
$dtrMock->shouldReceive('generate_dtr')->once()
        ->andReturn(['total_dtr_count' => 60, 'dtr' => []]);
$this->app->instance(DtrRepositoryInterface::class, $dtrMock);
```
Also added import: `use App\Modules\Payroll\Repositories\DtrRepositoryInterface;`

---

## Issue 3 — Hang: `test_send_supervisor_reminder_no_sched_runs_successfully`

**Test:** `SchedulerCronCommandsTest::test_send_supervisor_reminder_no_sched_runs_successfully`  
**Command under test:** `send_supervisor_reminder_no_sched`

**What happened:**  
Test hung. DB process list showed full-table scans on employees + schedules for every supervisor.

**Root cause:**  
`sendSupervisorReminderNoSchedEmail::handle()` calls `$this->user->get_users_under_supervisee_active_with_no_schedule($supervisor)` for each supervisor. This method scans all employees under each supervisor and checks schedule availability per employee — unbounded iteration against real data.

**Fix applied:**
```php
$userMock->shouldReceive('get_users_under_supervisee_active_with_no_schedule')
         ->withAnyArgs()->andReturn(collect([]));
```

---

## Issue 4 — Hang: `test_send_supervisor_reminder_invalid_check_ins_runs_successfully`

**Test:** `SchedulerCronCommandsTest::test_send_supervisor_reminder_invalid_check_ins_runs_successfully`  
**Command under test:** `send_supervisor_reminder_invalid_check_ins`

**What happened:**  
Test hung. DB process list showed repeated aggregate queries per DTR row:
```sql
select count(*) as aggregate from `leaves` where `dtr_id` = ?
select count(*) as aggregate from `holidays` inner join `dtr_holidays` on ... where `dtr_id` = ?
```

**Root cause:**  
`get_users_under_supervisee_active_with_invalid_check_ins($u->id)` iterates all team members under Gary, then for each member iterates their DTR rows running two `count(*)` queries per row to evaluate check-in validity. With Gary having a large team and years of DTR history, this loops thousands of rows.

**Fix applied:**
```php
$userMock->shouldReceive('get_users_under_supervisee_active_with_invalid_check_ins')
         ->withAnyArgs()->andReturn([]);
```

---

## Issue 5 — Hang: `test_send_supervisor_reminder_requests_runs_successfully`

**Test:** `SchedulerCronCommandsTest::test_send_supervisor_reminder_requests_runs_successfully`  
**Command under test:** `send_supervisor_reminder_requests`

**What happened:**  
Test hung. Same leaf/holiday count queries as Issue 4.

**Root cause (two problems):**  
1. `sendSupervisorReminderRequests::handle()` calls `$this->payroll_cutoff->get_payroll_cutoff()` before iterating supervisors — this was never mocked, so it hit real DB (or failed if no current cutoff row).  
2. `get_users_under_supervisee_active_with_requests($start, $end, $user_id)` iterates all team members and their requests for the cutoff period — same unbounded pattern as Issues 3 & 4.

**Fix applied:**
```php
$this->mockPayrollCutoff();  // was missing — command needs this before any iteration

$userMock->shouldReceive('get_users_under_supervisee_active_with_requests')
         ->withAnyArgs()->andReturn([]);
```

---

## Issue 6 — Hang: `test_sync_bhr_holidays_runs_successfully`

**Test:** `SchedulerCronCommandsTest::test_sync_bhr_holidays_runs_successfully`  
**Command under test:** `sync_bhr_holidays`

**What happened:**  
Test hung after Part 1 restarted (fixes for Issues 2–5 were already applied). DB process list showed:
```sql
select * from `users` where `users`.`id` = ? and `users`.`deleted_at` is null limit 1
insert into `dtr_holidays` (`dtr_id`, `holiday_id`) values (?, ?)
select count(*) as aggregate from `holidays` inner join `dtr_holidays` on ... where `dtr_id` = ?
```
Queries cycled continuously — one per DTR row.

**Root cause:**  
`syncBhrHolidays::handle()` does:
```
get_payroll_cutoff()          → start_date = '2026-01-01'  (from mockPayrollCutoff)
bhr->sync_holidays(start,end) → mocked ✓
dtr->bind_holidays_to_dtr(start_date, now()+3months)  ← NOT mocked — was the hang
```
`$end_date = Carbon::now()->addMonth(3)` evaluates to ~2026-11-05, making the date range Jan–Nov 2026 (10 months).  
`DtrRepository::bind_holidays_to_dtr()` fetches ALL DTR rows in that range for ALL active users, then for each row: `users` lookup → `dtr_holidays` INSERT → holiday count query. With 10 months of data across all employees, this is tens of thousands of iterations.

`sync_holidays` was mocked (BHR call) but `bind_holidays_to_dtr` (DtrRepository call) was not.

**Fix applied:**
```php
$dtrMock = Mockery::mock(DtrRepositoryInterface::class);
$dtrMock->shouldReceive('bind_holidays_to_dtr')->withAnyArgs()->once()
        ->andReturn(new \Illuminate\Database\Eloquent\Collection([]));
$this->app->instance(DtrRepositoryInterface::class, $dtrMock);
```

---

## Summary

| # | Test | Command | Hang Cause | Fix |
|---|---|---|---|---|
| 1 | — | — | OOM at test 2013 (Xdebug + low RAM) | Split run into part1 + part2 |
| 2 | `test_generate_weekly_dtr_runs_successfully` | `generate_weekly_dtr` | `DtrRepository::generate_dtr` per-row loop (alter_logs, leaves, utc_timelog × 60 rows) | Mock `generate_dtr` |
| 3 | `test_send_supervisor_reminder_no_sched_runs_successfully` | `send_supervisor_reminder_no_sched` | `get_users_under_supervisee_active_with_no_schedule` full-team scan | Mock → `collect([])` |
| 4 | `test_send_supervisor_reminder_invalid_check_ins_runs_successfully` | `send_supervisor_reminder_invalid_check_ins` | `get_users_under_supervisee_active_with_invalid_check_ins` count(*) per DTR row | Mock → `[]` |
| 5 | `test_send_supervisor_reminder_requests_runs_successfully` | `send_supervisor_reminder_requests` | Same per-row pattern + missing `mockPayrollCutoff()` | Mock method + add `mockPayrollCutoff()` |
| 6 | `test_sync_bhr_holidays_runs_successfully` | `sync_bhr_holidays` | `DtrRepository::bind_holidays_to_dtr` over 10-month range (Jan–Nov 2026), user lookup + INSERT per row | Mock `bind_holidays_to_dtr` |

---

## Current Run Status

**Part 1** — re-running now after all 5 hang fixes.  
**Part 2** — pending (run after Part 1 completes).  
**Merge** — pending (run `php generated/evoxtest_merge_coverage.php` after both parts done).

**Commands:**
```powershell
# Part 1
php vendor/bin/phpunit --configuration generated/evoxtest_phpunit_part1.xml

# Part 2 (after Part 1 finishes)
php vendor/bin/phpunit --configuration generated/evoxtest_phpunit_part2.xml

# Merge (after both parts finish)
php generated/evoxtest_merge_coverage.php
```
