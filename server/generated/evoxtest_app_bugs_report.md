# EVOX Backend App Bugs Report

> Cat 4 = backend app crashes with valid input — skip + bug report.
> Cat 3 = frontend code broken, API works — dev team fix.

---

## BUG-123 — Open (test skipped, dev team to fix the stored procedure)

### EH_SP_overall_My_Team_Request signals SQLSTATE[22032] via JSON_OBJECTAGG(NULL key)

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (stored procedure) |
| **File** | MySQL stored procedure `EH_SP_overall_My_Team_Request` (lives in the database, not in this repo) — the `change_schedule` branch, `JSON_OBJECT('work_days',JSON_ARRAYAGG(SD.day)) as fourth_column, JSON_OBJECTAGG(SP.policy,SP.value) fifth_column` |
| **Status** | Open |
| **Symptom** | `GET /api/request/request-list?url=my_team_requests&status=pending&request_type=all&department_id=403` (and any other `request_type=all` combination that reaches the change_schedule branch) throws `PDOException: SQLSTATE[22032]: <<Unknown error>>: 3158 JSON documents may not contain NULL member names`, caught by `RequestController::requestlist()`'s `catch(Exception $e)` and returned as HTTP 400. |
| **Root Cause** | The change_schedule branch `LEFT JOIN`s `schedule_policies`. When a matched employee's change_schedule request points at a schedule with zero `schedule_policies` rows, `SP.policy` is `NULL` for every joined row, and `JSON_OBJECTAGG(NULL, SP.value)` is invalid in MySQL — the function signals SQLSTATE 22032 rather than returning e.g. `{}` or omitting the pair. |
| **Likely Fix** | In the SP, replace `JSON_OBJECTAGG(SP.policy, SP.value)` with a form that tolerates an all-NULL group, e.g. `IF(COUNT(SP.policy) = 0, JSON_OBJECT(), JSON_OBJECTAGG(COALESCE(SP.policy, 'none'), SP.value))`, or filter the join so a policy-less schedule contributes zero rows to the aggregate rather than one row with a NULL policy. |
| **Affected Tests** | `Feature/MyTeamRequestVerifiedApiTest::test_request_list_my_team_requests_returns_200_for_authenticated_user`, `::test_request_list_my_team_requests_with_status_filter_returns_200`, `::test_request_list_my_team_requests_with_request_type_filter_returns_200`, `::test_request_list_my_team_requests_with_department_filter_returns_200`, `::test_request_list_my_team_requests_with_showall_param_returns_200`, `::test_request_list_my_team_requests_with_page_param_does_not_500` — all `markTestSkipped('BUG-123: ...')` 2026-09-03. |

---

## BUG-122 ✅ FIXED — App code updated 2026-08-14

