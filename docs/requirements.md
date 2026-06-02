# EVOX Business Rules

**Status: DRAFT — adversarial review complete, corrections applied 2026-04-17**
**Generated:** 2026-04-16
**Ticket:** EVOX-14
**Source:** Deep scan of validators, repositories, models, controllers, constants, migrations

---

## Overview

This document extracts all business rules embedded in the EVOX codebase: validation rules, status lifecycles, calculation formulas, authorization checks, edge cases, and error handling. Organized by module.

---

## 1. Authentication & User Management

### 1.1 Login Rules

| Rule | Detail | File |
|---|---|---|
| Username or email accepted | If input matches email format → query by `email`, else by `username` | `AuthController.php` |
| User must exist | Returns 404 "user_email_not_found" or "user_name_not_found" | `AuthController.php` |
| Password verified | `auth()->attempt($credentials)` — returns 404 "user_password_incorrect" | `AuthController.php` |
| User must be active | If `is_active=false`, checks `termination_date` | `AuthController.php` |
| Termination grace period | Can still login for 1 day after `termination_date`. After that → 404 "user_not_active" | `AuthController.php` |
| Force password change | If `force_change_password=true`, frontend redirects to change password screen | `ProtectedRoutes.js` |
| Microsoft OAuth supported | Gets token from MS OAuth → calls Graph API `/me` → matches by email | `AuthController.php` |

### 1.2 JWT Token Rules

| Setting | Value |
|---|---|
| Algorithm | HS256 |
| TTL (time to live) | 60 minutes |
| Refresh TTL | 14 days (20,160 minutes) |
| Blacklist enabled | Yes |
| Grace period | 0 seconds |
| Token errors | `token_expired` (401), `token_invalid` (401), `token_absent` (401) |

### 1.3 Password Rules

| Rule | Detail |
|---|---|
| Minimum length | 6 characters |
| Maximum length | 255 characters |
| Confirm must match | `confirm_new_password` must exactly equal `new_password` |
| Current password verified | Must pass `auth()->attempt()` before allowing change |
| Forgot password | Generates 8-char random temp password, sets `force_change_password=true` |
| Default BHR password | `{ev2010}` — used for all BHR-synced users initially |

### 1.4 User Registration Rules

**Admin-initiated registration:**
- Required: `first_name`, `last_name`, `email` (unique), `roles[]`, `departments_handled[]`
- Generates 8-char random temp password
- Sets `force_change_password=true`, `is_active=true`, `employment_status='Registered User'`
- Auto-assigns role permissions
- Sends welcome email with temp password

**BHR sync registration:**
- Must have valid email from BHR
- Password set to default `{ev2010}`
- Auto-assigned `employee` role + permissions
- `user_multi_login` permission explicitly **revoked**
- Department auto-generated from BHR data

### 1.5 Role Assignment Rules

- If `admin` role assigned without `supervisor` → `supervisor` auto-added
- Admin role inherits all supervisor permissions automatically
- Roles synced (replaced, not appended): `$user->syncRoles($roles_array)`
- Permissions synced similarly: `$user->syncPermissions($permissions_array)`

### 1.6 User Model Constraints

- **Fillable = []** (empty) — no mass assignment allowed, all fields set explicitly
- **Soft deletes** enabled — users never permanently deleted
- **Hidden fields**: `password` (never in API responses)
- **Foreign key**: `department_id` → `departments.id` (ON DELETE SET NULL)

---

## 2. Request Module

### 2.1 Validation Rules Per Request Type

**Overtime:**
| Field | Rules |
|---|---|
| `date` | required, Y-m-d format, unique per user (soft-delete aware) |
| `user_id` | required, must exist in users |
| `type` | required, must be `pre_overtime` or `post_overtime` |
| `amount` | required, H:i format (converted to seconds) |
| `employee_note` | optional, max 255 chars |

**Alter Log:**
| Field | Rules |
|---|---|
| `date` | required, Y-m-d format, unique per user |
| `user_id` | required, must exist in users |
| `new_time_in` | required, Y-m-d H:i:s format |
| `new_time_out` | required, Y-m-d H:i:s format |
| `employee_note` | **required**, max 255 chars |

**Change Schedule:**
| Field | Rules |
|---|---|
| `valid_from` | required, Y-m-d format |
| `valid_to` | required, Y-m-d format, must be >= valid_from |
| `employee_note` | optional, max 255 chars |

