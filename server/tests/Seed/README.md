# Seed Suite — committed baseline data for the test DB

## Why this exists

~410 tests in the main suite are blocked as **DATA-SEEDABLE**: they look for pre-existing
rows (a pending overtime, an approved alter log, a user with a supervisor, …) and skip when
the dump doesn't have them. The main suite runs under `DatabaseTransactions`, so nothing a
test writes survives — by design. This suite is the deliberate exception: it has **no
rollback**, and every row it writes is meant to stay and become part of the test DB baseline.

Each seed test is also a real end-to-end workflow check: the employee persona submits
through the real API, the supervisor persona approves or declines through the real API, and
the final DB state is asserted before it is left in place.

## How to run (one-time, then re-run any time — it's idempotent)

1. **Create the personas** — see `SEED-USERS.csv` in this directory. Create each account
   through the normal staging **Register User** flow (this fills levels, departments and BHR
   side-tables correctly). The supervisor must be set as the employee persona's direct
   supervisor / department handler so requests route to them.
2. **Wire the env** — add to `server/.env` (emails are examples):

   ```
   E2E_USER_EMPLOYEE_PHILIPPINES=e2e.employee.ph@eastvantage.com
   E2E_USER_SUPERVISOR_PHILIPPINES=e2e.supervisor.ph@eastvantage.com
   E2E_USER_ADMIN_PHILIPPINES=e2e.admin.ph@eastvantage.com
   E2E_USER_HR_PHILIPPINES=e2e.hr.ph@eastvantage.com
   E2E_USER_EMPLOYEE_SECOND=e2e.employee2@eastvantage.com
   E2E_USER_MULTIPUNCH=e2e.multipunch@eastvantage.com   # optional this wave
   ```

   The `E2E_USER_*` names double as the lookups the `tests/Feature/Vishnu` suites already
   use, so setting them here unblocks those suites too.
3. **Run the seed suite:**

   ```
   cd server
   RUN_SEED=1 vendor/bin/phpunit --testsuite Seed
   ```

   Windows PowerShell: `$env:RUN_SEED='1'; vendor\bin\phpunit --testsuite Seed`
4. **Then run the main suite as usual** (no `RUN_SEED`) and compare the incomplete/skipped
   count against the blocked-tests register.

## Safety properties

- **Opt-in:** without `RUN_SEED=1` every test in this suite skips. A plain `phpunit` run
  cannot seed by accident.
- **Idempotent:** each test checks for its marker row first and skips if it already exists.
  Running the suite twice does not duplicate data.
- **Traceable / reversible:** every seeded row carries `SEED-E2E baseline row` in its note
  field. `cleanup-seed-data.sql` deletes everything this suite ever wrote.
- **Personas only:** rows are written exclusively against the dedicated `E2E_USER_*`
  accounts — never against real employees (the old happy-path tests used real staff
  accounts; that was acceptable only because they rolled back).
- **No real emails:** `Mail::fake()` + `Queue::fake()` are active throughout.

## What this wave seeds

| Step | Rows committed |
|---|---|
| Seed00 | nothing — verifies the six personas resolve |
| Seed10 | overtime, alter log, rest day work: one pending + one approved + one declined each; change schedule: pending + declined + approved (approve arm guarded — needs the employee to have a schedule) |

## Wave 2 (after this run's results)

- Alter-log **punch** requests (needs the MULTIPUNCH persona + real login/logout punch rows)
- Announcements + department announcements (HR persona)
- Schedule template + assignment (unlocks the change-schedule approve arm cleanly)
- Team containing the personas; payroll cutoff + holiday rows (needs a decision — a cutoff
  spanning today affects other staging behaviour)
- Non-PH persona attribute + `utc_timelog` geo rows

## Known limits

- Two `MiscProtectedApiTest` tests stay blocked regardless of data — they document real
  `HrController` production bugs (500 on missing announcement ID; broken `catch (Exception)`).
- If a store returns 500 here, the test reports the response body — the usual cause is the
  payroll-period validation SP missing on the dump, or no cutoff covering the seeded dates.