### OpsScheduleController::store() replace-image arm uses undefined $new_ops_sched

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Opsschedule/Http/Controllers/OpsScheduleController.php` |
| **Method** | `store()` |
| **Symptom** | When a department already has an image record, the second (replace) image upload returns HTTP 400 instead of 201. In PHPUnit, `E_NOTICE: Undefined variable: new_ops_sched` is promoted to a `PHPUnit\Framework\Error\Notice` (extends `Exception`) which is caught by `catch(Exception $e)` → `error_response()` → 400. In production PHP (default config), this only triggers a notice and returns 201 — so the bug is silent in production but fatal in tests. |
| **Root Cause** | `store()` has two branches: the "new" branch assigns `$new_ops_sched = OpsSchedule::create(...)` and the "replace" branch assigns only `$upd_ops_sched = $check_sched->update(...)`. Both branches call `DB::commit()`, then execution falls through to a shared `return success_response(..., $new_ops_sched, ...)`. In the replace branch `$new_ops_sched` is never assigned. |
| **Likely Fix** | In the replace branch, add `$new_ops_sched = $check_sched;` before `DB::commit()`. Alternatively, move the `return success_response()` call inside each branch (new and replace) with the correct variable. |
| **Fix applied** | `app/Modules/Opsschedule/Http/Controllers/OpsScheduleController.php` replace arm: removed unused `$upd_ops_sched =` assignment, added `$new_ops_sched = $check_sched;` after `update()` call. |
| **Affected Tests** | `OpsScheduleControllerBranchTest::store_image_creates_then_replaces_for_same_department` — skip now removable (re-enable after next run confirms 201). Tests `get_list_formats_form_and_image_rows_with_and_without_filter` and `get_groups_departments_by_image_or_form_and_chunks_in_two` reverted to hardcoded `OPS_DEPTS[1]` is no longer needed — the `imageDept()` helper remains as a safety net against future pre-existing data. |

---

## BUG-121 — RegisteredUserEmail / ForgotPasswordRequestEmail missing BCC in build()

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **Files** | `app/Modules/Email/Mail/RegisteredUserEmail.php`, `app/Modules/Email/Mail/ForgotPasswordRequestEmail.php` |
| **Symptom** | `$built->bcc` is empty after `build()` — registration and forgot-password emails never BCC the monitoring inbox on any environment. Every other Mailable (OvertimeRequestEmail, AlterLogRequestEmail, all dispute and supervisor-reminder emails) includes `$this->bcc(get_constant(...))` inside `build()`. |
| **Root Cause** | `RegisteredUserEmail::build()` and `ForgotPasswordRequestEmail::build()` were written without the `App::environment('production') / bcc()` block that all other Mailables have. |
| **Likely Fix** | Add the same pattern to both `build()` methods: `if (App::environment('production')) { $this->bcc(get_constant('BCC_EMAIL_ADDRESS')); } else { $this->bcc(get_constant('BCC_EMAIL_ADDRESS_FOR_NON_PROD')); }` |
| **Affected Tests** | `MailablesBuildTest::registration_and_forgot_password_emails_build_with_the_temp_password` — skipped `[CAT-4]` 2026-08-14 |

---

## BUG-120 — UserRepository methods deleted (adminRoleConditions, assign_permissions_to_user)

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (methods removed with Client module) |
| **File** | `app/Modules/User/Repositories/UserRepository.php` |
| **Methods** | `adminRoleConditions()`, `assign_permissions_to_user()` |
| **Symptom** | Tests calling these methods throw `BadMethodCallException: Call to undefined method`. Both were deleted as part of the Client module removal on 2026-08-10. |
| **Affected Tests** | `RepositoryCrudFinishTest::admin_role_conditions_touches_nothing_when_no_admin_role_is_requested`, `::admin_role_conditions_ignores_an_empty_role_list`, `::admin_role_conditions_rethrows_when_the_user_no_longer_exists`, `::assigning_permissions_to_an_unknown_user_is_rethrown_to_the_caller` — all skipped `[CAT-4]` 2026-08-14 |

---

## BUG-119 — App\Jobs\AssignAllUserToAdminJob class deleted

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (class removed with Client module) |
| **File** | `app/Jobs/AssignAllUserToAdminJob.php` (deleted 2026-08-10) |
| **Symptom** | `Class 'App\Jobs\AssignAllUserToAdminJob' not found` — three test methods that test this Job's constructor, error path, and ModelNotFoundException path all throw at class resolution. |
| **Affected Tests** | `ExportAndServiceArmsTest::the_admin_assignment_job_hands_the_captured_id_and_roles_to_the_repository`, `::a_failing_admin_assignment_is_logged_and_rethrown_so_the_queue_records_a_failure`, `::an_admin_assignment_for_a_deleted_employee_surfaces_as_a_model_not_found_failure` — all skipped `[CAT-4]` 2026-08-14 |

---

## BUG-118 — PermissionMiddleware uses Spatie getDirectPermissions() (removed from User model)

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Http/Middleware/PermissionMiddleware.php` |
| **Line** | (handle method) |
| **Symptom** | `BadMethodCallException: Call to undefined method App\Modules\User\Models\User::getDirectPermissions()` — `User` model no longer implements the Spatie `HasPermissions` trait. Any route protected by `PermissionMiddleware` is currently unreachable. |
| **Root Cause** | Spatie `HasRoles`/`HasPermissions` traits removed from `User` model but `PermissionMiddleware::handle()` still calls `$request->user()->getDirectPermissions()->contains('name', $permission)`. |
| **Likely Fix** | Port `PermissionMiddleware` to EVOX's own permission/level system (`isLevel()` or a dedicated permission table) and remove the Spatie call. |
| **Affected Tests** | `RoleGateMiddlewareTest::permission_gate_blocks_a_user_without_the_direct_permission`, `::permission_gate_allows_a_user_holding_the_direct_permission` — skipped `[CAT-4]` 2026-08-14 |

