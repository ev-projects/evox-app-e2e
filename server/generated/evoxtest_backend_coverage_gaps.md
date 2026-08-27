# EVOX Backend — Real Coverage Gaps Report
**Generated:** 25 August 2026  
**Based on:** Aug 24 2026 single-config PHPUnit run (evoxtest_phpunit.xml · 4,138 tests)  
**Scope:** Decommissioned code excluded (RoomController, LocationController, BookingController, PDFController, SyncController, simcorpDTR, CareersController, Modules/Client — all removed from whitelist 2026-08-25)

---

## Overall Figures

| Metric | Current (Aug 24) | After whitelist trim (next run est.) |
|---|---|---|
| Methods | 971 / 1,138 = **85.33%** | 971 / 1,077 = **~90.16%** |
| Classes | 212 / 272 = **77.94%** | 212 / 257 = **~82.49%** |
| Lines | 12,406 / 13,462 = **92.16%** | slight improvement |

**Real uncovered methods (live code only): 167**  
Spread across 83 classes with partial or zero method coverage.

---

## Table of Contents

1. [Tier 1 — 0% Coverage (17 classes)](#tier-1--0-coverage-17-classes)
2. [Tier 2 — 1–49% Coverage (10 classes)](#tier-2--149-coverage-10-classes)
3. [Tier 3 — 50–79% Coverage (44 classes)](#tier-3--5079-coverage-44-classes)
4. [Tier 4 — 80–99% Coverage (12 classes)](#tier-4--8099-coverage-12-classes)
5. [Summary — Where the 167 Missing Methods Come From](#summary--where-the-167-missing-methods-come-from)
6. [Top 3 High-Value Targets](#top-3-high-value-targets)

---

## Tier 1 — 0% Coverage (17 classes)

These classes were never entered during any test in the Aug 24 run. Every method is uncovered.

### Auth Scaffold Controllers (4 classes — Laravel boilerplate)

| Class | File | Methods | Note |
|---|---|---|---|
| `Auth\RegisterController` | `Http/Controllers/Auth/RegisterController.php` | `__construct`, `validator`, `create` | Laravel scaffold — EVOX uses JWT, not form registration |
| `Auth\ForgotPasswordController` | `Http/Controllers/Auth/ForgotPasswordController.php` | `__construct` | Route exists but no test hits it |
| `Auth\ResetPasswordController` | `Http/Controllers/Auth/ResetPasswordController.php` | `__construct` | Route exists but no test hits it |
| `Auth\VerificationController` | `Http/Controllers/Auth/VerificationController.php` | `__construct` | Route exists but no test hits it |

### Middleware (2 classes)

| Class | File | Methods | Priority | Note |
|---|---|---|---|---|
| `PermissionMiddleware` | `Http/Middleware/PermissionMiddleware.php` | `handle` | 🔴 High | Role-gate applied to protected routes — gate logic never exercised |
| `CoverageMiddleware` | `Http/Middleware/CoverageMiddleware.php` | `handle` | 🟡 Low | Xdebug toggle middleware — not meaningful to test |

### Controllers with Production Bugs (2 classes)

These are skipped because the app itself crashes with valid input. Tests exist but are `markTestSkipped`.

| Class | File | Missing methods | Bug |
|---|---|---|---|
| `PoliciesDocumentController` | `Http/Controllers/PoliciesDocumentController.php` | `upload`, `show`, `showlist`, `updatestatus`, `downloadPolicy`, `get_user_departments` | `upload()` has `foreach($request->file(...))` with no null check + namespace catch bug (`catch(Exception)` without `use Exception`). All 6 methods untested. |
| `HrController` | `Modules/Hr/Http/Controllers/HrController.php` | `index`, `store`, `delete`, `getAnnouncement`, `getAnnouncementById` *(5 total)* | `getAnnouncement()` calls `find($id)->toArray()` with no null check. `store()`/`delete()` missing `use Exception` — catch resolves to wrong namespace. |

### Approval Trait (1 class)

| Class | File | Missing methods | Note |
|---|---|---|---|
| `Modules\Request\ApprovalTrait` | `Modules/Request/ApprovalTrait.php` | All 10 methods | Full approval state machine — approve, decline, pending, cancel + supporting helpers. Source file may be in a non-standard path (not found at expected location during scan). |

### API Resource Transformers (5 classes)

These `toArray()` transformer classes are never directly asserted on in responses.

| Class | Missing method |
|---|---|
| `Department\Resources\DepartmentResource` | `toArray` |
| `Payroll\Resources\DtrLogResource` | `toArray` |
| `Payroll\Resources\DtrResource` | `toArray` |
| `Request\Resources\RequestResource` | `toArray` |
| `Request\Resources\WorkFromHomeResource` | `toArray` |

### Miscellaneous (3 classes)

| Class | File | Methods | Note |
|---|---|---|---|
| `DepartmentAnnouncementController` | `Modules/Department/Http/Controllers/DepartmentAnnouncementController.php` | 1 method | Not tested |
| `Payroll\BiometricsRepository` | `Modules/Payroll/Repositories/BiometricsRepository.php` | `get_biometrics` | Biometrics sync repo — 1 method, never called |
| `Features` | `app/Features.php` | `features_level`, `users` | Feature-flag helper — never exercised |

---

## Tier 2 — 1–49% Coverage (10 classes)

### `DtrRepository` — 19% (4/21) 🔴 LARGEST REPO GAP

**File:** `Modules/Payroll/Repositories/DtrRepository.php`  
**Covered (4):** `generate_dtr`, `get_dtr_logs`, `apply_schedule_to_dtr`, and one other (via DTR integration tests)  
**Not covered (17):**

| Method | What it does |
|---|---|
| `remove_schedule_to_dtr` | Removes a schedule binding from a DTR record |
| `apply_alter_log_to_dtr` | Applies an alter-log (punch correction) to DTR |
| `remove_alter_log_from_dtr` | Removes an alter-log binding from DTR |
| `apply_rest_day_work_to_dtr` | Applies rest-day-work approval to DTR |
| `remove_rest_day_from_dtr` | Removes rest-day-work from DTR |
| `bind_holidays_to_dtr` | Binds holiday records to DTR dates |
| `bind_leaves_to_dtr` | Binds approved leaves to DTR |
| `bind_superceded_leaves_to_dtr` | Handles superseded leave bindings |
| `sync_biometrics_to_dtr` | Syncs biometric punch data to DTR |
| `compute_payroll_items` | Calculates payroll line items from DTR |
| `get_leaves_from_dtr` | Retrieves leave data from DTR records |
| `apply_biometrics_to_dtr` | Applies raw biometric data to DTR |
| `save_dtr_policies` | Persists DTR policy records |
| `optimze_schedule_application` | Optimises schedule application logic |
| `apply_punch_to_history` | Applies punch events to DTR history |
| `apply_alter_to_punch` | Applies alter-log to punch records |
| `remove_alter_to_punch` | Removes alter-log from punch records |

> **Why this matters:** These 17 methods are the core DTR calculation engine. Every cron job, biometrics sync, and payroll computation depends on this class. Zero coverage here means the most business-critical transformation logic is untested.

---

### `DisputeController` — 14% (1/7)

**File:** `Http/Controllers/DisputeController.php`  
**All methods:** `__construct`, `store`, `show`, `showExport`, `getEmployeeDispute`, `UpdateDispute`, `getpayrollcutoff`  
**Covered (1):** `__construct`  
**Not covered (6):** `store`, `show`, `showExport`, `getEmployeeDispute`, `UpdateDispute`, `getpayrollcutoff`

---

### `Department\Models\Announcement` — 17% (1/6)

**File:** `Modules/Department/Models/Announcement.php`  
**All methods:** `announcements_departments`, `department`, `creator`, `announcement_clones_departments_old`, `announcement_clones_departments`, `is_expired`  
**Covered (1):** `is_expired`  
**Not covered (5):** `announcements_departments`, `department`, `creator`, `announcement_clones_departments_old`, `announcement_clones_departments`

---

### `TeamRepository` — 29% (2/7)

**File:** `Modules/Team/Repositories/TeamRepository.php`  
**All methods:** `all`, `list_via_department`, `list_via_team_handler`, `find`, `store`, `update`, `destroy`  
**Covered (2):** `all`, `list_via_department`  
**Not covered (5):** `list_via_team_handler`, `find`, `store`, `update`, `destroy`

---

### `DrupalEvoxRepository` — 13% (1/8)

**File:** `Modules/Payroll/Repositories/DrupalEvoxRepository.php`  
**Not covered (7):** 7 of 8 methods — Drupal API integration, never exercised in any test

---

### `DepartmentRepository` — 40% (4/10)

**File:** `Modules/Department/Repositories/DepartmentRepository.php`  
**All methods:** `__construct`, `all`, `all_with_announcements`, `find`, `destroy_department`, `assign_handlers`, `dashboard_annoucments`, `create_department_announcement`, `edit_department_announcement`, `destroy_department_announcement`  
**Covered (6):** `__construct`, `all`, `all_with_announcements`, `find`, `destroy_department`, `assign_handlers`  
**Not covered (4):** `dashboard_annoucments`, `create_department_announcement`, `edit_department_announcement`, `destroy_department_announcement`

---

### `ReportRepository` — 40% (2/5)

**File:** `Modules/Report/Repositories/ReportRepository.php`  
**All methods:** `get_my_dtr_notifications`, `get_team_attendance`, `get_dtr_summary`, `get_dtr_summary_block`, `get_team_attendance_summary`  *(note: ReportRepository may have 4 or 5 methods depending on source version)*  
**Covered (~2):** `get_team_attendance`, `get_dtr_summary`  
**Not covered (~3):** `get_my_dtr_notifications`, `get_dtr_summary_block`, `get_team_attendance_summary`

---

### `Payroll\Models\TeamAttendanceSummary` — 40% (2/5)

**File:** `Modules/Payroll/Models/TeamAttendanceSummary.php`  
**All methods:** `get_summary`, `get_summary2`, `get_summary_dtr`, `clear_properties` *(+ 1 more)*  
**Not covered (3):** `get_summary2`, `get_summary_dtr`, `clear_properties`

---

### `Helpers\parse_helper` — 43% (3/7)

**File:** `app/Helpers/parse_helper.php`  
4 of 7 global helper functions uncovered.

---

## Tier 3 — 50–79% Coverage (44 classes)

### Approval Workflow Repositories — 🔴 SECURITY CRITICAL

All 5 request-type repositories test the **submission** path (`store`, `update`, `destroy`, `find`) but **never test the approval path** (`approve`, `decline`, `pending`, `cancel`). This is the most critical security gap: the tests do not verify that an employee cannot approve their own request.

| Repository | Coverage | ❌ Approval methods missing | ❌ Other missing |
|---|---|---|---|
| `AlterLogRepository` | 70% 7/10 | `approve`, `decline`, `pending`, `cancel` | — |
| `AlterLogPunchRepository` | 70% 7/10 | `approve`, `decline`, `pending`, `cancel` | `on_conflict` |
| `ChangeScheduleRepository` | 70% 7/10 | `approve`, `decline`, `pending`, `cancel` | — |
| `OvertimeRepository` | 78% 7/9 | `approve`, `decline`, `pending`, `cancel` | — |
| `RestDayWorkRepository` | 60% 6/10 | `approve`, `decline`, `pending`, `cancel` | `optimze_rest_day` |

**Total: 20 uncovered approval methods across 5 repos.**

**Full method lists:**
- `AlterLogRepository`: `__construct`, `store`, `update`, `destroy`, `find`, **`approve`**, **`decline`**, **`pending`**, **`cancel`**, `where`
- `AlterLogPunchRepository`: `__construct`, `store`, `update`, `destroy`, `find`, **`approve`**, **`decline`**, **`pending`**, **`cancel`**, **`on_conflict`**
- `ChangeScheduleRepository`: `__construct`, `store`, `update`, `destroy`, `find`, **`approve`**, **`decline`**, **`pending`**, **`cancel`**, `where`
- `OvertimeRepository`: `store`, `update`, `destroy`, `find`, `where`, **`approve`**, **`decline`**, **`pending`**, **`cancel`**
- `RestDayWorkRepository`: `store`, `update`, `destroy`, `find`, `where`, **`approve`**, **`decline`**, **`pending`**, **`cancel`**, **`optimze_rest_day`**

---

### Controllers

#### `ReportController` — 73% (16/22) — 6 methods missing

**File:** `Modules/Report/Http/Controllers/ReportController.php`  
**All 22 methods:** `__construct`, `dtr_summary`, `dtr_summary_block`, `export_team_dtr_summary`, `team_dtr_logs`, `export_team_dtr_logs`, `team_schedule`, `holidays`, `get_dashboard_holidays`, `my_dtr_notifications`, `team_birthday_anniversary`, `team_attendance`, `team_attendance_summary`, `export`, `new_dtr_summary_report_csv_export`, `new_dtr_summary_report`, `dtr_multi_logs_summary_report`, `dtr_multi_logs_summary_report_csv_export`, `dtr_half_day_mismatch`, `dtr_conflict_report`, `timeoff_allocation_report`, `getMoroccoPayrollParams`

**Not covered (6):** `dtr_summary_block`, `export_team_dtr_summary`, `export_team_dtr_logs`, `export` (CSV exports), `dtr_half_day_mismatch`, `dtr_conflict_report`

> ReportController is 882 lines — the largest controller. 6 untested methods are all export/advanced-report endpoints.

---

#### `AuthController` — 63% (5/8) — 3 methods missing

**File:** `Modules/User/Http/Controllers/AuthController.php`  
**All methods:** `__construct`, `login`, `loginMobile`, `authenticateClient`, `authenticateMSClient`, `logout`, `payload`, `get_default_payload`  
**Covered (5):** `__construct`, `login`, `logout`, `payload`, `get_default_payload`  
**Not covered (3):** `loginMobile`, `authenticateClient`, `authenticateMSClient`

> These are the mobile and client SSO auth paths. No test exercises them.

---

#### `NeoController` — 75% (6/8) — 2 methods missing

**File:** `Http/Controllers/NeoController.php`  
**All methods:** `get_api_headers`, `get_neo_onboarding_users`, `get_users_pending_submissions`, `get_user_submissions_data`, `send_onboarding_link`, `approve_submissions`, `request_for_resubmission`, `get_file`  
**Covered (6):** `get_api_headers`, `get_neo_onboarding_users`, `get_users_pending_submissions`, `get_user_submissions_data`, `send_onboarding_link`, `get_file`  
**Not covered (2):** `approve_submissions`, `request_for_resubmission`

> Both missing methods have a known prod bug: they `return false` on non-200 cURL response, which throws `\UnexpectedValueException`. Blocked by Cat 4 bug.

---

#### `FreshServiceController` — 67% (6/9) — 3 methods missing

**File:** `Http/Controllers/FreshServiceController.php`  
**All methods:** `getWorkspaces`, `getMyTickets`, `createTicket`, `getTicket`, `sendTicketConversation`, `getTicketConversation`, `saveTicketImage`, `saveAttachment`, `getUserSuggestions`  
**Covered (6):** `getWorkspaces`, `getMyTickets`, `createTicket`, `getTicket`, `getTicketConversation`, `getUserSuggestions`  
**Not covered (3):** `sendTicketConversation`, `saveTicketImage`, `saveAttachment`

---

#### `EvaController` — 50% (2/4) — 2 methods missing

**File:** `Http/Controllers/EvaController.php`  
**All methods:** `index`, `store`, `getEvaRegistration`, `saveEvaRegistration`  
**Covered (2):** `index`, `getEvaRegistration`  
**Not covered (2):** `store`, `saveEvaRegistration`

---

### Repositories

#### `AnnouncementRepository` — 50% (7/14) — 7 methods missing

**File:** `Modules/Department/Repositories/AnnouncementRepository.php`  
**All 14 methods:** `__construct`, `index`, `store`, `show`, `show_strict`, `update`, `update_status`, `destroy`, `dashboard_index`, `increment_dashboard_index`, `handle_announcements_index`, `all_department_handled_Announcements`, `show_hr_strict`, `all_hr_handled_Announcements`  
**Covered (7):** `__construct`, `index`, `store`, `show`, `show_strict`, `update`, `destroy`  
**Not covered (7):** `update_status`, `dashboard_index`, `increment_dashboard_index`, `handle_announcements_index`, `all_department_handled_Announcements`, `show_hr_strict`, `all_hr_handled_Announcements`

---

#### `BhrRepository` — 62% (8/13) — 5 methods missing

**File:** `Modules/Bhr/Repositories/BhrRepository.php`  
**All 13 methods:** `get_changed_users`, `get_all_bhr_user_numbers`, `get_user`, `get_profile_picture`, `get_user_bhr_field`, `get_user_job_information`, `get_report`, `get_leave_credits`, `sync_holidays`, `get_holidays`, `get_leaves`, `test`, `get_match`  
**Covered (8 — via IoC mock):** `get_changed_users`, `get_all_bhr_user_numbers`, `get_user`, `get_profile_picture`, `get_user_bhr_field`, `get_user_job_information`, `get_leaves`, `get_match`  
**Not covered (5):** `get_report`, `get_leave_credits`, `sync_holidays`, `get_holidays`, `test`

---

#### `PayrollCutoffRepository` — 63% (5/8) — 3 methods missing

**File:** `Modules/Payroll/Repositories/PayrollCutoffRepository.php`  
**All methods:** `__construct`, `get_payroll_cutoff`, `get_filter_for_dtr`, `all`, `find`, `store`, `update`, `destroy`  
**Covered (5):** `__construct`, `get_payroll_cutoff`, `get_filter_for_dtr`, `all`, `find`  
**Not covered (3):** `store`, `update`, `destroy` — the write path is never tested

---

#### `UserRepository` — 78% (21/27) — 6 methods missing

**File:** `Modules/User/Repositories/UserRepository.php`  
**All 27 methods:** `register_user`, `insert_bhr_user_to_evox`, `update_bhr_user_to_evox`, `update_bhr_user_country_to_evox`, `apply_user_supervisor_pivot`, `store`, `update`, `destroy`, `destroy_department_users`, `show`, `show_via_bhr_number`, `new_get_my_team_list`, `get_all_active_users`, `get_all_bhr_synced_users`, `get_all_supervisors`, `get_users_under_supervisee`, `get_users_under_supervisee_active_with_no_schedule`, `get_dpa_list`, `apply_temporary_password`, `change_password`, `tick_dpa`, `assign_level_features`, `assign_employees_to_user`, `list_via_department`, `generate_department`, `get_users_under_supervisee_active_with_requests`, `get_users_under_supervisee_active_with_invalid_check_ins`  
**Not covered (6):** `insert_bhr_user_to_evox`, `update_bhr_user_to_evox`, `update_bhr_user_country_to_evox`, `destroy_department_users`, `get_users_under_supervisee_active_with_requests`, `get_users_under_supervisee_active_with_invalid_check_ins`

---

#### `EmailRepository` — 72% (13/18) — 5 methods missing

**File:** `Modules/Email/Repositories/EmailRepository.php`  
**All 18 methods:** `sendRegisteredUserEmail`, `sendForgotPasswordRequestEmail`, `sendOvertimeRequestEmail`, `sendOvertimeDisputeEmail`, `sendOvertimeRequestChangeStatusEmail`, `sendRestDayWorkRequestEmail`, `sendRestDayWorkDisputeEmail`, `sendRestDayWorkRequestChangeStatusEmail`, `sendAlterLogRequestEmail`, `sendAlterLogDisputeEmail`, `sendAlterLogRequestChangeStatusEmail`, `sendChangeScheduleRequestEmail`, `sendChangeScheduleRequestChangeStatusEmail`, `sendSupervisorReminderNoSchedEmail`, `sendSupervisorReminderofNewUser`, `sendSupervisorReminderRequestsEmail`, `sendSupervisorReminderInvalidCheckInsEmail`, `sendFailedBHRUserSyncNotice`  
**Covered (13):** All request and dispute notification emails (OT, RDW, AlterLog, ChangeSchedule)  
**Not covered (5):** `sendSupervisorReminderNoSchedEmail`, `sendSupervisorReminderofNewUser`, `sendSupervisorReminderRequestsEmail`, `sendSupervisorReminderInvalidCheckInsEmail`, `sendFailedBHRUserSyncNotice`

---

#### `RequestRepository` — 50% (2/4) — 2 methods missing

**File:** `Modules/Request/Repositories/RequestRepository.php`  
**All methods:** `get_status_numbers_old`, `get_status_numbers`, `get_status_numbers_dashboard`, `get_status_numbers_only`  
**Covered (2):** `get_status_numbers`, `get_status_numbers_dashboard`  
**Not covered (2):** `get_status_numbers_old`, `get_status_numbers_only`

---

### Console Commands — 50% each (8 commands × 1 missing = 8 methods)

All 8 commands have 1/2 methods covered — `__construct` (loaded by scheduler) but `handle()` (execution body) not called directly in tests. The CronController tests call the HTTP endpoint, not artisan commands directly.

| Command | File |
|---|---|
| `syncBhrLeaves` | `Console/Commands/syncBhrLeaves.php` |
| `SyncBhrUsersPhoto` | `Console/Commands/SyncBhrUsersPhoto.php` |
| `syncEvoxAlterLog` | `Console/Commands/syncEvoxAlterLog.php` |
| `syncEvoxChangeSchedule` | `Console/Commands/syncEvoxChangeSchedule.php` |
| `syncEvoxDefaultSchedule` | `Console/Commands/syncEvoxDefaultSchedule.php` |
| `syncEvoxDtr` | `Console/Commands/syncEvoxDtr.php` |
| `syncEvoxOvertime` | `Console/Commands/syncEvoxOvertime.php` |
| `syncEvoxRestDayWork` | `Console/Commands/syncEvoxRestDayWork.php` |

---

### Helpers — Tier 3 Summary

| Helper | Coverage | Missing |
|---|---|---|
| `date_helper` | 66% 1/21 | **20 of 21 functions** — largest helper gap by count |
| `parse_helper` | 43% 3/7 | 4 functions |
| `sql_helper` | 53% 4/7 | 3 functions |
| `schedule_helper` | 63% 0/4 | All 4 functions — none covered |
| `validator_helper` | 67% 2/3 | 1 function |
| `user_helper` | 86% 2/6 | 4 functions |

### Other Tier 3 Classes (misc)

| Class | Coverage | Missing methods |
|---|---|---|
| `Department\Models\Department` | 75% 6/8 | `getCompleteName`, `departments_on_schedule_is_active` |
| `Payroll\Models\DtrSummary` | 83% 5/6 | `check_if_rest_day_work` |
| `Department\Http\Controllers\DepartmentController` | *(partial)* | Various |
| `Exports\DpaListExport` | 67% 2/3 | 1 export method |
| `Jobs\AssignAllUserToAdminJob` | 50% 1/2 | `handle()` |
| Various `Mail\*` classes | 50% 1/2 | `build()` or `content()` |

---

## Tier 4 — 80–99% Coverage (12 classes)

Small gaps — each class is mostly tested, with 1–6 methods missing.

| Class | Coverage | ❌ Missing methods | Note |
|---|---|---|---|
| `Request\Traits\ApprovalTrait` | 80% 8/10 | `isCanceled` | State-check method |
| `Auth\LoginController` | 80% 4/5 | `handleMSCallback` | Microsoft SSO callback |
| `DepartmentController` | 82% 9/11 | `set_active_on_sched`, `get_department_all` | Admin schedule toggle + list endpoint |
| `EmployeeAttendanceReportExport` | 82% 9/11 | `daydate`, `newline` | Excel formatting helper methods |
| `RequestController` | 83% 10/12 | `bulkRequest`, `requestValidityChecker` | Bulk action + validation check |
| `CronController` | 86% 6/7 | `initial_sync_of_users` | One-shot deploy method, not in regular cron |
| `AlterLogController` | 90% 9/10 | `insertToAlterLogDispute` | Dispute conversion endpoint |
| `UserController` | 91% 39/43 | `register`, `getAllAssets`, `getUserAssets`, `addUserAsset` | User registration + asset management endpoints |
| `Dtr` model | 89% 52/58 | `checkUndertime`, `isTimedOutBeforeSchedule`, `isTimedOutBetweenSchedule`, `isTimedOutAfterSchedule`, `summary_report_short` | Undertime/timeout state-check methods |
| `User` model | 95% 39/41 | 2 Eloquent relationship/helper methods | Minor |
| `ScheduleRepository` | 94% 17/18 | 1 method | Minor |
| `DtrController` | 88% 7/8 | `dtr_single_punch` | Single-punch DTR entry endpoint |

---

## Summary — Where the 167 Missing Methods Come From

```
╔══════════════════════════════════════════════════════════════╦════════╦══════════╗
║ Category                                                     ║Missing ║ Priority ║
╠══════════════════════════════════════════════════════════════╬════════╬══════════╣
║ Approval workflow (approve/decline/pending/cancel × 5 repos) ║  20    ║ 🔴 HIGH  ║
║ DtrRepository transformation methods                         ║  17    ║ 🔴 HIGH  ║
║ date_helper (20 of 21 functions)                             ║  20    ║ 🟡 Low   ║
║ AnnouncementRepository                                       ║   7    ║ 🟠 Med   ║
║ PoliciesDocumentController (prod bugs)                       ║   6    ║ 🔴 HIGH* ║
║ HrController (prod bugs)                                     ║   5    ║ 🔴 HIGH* ║
║ ReportController (exports + advanced reports)                ║   6    ║ 🟠 Med   ║
║ DisputeController                                            ║   6    ║ 🟠 Med   ║
║ UserRepository (BHR sync methods)                            ║   6    ║ 🟠 Med   ║
║ EmailRepository (supervisor reminder emails)                 ║   5    ║ 🟠 Med   ║
║ BhrRepository (sync/holiday methods)                         ║   5    ║ 🟡 Low   ║
║ AuthController (mobile/client SSO)                           ║   3    ║ 🟠 Med   ║
║ Console Commands handle() × 8                                ║   8    ║ 🟡 Low   ║
║ Auth scaffold controllers (unused path)                      ║   6    ║ 🟡 Low   ║
║ Middleware (PermissionMiddleware)                             ║   1    ║ 🔴 High  ║
║ TeamRepository                                               ║   5    ║ 🟠 Med   ║
║ PayrollCutoffRepository (write path)                         ║   3    ║ 🟠 Med   ║
║ Helpers (parse/sql/schedule/user/etc)                        ║  ~15   ║ 🟡 Low   ║
║ Small gaps in Tier 4 (12 classes)                            ║  ~20   ║ 🟡 Low   ║
║ Resources toArray × 5                                        ║   5    ║ 🟡 Low   ║
║ Features, misc                                               ║   ~3   ║ 🟡 Low   ║
╠══════════════════════════════════════════════════════════════╬════════╬══════════╣
║ TOTAL                                                        ║  ~167  ║          ║
╚══════════════════════════════════════════════════════════════╩════════╩══════════╝

* Prod bugs — Cat 4. Dev team fix required before tests can be written.
```

---

## Top 3 High-Value Targets

### 1. Approval Workflow — 20 methods, 5 repositories 🔴 Security Critical

Write tests that:
- Have a **Supervisor** (not the Employee who submitted) call `approve` / `decline`
- Assert the correct status change and email notification
- Optionally: assert that the Employee role **cannot** call approve on their own request

**Pattern for all 5 repos** (AlterLog, AlterLogPunch, ChangeSchedule, Overtime, RestDayWork):
```php
// Submit as Employee
$result = $repo->store($employeeId, $payload);

// Approve as Supervisor
$approved = $repo->approve($result->id, $supervisorId, $note);
$this->assertEquals('approved', $approved->status);

// Decline path
$declined = $repo->decline($result->id, $supervisorId, $note);
$this->assertEquals('declined', $declined->status);
```

---

### 2. DtrRepository Transformation Methods — 17 methods 🔴 Core Payroll Engine

Write integration tests that:
- Set up a user with a schedule and biometrics punch
- Call each transformation method (`apply_schedule_to_dtr`, `apply_alter_log_to_dtr`, `bind_holidays_to_dtr`, etc.)
- Assert the resulting DTR record reflects the transformation

These are already partially covered in `DtrRepositoryIntegration2Test` — extend that file.

---

### 3. `date_helper` — 20 functions 🟡 Cheapest Win

Pure functions with no DB dependency. Each test is:
```php
$this->assertEquals(expected, function_name(input));
```
20 functions × ~3 cases each = 60 assertions, all passing in milliseconds. Easy coverage gain.

---

*Report generated from Aug 24 2026 PHPUnit run — evoxtest_phpunit.xml · 4,138 tests · 3.84 hrs*  
*Whitelist updated 2026-08-25: decommissioned code excluded, methods/classes denominators reduced by 61/15*
