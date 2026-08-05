# EVOX Backend Test Change Log

---

## 2026-08-05 — mock unbounded repository calls in SchedulerCronCommandsTest.php (5 tests)

**File:** `tests/Feature/Vishnu/SchedulerCronCommandsTest.php`  
**Category:** Cat 5 — Test Case Error (unbounded DB iteration causing multi-hour hangs)

**Context:** Five tests in this class called real UserRepository / DtrRepository methods
that iterate over all data (all employees, all DTR rows) for real users with years of history,
causing multi-hour hangs observed during Part 1 coverage run. Queries seen in DB process list:
`select * from alter_logs`, `select count(*) from leaves where dtr_id = ?`,
`select count(*) from holidays inner join dtr_holidays where dtr_id = ?`,
`select * from users where id = ?`, `insert into dtr_holidays`.

**Fixes applied:**

1. `test_generate_weekly_dtr_runs_successfully` — Mocked `DtrRepositoryInterface::generate_dtr`
   (`->once()`). The generate_dtr schedule-apply loop (getBestSchedule + getParsedDetailToDate
   × 60 iterations) fires per-row queries on `alter_logs`, `leaves`, `utc_timelog`.
   Added `use App\Modules\Payroll\Repositories\DtrRepositoryInterface;` import.

2. `test_send_supervisor_reminder_no_sched_runs_successfully` — Mocked
   `get_users_under_supervisee_active_with_no_schedule` (returns `collect([])`). 
   Command calls this for each supervisor; against real DB it scans all employees + schedules.

3. `test_send_supervisor_reminder_invalid_check_ins_runs_successfully` — Mocked
   `get_users_under_supervisee_active_with_invalid_check_ins` (returns `[]`).
   This method runs `count(*) from leaves` + `count(*) from dtr_holidays` per DTR row for
   all team members under Gary — loops hundreds/thousands of rows.

4. `test_send_supervisor_reminder_requests_runs_successfully` — Mocked
   `get_users_under_supervisee_active_with_requests` (returns `[]`) and added
   `$this->mockPayrollCutoff()` call (command uses `get_payroll_cutoff()` for date window,
   previously unmocked — would fail if no current cutoff row in DB on run date).

5. `test_sync_bhr_holidays_runs_successfully` — Mocked `DtrRepositoryInterface::bind_holidays_to_dtr`
   (`->once()`, returns empty EloquentCollection). `syncBhrHolidays::handle()` calls
   `bind_holidays_to_dtr($cutoff_start, now()+3months)` — with mockPayrollCutoff start=2026-01-01
   and end anchored 3 months from now (~2026-11-05), this iterates ALL DTRs across 10 months for
   all active users, running a user lookup + `dtr_holidays` INSERT + holiday count per row.
   BHR `sync_holidays` was already mocked; `bind_holidays_to_dtr` was the missing second mock.

---

## 2026-07-16 — bind evoxtest_BhrMock in SyncApiTest.php, COEValidationApiTest.php, UserPiiApiTest.php

**Context:** User asked for a full audit of every BHR mock file in the repo and confirmation
that no test still relies on live BHR "failing gracefully." A deep-dive search (see
`feedback_phpunit_patterns.md` / memory for the full inventory) found the default
`BhrServiceProvider` binding resolves `BhrRepositoryInterface` to the real `BhrRepository`
(live `api.bamboohr.com`), and three active, non-skipped, non-excluded test files had no BHR
mock anywhere in their class or a shared base class:

- `tests/Feature/Vishnu/SyncApiTest.php` — posts with a valid API key straight to
  `/api/sync_holidays`, `/api/sync_leaves`, etc. — the same SyncController route family that
  `AdminSyncApiTest.php` explicitly calls "UNSAFE: live BHR call" and skips. This file didn't.
- `tests/Feature/Vishnu/COEValidationApiTest.php` — `COEController::create()` calls
  `$this->bhr->get_user_bhr_field(...)`; header comment assumed "the BHR call will fail in unit
  context" — the same unverified assumption already disproven once in `CronApiTest.php`'s
  history.
- `tests/Feature/Vishnu/UserPiiApiTest.php` — `personal_information`/`job_information`/
  `leave_credits` endpoints all call into BHR; same "fails gracefully" assumption, unverified.

**Fix:** Added the standard `evoxtest_BhrMock` binding to each file's `setUp()` — same pattern
as `ApiTestCase.php` and `Vishnu/CronApiTest.php`. `php -l` clean on all three.

**Also confirmed already safe (no change needed):** `Feature/Mocked/GenerateWeeklyDtrMockedTest.php`
binds `BhrRepositoryInterface` via a `foreach` loop over `Mockery::mock($iface)` in `setUp()` —
verified this actually includes `BhrRepositoryInterface::class` in the loop array, not just
adjacent interfaces.

**No separate "Vishnu BHR mock file" exists.** Vishnu's own convention (seen in
`SchedulerCronCommandsTest.php`) is inline `Mockery::mock(BhrRepositoryInterface::class)` per
test method for asserting specific call expectations — a pattern, not a file. `evoxtest_BhrMock.php`
remains the one reusable class for anything needing realistic BHR data across a whole test class.

---

## 2026-07-15 — tests/ApiTestCase.php — bind BHR mock in shared setUp() (BHR PII leak, 2nd occurrence)

**Problem:** Full backend run kept dumping real employee usernames/emails to console and
crashing mid-run (test 732/2230 on the latest attempt), even after `Vishnu/CronApiTest.php`
was already fixed with an `evoxtest_BhrMock` binding earlier the same day. The leak recurred
regardless of which test class was executing.

**Root cause:** `ApiTestCase::loginAndGetToken()` (`tests/ApiTestCase.php`) — the shared login
helper used by **24 test classes** across `Feature/Api/{DTR,Overtime,AlterLog,RestDayWork,
Attendance,Report,Schedule,Auth,User}/*` — does a real HTTP `POST /api/auth/login` on every
call. That request runs `AuthController::login()` → `get_default_payload()`
(`app/Modules/User/Http/Controllers/AuthController.php:342`):
```php
$bhr_details = $this->bhr->get_user( auth()->user()->bhr_num ? auth()->user()->bhr_num : '');
```
The seeded `'active.user'` fixture (from `UserTestSeeder`) has no `bhr_num`, so this call goes
out to live BHR with an empty employee id on every authenticated request from any of the 24
files — `BhrRepositoryInterface` was never bound in `ApiTestCase::setUp()`. This is separate
from (and wider than) the `CronApiTest.php` leak fixed earlier — that fix only covered
`/api/cron/*`, not the shared login path used by nearly a third of the Feature suite.

**Fix:** Added the standard `evoxtest_BhrMock` IoC binding to `ApiTestCase::setUp()` (one
place, covers all 24 subclasses), same pattern as `CronApiTest.php`. Verified `PayloadApiTest.php`
does not assert on any BHR-derived payload fields (`profile_picture`, `country`, etc.), so the
mock should not change any existing test's expected output. `php -l` clean.

