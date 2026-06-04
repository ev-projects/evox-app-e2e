# Feature: Clock In / Clock Out (Quickpunch)

**Status: VERIFIED by Gary Aure on 2026-04-27 (EVOX-11)**
**Module:** Payroll (DTR)
**Priority:** P0 — Critical

## Description

Employees clock in and out using the Quickpunch feature on the top navigation bar. Two modes exist with **different code paths**:
- **Single quickpunch:** Writes to `dtrs` table's `time_in` or `time_out` column via `apply_biometrics_to_dtr` from collection of Biometrics model.
- **Multi quickpunch:** Writes to `DtrPunchHistory` records via `apply_punch_to_history` — completely different path

## User Personas

| Role | Access |
|---|---|
| employee | Can quickpunch (`allow_quickpunch` permission exists in DB but is NOT enforced at API level — only frontend show/hide) |
| All roles | Can view their own punch history |

## User Flow — Single Quickpunch

1. Employee clicks Quickpunch button on top navigation bar
2. Frontend calls `POST /api/dtr/quickpunch`
3. Punch recorded in `dtrs` table from Biometrics model with CheckType 'I' (In) or 'O' (Out)
4. Employee number stored with "20" prefix: `'20' + emp_num`
5. `sync_biometrics_to_dtr` matches punch to DTR record:
   - Matches by employee number + time range (schedule window, +/- 6 hours)
   - 'I' or 'C' → sets `time_in`
   - 'O' or 'P' → sets `time_out`
6. If no DTR exists for the punch date → auto-generation triggered:
   - New hire (hired within last 30 days): generates 30 days starting from `date_hired`
   - Otherwise: generates 23 days starting from 7 days before the punch time
7. Payroll items recomputed after DTR update via `compute_payroll_items()`

## User Flow — Multi Quickpunch

1. Employee navigates to Multi Clock-in page
2. The user can Clock-in, Pause, Continue, and/or Clock-out
3. The system checks the employee’s current status:
   - No active work yet
   - Currently working
   - Currently paused
   - Already finished for the day
4. The system decides what action is allowed based on that status
5. If the action is valid:
   - Start a new work session
   - OR update the current session
   - OR resume a paused session
6. If the action is not valid:
   - The system ignores or rejects the punch
7. The system saves the result in the attendance record
8. The process repeats for every new punch

## API Endpoints

| Method | URI | Middleware | Purpose |
|---|---|---|---|
| POST | `/api/dtr/quickpunch` | jwtauth, auth.apikey | Single clock in/out |
| POST | `/api/dtr/quickpunch_multi` | jwtauth, auth.apikey | Multi-login clock in/out |

Middleware confirmed: both routes are inside `Route::group(['prefix' => 'dtr', 'middleware' => ['jwtauth', 'auth.apikey']])` at `server/app/Modules/Payroll/Routes/api.php:18`.

## Business Rules

1. **Authentication required** — routes protected by `jwtauth, auth.apikey` group middleware (verified via production curl + route file)
2. **`allow_quickpunch` permission NOT enforced at API level** — exists in DB (migration `2021_01_22_031848`) but no middleware or gate checks it. Frontend route protection is doing the restriction.
3. **Single quickpunch CheckTypes:** 'I' (In) and 'O' (Out) only
4. **Multi quickpunch CheckTypes:** 'I' (In), 'O' (Out), 'P' (Pause), 'C' (Continue)
5. **CheckType mapping:** 'I' and 'C' → `time_in` | 'O' and 'P' → `time_out` (via `Biometrics.php:28-42`)
6. **Employee number prefix:** "20" prepended to `emp_num` for storage, stripped on retrieval via `parse_emp_num_for_evox()` (`parse_helper.php:33-40`)
7. **Auto-DTR generation:** triggered when no DTR exists for punch date
8. **Single vs Multi are completely different code paths** — do not conflate them

## Validation Rules

- No Laravel FormRequest validation on either endpoint
- Controller checks `$request->quickpunch` value directly (in/out) and throws exception for unknown values
- Authentication enforced via group middleware (JWT + API key required)

## Frontend Components

- `client/src/components/Dashboard/QuickPunch/QuickPunch.js` (single)
- `client/src/components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch.js` (multi)
- `client/src/components/Template/NavQuickPunch/NavQuickPunch.js` (nav bar)
- `client/src/store/actions/dtr/quickpunchActions.js` (`biometrixLog` for single, `biometrixLogMulti` for multi)

## Backend Components

- `server/app/Modules/Payroll/Http/Controllers/DtrController.php` (`quickpunch` at line 383, `quickpunch_multi` at line 432)
- `server/app/Modules/Payroll/Repositories/DtrRepository.php` (`sync_biometrics_to_dtr` at line 1381 — single only)
- `server/app/Modules/Payroll/Models/Biometrics.php` (table: `checkinout`, connection: `biometrix`).
**Comment:** Biometrics model is not stored in the DB, we iterate on the collection and save/update to `dtrs` table.
- `server/app/Modules/Payroll/Models/DtrPunchHistory.php` (multi-login punch storage)

## Known Issues / TODO

- [x] ~~SECURITY: Quickpunch has no auth middleware~~ — **CORRECTED:** Routes ARE protected
- [x] ~~Table name~~ — **CORRECTED:** Table is `checkinout` on `biometrix` connection, not "biometrics". This table is not used, Biometrics instances are not stored in the DB; they are directly sync to `dts` table.
- [x] ~~Frontend paths~~ — **CORRECTED:** Actual file is `quickpunchActions.js` with `biometrixLog`/`biometrixLogMulti`
- [x] ~~Multi-login code path~~ — **CORRECTED:** Uses `apply_punch_to_history`, NOT `sync_biometrics_to_dtr`
- [x] Verify: How does the system handle duplicate punches (same user, same time)? It will apply the most latest punch, no protect applied in the API. Frontend performs show/hide of Clock-in and Clock-out buttons.
- [x] Verify: Is `allow_quickpunch` permission checked anywhere in the frontend before showing the button? NO, Frontend disabled Clock-in button if the use has Multi Quickpunch feature; and if the user type is Client.