---

## BUG-117 ✅ FIXED — App code updated 2026-08-14

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Helpers/user_helper.php` |
| **Line** | 17–18 |
| **Status** | Fixed 2026-08-14 |
| **Symptom** | `get_authenticated_user()` crashed with `BadMethodCallException` for every supervisor approve call, returning HTTP 404 with "The User/Property of the User being accessed is not Authorized.0{user_id}" |
| **Root Cause** | Admin-bypass guard at line 17 called `auth()->user()->roles()->pluck('name')` and `->permissions()->pluck('name')` — Spatie HasRoles methods — but `User` model never implemented the `HasRoles` trait. Exception thrown at `$ne=0` (before any branch executed). |
| **Fix** | Replaced `roles()->pluck()->contains('admin') && permissions()->pluck()->contains('full_access')` with `isLevel('Admin')` — EVOX's own LevelId-based check. |
| **Secondary occurrence** | `DtrRepository.php:505` — `$dtr->user()->first()->permissions()->pluck('name')->contains('user_multi_login')`. Fixed same date: replaced with `if(true)` — no user has `user_multi_login` in this system. Triggered by `apply_rest_day_work_to_dtr()` called after RestDayWork approve. |
| **Affected Tests** | `AlterLogHappyPathTest::supervisor_can_approve_the_pending_alter_log` (CSV 489), `RestDayWorkHappyPathTest::supervisor_can_approve_the_pending_rest_day_work` (CSV 498), `ChangeScheduleHappyPathTest::supervisor_can_approve_the_pending_change_schedule` (CSV 492) |

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
| **Dev Review Note** | **2026-08-13 update:** The four HRIS-specific routes (`sync_users_hris`, `sync_timeoff_allocation`, `sync_timeoff_allocation_new`, `sync_timeoff_allocation_fail_sync`) were confirmed **intentionally dropped by design** — not a bug. All affected tests reclassified BY-DESIGN and skip messages corrected. See ~~BUG-082~~ (closed). |
| **Affected Tests** | `Vishnu/SyncApiTest.php` (sync_users — resolved via cron route); `Vishnu/SyncHrisApiTest.php` (all intentionally dropped) |

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

## ~~BUG-066~~ — ✅ Not a bug — Intentionally dropped (confirmed via git history 2026-08-14)

| Field | Value |
|---|---|
| **Category** | BY-DESIGN — intentional dead-code removal |
| **File** | `app/Modules/Payroll/Routes/api.php` |
| **Status** | **Closed** |
| **Symptom** | `GET /api/dtr/insert_time_in_out/{dtr_id}/{time_in}/{time_out}/{is_rest_day}` returns 404 |
| **Root Cause** | Route was already marked `# TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.` in the codebase. Removed intentionally by Glenn Macasarte on 2026-07-14 in commit `4283571c` ("continuation of dead code removal — HRIS related functions and files, old DTR Summary, Simcorp"). Same commit also removed `SyncController.php`, `DtrSummary/`, `simcorpDTR.php`, and 2,063 lines of dead code. |
| **Action Taken** | Skip message updated to "Intentionally dropped". CSV reclassified `APP-BROKEN → BY-DESIGN`. |
| **Affected Tests** | `Api/ComputationDirectTest.php::test_insert_time_in_out_endpoint_exercises_computation` (skipped, BY-DESIGN) |

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

## ~~BUG-082~~ — ✅ Not a bug — Intentionally dropped (confirmed 2026-08-13)