**Diagnostic path (for future reference):** Grepping for `BhrRepositoryInterface`/`bamboohr`/
`/api/cron/` in `tests/` only surfaces files that *directly* reference BHR — it silently
misses shared base classes and controllers where the live-BHR call is several layers removed
from the test file itself (e.g. login → controller → `get_default_payload()` → BHR). When a
BHR-shaped leak recurs after fixing the obvious file, check the auth/login path too — it's
often the actual root cause, since login is triggered by nearly every authenticated test.

---

## 2026-07-15 — `composer dump-autoload` — stale classmap was silently breaking all 24 ApiTestCase files

**Problem:** A fresh full-suite run after the `ApiTestCase.php` fix above produced byte-identical
output to the pre-fix run — same exact test counts, same exact crash. That should be impossible
if the fix actually executed, since 7+ of the 24 `ApiTestCase`-based files (`AlterLogTest`,
`TeamAttendanceSummaryTest`, `LoginApiTest`, `LogoutApiTest`, `JwtSecurityTest`,
`MobileLoginApiTest`, `PayloadApiTest`, etc.) sit inside the very test-position range (1–304)
that reproduced identically both times.

**Root cause:** Isolating a single test (`--filter test_login_001_successful_login_using_username`)
surfaced the real error: `ReflectionException: Class UserTestSeeder does not exist`. Composer's
cached classmap (`vendor/composer/autoload_classmap.php`) was stale and didn't include
`database/seeds/UserTestSeeder.php` (not PSR-4 autoloaded — only resolves via the classmap).
Every one of the 24 `ApiTestCase`-based tests calls `$this->seed(UserTestSeeder::class)` as the
**first line** of `setUp()`, before the BHR mock binding — so all 24 files were erroring out at
the seeder step on every run, both before and after the BHR fix, which is exactly why the fix
appeared to do nothing: its code was never reached.

**Fix:** `composer dump-autoload --no-plugins --no-interaction` (plain `composer dump-autoload`
hangs on an interactive `allow-plugins` prompt on this repo — always use the `--no-plugins
--no-interaction` flags here). Regenerated 6112 classes. Re-ran the isolated test: seeder now
resolves, test completes in ~5s (no hang, no employee dump), and fails for an unrelated,
legitimate reason (`401` instead of `200` — separate credential/seeding issue, not yet triaged).

**Lesson:** When a code fix appears to have zero effect on a re-run, don't assume the fix is
wrong — verify the fix's code path is actually being *reached* first, ideally via an isolated
`--filter` run on one affected test, before re-diagnosing from scratch. A stale autoload
classmap after file moves/additions (this repo has now hit this pattern multiple times across
`bootstrap.php`, `popper.js`, and now `UserTestSeeder.php`) can silently make a correct fix
inert.

---

## 2026-07-14 — Branch switch to feature/e2e-testing-v2 + dead-code test tagging

**Context:** Repo switched from `feature/e2e-testing-without-dead-code` to
`feature/e2e-testing-v2` (user-initiated, intentional — manual dead-code removal done
2026-07-13 for a fresh run). This branch has **fully deleted**
`RoomController.php`, `LocationController.php`, and `BookingController.php` (the old
branch only marked them dead and excluded them from coverage; this branch removed the
files outright).