**Rest Day Work:**
| Field | Rules |
|---|---|
| `date` | required, Y-m-d format, unique per user |
| `user_id` | required, must exist in users |
| `start_time` | required, H:i format |
| `end_time` | required, H:i format |
| `break_time` | required, H:i format, **max 1 hour** (custom ValidBreakTime rule) |

### 2.2 Request Status Lifecycle

**Valid statuses:** `pending`, `approved`, `declined`, `canceled`

**Transitions:**

| From | To | Who | Side Effects |
|---|---|---|---|
| (new) | pending | Employee (create) | Email sent to supervisor |
| pending | approved | Direct supervisor only | DTR recomputed, payroll items recalculated |
| pending | declined | Direct supervisor only | DTR changes removed if previously applied |
| any | canceled | Request owner only | — |
| any | pending | Anyone (if not already pending) | — |

**Authorization checks:**
- `approve()`/`decline()`: `is_under_supervisee()` — logged-in user must be the employee's direct supervisor
- `cancel()`: `get_authenticated_user()` — logged-in user must own the request
- `update()`: Only request owner can update; resets status back to `pending`

### 2.3 Dispute Mode

**When a request becomes a dispute:**
1. Request date is older than 30 days → automatically invalid
2. Stored procedure `EV_SP_Validate_Request_Payroll_Period` returns `2` → dispute
3. Request falls outside current payroll cutoff window

**What happens:**
- Original request is automatically **DECLINED**
- New dispute record created via stored procedure (`EV_SP_PD_Autoamtion_*`)
- Supervisor notified via dispute email
- No DTR computation happens on the original

**Bulk approval with disputes:**
- Each request in bulk is individually checked for payroll validity
- If any become disputes, response message changes to "bulk_approve_with_dispute"
- Bulk operations do NOT send individual emails

### 2.4 Rest Day Work Special Rule

Before creating a Rest Day Work request:
- System checks if target date's DTR has `is_rest_day == 1`
- If `is_rest_day == 0` → error: "The Date requested/targeted is not a restday, if its a work day make an alter log instead."

### 2.5 Payroll Side Effects on Approval

| Request Type | On Approve | On Decline |
|---|---|---|
| Overtime | `compute_payroll_items()` — recalculates all payroll for that date | `compute_payroll_items()` — recalculates without OT |
| Alter Log | `apply_alter_log_to_dtr()` — updates time_in/time_out | `remove_alter_log_from_dtr()` — reverts changes |
| Rest Day Work | `apply_rest_day_work_to_dtr()` — overwrites schedule | `remove_rest_day_from_dtr()` — reverts |
| Change Schedule | `apply_schedule_to_dtr()` — for entire date range | `remove_schedule_to_dtr()` — only if previously approved |

**Exception:** If user has `multi_login` feature → skip DTR payroll computation on overtime approval.

### 2.6 Email Approval (No Login Required)

- Endpoint: `POST /api/request/approval` (API key only, no JWT)
- Hash code parsed to: `[table_name, record_id, recipient_id]`
- System temporarily logs in as recipient, performs approve/decline, logs out
- Supported tables: `overtimes`, `rest_day_works`, `alter_logs`, `change_schedules`

---

## 3. DTR / Payroll Calculations

### 3.1 Constants

| Constant | Value | Usage |
|---|---|---|
| `TIMESTAMP.minute` | 60 sec | Base unit |
| `TIMESTAMP.hour` | 3,600 sec | Hour calculations |
| `TIMESTAMP.eight_hours` | 28,800 sec | Max threshold for late/undertime/night diff |
| `TIMESTAMP.day` | 86,400 sec | Full day |
| Night diff start | 22:00 (10 PM) | Night differential window |
| Night diff end | 06:00 (6 AM) | Night differential window |
| Default work hours | 9 AM – 6 PM | With 1-hour break |
| Default work days | Mon–Fri | Sat/Sun are rest days |

### 3.2 DTR Computation Workflow (Sequence)

```
1. Generate DTR → creates empty records (user_id + date only)
2. Apply Schedule → fills in start/end times, break, policies
3. Sync Biometrics → populates time_in/time_out from punches
4. Bind Holidays → links holiday records
5. Bind Leaves → links approved leave records from BHR
6. Apply Alter Logs → updates time_in/time_out if corrections approved
7. Apply Rest Day Work → overwrites schedule if approved
8. Compute Payroll Items → calculates: late, undertime, night diff, overtime, rendered hours
```