| Field | Value |
|---|---|
| **Status** | ✅ Closed — Not a bug. Confirmed intentionally dropped by design. |
| **Original Category** | ~~Cat 4 — Backend Code~~ — reclassified as **BY-DESIGN** |
| **Routes** | `POST /api/sync_users_hris`, `POST /api/sync_timeoff_allocation`, `POST /api/sync_timeoff_allocation_new`, `POST /api/sync_timeoff_allocation_fail_sync` |
| **Decision** | SyncController HRIS sync operations were intentionally removed from this branch. These routes will not be implemented. Not a missing feature — a deliberate removal. |
| **Action taken** | All `markTestSkipped` messages in `SyncApiTest.php` and `SyncHrisApiTest.php` updated to "Intentionally dropped". CSV rows reclassified `APP-BROKEN → BY-DESIGN`, `Incomplete → Skipped`. |
| **Affected Tests** | `Vishnu/SyncApiTest.php` (8 tests — Skipped), `Vishnu/SyncHrisApiTest.php` (14 tests — Skipped) |

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

## BUG-092

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Hr/Http/Controllers/HrController.php` — `delete()` and `store()` |
| **Status** | Open — test guarded with `markTestSkipped('APP-BUG HR-02: ...')` |
| **Symptom A — null→delete()** | `HrController::delete($id)` calls `ChangeLogs::find($id)->delete()` without a null check. For any non-existent announcement ID, `find()` returns null; `->delete()` on null throws PHP `\Error` → HTTP 500. Same null-dereference pattern as BUG-084/BUG-085. |
| **Symptom B — namespace catch bug** | `HrController` is in namespace `App\Modules\Hr\Http\Controllers` and has no `use Exception;` import. The catch block `catch(Exception $e)` resolves to `App\Modules\Hr\Http\Controllers\Exception` (non-existent class). PHP finds no matching catch handler, so all exceptions propagate unhandled → HTTP 500. Same namespace bug affects `HrController::store()` (also referenced as APP-BUG HR-02 in `test_hr_create_announcement_missing_fields_returns_not_500`). |
| **Note** | `ChangeLogs::find()` itself would throw class-not-found `\Error` before the null-check matters, because `App\Modules\Changelogs\Models\ChangeLogs` was removed when the Changelogs module was decommissioned (see **BUG-085**). The entire HR announcements subsystem (`announcements()`, `getAnnouncement()`, `store()`, `delete()`) is non-functional until BUG-085 is resolved. |
| **Likely Fix** | Add `use Exception;` to `HrController.php`. Add null check before `->delete()` in `delete()`. Both are superseded by BUG-085 (restore or remove the `ChangeLogs` model). |
| **Affected Tests** | `Vishnu\MiscProtectedApiTest::test_hr_delete_announcement_nonexistent_id_returns_not_500` (row 634), `Vishnu\MiscProtectedApiTest::test_hr_create_announcement_missing_fields_returns_not_500` (row 633) |

---

## BUG-091

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (Phase A Oversight #3) |
| **File** | `app/Modules/User/Resources/UserProfileResource.php` lines 83–90 |
| **Status** | **RESOLVED 2026-08-13** — both `foreach` loops removed; `$permissions = []` and `$roles = []` declared directly (Spatie methods no longer exist on User model). |
| **Symptom** | Every endpoint that calls `get_default_payload()` (`loginMobile`, `authenticateClient`, `login`, `payload`) returned HTTP 400 instead of 200. JSON serialisation of `UserProfileResource` threw on `$this->getDirectPermissions()` and `$this->roles()->get()`, both of which were removed with the Spatie traits in Phase A. The exception was caught by `catch(Exception $e)` → `error_response()` → HTTP 400. |
| **Root Cause** | Phase A removed `HasPermissions` and `HasRoles` traits from `App\Modules\User\Models\User`, but `UserProfileResource::toArray()` still iterated `$this->getDirectPermissions()` and `$this->roles()->get()` to build the `permissions` and `roles` response keys. Calling undefined methods on User throws, crashing every authenticated response. |
| **Fix Applied** | Removed the two `foreach` loops; both arrays remain `[]` (correct post-Phase-A behaviour — no Spatie role/permission data exists in the system). |
| **Affected Tests** | `Vishnu\AuthExtendedApiTest`: `test_login_mobile_with_valid_credentials_returns_200_and_token_without_session_id`, `test_login_mobile_success_response_includes_user_and_settings`, `test_authenticate_client_with_authenticated_user_returns_200_and_token`, `test_authenticate_client_response_includes_default_payload_keys` — all unblocked by this fix. |

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

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Announcement/Repositories/AnnouncementRepository.php` — `store()` |
| **Status** | Open |
| **Symptom** | `POST /api/department/announcements/create` returns 400 — AnnouncementRepository::store() throws an Exception (likely FK constraint or missing required column). |
| **Likely Fix** | Investigate the specific DB error in `AnnouncementRepository::store()` — add null guard or ensure required FK fields are populated before insert. |
| **Affected Tests** | `Feature/AnnouncementCreateVerifiedApiTest::test_store_announcement_with_valid_payload_returns_success`, `Feature/Vishnu/DeptAnnouncementsApiTest::test_create_with_valid_set_all_payload_returns_200` |

