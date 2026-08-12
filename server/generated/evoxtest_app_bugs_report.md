# EVOX Backend App Bugs Report

> Cat 4 = backend app crashes with valid input — skip + bug report.
> Cat 3 = frontend code broken, API works — dev team fix.

---

## BUG-061

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Console/Commands/SyncBhrUsersPhoto.php` |
| **Line** | 99 |
| **Command** | `sync:bhr_users_photo` (without `all` argument) |
| **Status** | **Fixed in test environment 2026-07-17** — null guard applied; production fix still pending |
| **Symptom** | `TypeError: Argument 1 passed to BhrRepositoryInterface::get_profile_picture() must be of the type string, null given` |
| **Root Cause** | `CALL EV_Photo_Sync(NULL, NULL, 2)` (mode=2 "list pending users") returns all users including test/dummy users that have no BHR number (`bhr_num IS NULL`). These test users are created by PHPUnit test runs (e.g. `active@company.com`, `force@company.com`, `inactive@company.com`, `grace@company.com`, `nullterm@company.com` — all with `emp_num=0` and `bhr_num=NULL`). Line 99 passes `$bhr_user_number->bhr_num` directly to `get_profile_picture(string $bhr_user_number)` without a null guard, causing a TypeError. |
| **Fix Option 1** | PHP null guard in `SyncBhrUsersPhoto.php` before line 99: `if (!$bhr_user_number->bhr_num) { continue; }` |
| **Fix Option 2** | Add `WHERE bhr_num IS NOT NULL` filter inside the `EV_Photo_Sync` SP (mode=2 branch) so it never returns rows without a BHR number |
| **Recommendation** | Fix Option 2 is preferred — the SP should never return users with no BHR number for photo sync. Fix Option 1 is a fallback if SP is not modifiable. |
| **Affected Tests** | `SchedulerCronCommandsTest::test_sync_bhr_users_photo_runs_successfully_without_all_argument` |
| **Note** | `_with_all_argument` companion test is unaffected — it mocks `get_all_bhr_user_numbers()` to return `[]`, so the loop never executes. |

---

## BUG-062

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (routes not registered) |
| **File** | `app/Modules/Cron/Routes/api.php` |
| **Symptom** | `GET /api/cron/sync_rest_day_work`, `sync_dtr`, `sync_overtime`, `sync_alter_log`, `sync_default_schedule` return 404 — these routes are not registered |
| **Root Cause** | The Cron module routes file only registers: `initial_sync_of_users`, `generate_weekly_dtr`, `sync_realtime_biometrics`, `sync_holidays`, `sync_leaves`, `sync_users` (and date-param variants). Five routes referenced in tests were never implemented. |
| **Likely Fix** | Add the missing route registrations in `Cron/Routes/api.php` and implement corresponding `CronController` methods, or confirm these operations were intentionally removed. |
| **Dev Review Note** | **2026-07-29 — user flagged as potential dead code.** The 5 routes (`sync_rest_day_work`, `sync_dtr`, `sync_overtime`, `sync_alter_log`, `sync_default_schedule`) are not referenced anywhere in the app beyond the cron test file. Dev team to confirm: (a) if these were planned but never implemented, or (b) if they were intentionally removed. If confirmed dead, add all 5 to the dead-code whitelist and mark tests `markTestSkipped('BUG-062: route intentionally removed — confirmed dead code')`. |
| **Affected Tests** | `CronApiTest::test_cron_sync_rest_day_work_without_token_returns_401`, `test_cron_sync_dtr_without_token_returns_401`, `test_cron_sync_overtime_without_token_returns_401`, `test_cron_sync_alter_log_without_token_returns_401`, `test_cron_sync_default_schedule_without_token_returns_401` (Vishnu/CronApiTest.php) |

---

## BUG-063

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (routes not registered) |
| **File** | N/A — no Sync module exists |
| **Symptom** | `POST /api/sync_users`, `POST /api/sync_users_hris`, `POST /api/sync_timeoff_allocation`, `POST /api/sync_timeoff_allocation_new`, `POST /api/sync_timeoff_allocation_fail_sync` all return 404 |
| **Root Cause** | No Sync module is registered in the application. The sync_users/sync_holidays/sync_leaves operations only exist as `GET /api/cron/sync_*` (different prefix, different HTTP method). The test suite was written against an expected POST-based HRIS sync API that was never built or was removed. |
| **Likely Fix** | Either build the Sync module routes (POST /api/sync_*) as originally designed, or update all affected tests to use the existing `GET /api/cron/sync_*` equivalents. |
| **Dev Review Note** | **2026-07-29 update:** `POST /api/sync_users` is a live production API — NOT dead code. SyncController is missing from this branch only. The `sync_users` tests in `SyncApiTest.php` were already corrected to hit `GET /api/cron/sync_users` (which exists). The following routes ARE confirmed dead code: `sync_users_hris`, `sync_timeoff_allocation`, `sync_timeoff_allocation_new`, `sync_timeoff_allocation_fail_sync` — all affected tests in `SyncHrisApiTest.php` already skipped with BUG-082. |
| **Affected Tests** | `Vishnu/SyncApiTest.php` (sync_users — resolved via cron route); `Vishnu/SyncHrisApiTest.php` (all already skipped BUG-082) |

---

## BUG-064

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (module removed) |
| **File** | N/A — `app/Modules/Changelogs/` does not exist |
| **Symptom** | `GET /api/changelogs` and `POST /api/changelogs` return 404 |
| **Root Cause** | No Changelogs module is registered. Routes `/api/changelogs` were expected by the test author but the module was either never implemented or was removed from the codebase. |
| **Likely Fix** | Implement the Changelogs module with controller and routes, or confirm the feature was intentionally removed (add to dead-code list). |
| **Dev Review Note** | **2026-07-29 — confirmed dead code by user.** Module was intentionally removed. Add to dead-code whitelist. All 10 affected tests to be marked `markTestSkipped('BUG-064: Changelogs module removed — confirmed dead code')`. |
| **Affected Tests** | `Vishnu/AdminMiscApiTest.php`: 3 tests; `Vishnu/PublicApiTest.php`: 7 tests |

---

## BUG-065

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (module removed) |
| **File** | N/A — `app/Modules/Careers/` does not exist |
| **Symptom** | `GET /api/careers/` and `POST /api/careers/` return 404 |
| **Root Cause** | The Careers module was removed from the codebase (confirmed by `DashboardVerifiedApiTest` dead-code note). Routes return 404. |
| **Likely Fix** | Dead code — module intentionally removed. Add to dead-code whitelist. |
| **Dev Review Note** | **2026-07-29 — confirmed dead code by user.** All affected tests to be marked `markTestSkipped('BUG-065: Careers module removed — confirmed dead code')`. |
| **Affected Tests** | `Vishnu/PublicApiTest.php`: 3 tests; `Vishnu/AdminMiscApiTest.php`: careers tests (already separately skipped for SAFETY reasons) |

---

## BUG-066

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (route not registered) |
| **File** | `app/Modules/Dtr/Routes/api.php` (missing route) |
| **Symptom** | `GET /api/dtr/insert_time_in_out/{dtr_id}/{time_in}/{time_out}/{is_rest_day}` returns 404 |
| **Root Cause** | This route is not registered in the Dtr module's routes. It was referenced in test files as a "cron-only route to be removed" — it appears to have already been removed (or was never registered). |
| **Likely Fix** | Dead code — route was removed. Mark all dependent tests as skipped. |
| **Affected Tests** | `Api/ComputationDirectTest.php::test_insert_time_in_out_endpoint_exercises_computation`, `CoverageMax/PayrollWebBrokenTest.php::test_insert_time_in_out_without_token_returns_401` |

---

## BUG-067

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (route not registered) |
| **File** | `routes/web.php` (missing route) |
| **Symptom** | `GET /demo-generate-pdf` returns 404 |
| **Root Cause** | The `demo-generate-pdf` web route is not registered in `routes/web.php`. It was referenced in test files as demo/dead code for `PDFController@demoGeneratePDF`. The route has been removed. |
| **Likely Fix** | Dead code — route was removed. Test skipped. |
| **Affected Tests** | `CoverageMax/PayrollWebBrokenTest.php::test_demo_generate_pdf_route_is_registered` |

---

## BUG-068

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Http/Controllers/UserController.php` (or role-assignment handler) |
| **Symptom** | `POST /api/user/{id}/assign_roles_permissions/` with empty payload returns HTTP 500 instead of 422 |
| **Root Cause** | Controller attempts to access a required field (role/permission) from the request payload without null-guarding; PHP crashes before Laravel validation can return 422. |
| **Likely Fix** | Add server-side validation (required rule) before accessing payload fields in the assign_roles_permissions handler. |
| **Affected Tests** | `Vishnu/AdminUsersApiTest.php::test_post_assign_roles_permissions_empty_payload_returns_200_or_422` |