**Recovery:** `generated/` folder, `evoxtest_phpunit.xml`, `evoxtest_BhrMock.php`, this
change log, `evoxtest_ApiTestCase.php`, and the backend/frontend coverage HTML reports
existed only on the old branch (committed there, never on this one) — extracted via a
temporary `git worktree` (old branch was never checked out over this one) and copied into
`C:\DFolder\Projects\EVOX\E2eTesting\TestCases\14072026\old-branch-generated\`, a location
outside the repo so future branch/commit activity on either branch can't touch it. The
Vishnu test batch already copied into the live tree (211 Feature + 7 Unit + 96 e2e + 121
jest) was untracked and survived the branch switch untouched; a duplicate safety copy of
it now also lives at `TestCases\14072026\current-batch-live-copy\`.

**Dead-code test tagging (`@group dead-code`, never deleted):**

Class-level (entire file is about the removed feature):
- `Feature/Api/BookingApiTest.php`
- `Feature/Vishnu/MeetingRoomApiTest.php`
- `Feature/Vishnu/PoliciesCocRoomsApiTest.php`
- `Feature/Vishnu/RoomApiTest.php`

Method-level (file covers other still-live functionality too; only these methods tagged):
- `Feature/DashboardVerifiedApiTest.php` — 9 `test_get_dashboard_all_*` methods (routed through the now-deleted `BookingController@get_dashboard_all`)
- `Feature/Vishnu/AdminMiscApiTest.php` — `test_delete_location_details_with_null_id_does_not_500`
- `Feature/Vishnu/DashboardApiTest.php` — 9 `test_get_dashboard_all_*` methods
- `Feature/Vishnu/MiscProtectedApiTest.php` — 8 `LocationController`-routed methods (`test_getlocation_*`, `test_storelocation_*`, `test_getlocationcal_*`, `test_update_location_*`, `test_delete_location_*`)
- `Feature/Vishnu/MiscRootControllersApiTest.php` — 8 `test_booking_*` methods

`server/generated/evoxtest_phpunit.xml` recreated on this branch with
`<groups><exclude><group>dead-code</group></exclude></groups>`, and the whitelist's
`RoomController.php`/`LocationController.php` file-excludes removed (files no longer exist,
so the exclude entries were dead references).

**Client-side (Jest/Playwright), tagged via `.skip` — same convention, no annotation
support for groups in this Jest/Playwright version so `.skip` is the direct equivalent:**
- `client/src/__tests__/vishnu/MeetingRoom.container.test.js` — full file (8 top-level `describe` → `describe.skip`)
- `client/src/__tests__/vishnu/MeetingRoom.test.js` — full file (8 → `describe.skip`)
- `client/src/__tests__/vishnu/MeetingRoomBooking.test.js` — full file (8 → `describe.skip`)
- `client/src/__tests__/vishnu/PoliciesCocRooms.test.js` — partial (3 of 5 `describe` blocks: `Meetingcalander`, `Meetingroombooking`, `RoomMaster`)
- `client/src/__tests__/vishnu/PoliciesCocRooms.container.test.js` — partial (same 3 of 5)
- `client/e2e/meeting-room.spec.ts` — full file (8 top-level `test.describe` → `test.describe.skip`)

`client/e2e/dashboard.verified.spec.ts` was left untouched — its `BookingController`
references are historical documentation comments on live UI navigation tests, not a
structural dependency on the deleted class.

**Verified:** `php -l` clean on all 9 modified backend files after tagging; `describe.skip`
counts verified per file after client-side edits. No test content deleted anywhere.

---

## 2026-07-13 — New Vishnu test batch copied in (216 backend files)

**Source:** `C:\DFolder\Projects\EVOX\E2eTesting\VishnuTestCases\evox-tests-complete-2026-07-13\tests\`
(`backend/`, `happy-path/`, `negative/`, `dispute-logic/` — the canonical de-duplicated suite per
its own `tests/README.md`; `by-feature/` was NOT copied, it's a navigation-only duplicate of the
same tests per that repo's top-level README).

**Placement:** Each file's destination computed from its declared `namespace Tests\...;` (matches
`composer.json` PSR-4 `"Tests\\": "tests/"`), e.g. `namespace Tests\Feature\HappyPath;` →
`tests/Feature/HappyPath/`. New subtrees introduced: `Feature/HappyPath/` (12), `Feature/Negative/`
(6 files / 18 tests), `Feature/DisputeLogic/` (1), `Feature/Mocked/` (3 — cron/sync/Freshservice,
Mockery-bound external deps per its own README), plus existing-style `Feature/Api/*`, `Feature/Vishnu/*`,
`Feature/Validation/*`, `Unit/*`.

**Excluded from copy:** `ExampleTest.php` (Laravel boilerplate placeholder), 2 zero-byte
corrupt-filename artifacts (`andReturnUsing(function`, `id)`) found in source `backend/mocked/`.

**Verified before running:** `php -l` syntax-checked all 216 files — zero parse errors. Checked
6 duplicate class names (`TeamAttendanceSummaryTest`, `RequestExtendedApiTest`, etc.) — all resolve
to different namespaces (`Api` vs `Vishnu`), so no redeclaration collision. Confirmed
`evoxtest_phpunit.xml`'s existing excludes (`Vishnu/AdminSyncApiTest.php`, `Vishnu/SyncHrisApiTest.php`)
still point at real files in the new batch and remain in effect.

**Not yet re-applied:** The BHR IoC mock binding pattern — the new batch's cron/BHR-adjacent
tests live under `Feature/Mocked/` and bind their own Mockery fakes directly (per that folder's
README), not the shared `evoxtest_BhrMock.php`. No action needed unless those mocks fail on-box.

---

## 2026-07-13 — Archived old test-case files (not deleted)

**Scope:** All `*Test.php` files under `server/tests/Feature/**` and `server/tests/Unit/**` (166 files).

**Change:** Moved (not deleted) to sibling folder `server/tests_archived_20260713/`, preserving
relative directory structure. A pre-move zip backup also exists at
`server/generated/evoxtest_tests_backup_20260713.zip`.

**Left in place (infrastructure, not test cases):** `tests/ApiTestCase.php`, `tests/bootstrap.php`,
`tests/CreatesApplication.php`, `tests/evoxtest_ApiTestCase.php`, `tests/TestCase.php`,
`tests/Support/TestUsers.php`, `tests/Feature/Api/evoxtest_BhrMock.php`, this change log.

**Why:** User requested the old test suite be cleared out of the live `tests/` tree so a new
batch of test cases can be added and run without old tests interfering/causing confusion in the
same run. Per CLAUDE.md's "never delete a file you didn't create this session" rule, files were
moved aside rather than deleted, and a zip backup was taken beforehand.

**Action required by user:** None. New test files can now be added directly under
`server/tests/Feature/` and `server/tests/Unit/` — the old ones are safely out of the runner's path.

---

## 2026-06-10 — OvertimeTest.php (runtime API key generation)

**File:** `server/tests/Feature/Api/OvertimeTest.php`

**Change:** Replaced `env('E2E_API_KEY')` with runtime DB insert in `setUp()`.

**Before:**
```php
$this->apiKey = env('E2E_API_KEY');
if (!$this->apiKey) {
    $this->markTestSkipped('E2E_API_KEY not set ...');
}
```

**After:**
```php
$this->apiKey = \Illuminate\Support\Str::random(64);
DB::table('api_keys')->insert([
    'name'       => 'evox_e2e_employee_philippines_' . now()->format('His'),
    'key'        => $this->apiKey,
    'active'     => 1,
    'created_at' => now(),
    'updated_at' => now(),
]);
```

**Why:** Static long-lived keys are a security exposure. PHPUnit runs inside DatabaseTransactions —
any insert is rolled back after the test. The key lives for one test method only (a few seconds).
Key name is derived from the primary variant (`employee-philippines`) + timestamp so it's
identifiable in the DB if debugging a failure before rollback.

Uses raw `DB::table()` rather than `ApiKey::generate()` (package Eloquent method) to avoid
firing admin event logs.

**Action required by user:** Remove `E2E_API_KEY` from `server/.env` — PHPUnit no longer needs it.
`E2E_USER_EMPLOYEE_PHILIPPINES` and `E2E_USER_SUPERVISOR_PHILIPPINES` are still needed.

**`E2E_API_KEY` in `.env.e2e`** — stays, but now Playwright-only (comment added to file).

---

## 2026-06-10 — OvertimeTest.php + .env.e2e + evoxtest_test-users.md (per-role JWT refactor)

### Motivation
JWT encodes user identity. A single employee token for all tests means no test exercises
what a different role's token does. The `menus/<Role>-<Geo>/` folder name is now the
canonical user type identifier — same index drives Playwright, access matrix, and PHPUnit.

### Changes to OvertimeTest.php

**Removed:**
- `private $userId` (single int property)
- `loadUserByRole(string $role, ?int $countryId)` — Spatie join, called `markTestSkipped` internally

**Added:**
- `private $users = []` — array keyed by variant name (`'employee-philippines'`, etc.)
- `loadUserByVariant(string $variant): ?int` — derives env key from variant name, looks up user
  by email. Returns null (does NOT skip) so missing optional variants don't abort the suite.
- `requireUser(string $variant): int` — called inside individual tests; skips only that test
  if the variant's user wasn't loaded
- `testSupervisorJwtIsCurrentlyAccepted()` — `@group security-finding`; documents that
  `permission:add_overtime` middleware is commented out (any role can currently submit)

**setUp now loads:**
```php
$this->users['employee-philippines']   = $this->loadUserByVariant('employee-philippines');
$this->users['supervisor-philippines'] = $this->loadUserByVariant('supervisor-philippines');
```
Employee is required (markTestSkipped if missing); supervisor is optional.

**All 9 existing test methods** updated to call `$this->requireUser('employee-philippines')`
explicitly instead of `$this->userId`.

### Changes to .env.e2e

Old keys removed:
- `E2E_EMPLOYEE_USERNAME`, `E2E_EMPLOYEE_PASSWORD`
- `E2E_SUPERVISOR_USERNAME`, `E2E_SUPERVISOR_PASSWORD`

New keys added (role+geo convention):
- `E2E_USER_EMPLOYEE_PHILIPPINES=glenn.macasarte@eastvantage.com`
- `E2E_USER_EMPLOYEE_PHILIPPINES_PASSWORD={ev2010}`
- `E2E_USER_SUPERVISOR_PHILIPPINES=vishnu.prakash@eastvantage.com`
- `E2E_USER_SUPERVISOR_PHILIPPINES_PASSWORD={ev2010}`

### Action required by user — update server/.env

Add these lines to `server/.env` (not committed):
```
E2E_API_KEY=RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z
E2E_USER_EMPLOYEE_PHILIPPINES=glenn.macasarte@eastvantage.com
E2E_USER_SUPERVISOR_PHILIPPINES=vishnu.prakash@eastvantage.com
```

### Action required by user — update Playwright specs

Any Playwright spec that reads `process.env.E2E_EMPLOYEE_USERNAME` must be updated to
`process.env.E2E_USER_EMPLOYEE_PHILIPPINES` (and same for supervisor).
Currently: `evoxtest_Employee_Overtime.spec.ts` uses `E2E_EMPLOYEE_USERNAME` — update that reference.

---

## 2026-06-10 — OvertimeTest.php (API key source — use E2E_API_KEY env var)

**File:** `server/tests/Feature/Api/OvertimeTest.php`

**Change:** Replaced `DB::table('api_keys')->where('active', 1)->value('key')` with
`env('E2E_API_KEY')` in `setUp()`.

**Before:**
```php
$this->apiKey = DB::table('api_keys')->where('active', 1)->value('key');
if (!$this->apiKey) {
    $this->markTestSkipped('No active API key in api_keys table — add one to the dev DB');
}
```

**After:**
```php
$this->apiKey = env('E2E_API_KEY');
if (!$this->apiKey) {
    $this->markTestSkipped('E2E_API_KEY not set — add it to server/.env (same value as .env.e2e E2E_API_KEY)');
}
```

**Why:** Playwright reads `E2E_API_KEY` from `PS-main/.env.e2e`. PHPUnit should use the
same provisioned credential, not "any active key from the DB." Querying the DB is fragile —
a different active key could be returned and might not match what the E2E layer uses.
Single credential source = `E2E_API_KEY` in both files.

**Action required by user:** Add `E2E_API_KEY=RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z`
(or the current key) to `server/.env`. This is a local file, not committed.

---

## 2026-06-10 — OvertimeTest.php (country_id geo-filter correction)

**File:** `server/tests/Feature/Api/OvertimeTest.php`

**Change:** Removed `country_id=1` from the `loadUserByRole` call in `setUp()`.

**Before:**
```php
$this->userId = $this->loadUserByRole('employee', 1);
```

**After:**
```php
$this->userId = $this->loadUserByRole('employee');
```

**Why:** Business Rules doc confirms India = country_id=1. Filtering Philippines employees by
country_id=1 would have returned India employees or no results. Philippines country_id is not
yet determined. Until it is confirmed (check `countries` table or BHR sync), the ph filter runs
without a country_id constraint — picks the first active employee regardless of geo.

**Also updated:** `_shared/evoxtest_test-users.md` Country ID Map and Variant Registry to
reflect this — Employee-Philippines row now shows "TODO — no filter yet" for country_id.

All edits made to app-repo test files are recorded here.
Source file prefix: `server/tests/Feature/Api/`
App repo: `C:\DFolder\Projects\EVOX\E2eTesting\EVOX Code-Git\evox-app-e2e`
Branch: `feature/e2e-testing-code`

---

## 2026-06-10 — OvertimeTest.php + test-users registry (no-fake-user refactor)

### New file: `_shared/evoxtest_test-users.md`

**Why:** Central registry mapping `menus/<Role>-<Geo>/` folder names → real DB users.
Every test traces its user back to a menu variant. Add a row when a new menu folder is added.

**Removed from OvertimeTest.php:**
- `private $apiKey = 'phpunit-test-key-overtime'` (hardcoded fake key)
- `DB::table('api_keys')->insert(...)` in setUp() (fake key insert)
- `seedUser()` method (entire fake user insert)

**Added to OvertimeTest.php:**
- `$this->userId = $this->loadUserByRole('employee', 1)` — picks first active employee,
  country_id=1 (Philippines), from the real DB
- `$this->apiKey = DB::table('api_keys')->where('active', 1)->value('key')` — uses first
  real active key; skips test if none found
- `loadUserByRole(string $role, ?int $countryId)` — reusable helper joining users →
  model_has_roles → roles. Calls `markTestSkipped()` if no match so tests skip cleanly.

`DatabaseTransactions` kept — still rolls back the overtimes row from the duplicate test
and any row created by the 201 test.

---

## 2026-06-11 — evoxtest_DashboardTest.php (new file)

**File:** `server/tests/Feature/Api/DashboardTest.php`

**Change:** New file covering Dashboard API auth gates, data validation, and two security findings.

**Tests added:**
- `testMissingJwtReturns401WithTokenAbsent` — no Authorization header → 401 (JWTAuthentication.php:42-43)
- `testMissingApiKeyReturns401` — no X-Authorization header → 401 (AuthorizeApiKey.php:31-35)
- `testValidAuthReturns200WithDashboardStructure` — contract anchor: `{data:{departments,announcements}}`
- `testDepIdFilterReturns200WithFilteredAnnouncements` — dep_id=112 → 200
- `testDepIdAllReturns200WithFullAnnouncementList` — dep_id=all → 200 full list
- `testNonExistentDepIdReturns200WithoutCrash` — dep_id=999999 → 200, no SQL error
- `testDtrOwnRecordReturns200` — own DTR fetch → 200 with summary/dtr_records structure
- `testDtrMalformedDateReturns422` — invalid date format → 422
- `testDtrCrossUserAccessCurrentlyNotBlocked` — @security-finding: DtrController.php:70 IDOR (get_authenticated_user commented out)
- `testAnnouncementShowHasNoOwnershipCheck` — @security-finding: AnnouncementController.php:99-108 no visibility check

**Why:** Split from `evoxtest__PH_Employee_Dashboard_extended.spec.ts` — API-level assertions belong in PHPUnit, not browser-based `page.evaluate` fetches.

**Patterns used:** `loadUserByVariant` / `requireUser` / runtime API key in `api_keys` table — per PHPUnit patterns memory.

**Companion file (UI side):**
`.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_Dashboard_frontend.spec.ts`

---

## 2026-06-11 — evoxtest_Dashboard_frontend.test.js (new file — Jest)

**File:** `.evox-test-frontend/generated/evoxtest_Dashboard_frontend.test.js`
**Copy to:** `client/src/__tests__/containers/evoxtest_Dashboard_frontend.test.js`

**Why:** User confirmed frontend tests must be `.js` files for Jest (not `.spec.ts` Playwright). This replaces the Playwright-based `evoxtest__PH_Employee_Dashboard_frontend.spec.ts` for the component-level test layer.

**Targets:**
- `DashboardAnnouncementsList` — filter select, announcement list states, getDashboardOverall dispatch
- `QuickPunch` — Clock In/Out button enabled/disabled logic based on `recent_dtr[1].time_in`

**Pattern:** Matches `DashboardModals.test.js` (Provider + createStore + thunk, jest.mock for actions).

**Tests added (15 total):**
- Rendered content: select visible, "All" option, department options from lookup, PageLoading when undefined, mount fires getDashboardOverall(3)
- Filter: onChange fires getDashboardOverall(3, {dep_id}); "all" dep_id preserved
- List states: cards rendered, "No Announcements." on empty, PageLoading when not loaded, Show More, No More Announcements to Show
- QuickPunch: both buttons rendered, Clock In enabled/disabled by time_in, disabled on rest day, note text on rest day, Clock Out never disabled

---

## 2026-06-11 — evoxtest__PH_Employee_Dashboard_frontend.spec.ts (split from extended)

**File:** `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_Dashboard_frontend.spec.ts`

**Change:** New file. Categories 2 (UI mocked API reactions), 3 (clock state), 5 (browser redirects), 6 (edge cases) split from the now-superseded `evoxtest__PH_Employee_Dashboard_extended.spec.ts`.

**Tests moved here from extended:**
- All `page.route()` mocked API-500/401 tests (cat 2) — UI crash/redirect checks
- Clock widget state tests (cat 3) — mutually exclusive states, disabled Day Completed
- Unauthenticated and post-logout redirect tests (cat 5 browser side)
- All 6 edge case tests (cat 6) — tab switching, empty list, state persistence, navigation, logout

**Tests moved to evoxtest_DashboardTest.php:**
- `page.evaluate` fetch-based auth tests (cat 5 API side) — now tested with PHPUnit HTTP client
- IDOR tests (cat 5) — asserted at HTTP layer in PHPUnit
- Data validation at the API level (cat 4)

---

## 2026-06-12 — evoxtest_DTRTest.php (new file — PHPUnit, DTR module)

**File:** `.evox-test-backend/generated/evoxtest_DTRTest.php`
**Copy to:** `server/tests/Feature/Api/evoxtest_DTRTest.php`

**Sources read:** DtrController.php, Payroll/Routes/api.php, dtrActions.js (response shape).

**Tests added (10 total):**
- `testDtrMissingJwtReturns401` — no Authorization header → 401
- `testDtrMissingApiKeyReturns401` — no X-Authorization → 401
- `testDtrFilterMissingJwtReturns401` — filter endpoint missing JWT → 401
- `testDtrFilterMissingApiKeyReturns401` — filter endpoint missing API key → 401
- `testDtrMalformedStartDateReturns422` — start_date not Y-m-d → 422
- `testDtrMalformedEndDateReturns422` — end_date not Y-m-d → 422
- `testDtrEndDateBeforeStartDateBehavior` — inverted range; documents behavior (no range-order validation)
- `testOwnDtrReturns200WithContractStructure` (@group sp-dependent) — contract anchor: `data.content.{dtr_records,summary}`
- `testOwnDtrFilterReturns200WithPayrollPeriods` (@group sp-dependent) — filter API contract
- `testDtrRecordsForClosedPeriodContainNoPastFutureDates` (@group sp-dependent) — SP result dates in range
- `testCrossUserDtrNotBlocked` (@group security-finding, @group sp-dependent) — IDOR: DtrController.php:70 commented out
- `testCrossUserDtrFilterAccessBehavior` (@group security-finding, @group sp-dependent) — filter IDOR boundary (TODO: read PayrollCutoffController)

**Security findings documented:**
- IDOR on DTR data endpoint (DtrController.php:70 `get_authenticated_user` is commented out) — flip assertion to `assertStatus(403)` when fixed
- Possible IDOR on filter endpoint — TODO: read PayrollCutoffController@get_filter_for_dtr

**Contract anchor note:**
`dtrActions.js` reads `result.data.content.dtr_records`. The existing DashboardTest.php
asserts `['data' => ['summary', 'dtr_records']]` (without `content` wrapper). One of these
is incorrect — confirm against a live API run and reconcile.

**Companion files:**
- `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_DTR_frontend.spec.ts` (Playwright extended UI)
- `.evox-test-frontend/generated/evoxtest_DTR_frontend.test.js` (Jest component)

---

## 2026-06-12 — evoxtest_DTR_frontend.test.js (new file — Jest, DTR component)

**File:** `.evox-test-frontend/generated/evoxtest_DTR_frontend.test.js`
**Copy to:** `client/src/__tests__/containers/evoxtest_DTR_frontend.test.js`

**Target:** `DailyTimeRecord` container (container/DailyTimeRecord/DailyTimeRecord.js)

**Tests added (16 total):**
- Mount: renders heading, calls getFilterForDtr on mount, renders without crash when filter not loaded
- Dropdown rendering: year renders when isFilterLoaded=true, year has 2025 option, year absent when not loaded, month absent before year, month appears after year, month has correct label, cutoff absent before month, cutoff appears after year+month, cutoff has period label
- Action dispatch: cutoff selection calls viewEmployeeDtr with correct user_id/start_date/end_date; calls setSelectedPayrollCutoff with full cutoff object
- Table: absent when isDtrLoaded=false; renders when isDtrLoaded=true; has Clock In/Clock Out headers; future rows filtered (moment().diff < 0 branch); undertime null when approved leave; undertime visible when no leave

**Key patterns:**
- react-select mocked as native `<select>` that calls `onChange` with the full option object `{value, label}`
- Reducer returns same object reference so React Redux does not trigger componentWillReceiveProps → setPayrollCutoffInstance auto-flow
- `Wrapper` mocked to avoid Redux auth redirects inside the component

---

## 2026-06-12 — evoxtest__PH_Employee_DTR_frontend.spec.ts (new file — Playwright extended UI)

**File:** `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_DTR_frontend.spec.ts`

**Tests added (8 total):**
- 2. DTR data API 500 after period change does not crash page
- 2. Filter API 500 on page load does not show blank page
- 2. Simulated 401 (token_expired) redirects to login
- 3. Period filter selection fires a real 200 GET /api/dtr request (waitForResponse)
- 5. Unauthenticated direct access to DTR URL redirects to login
- 5. Post-logout access to DTR URL redirects to login
- 6. Previously selected period is restored when navigating away and back
- 6. Empty dtr_records (mocked) does not crash the page

---

## 2026-06-10 — OvertimeTest.php (auth + LevelId fixes)

**File:** `server/tests/Feature/Api/OvertimeTest.php`

### Change 1 — Add `LevelId` to `seedUser()` (line ~72)

**Why:** `OvertimeResource::toArray()` calls `is_under_supervisee($this->user_id, false)`.
That helper calls `auth()->user()->level_type()` which does `$this->level()->first()->Name`.
If the authenticated user has no `LevelId` set, `first()` returns `null` and `->Name` throws a
TypeError caught by the framework as a 400. Adding a real `LevelId` from `EVOX_LEVELS` fixes this.

**Before:**
```php
'country_id'    => 1,
'is_active'     => 1,
```

**After:**
```php
'country_id'    => 1,
'LevelId'       => DB::table('EVOX_LEVELS')->value('LevelId'),
'is_active'     => 1,
```

---

### Change 2 — Remove `dump()` debug block from `authHeaders()` (lines ~82-86)

**Why:** Debug output left in from earlier troubleshooting session. Removed to keep test output clean.

**Before:**
```php
dump([
    'userId'    => $userId,
    'userFound' => $user ? 'yes' : 'NULL - user not found',
    'token'     => $token ?? 'NULL - token generation failed',
]);
```

**After:** *(block deleted entirely)*

---

### Change 3 — Add `testSecondsFormatAmountReturns422()` test

**Why:** Confluence FTC-011 specifies that `amount: "3600"` (raw seconds) must be rejected.
The existing `testSingleDigitHourAmountReturns422` only covers `'1:00'`. This adds the FTC-011 case.

**Added after `testSingleDigitHourAmountReturns422()`:**
```php
public function testSecondsFormatAmountReturns422(): void
{
    // FTC-011: amount must be H:i format — raw seconds string must be rejected
    $response = $this->withHeaders($this->authHeaders($this->userId))
        ->postJson('/api/request/overtime', $this->validPayload(['amount' => '3600']));

    $response->assertStatus(422);
}
```

---

## 2026-06-12 — evoxtest_OvertimeRequestTest.php (new file — PHPUnit, Overtime module)

**File:** `.evox-test-backend/generated/evoxtest_OvertimeRequestTest.php`
**Copy to:** `server/tests/Feature/Api/evoxtest_OvertimeRequestTest.php`

**Why:** Supersedes the old `evoxtest_OvertimeTest.php` which used DB::table fake users + static API key. This version uses the correct patterns: `loadUserByVariant`, `requireUser`, `authHeaders`, runtime API key via `Str::random(64)`, `DatabaseTransactions`.

**Sources read:**
- OvertimeController.php — store (201), find (200/404), destroy (200)
- OvertimeRequest.php — validation rules: date Y-m-d unique/user_id, user_id exists, type OVERTIME_TYPE, amount H:i
- OvertimeResource.php — response fields: id, user_id, date, amount, type, status, request_type, user
- Request/Routes/api.php — middleware: jwtauth + auth.apikey (permission:add_overtime is commented out)
- api_response_helper.php — success_response → {message, content}

**Tests added (15 total):**
- `testMissingJwtReturns401` — no Authorization → 401
- `testMissingApiKeyReturns401` — no X-Authorization → 401
- `testGetFindWithoutJwtReturns401` — GET /{id} without JWT → 401
- `testMissingDateReturns422` — date: null → 422
- `testInvalidDateFormatReturns422` — date: 'DD-MM-YYYY' → 422
- `testMissingUserIdReturns422` — user_id: null → 422
- `testNonExistentUserIdReturns422` — user_id: 999999999 → 422
- `testMissingTypeReturns422` — type: null → 422
- `testInvalidTypeValueReturns422` — type: 'invalid_type' → 422
- `testMissingAmountReturns422` — amount: null → 422
- `testInvalidAmountSingleDigitHourReturns422` — amount: '1:00' → 422 (H requires zero-padded 2-digit)
- `testInvalidAmountMissingColonReturns422` — amount: '0200' → 422
- `testInvalidAmountSecondsFormatReturns422` — amount: '3600' → 422
- `testValidStoreReturns201WithOvertimeStructure` @group sp-dependent — 201 + contract anchor
- `testDuplicateDateForSameUserReturns422` @group sp-dependent — double POST → 422
- `testFindExistingOvertimeReturns200WithOvertimeStructure` @group sp-dependent — 200 + structure
- `testFindNonExistentOvertimeReturns404` @group sp-dependent — 404

**Contract anchor:**
`POST /api/request/overtime → 201 {message, content:{id,user_id,date,amount,type,status}}`
Cross-check against overtimeActions.js shape to detect drift.

**Security note:**
`permission:add_overtime` middleware is commented out on all routes. Any authenticated user can currently submit, update, approve, decline, and cancel overtime requests. TODO: confirm whether this is intentional.

**Companion files:**
- `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_OvertimeRequest_frontend.spec.ts` (Playwright extended UI)
- `.evox-test-frontend/generated/evoxtest_OvertimeRequest_frontend.test.js` (Jest component)

---

## 2026-06-12 — evoxtest__PH_Employee_OvertimeRequest_frontend.spec.ts (new file — Playwright extended UI)

**File:** `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_OvertimeRequest_frontend.spec.ts`
**npm script:** `test:overtime-ui` (PLAYWRIGHT_SPEC_NAME=Overtime-frontend)

**Tests added (7 total):**
- 5. Unauthenticated access redirects to login
- 5. Post-logout access redirects to login (ERR_ABORTED catch pattern)
- 6. Form renders Date, Amount(Hours), Type, note placeholder, Submit; Supervisor Note hidden in store mode
- 3. Cancelling confirm dialog → no POST to /api/request/overtime
- 3. Validity-check Result:0 → alert dialog fires (not confirm); no POST
- 2. POST returning 500 → page survives (no Whoops/Internal Server Error text)
- 2. POST returning 422 → URL stays on /app/request/Overtime

**Mocked endpoints (page.route):**
- `**/api/request/request-validity-check**` → { message, content: { Result, StartDate, EndDate } }
- `**/api/request/overtime**` (POST) → configurable per test (500 / 422)

---

## 2026-06-12 — evoxtest_OvertimeRequest_frontend.test.js (new file — Jest, Overtime component)

**File:** `.evox-test-frontend/generated/evoxtest_OvertimeRequest_frontend.test.js`
**Copy to:** `client/src/__tests__/containers/evoxtest_OvertimeRequest_frontend.test.js`

**Target:** `container/Request/Overtime/Overtime.js`

**Tests added (18 total):**
- Store mode: renders without crash; Date/Amount/Type/note labels; Pre/Post Overtime options via Formatter.slug_to_title mock; type select element; Supervisor Note hidden
- Edit mode: form visible when isInstanceLoaded=true; PageLoading when false; Supervisor Note visible
- Approval mode (is_under_supervisee=true): renders without crash; employee note is read-only (no textarea); approver_note textarea editable; Enter Note label visible
- Lifecycle: clearOvertimeInstance called once on mount; fetchOvertime called with id in edit mode; NOT called in store mode
- Submit guard: addOvertime not dispatched before submit; updateOvertime not dispatched in edit mode

**Key mocks added vs existing Overtime.test.js:**
- `jest.mock('../../services/Formatter', ...)` — slug_to_title stub so Pre/Post Overtime options render
- `jest.mock('../../services/API', ...)` — prevents network calls from checkRequestValidity
- `jest.mock('../../services/DateFormatter', ...)` — prevents Date math errors in Yup schema

---

## 2026-06-12 — evoxtest_OvertimeDisputeTest.php (new file — PHPUnit, Overtime Dispute)

**File:** `.evox-test-backend/generated/evoxtest_OvertimeDisputeTest.php`
**Copy to:** `server/tests/Feature/Api/evoxtest_OvertimeDisputeTest.php`

**Unique to dispute:** `request_mode=dispute` → SP `EV_SP_PD_Autoamtion_Overtimes` — no email/audit trail. Response content is `[]` (empty), not OvertimeResource.

**Tests added (9 total):** auth gate (2); validation (4); `testDisputeStoreReturns201WithEmptyContent` @group sp-dependent; `testDisputeDuplicateDateBehaviorDocumented` @group sp-dependent.

---

## 2026-06-12 — evoxtest__PH_Employee_OvertimeDispute_frontend.spec.ts (new file — Playwright extended UI)

**File:** `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_OvertimeDispute_frontend.spec.ts`
**npm script:** `test:overtime-dispute-ui` (PLAYWRIGHT_SPEC_NAME=Overtime-dispute-frontend) — **6/6 passed**

**Tests (6):** unauth redirect; post-logout redirect; past-date form renders; Result:2 dispute confirm message; cancel no POST; POST 500 no crash.

---

## 2026-06-12 — evoxtest_OvertimeDispute_frontend.test.js (new file — Jest, Overtime dispute)

**File:** `.evox-test-frontend/generated/evoxtest_OvertimeDispute_frontend.test.js`
**Copy to:** `client/src/__tests__/containers/evoxtest_OvertimeDispute_frontend.test.js`

**Tests (11):** rendering (7); lifecycle (2); submit guard (1 + TODO for dispute request_mode verification). API mock returns Result:"2".

---

## 2026-06-12 — evoxtest_RestDayWorkTest.php (new file — PHPUnit, Rest Day Work)

**File:** `.evox-test-backend/generated/evoxtest_RestDayWorkTest.php`
**Copy to:** `server/tests/Feature/Api/evoxtest_RestDayWorkTest.php`

**Contract anchors:**
- Regular POST → 201 { message, content: RestDayWorkResource {id, user_id, date, start_time, end_time, break_time, status} }
- Dispute POST (request_mode=dispute) → 201 { message, content: [] } — SP `EV_SP_PD_Autoamtion_RestDay`

**DTR check note:** Controller-level (not FormRequest) — Dtr record with is_rest_day==0 returns error_response, not 422. Tests use 90-days-past dates (no DTR expected). Security note: `permission:add_rest_day_work` middleware commented out.

**Tests added (16 total):** auth (2); date (3); user_id (2); start_time (2); end_time (2); break_time (2); `testStoreReturns201WithResourceShape` @group dtr-dependent; `testDisputeStoreReturns201WithEmptyContent` @group sp-dependent.

---

## 2026-06-12 — evoxtest__PH_Employee_RestDayWork_frontend.spec.ts (new file — Playwright extended UI)

**File:** `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_RestDayWork_frontend.spec.ts`
**npm script:** `test:restdaywork-ui` (PLAYWRIGHT_SPEC_NAME=RestDayWork-frontend)

**Tests (9):** unauth redirect; post-logout redirect; all labels visible; past Saturday no crash; Result:0 alert + no POST; Result:1 regular confirm + cancel blocks POST; Result:2 dispute confirm message; POST 500 no crash; POST 422 form stays visible.

Key notes: direct navigation (sidebar collapsed); `exact: true` for 14:00/00:30 time pickers; wide date range mock (2020-2040) for Result:1.

---

## 2026-06-12 — evoxtest__PH_Employee_RestDayWorkDispute_frontend.spec.ts (new file — Playwright extended UI)

**File:** `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_RestDayWorkDispute_frontend.spec.ts`
**npm script:** `test:restdaywork-dispute-ui` (PLAYWRIGHT_SPEC_NAME=RestDayWork-dispute-frontend)

**What is unique to dispute:** Result:2 → long dispute confirm message; POST body includes `request_mode=dispute`; response `content: []` (empty). Controller: DTR check → `call_sp('EV_SP_PD_Autoamtion_RestDay')` (typo in source) → `sendRestDayWorkDisputeEmail`.

**Tests (6):** unauth redirect; post-logout redirect; past Saturday renders normally; Result:2 dispute confirm message verified; cancel no POST; POST 500 no crash.

**Notes:** No separate PHPUnit file — dispute PHPUnit tests already in `evoxtest_RestDayWorkTest.php`. `goToRestDayWorkForm` includes `.fadeInLoader.overlay` wait (per EVOX pitfalls) and 30s login timeout.

---

## 2026-06-12 — evoxtest_RestDayWorkDispute_frontend.test.js (new file — Jest, RDW dispute)

**File:** `.evox-test-frontend/generated/evoxtest_RestDayWorkDispute_frontend.test.js`
**Copy to:** `client/src/__tests__/containers/evoxtest_RestDayWorkDispute_frontend.test.js`

**Tests (10):** Rendering (7): renders without crash; Date/On Duty/Off Duty/Break(Hours)/note labels; 'Enter Note...' placeholder; Supervisor Perspective Timezone absent (dispute looks identical to regular before submit). Lifecycle (2): clearRestDayWorkInstance on mount; fetchRestDayWork NOT called in create mode. Submit guard (1 + TODO): addRestDayWork not called pre-submit.

**API mock:** Result:"2" — confirms component renders identically before submit in the dispute path.

---

## 2026-06-12 — evoxtest_RestDayWork_frontend.test.js (new file — Jest, Rest Day Work component)

**File:** `.evox-test-frontend/generated/evoxtest_RestDayWork_frontend.test.js`
**Copy to:** `client/src/__tests__/containers/evoxtest_RestDayWork_frontend.test.js`

**Target:** `container/Request/RestDayWork/RestDayWork.js`

**Tests (17):** store mode (8): renders without crash; Date/On Duty/Off Duty/Break(Hours)/Note labels; 'Enter Note...' placeholder; timezone headers absent. Approval mode (5): timezone headers visible; employee note as bold read-only text; approver_note textarea; employee_note textarea absent. Lifecycle (3): clearRestDayWorkInstance on mount; fetchRestDayWork skipped in create mode; called with id in edit mode. Submit guard (1 + TODO block).

---

## 2026-06-12 — evoxtest__PH_Employee_ChangeSchedule_frontend.spec.ts (new file — Playwright UI, Change Schedule)

**File:** `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_ChangeSchedule_frontend.spec.ts`
**npm script:** `test:changeschedule-ui` (`PLAYWRIGHT_SPEC_NAME=ChangeSchedule-frontend`)

**Happy-path:** `evoxtest_PH_Employee_ChangeSchedule.spec.ts` (1 passed, 23.0s)

**NSD-bypass pattern:** Night Differential toggle is set ON in `fillMinimalChangeScheduleForm` so that `allow_night_diff=1` bypasses the NSD modal check unconditionally. Without this, default time values trigger `nsdAlertCall=true` and the modal shows instead of `window.confirm()`.

**Tests (7):** cat 5 (2): unauthenticated redirect; post-logout redirect. cat 6 (1): Valid From/Valid To/Holiday Policy/Payroll Policy/Work Days labels visible on load. cat 3 (2): confirm dialog = "Are you sure you want to submit/update this request?"; cancel prevents POST. cat 2 (2): POST 500 no crash; POST 422 form stays on page.

**Notes:** Route has no permission middleware (unlike Overtime/RestDayWork where `permission:*` is commented out — here it was never added). Auth: `jwtauth + auth.apikey`.

---

## 2026-06-12 — evoxtest_ChangeSchedule_frontend.test.js (new file — Jest, Change Schedule component)

**File:** `.evox-test-frontend/generated/evoxtest_ChangeSchedule_frontend.test.js`
**Copy to:** `client/src/__tests__/containers/evoxtest_ChangeSchedule_frontend.test.js`

**Target:** `container/Request/ChangeSchedule/ChangeSchedule.js`

**Tests (15):** store mode (8): renders without crash; Valid From/Valid To/Holiday Policy/Payroll Policy/Work Days/Note labels; 'Enter Note...' placeholder; no Toggle Outlook/Employee's Note in store mode. Approval mode (4): renders without crash; Toggle Outlook button; Employee's Note bold label; approver_note textarea; employee_note textarea absent (shown as bold text). Lifecycle (3): clearChangeScheduleInstance on mount; fetchChangeSchedule skipped without params.id; called with id when params.id defined. Submit guard (1 + TODO block).

**Key mock:** `ScheduleDetails.js` mocked as no-ops — labels "Holiday Policy:", "Payroll Policy:", "Work Days:" are in ChangeSchedule.js as `<label>` elements, not inside child components.

---

## 2026-06-12 — evoxtest__PH_Employee_CertificateOfEmployment_frontend.spec.ts (new file — Playwright UI, COE)

**File:** `.evox-test-status/generated/Employee-PH/evoxtest__PH_Employee_CertificateOfEmployment_frontend.spec.ts`
**npm script:** `test:coe-ui` (`PLAYWRIGHT_SPEC_NAME=COE-frontend`)

**Happy-path:** `evoxtest_PH_Employee_CertificateOfEmployment.spec.ts` (1 passed — `page.waitForEvent('download')`)

**COE uniqueness vs other request forms:**
- No `window.confirm()` — submits directly (`addCOE` dispatches via `API.export`)
- Response is a PDF stream (HTTP 200 `application/pdf`), not JSON 201
- Two native `<select>` elements (no react-select, no date pickers) → `selectOption()` directly
- Conditional "Travel To:" input when `purpose_index` = 6 (Visa Application) or 10 (Personal Travel)
- BHR integration required for the real create → PHPUnit test is `@group bhr-dependent`

**Tests (8):** cat 5 (2): unauthenticated redirect; post-logout redirect. cat 6 (3): labels and note text visible; all 11 COE_PURPOSES options present; Travel To field hidden by default. cat 3 (3): purpose=6 shows Travel To field (and reset hides it); submit without purpose blocks POST (Yup validation); valid form fires POST (mocked PDF response). cat 2 (2): POST 422 no crash; POST 500 no crash.

---

## 2026-06-12 — evoxtest_COE_frontend.test.js (new file — Jest, COE component)

**File:** `.evox-test-frontend/generated/evoxtest_COE_frontend.test.js`
**Copy to:** `client/src/__tests__/containers/evoxtest_COE_frontend.test.js`

**Target:** `container/Request/COE/COE.js`

**Key differences from existing `CertificateOfEmployment.test.js`:**
- Uses `connect: () => (Component) => Component` mock (not real Redux Provider + createStore)
- Passes props directly → no Redux store setup overhead
- Tests conditional render (Travel To field) that the existing test does not cover

**Tests (13):** Render (7): renders without crash; Purpose label; With Salary label; note text visible; purpose select element; show_compensation select element; 11 purpose options from COE_PURPOSES. Conditional (4): Travel To hidden when null; shows for index 6 (Visa Application); shows for index 10 (Personal Travel); hidden for non-travel index. Lifecycle (2): fetchCOE called on mount; addCOE NOT called on mount.

---

## 2026-06-12 — evoxtest_COETest.php (new file — PHPUnit, COE)

**File:** `.evox-test-backend/generated/evoxtest_COETest.php`
**Copy to:** `server/tests/Feature/Api/evoxtest_COETest.php`

**Endpoint:** `POST /api/request/coe` and `GET /api/request/coe/`

**Middleware:** `jwtauth + auth.apikey` — no `permission:*` middleware found on any COE route.
TODO: confirm whether this is intentional (any authenticated user can request COE).

**FormRequest (COERequest.php):** only `purpose_index` is required server-side. `show_compensation` is Yup-only (frontend). Note: `purpose_index=99` (out of range) test is marked TODO — COERequest has no `in_array/between` rule; this may return 200/404 not 422.

**BHR dependency:** `COEController::create()` calls `$this->bhr->get_user_bhr_field($user->bhr_num, ...)`. Happy-path test auto-skips on HTTP 404 (BHR unavailable). Any 5xx is treated as a real code failure (not skipped).

**Contract anchor (create success):** `HTTP 200, Content-Type: application/pdf` — NOT JSON.
**Contract anchor (get all):** `{ message: 'Sucess', content: [{id, user_id, purpose, generated_at}] }` — note "Sucess" typo is in the original controller source.

**Tests (6):** `testCreateReturns401WhenJwtTokenIsMissing`; `testCreateReturns401WhenApiKeyHeaderIsMissing`; `testCreateReturns422WhenPurposeIndexIsMissing`; `testCreateReturns422WhenPurposeIndexIsOutOfRange` (TODO — may not be 422); `testGetAllReturns200WithCoeListShape`; `testCreateReturns200PdfStreamWhenBhrIsAvailable` (`@group bhr-dependent`).

---

## 2026-06-12 — evoxtest_ChangeScheduleTest.php (new file — PHPUnit, Change Schedule)

**File:** `.evox-test-backend/generated/evoxtest_ChangeScheduleTest.php`
**Copy to:** `server/tests/Feature/Api/evoxtest_ChangeScheduleTest.php`

**Endpoint:** `POST /api/request/change_schedule`

**Contract anchor:** 201 `{ message, content: ChangeScheduleResource }` — content: `{ id, user_id, valid_from, valid_to, schedule, status, employee_note, approver_note, user, is_under_supervisee, offset_difference_info, offset_difference }`.

**Tests (9):** auth gate (2): missing JWT → 401; missing X-Authorization → 401. Validation (5): missing valid_from → 422; invalid valid_from format → 422; missing valid_to → 422; valid_to before valid_from → 422; employee_note > 255 chars → 422. Happy path (1, `@group schedule-dependent`): skips with message if repository rejects minimal payload — TODO for full schedule payload (work_days, cst_schedule_details, schedule_policies etc.).

**Finding:** No `permission:*` middleware on any change_schedule route (confirmed from Routes/api.php). Any authenticated user can submit. TODO: confirm whether this is intentional.

---