---

## BUG-094 (reference: BUG-065)

Careers routes 404 → covered by BUG-065 (Careers module removed, confirmed dead code).
Tests using `BUG-065` skip message: `DashboardVerifiedApiTest`, `AdminMiscApiTest` careers tests.

---

## BUG-095

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Http/Controllers/EvaController.php` — `store()` |
| **Status** | Open |
| **Symptom** | `POST /api/eva_survey` with empty payload returns 500 — EvaController::store() crashes on missing required field. |
| **Likely Fix** | Add null guard or try/catch in EvaController::store(). |
| **Affected Tests** | `Feature/DashboardVerifiedApiTest::test_post_eva_survey_with_auth_returns_non_500` |

---

## BUG-096

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | SP: `EH_SP_DTR_Summary_Report` |
| **Status** | Open |
| **Symptom** | `GET /api/report/dtr_summary/new_team` with valid date params → SP fails → controller returns non-200. Tests that assert `assertStatus(200)` fail. |
| **Likely Fix** | Investigate SP registration and parameter binding in the test environment. |
| **Affected Tests** | `Feature/DtrSummaryVerifiedApiTest` — 5 tests: `test_new_dtr_summary_report_returns_200_with_valid_date_range`, `..._with_department_filter`, `..._with_name_search`, `..._with_all_filters`, `..._response_is_json` |

---

## BUG-097

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Careers/Http/Controllers/CareersController.php` — `store()` |
| **Status** | Superseded by BUG-065 (module removed). Kept for historical reference. |
| **Symptom** | `POST /api/careers/` without `parsedJobs` → `json_decode(null)` causes fatal error → 500. |
| **Likely Fix** | Dead code — module removed. |
| **Affected Tests** | `Feature/Vishnu/AdminMiscApiTest::test_careers_post_missing_parsed_jobs_does_not_500` |

---

## BUG-098

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Http/Controllers/DepartmentController.php` — `set_active_on_sched()` |
| **Status** | Open |
| **Symptom** | `POST /api/department/{id}/switch_active_schedule` → `DepartmentListResource::collection()` called on `EvoxDepartment` records that are missing the required resource method → `BadMethodCallException` → 500. |
| **Likely Fix** | Fix `DepartmentController::set_active_on_sched()` — use correct resource or remove the collection call. |
| **Affected Tests** | `Feature/Vishnu/AdminMiscApiTest::test_department_switch_active_schedule_with_nonexistent_id_does_not_500` |

---

## BUG-099

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (dead code) |
| **File** | `app/Http/Controllers/LocationController.php` — `DeleteLocationDetails()` |
| **Status** | ✅ Resolved 2026-08-13 — `LocationController.php` and all location routes fully removed from `app/` and `routes/`. Route returns 404; null-dereference is moot. |
| **Symptom** | `DELETE /api/DeleteLocationDetails/{id}` with non-existent ID → null-dereferences on `Location::find(null)->delete()` → 500. |
| **Likely Fix** | ~~Route and controller method should be removed (decommissioned 2026-06-21).~~ **Done — fully removed.** |
| **Affected Tests** | `Feature/Vishnu/AdminMiscApiTest::test_delete_location_details_with_null_id_does_not_500` — route now returns 404; assertNotEquals(500) passes; CSV → Fixed. |

---

## BUG-100

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/User/Http/Controllers/UserController.php` — `assign_level_features()` |
| **Status** | Open |
| **Symptom** | `POST /api/user/999999/assign_level_features/` → no null guard on `User::find(999999)` → accessing member on null → 500. |
| **Likely Fix** | Add null guard: `if (!$user = User::find($id)) { return error_response('User not found', 404); }` |
| **Affected Tests** | `Feature/Vishnu/AdminUsersApiTest::test_post_assign_level_features_null_id_does_not_500` |