---

## BUG-069

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (route not registered / controller crash) |
| **File** | Routes file for department assign_handlers endpoint |
| **Symptom** | `POST /api/department/assign_handlers/{id}` returns 404 (route not registered) on some environments, and 500 (controller crash) on others |
| **Root Cause** | The department assign_handlers route is either not registered in the application route files, or the corresponding controller crashes with valid input. |
| **Likely Fix** | Register the route in the appropriate module routes file and implement null guards in the controller. |
| **Affected Tests** | `Vishnu/AdminUsersApiTest.php::test_post_department_assign_handlers_empty_payload_returns_200`, `test_post_department_assign_handlers_null_id_does_not_500` |

---

## BUG-070

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Http/Controllers/TeamController.php` (or equivalent Team module controller) |
| **Symptom** | `POST /api/team/` with empty payload or missing `team_users` returns HTTP 500 instead of 422; `POST /api/team/{id}` (_method=PUT) with empty payload also returns 500 |
| **Root Cause** | TeamController::store() and update() do not validate input before attempting to use it; crashes before returning a validation error response. |
| **Likely Fix** | Add server-side validation rules (required, array) for `team_users` and other required fields before processing. |
| **Affected Tests** | `Vishnu/EmployeeTeamApiTest.php::test_team_store_empty_payload_returns_422`, `test_team_store_missing_team_users_returns_422`, `test_team_update_empty_payload_returns_422` |

---

## BUG-071

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Request/Http/Controllers/OvertimeController.php` — `approve()` method |
| **Symptom** | `PUT /api/request/overtime/approve/{id}` with valid payload and existing record returns HTTP 500 |
| **Root Cause** | OvertimeController::approve() crashes on existing records — likely a null guard missing in the dispute/normal branch logic where `request_validity_checker()` returns a value that sends execution into an unguarded code path. |
| **Likely Fix** | Add null guards and defensive checks around the result of `request_validity_checker()` before branching into the dispute or normal approval path. |
| **Affected Tests** | `Vishnu/DisputeBranchApiTest.php::test_overtime_approve_with_existing_record_does_not_return_500` |