Each step triggers payroll recomputation.

### 3.3 Late Calculation

**Conditions:** valid time-in + schedule exists + not a holiday + `allow_late` policy = true

**Formula:**
```
late = time_in - (expected_time_in + owner_offset_seconds)
# Note: owner_offset_seconds is the user's timezone offset. The doc previously omitted this.
# time_in is already adjusted by offset at Computation.php:61, but expected_time_in needs it added here.
late = late - timeoff_time (leave deduction)
if late < 0 → 0
if late > 28,800 sec (8 hrs) → 0
if half-day leave (0.5) → late = 0
```

**No grace period** — calculated from exact seconds.

### 3.4 Undertime Calculation

**Conditions:** valid time logs + schedule + not holiday + `allow_undertime` policy = true

**Standard schedule:**
```
if time_out < end_datetime:
    undertime = end_datetime - time_out
else:
    undertime = 0
```

**Flexible schedule:** Three cases based on when employee clocked in relative to flex window (before start, within flex, after flex start). Required work duration stays constant but window shifts.

**Adjustments:**
- Half-day leave: special calculation
- Full-day leave: `undertime = undertime - timeoff_time`
- Break time deduction: complex rule with half-day threshold
- Final: if `undertime < 0` or `undertime > required_time` → 0

### 3.5 Night Differential

**Window:** 22:00 – 06:00
**Conditions:** `allow_night_diff` policy = true + valid time logs

**Same-day shift:** Calculate overlap between work period and 22:00–06:00 window
**Overnight shift:** Split into Day 1 (time_in to midnight) and Day 2 (midnight to time_out), calculate night diff for each

**Validation:** if < 0 or > 28,800 sec → 0

### 3.6 Overtime Calculation

**Types:**
- **Pre-overtime:** Work before scheduled start → `overtime = actual_start - approved_amount` to `actual_start`
- **Post-overtime:** Work after scheduled end → `overtime = actual_end` to `actual_end + approved_amount`

**Must have approved overtime request.** Unapproved overtime is never computed.

**Overnight tagging:**
- `regular` — same day
- `underlapped` — overtime from previous day
- `overlapped` — overtime extending to next day

Overtime night differential calculated separately within overtime period.

### 3.7 Rendered Hours

**Formula:** `rendered_hours = (break_start - time_in) + (time_out - break_end)`

Split around break period. For overnight shifts, split at midnight.

**Validation:** if < 0 or > required_work_time → 0

### 3.8 Schedule Priority (When Multiple Apply)

1. **Approved Rest Day Work** (highest priority)
2. **Temporary Schedule**
3. **Change Schedule** (from approved request)
4. **Default Schedule** (lowest priority)

### 3.9 Payroll Cutoff Rules

- **Philippines/others:** Uses `payroll_cutoffs` table. Matches where `start_date <= date AND end_date >= date`. Fallback: latest cutoff.
- **India (country_id=1) and Morocco (country_id=4):** Uses `evox_india_payroll_cutoffs` table, indexed by cutoff year and month.
- Cutoff periods filtered to show only those >= user's `date_hired`.

### 3.10 Holiday Rules

**Types:** Regular (`reg`), Rest Day (`rd`), Legal Holiday (`lh`), Double Legal (`dlh`), Special Holiday (`sh`), Double Special (`dsh`), Special+Legal (`slh`)

**Binding:**
- Predefined holidays: match by month-day (recurring annually)
- Non-predefined: match exact date
- Country-specific holidays override global ones

**Impact:** Holidays typically waive late/undertime but not overtime/night diff.

### 3.11 Leave Rules

**Leave amounts:** 0 = none, 0.5 = half-day, 1 = full-day
**Unpaid leave types:** Unpaid Leave, Work from Home, MGC Unpaid Call Out Days
**Unplanned leave types:** Unpaid Leave, Bereavement Leave, Sick Leave, MGC Unpaid Call Out Days

Half-day leaves affect late/undertime calculations differently from full-day.

### 3.12 Timezone Handling

All DTR times are adjusted by user's country timezone offset before computation:
```
offset = string_offset_to_seconds(user.country_timezone_to_offset())
All time fields += offset
```

Critical for multi-country payroll accuracy.