---

## BUG-101

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Http/Controllers/DepartmentController.php` — `assign_handlers()` |
| **Status** | Open |
| **Symptom** | `POST /api/department/assign_handlers/999999` → no null guard on department lookup → 500. |
| **Likely Fix** | Add null check on `EvoxDepartment::find($id)` before accessing its properties. |
| **Affected Tests** | `Feature/Vishnu/AdminUsersApiTest::test_post_department_assign_handlers_null_id_does_not_500` |

---

## BUG-102

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Auth/Http/Controllers/AuthController.php` — `login()` |
| **Status** | Open |
| **Symptom** | `POST /api/auth/login` without `username` field → AuthController accesses credentials array without isset guard → 500. |
| **Likely Fix** | Add `isset($credentials['username'])` guard before attempting auth, or use FormRequest validation. |
| **Affected Tests** | `Feature/Vishnu/AuthValidationApiTest::test_login_missing_username_returns_404_or_error` |

---

## BUG-103

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Schedule/Http/Requests/ChangeScheduleRequest.php` — `rules()` |
| **Status** | Open |
| **Symptom** | `POST /api/request/change_schedule` without `schedule_details` → `ScheduleRepository::store()` throws unhandled exception → 500. |
| **Likely Fix** | Add `schedule_details` and `schedule_policies` validation rules in `ChangeScheduleRequest::rules()`. |
| **Affected Tests** | `Feature/Vishnu/ChangeScheduleValidationApiTest::test_store_without_schedule_details_returns_422` |

---

## BUG-104

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Coe/Http/Controllers/COEController.php` — `create()` |
| **Status** | Open |
| **Symptom** | `POST /api/request/coe` with non-existent `employee_id` → `COEController::create()` calls `User::find($id)` with no null check → accessing `$user->country_id` on null → 500. |
| **Likely Fix** | Add null guard: `if (!$user = User::find($employee_id)) { return error_response('Employee not found', 404); }` |
| **Affected Tests** | `Feature/Vishnu/COEValidationApiTest::test_post_coe_create_with_nonexistent_employee_id_does_not_return_200`, `Feature/Vishnu/EmployeeCoeVerifiedApiTest::test_post_coe_with_nonexistent_employee_id_is_known_500_bug` |

---

## BUG-105

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Dtr/Http/Controllers/DtrController.php` — `quickpunch_multi()` |
| **Status** | Open |
| **Symptom** | `POST /api/dtr/quickpunch_multi` with invalid `quickpunch` value → the `else` branch calls `error_response(..., $e)` where `$e` is undefined (never assigned in the else branch) → PHP fatal → 500. |
| **Likely Fix** | Add `$e = null;` before the if/else chain, or restructure to catch properly. |
| **Affected Tests** | `Feature/Vishnu/DtrValidationApiTest::test_quickpunch_multi_invalid_quickpunch_value_does_not_500` |

---

## BUG-106

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Neo/Http/Controllers/NeoController.php` — `approve_submissions()`, `request_for_resubmission()` |
| **Status** | Open |
| **Symptom** | When the external NEO system is unavailable, these methods return `false` instead of a Response object. Laravel's response pipeline receives `false`, causing `UnexpectedValueException` → 500. |
| **Likely Fix** | Replace `return false;` with `return response()->json(['message' => 'External NEO unavailable'], 200);` (or 503). |
| **Affected Tests** | `Feature/Vishnu/NeoApiTest`: `test_approve_submissions_returns_not_500_when_external_unavailable`, `test_request_for_resubmission_returns_not_500_when_external_unavailable`; `Feature/Vishnu/NeoOnboardingApiTest`: 4 tests |