---

## BUG-072

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Http/Controllers/NhoSurveyController.php` — `store()` method |
| **Symptom** | `POST /api/nho_survey` with empty payload returns HTTP 500 instead of a validation error |
| **Root Cause** | NhoSurveyController::store() does not validate required fields before attempting to insert; MySQL throws a constraint error (null values for NOT NULL columns) which is not caught, causing a 500. |
| **Likely Fix** | Add server-side validation rules (required) for all NOT NULL survey fields before the DB insert, and/or wrap the insert in a try-catch that returns a 422 response on constraint failure. |
| **Affected Tests** | `Vishnu/MiscRootControllersApiTest.php::test_nho_post_survey_empty_payload_does_not_500` |

---

## BUG-073

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (missing server-side validation) |
| **File** | `app/Modules/Department/Http/Controllers/AnnouncementController.php` — `store()` method |
| **Symptom** | `POST /api/department/announcements/create` with title > 100 chars returns HTTP 200 (no rejection); same endpoint with an invalid URL in the `link` field also returns HTTP 200 |
| **Root Cause** | AnnouncementController::store() has no server-side validation rules for title max-length (documented as 100 chars) or link URL format. Frontend Yup validation is the only guard, which is bypassable via API. |
| **Likely Fix** | Add a Laravel FormRequest or inline `$request->validate([])` with `'title' => 'max:100'` and `'link' => 'nullable\|url'` rules. |
| **Affected Tests** | `AnnouncementCreateVerifiedApiTest.php::test_store_announcement_title_exceeding_100_chars_returns_validation_error`, `test_store_announcement_with_invalid_link_url_returns_validation_error` |

---

## BUG-074 ✅ RESOLVED — NOT A BUG (Decommissioned 2026-07-18)

| Field | Value |
|---|---|
| **Category** | Decommissioned — intentional removal, not a backend bug |
| **File** | `app/Console/Commands/syncEvoxChangeSchedule.php` |
| **Status** | **CLOSED** — file confirmed deleted; console Kernel `$commands` array is empty. Command was intentionally removed from the codebase. |
| **Resolution** | Test skip message updated to "DECOMMISSIONED" (not BUG). No app fix needed. If the server crontab still references `sync_evox_changes_chedule`, that crontab entry should be removed by the sysadmin. |
| **Affected Tests** | `SchedulerFrequencyTest.php::test_known_signature_typo_sync_evox_changes_chedule_is_preserved` — skip retained as documentation |

---

## BUG-075

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (missing self-approval gate) |
| **Files** | `app/Modules/Request/Http/Controllers/AlterLogController.php`, `OvertimeController.php`, `RestDayWorkController.php` (and/or their repository counterparts) |
| **Symptom** | When an employee calls the approve endpoint on their own pending request, the request status is set to `"approved"` — self-approval succeeds. The correct business rule is that self-approval must be rejected (403) or treated as a silent no-op leaving status unchanged. |
| **Root Cause** | The `permission:approval_of_request` middleware is commented out on the approve routes. Additionally, the repository-level `is_under_supervisee()` guard (OvertimeRepository) silently skips approval when the approver is not a supervisee, but returns success regardless — meaning self-approval may succeed depending on how the relationship query evaluates the same user against itself. The alter_log and rest_day_work approval paths appear to have no such guard at all. |
| **Likely Fix** | Re-enable `permission:approval_of_request` middleware on approve routes, or add an explicit check in each approve() controller method: `if ($request->user_id === auth()->id()) { return error_response(..., 403); }` |
| **Affected Tests** | `Negative/AlterLogNegativeTest.php::self_approval_is_not_gated_and_is_a_silent_noop`, `Negative/OvertimeApprovalNegativeTest.php::self_approval_returns_false_success_status_stays_pending`, `Negative/RestDayWorkNegativeTest.php::self_approval_is_not_gated_and_is_a_silent_noop` |

---

## BUG-076 ✅ FALSE POSITIVE — REMOVED (2026-07-18)

| Field | Value |
|---|---|
| **Category** | FALSE POSITIVE — route was already registered |
| **Status** | **CLOSED** — `GET /api/report/dtr_logs/team` IS registered at `app/Modules/Report/Routes/api.php:74` as `ReportController@team_dtr_logs`. The original 404 was caused by the test calling the route without required parameters (valid_from, valid_to, department_id, is_active), not a missing route. |
| **Resolution** | All 4 affected tests updated: `Api/ReportExtendedApiTest.php` tests now call the route with correct params (valid_from, valid_to, department_id=403, is_active=1) acting as Gary Aure. `Vishnu/ReportsApiTest.php` Pattern B tests reverted to `assertStatus(401)` + `token_absent` error code check. |
| **Affected Tests** | All previously affected tests are now fixed — no skips remain for this item. |

---

## BUG-078

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (PDO cursor resource leak) |
| **File** | `app/Helpers/pdo_helper.php` — `call_sp()` function |
| **Command** | `sync_bhr_users:send all` (trigger), but any sequential test calling `call_sp()` on the same PDO connection is affected |
| **Symptom** | `SchedulerCronCommandsTest::test_sync_bhr_users_send_runs_successfully_with_all_argument` hangs indefinitely when preceded by tests 1–4 in the same file. Passes in 2.78s in isolation. Originally misdiagnosed as Xdebug overhead (2026-07-20); confirmed to hang with `xdebug.mode=off` in sequential mode too. |
| **Root Cause** | `call_sp()` in `pdo_helper.php` opens a PDO statement with `PDO::CURSOR_SCROLL` but never calls `$stmt->closeCursor()` after the `nextRowset()` drain loop. The open cursor leaves stale MySQL wire-state on the shared PDO connection. When the next test in the same file calls `call_sp()` on the same connection, its `execute()` blocks indefinitely waiting for the prior cursor to be released. This happens regardless of Xdebug — confirmed to hang with `xdebug.mode=off` too. |
| **Fix** | Add `$stmt->closeCursor();` in `call_sp()` in `app/Helpers/pdo_helper.php` after the `while ($stmt->nextRowset())` loop. One-line app code change — **requires explicit authorisation**. |
| **Mitigation** | Entire file excluded from `generated/evoxtest_phpunit.xml` via `<exclude>` tag. Each test passes when run individually with `--filter`. |
| **Verify command** | `php -d xdebug.mode=off vendor/bin/phpunit --filter test_sync_bhr_users_send_runs_successfully_with_all_argument tests/Feature/Vishnu/SchedulerCronCommandsTest.php` → **OK (1 test, 1 assertion) in 2.78s** |
| **Affected Tests** | All tests in `Vishnu/SchedulerCronCommandsTest.php` when run as a full file (sequential) |
| **Status** | File excluded from `evoxtest_phpunit.xml` — 2026-07-20. App code fix (`$stmt->closeCursor()`) pending authorisation. |

---

## BUG-079 — RECLASSIFIED: Cat 5 (Test Case Error) — RESOLVED 2026-07-28

| Field | Value |
|---|---|
| **Category** | ~~Cat 4~~ → **Cat 5 — Test Case Error** |
| **File** | `tests/Feature/Api/Auth/MobileLoginApiTest.php` lines 15–16 |
| **Symptom** | `POST /api/auth/login-mobile` returned HTTP 500 for the 'active.user' fixture. |
| **Root Cause** | `'active.user'` is a minimal fixture user with null `country_id`, `SubDepartmentID`, and `bhr_num`. `AuthController::get_default_payload()` calls `new UserProfileResource(auth()->user())` which at line 70–74 accesses `$this->country_zone()->country_name` — `country_zone()` returns null for a user with no `country_id`, causing a PHP Error → 500. The app code is not broken for production (all real users have `country_id` set); the test was using an invalid fixture user, violating CLAUDE.md's "No fake users" rule. |
| **Fix Applied** | Credentials changed from `'active.user'` / `'CorrectPassword123'` to `'glenn.macasarte@eastvantage.com'` / `'{ev2010}'` (Glenn Macasarte — real user, full profile, Philippines). |
| **Affected Tests** | `tests/Feature/Api/Auth/MobileLoginApiTest.php::test_mobile_001_successful_mobile_login` |
| **Status** | **FIXED** — test file updated 2026-07-28. No app code change required. |

---

## BUG-080 — RECLASSIFIED: Cat 5 (Test Case Error) — RESOLVED 2026-07-28

| Field | Value |
|---|---|
| **Category** | ~~Cat 4~~ → **Cat 5 — Test Case Error** |
| **File** | `tests/Feature/happy-path/AlterLogHappyPathTest.php` — `supervisor_can_approve_the_pending_alter_log()` |
| **Symptom** | `assertDatabaseHas(['status' => 'approved'])` failed after approve call returned 201. |
| **Root Cause** | Test used `now()->subDays(21)` as the alter log date. 21 days ago falls in the **previous closed payroll period**. `request_validity_checker()` calls SP `EV_SP_Validate_Request_Payroll_Period` which returns `2` for closed periods. `AlterLogController::approve()` hits the dispute branch — sets the original alter_log status to `'declined'` (not `'approved'`) and creates a new dispute record. The test then asserted status was `'approved'` when the app had correctly set it to `'declined'`. No app code bug — the test date was wrong. |
| **Fix Applied** | `subDays(21)` → `subDays(5)`. Five days ago is within the current open payroll cutoff; SP returns 0 or 1; normal approve branch runs; status is saved as `'approved'`. |
| **Status** | **FIXED** — test updated 2026-07-28. Previous Cat 4 diagnosis was incorrect. |

---

## BUG-081 — RESOLVED 2026-07-28 (Option B — test file change)

| Field | Value |
|---|---|
| **Category** | ~~Cat 4~~ → **Cat 5 — Test Case Error / Missing Mock Setup** |
| **File** | `tests/Feature/FeatureRoot/CertificateOfEmploymentTest.php` + `tests/Feature/Api/evoxtest_BhrMock.php` |
| **Symptom** | `POST /api/request/coe` returned 400 (caught exception in `COEController::create()`) |
| **Root Cause** | `COEController::create()` calls `$this->bhr->get_user_bhr_field()`, which returned `null` in `evoxtest_BhrMock`. `COEController` checks `if (!$employee)` and calls `error_response("Employee could not be found.", [], 404)` — but the test had no CLAUDE.md-compliant BHR binding in `setUp()`, meaning per-test `$this->mock()` calls were competing with (or not reliably overriding) any prior IoC bindings. |
| **Fix Applied** | (1) `evoxtest_BhrMock::get_user_bhr_field()` now returns `(object)['id' => $bhr_user_number]` (non-null) instead of null. (2) `CertificateOfEmploymentTest` gained a `setUp()` that binds `evoxtest_BhrMock` per CLAUDE.md standing rule — every endpoint backed by `BhrRepositoryInterface` must use the IoC bind pattern. (3) Removed redundant per-test `$this->mock(BhrRepositoryInterface::class, ...)` blocks; COE repository is still mocked per-test via `$this->mock(COERepositoryInterface::class, ...)`. |
| **Affected Tests** | `tests/Feature/FeatureRoot/CertificateOfEmploymentTest.php::test_user_can_create_coe_request`, `test_coe_download_endpoint_returns_pdf` |
| **Status** | **FIXED** — test file updated 2026-07-28. No app code change required. |
| **2026-07-29 addendum** | After the BHR null-check was resolved, the next failure was DomPDF font cache missing (`storage/fonts/roboto_300_*.ufm`). `fopen()` throws → `catch(Exception $e)` in `COEController` → `error_response()` → HTTP 400. Fix: `\PDF` facade mocked in both endpoint tests via `shouldReceive('loadView'/'setPaper'/'stream')`. Response now returns a synthetic `%PDF-1.4 fake` body with `Content-Type: application/pdf`; all three assertions (`assertStatus(200)`, `assertHeader(…)`, `assertStringStartsWith('%PDF',…)`) pass. |

---

## BUG-077

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (missing null guard) |
| **File** | `app/Http/Controllers/UserController.php` — `sub_department_under_department()` method |
| **Symptom** | `GET /api/user/999999/sub_department/1` returns HTTP 500 when user ID 999999 does not exist |
| **Root Cause** | `UserController::sub_department_under_department()` calls `User::find($id)` without null-guarding the result. When `find()` returns null for a non-existent ID, the subsequent call to `->evox_sub_departments_handled($department_id)` on null causes a PHP Error / 500. |
| **Likely Fix** | Add a null guard: `if (!$user = User::find($id)) { return error_response(..., 404); }` before calling `evox_sub_departments_handled()`. |
| **Affected Tests** | `Vishnu/UserExtendedApiTest.php::test_sub_department_under_department_nonexistent_user_returns_not_500` |

---

## BUG-082

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (routes and controller never implemented in this branch) |
| **File** | No controller file found — `SyncController.php` does not exist under `server/app/` |
| **Symptom** | All POST requests to `/api/sync_users_hris`, `/api/sync_timeoff_allocation`, `/api/sync_timeoff_allocation_new`, `/api/sync_timeoff_allocation_fail_sync` return 404 — no matching route in any module's `api.php` |
| **Root Cause** | `SyncController.php` was never implemented (or was removed) in the current branch. The routes documented in `SyncHrisApiTest.php` do not exist. The only related sync routes in the codebase are GET routes under `/api/cron/` prefix handled by `CronController`. |
| **Likely Fix** | Implement `SyncController` with the four HRIS-facing sync methods (`syncusers_HRIS`, `timeoff_allocation_HRIS`, `timeoff_allocation_HRIS_New`, `timeoff_allocation_HRIS_fail_sync`) and register the POST routes in the appropriate module's `api.php`. |
| **Affected Tests** | `Vishnu/SyncApiTest.php` (4 skipped tests — BUG-082 marker), `Vishnu/SyncHrisApiTest.php` (all 14 tests) |

---

## BUG-083

| Field | Value |
|---|---|
| **Category** | Dead Code — To Be Removed |
| **File** | `app/Http/Controllers/DashboardController.php` — `get_today_leave_list()` |
| **Route** | `GET /api/Gettodayleaves` (registered `routes/api.php:21`) |
| **Symptom** | Returns HTTP 400 — `EH_SP_Dashboard` called with 5 args but SP requires 7; SP fails, exception caught, `error_response()` returned. |
| **Root Cause** | **Endpoint is dead code.** The Redux action `get_today_leaves` in `client/src/store/actions/filters/requestListActions.js:163` points to this route, but the dispatch call in `client/src/components/Summary/SummaryDashbord.js:58` is **commented out**. Today's leaves are served by `GET /api/get_dashboard_all/1` (which correctly passes all 7 SP args). This endpoint has no active callers. |
| **Recommended Action** | Remove `Route::get('Gettodayleaves', ...)` from `routes/api.php`, remove `get_today_leave_list()` from `DashboardController.php`, and remove the commented-out dispatch and `get_today_leaves` action from the frontend. |
| **Affected Tests** | `Vishnu/MiscRootControllersApiTest.php::test_booking_get_today_leaves_returns_data_key_not_500` (guarded with `markTestIncomplete`) |

---

## BUG-084

| Field | Value |
|---|---|
| **Category** | Dead Code — To Be Removed |
| **File** | `app/Http/Controllers/DashboardController.php` — `get_tommorow_leave_list()` |
| **Route** | `GET /api/Gettommorowleaves` (registered `routes/api.php:22`) |
| **Symptom** | Returns HTTP 500 — `auth()->user()` returns null under JWT auth (web guard vs api guard mismatch); `null->users_handled()` throws `\Error` which escapes `catch(Exception $e)`. |
| **Root Cause** | **Endpoint is dead code.** No frontend component calls `GET /api/Gettommorowleaves`. Tomorrow's leaves are served by `GET /api/get_dashboard_all/1`. The endpoint has no active callers and was never updated when the SP signature was extended to 7 args. |
| **Recommended Action** | Remove `Route::get('Gettommorowleaves', ...)` from `routes/api.php` and remove `get_tommorow_leave_list()` from `DashboardController.php`. |
| **Affected Tests** | `Vishnu/MiscRootControllersApiTest.php::test_booking_get_tomorrow_leaves_returns_data_key_not_500`, `test_booking_get_tomorrow_leaves_data_is_array` (both guarded with `markTestIncomplete`) |

---

## BUG-085

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Hr/Http/Controllers/HrController.php` — `announcements()` |
| **Symptom** | `GET /api/hr/announcements/all` returns HTTP 400 (after the 2026-07-30 fix); previously returned 500 |
| **Root Cause** | `App\Modules\Changelogs\Models\ChangeLogs` class does not exist in the codebase (module was removed). When `announcements()` accesses this class, PHP throws `\Error` (class not found). The 2026-07-30 fix added a `catch(\Throwable $e)` wrapper, converting the 500 → 400. But the underlying class is still missing — the feature is non-functional. |
| **Likely Fix** | Either re-implement the `Changelogs` module with the `ChangeLogs` model class, or remove the `announcements()` method and its route if the feature has been intentionally decommissioned. |
| **Affected Tests** | `Vishnu/HrAnnouncementsApiTest.php::test_hr_announcements_all_returns_200_and_success_envelope`, `Vishnu/MiscProtectedApiTest.php::test_hr_announcements_all_returns_200_and_success_envelope` |