---

## 4. Schedule Module

### 4.1 Schedule Types

| Type | Description |
|---|---|
| `standard` | Fixed work hours, no flexibility |
| `flexible` | Variable start/end within defined windows |
| `customize` | Flexible with optional flexy hours |
| `empty` | No schedule (placeholder) |

### 4.2 Source Types

| Source | Description |
|---|---|
| `default` | Primary employee schedule (one per user) |
| `temporary` | Time-bound schedule (valid_from to valid_to) |
| `template` | Reusable admin template |
| `change_schedule` | Created from approved change schedule request |

### 4.3 Validation Rules

| Field | Rules |
|---|---|
| `name` | required, string, max 255 |
| `source_type` | required, must be `template` or `change_schedule` |
| `schedule_type` | required, must be `standard`, `flexible`, `customize`, or `empty` |
| `bind_to` | `user` or `department` |
| `valid_from/to` | required for non-template source types, Y-m-d format |
| `work_days` | array of day abbreviations |
| `schedule_policies.*` | boolean values for `allow_late`, `allow_undertime`, `allow_night_diff` |
| `schedule_holiday_policies.*` | boolean values for `allow_special_holiday`, `allow_legal_holiday` |

### 4.4 Assignment Rules

- **User assignment:** Directly assigns + applies to DTR
- **Department assignment:** Copies schedule to each user in department + applies to all DTRs
- **Default schedule update:** If user already has default, update it (don't create duplicate)
- **Temporary schedule:** Check for existing date range; update if found, create if not
- **Schedule details/policies:** Hard-deleted and recreated on every update (complete replacement)

---

## 5. Department & Team

### 5.1 Department Rules

| Rule | Detail |
|---|---|
| Handler assignment | `user_id.*` must exist in users table. Uses sync (replaces all). |
| Deletion | Soft delete only. Sets `disabled_by` and `disabled_on`. |
| Two tables | `EVOX_DEPARTMENT` (legacy ERP) and `departments` (Laravel). Relationship unclear. |
| Active schedule | One active schedule per department via `department_on_schedules` table. |

### 5.2 Team Rules

| Field | Rules |
|---|---|
| `name` | required, string |
| `department_id` | required, must exist in departments |
| `team_handlers` | required array, each must exist in users |
| `team_users` | required array, each must exist in users |

**Constraints:**
- Team users must belong to the **same department** as the team
- Each user can only be in **one team** (unique constraint on `team_users.user_id`)
- Error: "{FullName} is not from this department selected" / "{FullName} has already a team"

---

## 6. Announcements

### 6.1 Validation

| Field | Rules |
|---|---|
| `release_date` | required, Y-m-d format |
| `expiry_date` | required, Y-m-d format |
| `title` | required, string |
| `link` | required if `on_link=true` |
| `selectedDepartments` | required if `set_all=0` |
| `country_id` | required if `set_country_all=0` |

### 6.2 Visibility Rules

- **Department announcements:** Scoped to `present_dep_id` (creator's department)
- **HR announcements:** Only visible to HR-level users
- **Global:** `set_all=1` makes visible to all departments
- **Country scope:** `set_country_all=0` limits to specific country
- **Expiry:** Only shown where `release_date <= today AND expiry_date > today`
- **Pagination:** 6 per page

---

## 7. COE (Certificate of Employment)

### 7.1 Rules

| Rule | Detail |
|---|---|
| Who can request | Employee (self) or Admin (for any employee via `employee_id`) |
| Required field | `purpose_index` (maps to COE_PURPOSES constant) |
| Sequence number | Generated via SP `EV_SP_COE_Generate_Sequence`. Format: `COE-{emp}-{template}-{YYYYMMDD}-{seq}` |
| Encrypted fields | `address`, `basic_pay`, allowance values — using Laravel `encrypt()` |
| PDF generation | `PDF::loadView('pdfs.coe')`, A4 portrait, streamed to browser |
| Compensation toggle | `show_compensation` flag controls whether salary is shown |

---

## 8. Email Notifications

### 8.1 Triggers & Timing

| Trigger | Job | Delay | Recipient |
|---|---|---|---|
| User registered | SendRegisteredUserEmailJob | 5 sec | New user |
| Forgot password | SendForgotPasswordRequestEmailJob | 5 sec | Requesting user |
| Overtime submitted | SendOvertimeRequestEmailJob | 5 sec | Direct supervisor |
| Alter log submitted | SendAlterLogRequestEmailJob | 5 sec | Direct supervisor |
| Rest day work submitted | SendRestDayWorkRequestEmailJob | 5 sec | Direct supervisor |
| Change schedule submitted | SendChangeScheduleRequestEmailJob | 5 sec | Direct supervisor |
| Overtime disputed | SendOvertimeDisputeEmailJob | 5 sec | Direct supervisor |
| Alter log disputed | SendAlterLogDisputeEmailJob | 5 sec | Direct supervisor |
| Rest day work disputed | SendRestDayWorkDisputeEmailJob | 5 sec | Direct supervisor |
| No schedule assigned | SendSupervisorReminderNoSchedEmailJob | 2 sec | Supervisor |
| New employees | SendSupervisorReminderOfNewUserEmailJob | 2 sec | Supervisor |
| Pending requests | SendSupervisorReminderRequestsEmailJob | 2 sec | Supervisor |
| Invalid check-ins | SendSupervisorReminderInvalidCheckInsEmailJob | **Immediate** | Supervisor |
| BHR sync failed | SendFailedBHRSyncNoticeJob | 2 sec | Supervisor |

All use queue system except invalid check-ins (dispatched immediately).

---

## 9. BHR Integration

### 9.1 API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `/employees/directory` | Get all employee BHR numbers |
| `/employees/changed?since={date}` | Get changed users since date |
| `/employees/{id}?fields={fields}` | Get employee details |
| `/employees/{id}/photo/medium` | Get profile picture (base64) |
| `/employees/{id}/tables/{field}` | Get job info tables |
| `/employees/{id}/time_off/calculator?end={date}` | Get leave credits |
| `/time_off/whos_out/?start={start}&end={end}` | Get who's on leave |
| `/time_off/requests/?start={start}&end={end}&employeeId={id}` | Get leave requests |
| `/reports/{id}?format=JSON` | Get reports |

### 9.2 Sync Rules

- Countries supported: Philippines, India, Bulgaria, Morocco, Belgium
- If sync fails: transaction rolled back, `SendFailedBHRSyncNoticeJob` dispatched
- Holiday type mapping: "(Regular)" in name → `lh` (Legal Holiday), others → `sh` (Special Holiday)
- Country extracted from holiday name via `[ACRONYM]` regex → mapped via UtcTimelog

---

## 10. Biometrics

### 10.1 Sync Rules

- Only `CheckType` of 'I' (In) or 'O' (Out) processed
- 'I' → `time_in`, 'O' → `time_out`
- Matched to DTR by employee number + time range (schedule window)
- If no DTR exists when punch received:
  - New hire (< 30 days): generates 30 days of DTR
  - Otherwise: generates 23 days prior + 7 future days
  - Then recursively applies biometric

---

## 11. Global Patterns

### 11.1 Transaction Safety

All repository methods wrap in `DB::beginTransaction()` / `DB::commit()` / `DB::rollback()`.

### 11.2 Soft Deletes

All main entities use soft deletes. Uniqueness checks include `whereNull('deleted_at')`.

### 11.3 Validation Error Response

All FormRequest classes override `failedValidation()` → throws `HttpResponseException` with HTTP 422 and all validator errors.

### 11.4 Activity Logging

All significant actions logged via `log_activity()`, `log_to_file()`, and `log_to_audit_trail()`.

### 11.5 Error Response Format

```
error_response($message, $extra_data, $http_code)
success_response($message, $data, $http_code)
```

HTTP codes: 200 (success), 201 (created), 401 (unauthorized), 404 (not found), 422 (validation), 403 (forbidden)

---

## Open Questions for Verification

1. **No grace period for late** — the code calculates late from exact seconds with no grace. Is there a grace period applied at the payroll/reporting level?
2. **Default password `{ev2010}`** — is this still the default for BHR-synced users? Security concern.
3. **Stored procedures** — several critical calculations use SPs (`SP_DTR_By_UserId`, `EV_SP_Validate_Request_Payroll_Period`, etc.). These are in the database, not the codebase. Need DB access to verify their logic.
4. **Flexible schedule undertime** — the calculation has complex branching based on clock-in time relative to flex window. Needs testing verification.
5. **Break time deduction in night diff** — proportional split across midnight. Needs testing verification.