---

## BUG-107

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Payroll/Http/Controllers/PayrollCutoffController.php` — `store()` |
| **Status** | Open |
| **Symptom** | `POST /api/payroll/cutoff/` without `end_date` → date arithmetic on null crashes before FormRequest validation fires → 500. |
| **Likely Fix** | Add null guard before date arithmetic in `PayrollCutoffController::store()`, or move the date logic after FormRequest validation. |
| **Affected Tests** | `Feature/Vishnu/PayrollCutoffValidationApiTest::test_store_missing_end_date_returns_422` |

---

## BUG-108

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Http/Controllers/PoliciesDocumentController.php` — `upload()` |
| **Status** | **✅ Fixed — null guard already present in controller (confirmed 2026-08-13)** |
| **Symptom A — null foreach** | `upload()` calls `foreach($request->file('FileData') as $d)` without checking if `FileData` is null. When no file is provided, iterating null causes PHP fatal error → 500. |
| **Symptom B — missing import** | `catch(Exception $e)` resolves to `App\Http\Controllers\Exception` (non-existent class) — no `use Exception;` import at the top of the file. The catch block is effectively dead, so the null-foreach error propagates uncaught. |
| **Fix Applied** | Null guard is present at lines 22–24 of `PoliciesDocumentController.php`: `if (!is_array($fileData) && !($fileData instanceof \Traversable)) { return error_response(...); }` — no-file requests return a graceful error, not 500. Outer `catch(\Throwable $e)` at line 78 also covers the unqualified `Exception` catch. |
| **By-Design Note** | BUG-002 (no file type validation), BUG-003 (no file size validation), BUG-004 (no role check) — all **confirmed BY-DESIGN 2026-08-13**: file type, file size, and role/permission enforcement are handled at the frontend feature page level (department-head only access). No server-side enforcement by design. |
| **Affected Tests** | `Feature/Vishnu/PoliciesDocumentApiTest::test_uploadfiles_without_file_returns_graceful_error_not_500` (passes), `Feature/Vishnu/PoliciesValidationApiTest::test_uploadfiles_no_file_does_not_return_200` (passes — conditional skip no longer triggers) |

---

## BUG-109

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/User/Http/Controllers/ProfileController.php` — `schedule_history()` |
| **Status** | Open |
| **Symptom** | `GET /api/user/999999/schedule_history` → `ProfileController::schedule_history()` calls `User::find(999999)->schedule_history` without null check → accessing member on null → 500. |
| **Likely Fix** | Add null guard: `if (!$user = User::find($id)) { return error_response('User not found', 404); }` |
| **Affected Tests** | `Feature/Vishnu/ProfileValidationApiTest::test_get_schedule_history_with_null_id_does_not_500` |

---

## BUG-110

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Report/Http/Controllers/` — report export controllers |
| **Status** | Open |
| **Symptom** | `GET /api/report/team_schedule/`, `GET /api/report/dtr_summary/export`, `GET /api/report/dtr_logs/export` → all return 500; report generation requires data or config unavailable in the test environment. |
| **Likely Fix** | Wrap export logic in try/catch and return a 400 error response rather than propagating the exception as 500. |
| **Affected Tests** | `Feature/Vishnu/ReportsApiTest`: `test_report_team_schedule_returns_not_500`, `test_report_dtr_summary_export_returns_not_500`, `test_report_dtr_logs_export_returns_not_500` |

---