---

## BUG-086

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Department/Repositories/AnnouncementRepository.php` — `store()` |
| **Symptom** | `POST /api/department/announcements/create` with a valid `set_all=1` payload returns HTTP 400 |
| **Root Cause** | `AnnouncementRepository::store()` throws an Exception that is caught by `AnnouncementController::store()` and returned as `error_response()`. The exact DB failure has not been identified — likely a FK constraint violation (e.g., `dep_id` referencing a non-existent row in the legacy `departments` table) or a missing NOT NULL column value. |
| **Likely Fix** | Add detailed exception logging in `AnnouncementRepository::store()` to capture the specific DB error message, then address the constraint (null guard, valid FK value, or missing column). |
| **Affected Tests** | `AnnouncementCreateVerifiedApiTest.php::test_store_announcement_with_valid_payload_returns_success`, `Vishnu/DeptAnnouncementsApiTest.php::test_create_with_valid_set_all_payload_returns_200` |

---

## BUG-087

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Helpers/user_helper.php` — `get_authenticated_user()` — line 33 |
| **Triggered from** | `app/Modules/Request/Repositories/AlterLogPunchRepository.php:149` → `destroy($id)` |
| **Symptom** | `Call to a member function findOrFail() on array` |
| **Root Cause** | `get_authenticated_user()` line 33: `auth()->user()->users_handled(null, null, $user->is_active)->findOrFail($user_id)`. When `users_handled()` is called with these null arguments it returns a PHP array (or evaluated collection) instead of an Eloquent query builder. Calling `->findOrFail()` on a PHP array produces a fatal TypeError. |
| **Likely Fix** | Investigate what `users_handled(null, null, bool)` returns for the authenticated user in context. If it returns a Collection, change to `->find($user_id)` or `->filter(fn($u) => $u->id == $user_id)->first() ?? throw new ModelNotFoundException()`. If it should return a query builder, fix the `users_handled()` method to not call `->get()` early when given null pagination arguments. |
| **Affected Tests** | `BranchTests/Unit/Repositories/AlterLogPunchRepositoryLiveTest.php::destroy_as_owner_soft_deletes_and_returns_true` (marked BUG-087) |