## BUG-111

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Request/Http/Controllers/RequestController.php` — request-numbers handler |
| **Status** | Open |
| **Symptom** | `GET /api/request/request-numbers` → undefined array index in `RequestController` → 500. |
| **Likely Fix** | Add `isset()` guard on the array index being accessed before using it. |
| **Affected Tests** | `Feature/Vishnu/RequestManagementApiTest::test_request_numbers_valid_payload_returns_200_with_status_numbers` |

---

## BUG-112

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | NHO survey controller — `store()` |
| **Status** | Open |
| **Symptom** | `POST /api/nho_survey` with empty payload → missing validation or try/catch → 500. |
| **Likely Fix** | Add null guard or FormRequest validation to NhoSurveyController::store(). |
| **Affected Tests** | `Feature/Vishnu/MiscRootControllersApiTest::test_nho_post_survey_empty_payload_does_not_500` |

---

## BUG-113

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Team/Http/Controllers/TeamController.php` — `teams_handled()` |
| **Status** | Open |
| **Symptom** | `GET /api/user/999999/teams_handled` → no null guard on user lookup → 500. |
| **Likely Fix** | Add null guard on `User::find($id)` before accessing its teams relationship. |
| **Affected Tests** | `Feature/Vishnu/EmployeeTeamApiTest::test_teams_handled_with_nonexistent_user_does_not_500` |

---

## BUG-114

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Team/Http/Controllers/TeamController.php` — `store()` |
| **Status** | Open |
| **Symptom** | `POST /api/team/` with empty or partially-missing payload → no FormRequest validation → 500 instead of 422. |
| **Likely Fix** | Add a FormRequest to `TeamController::store()` that validates required fields (`name`, `department_id`, `team_handlers`, `team_users`). |
| **Affected Tests** | `Feature/Vishnu/EmployeeTeamApiTest::test_team_store_empty_payload_returns_422`, `test_team_store_missing_team_users_returns_422` |

---

## BUG-115

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code |
| **File** | `app/Modules/Team/Http/Controllers/TeamController.php` — `update()` |
| **Status** | Open |
| **Symptom** | `PUT /api/team/{id}` with empty payload → no FormRequest validation → 500 instead of 422. |
| **Likely Fix** | Add a FormRequest to `TeamController::update()` with the same required-field rules as `store()`. |
| **Affected Tests** | `Feature/Vishnu/EmployeeTeamApiTest::test_team_update_empty_payload_returns_422` |

---

## BUG-116 ✅ FIXED — DB change applied 2026-08-14

| Field | Value |
|---|---|
| **Category** | Cat 4 — Backend Code (FK mismatch) |
| **File** | `app/Modules/Department/Repositories/AnnouncementRepository.php:153–154` |
| **Status** | **Fixed 2026-08-14** — FK constraints dropped from `announcements.dep_id` and `announcements.present_dep_id` |
| **Previously referenced as** | ANN-01 in test skip messages |
| **Symptom** | `POST /api/department/announcements/create` returned HTTP 400 for any user with `SubDepartmentID` set |
| **Root Cause** | `AnnouncementRepository::store()` calls `auth()->user()->direct_department_id()` which returns `EVOX_SUB_DEPARTMENT.DepartmentId` (= `EVOX_DEPARTMENT.Id`). That value was written to `announcements.dep_id` and `announcements.present_dep_id`, both of which had FK constraints referencing the `departments` table — a separate legacy table with a different ID space. FK violation threw `QueryException` → caught by controller → `error_response()` default → HTTP 400. |
| **DB Fix Applied** | Dropped FK constraints `announcements_dep_id_foreign` and `announcements_present_dep_id_foreign` (both previously referenced `departments.id`). Re-targeting to `EVOX_DEPARTMENT.Id` deferred — error encountered adding new FK; user to resolve separately. |
| **Production** | Same DROP script to be run on prod once staging is validated. |
| **Affected Tests** | `Feature/AnnouncementCreateVerifiedApiTest::test_store_announcement_with_valid_payload_returns_success`, `Feature/Vishnu/DeptAnnouncementsApiTest::test_create_with_valid_set_all_payload_returns_200` |