---

## BUG-088

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Department/Repositories/AnnouncementRepository.php` — `store()` — line 133 |
| **Status** | **Fixed 2026-08-03** — user changed `$main_dep_id = 0` → `$main_dep_id = null` |
| **Symptom** | `SQLSTATE[23000]: Integrity constraint violation: 1452 Cannot add or update a child row: a foreign key constraint fails (evox-app.announcements, CONSTRAINT announcements_dep_id_foreign FOREIGN KEY (dep_id) REFERENCES departments (id) ON DELETE SET NULL ON UPDATE CASCADE)` |
| **Root Cause** | Line 133 initialised `$main_dep_id = 0`. When the authenticated user has `SubDepartmentID = null`, `is_valid()` returns false and the fallback `direct_department_id()` call is skipped, leaving `dep_id = 0`. No row in `departments` has `id = 0`. The FK constraint `ON DELETE SET NULL` confirms that `NULL` is the valid sentinel for "no department" — not `0`. |
| **Fix Applied** | `$main_dep_id = 0;` → `$main_dep_id = null;` at line 133. The column is declared `nullable()` so `null` satisfies the FK. |
| **Note** | BUG-086 describes the same root cause from the controller-level API tests. A deeper schema fix (changing FK to reference `EVOX_DEPARTMENT` instead of `departments`) is optional — deferred. |
| **Affected Tests** | `BranchTests/Unit/Repositories/AnnouncementRepositoryLiveTest.php` — 7 tests (marked BUG-088): `store_set_all_creates_single_root_announcement`, `store_selected_departments_creates_child_rows`, `store_set_exclude_inverts_department_selection`, `show_returns_row_and_show_strict_passes_for_global_announcement`, `update_rewrites_fields_replaces_children_and_clears_thumbnail`, `update_status_flips_status_and_wraps_in_success_response`, `destroy_removes_root_and_force_deletes_children` |

---

## FINDING-ANN-DEAD-1 — Dead Code in AnnouncementStrictResource (2026-08-10)

| Field | Value |
|---|---|
| **Category** | Dead Code — unreachable branch in application resource |
| **File** | `app/Modules/Department/Resources/AnnouncementStrictResource.php` |
| **Line** | 30 |
| **Status** | Open — no fix required in tests (test marked BY-DESIGN skip) |
| **Finding** | `AnnouncementStrictResource::toArray()` has the guard `if ($this->created_by != 0)`. The else-arm (`$owner = []`) is dead code: `created_by` is **always** a real `users.id` in production. Every announcement is created by an authenticated user — `created_by=0` cannot occur via any normal app flow. Confirmed by business rule 2026-08-10. |
| **Impact on Tests** | `AnnouncementStrictResourceTest::test_system_announcement_without_creator_has_empty_owner_block` was testing this dead arm. It has been marked `markTestSkipped('BY-DESIGN: created_by=0 impossible in production')`. |
| **Recommendation** | The `if ($this->created_by != 0)` guard in `AnnouncementStrictResource.php:30` can be simplified — always populate the `$owner` block and remove the condition. The guard is defensive code left over from an earlier design. This is a low-priority cleanup. |
| **Affected Tests** | `AnnouncementStrictResourceTest::test_system_announcement_without_creator_has_empty_owner_block` — marked `markTestSkipped` BY-DESIGN |

---

## Dead Code / To Be Removed (2026-07-30)

Routes and controller methods confirmed unused by any active frontend caller. Tests are guarded with `markTestIncomplete`. Recommend removal in the next cleanup sprint.

| Bug | Route | Controller Method | Evidence | Action |
|---|---|---|---|---|
| BUG-083 | `GET /api/Gettodayleaves` | `DashboardController::get_today_leave_list()` | `get_today_leaves` dispatch commented out in `SummaryDashbord.js:58`; data served by `get_dashboard_all/1` | Remove route (`routes/api.php:21`), remove method, remove frontend action |
| BUG-084 | `GET /api/Gettommorowleaves` | `DashboardController::get_tommorow_leave_list()` | No frontend component calls this route; data served by `get_dashboard_all/1` | Remove route (`routes/api.php:22`), remove method |
| BUG-064 | `GET /api/changelogs` | `ChangeLogsController` (missing) | Module removed — no controller, no model, no routes | Routes already absent; remove any remaining references |
| BUG-065 | `GET /api/careers/`, `POST /api/careers/` | `CareersController` (missing) | Module removed — no controller, no routes | Routes already absent; remove any remaining references |
| BUG-082 | `POST /api/sync_*` (4 routes) | `SyncController` (never implemented) | No `SyncController.php` in codebase; all 4 routes return 404 | Implement or formally remove from roadmap |


---

## BUG-089

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Schedule/Http/Requests/ScheduleRequest.php` |
| **Line** | 42 |
| **Status** | **RESOLVED 2026-08-11** — user changed `'bool\|in:...'` → `'bool:...'` (pipe to colon). `bool:params` is parsed by Laravel as the `bool` rule with ignored parameters, removing the contradictory `in:` constraint. |
| **Symptom** | `POST /api/request/change_schedule` always returned 422 UNPROCESSABLE ENTITY — change schedule store never reached the controller body. |
| **Root Cause** | `ScheduleRequest::rules()` line 42 had: `'schedule_policies.*' => 'bool\|in:'.implode(',', ...)`. This validated each policy VALUE against the list of policy NAME strings (e.g. `allow_undertime,allow_late,...`). Two constraints were contradictory: a boolean value (`false`/`true`/`0`/`1`) fails the `in:` rule; a policy name string fails `bool`. No value could satisfy both. `StoreScheduleRequest` (which inherits `ScheduleRequest`) was auto-validated as a side effect of being type-hinted in `ChangeScheduleRequest::rules(StoreScheduleRequest $request)`, so this 422 fired before the controller body ran. |
| **Fix Applied** | `'bool\|in:...'` → `'bool:...'` at line 42. Laravel parses `bool:params` as the `bool` rule with parameters, which `bool` ignores. The effective rule is now just `bool`, identical to the per-key rules on lines 43–47. |
| **Affected Tests** | `ChangeScheduleHappyPathTest::valid_change_schedule_submit_creates_a_pending_row_and_queues_the_notification`, `ChangeScheduleHappyPathTest::supervisor_can_approve_the_pending_change_schedule` — both now implemented (skips removed 2026-08-11). |

---

## BUG-090

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (Phase A oversight) |
| **Files** | `app/Modules/User/Repositories/UserRepository.php` lines 80–87, 189–196 |
| **Status** | **RESOLVED 2026-08-12** — dead blocks deleted from UserRepository.php (register_user + insert_bhr_user_to_evox); dead imports removed from UserRepository.php and CronController.php. Tests remain skipped pending re-enable decision. |
| **Symptom** | `register_user()` and `insert_bhr_user_to_evox()` have dangling Spatie permission-sync blocks that reference undefined variables (`$role` / `$employee_role`) and Spatie methods removed from User model (`hasDirectPermission`, `givePermissionTo`, `revokePermissionTo`). Any code path that (a) registers a new user with valid roles, or (b) inserts a new BHR user, crashes with "Undefined variable" / "Call to undefined method". |
| **Root Cause** | Phase A removed `$role = Role::findByName($role_name)` and `$employee_role = Role::findByName(...)` assignments plus the `HasPermissions` trait from `User.php`, but left the inner `foreach` loops and Spatie method calls that depend on them. |
| **Fix Required** | In `UserRepository.php`: delete lines 72–88 (entire `foreach($request->roles)` block in `register_user()`) and lines 184–196 (entire permission-sync block in `insert_bhr_user_to_evox()`). Also remove the dead `use Spatie\Permission\Models\Role;` import at line 14. Same dead import at `app/Modules/Cron/Http/Controllers/CronController.php:11`. |
| **Affected Tests** | `UserRepositoryBhrSyncSpFakeTest::test_new_bhr_user_is_inserted_with_employee_role_and_country`, `UserRepositoryBhrSyncSpFakeTest::test_two_char_employee_number_is_zero_padded` — both marked `markTestSkipped('BUG-PhaseA-1: ...')` |
| **Note** | Validation tests (`RegisterUserValidationRejectionTest`, `RegisterUserBusinessRuleRejectionTest`) are unaffected — they send invalid payloads that 422 before `register_user()` is reached. |
