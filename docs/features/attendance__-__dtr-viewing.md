# Feature: DTR (Daily Time Record) Viewing

**Status: VERIFIED by Gary Aure on 2026-04-27 (EVOX-11)**
**Module:** Payroll
**Priority:** P0 — Critical

## Description

Employees and supervisors view Daily Time Records showing attendance, work hours, late, undertime, overtime, and night differential per day. DTR is the core data feeding payroll calculations.

## User Personas

| Role | Access |
|---|---|
| employee | View own DTR |
| supervisor | View team DTR + export |
| team_leader | View team DTR |
| hr | View attendance records |
| payroll | View DTR for payroll processing |
| admin | View all DTR |

## User Flow

1. User navigates to `/app/dtr/:id`
2. System loads payroll cutoff filters: `GET /payroll/cutoff/get_filter_for_dtr/:user_id`
3. Filters organized by year → month → cutoff period
4. User selects payroll cutoff period
5. System fetches DTR: `GET /dtr/:user_id/:from/:to`
6. Response includes: `dtr_records` array + `summary` object
7. Display: Date, Time In, Time Out, Hours Worked, Status per day
8. Summary: Total hours, overtime, undertime, absences

## API Endpoints

| Method | URI | Middleware | Purpose |
|---|---|---|---|
| GET | `/api/dtr/{user_id}/{start}/{end}` | jwtauth, auth.apikey | Get DTR records |
| GET | `/api/dtr/punch/{user_id}/{start}/{end}` | jwtauth, auth.apikey | Get punch records |
| GET | `/api/dtr/dtrpunch/{user_id}/{start}/{end}` | jwtauth, auth.apikey | Get DTR with punches |
| GET | `/api/dtr/incomplete_logs` | jwtauth, auth.apikey | Get incomplete DTR logs |
| GET | `/api/payroll/cutoff/get_filter_for_dtr/{user_id}` | jwtauth, auth.apikey | Get payroll period filter |

## Business Rules

1. DTR uses stored procedure `SP_DTR_By_UserId` for complex calculations
2. Country-specific cutoff: India/Morocco use `evox_india_payroll_cutoffs`, others use `payroll_cutoffs`
3. Cutoff periods filtered to only show those >= user's `date_hired`
4. DTR computation sequence: Generate → Apply Schedule → Sync Biometrics → Bind Holidays → Bind Leaves → Apply Alter Logs → Apply Rest Day Work → Apply Overtime → Compute Payroll Items

## Payroll Items Calculated

| Item | Condition | Formula |
|---|---|---|
| Late | `allow_late` policy = true, not holiday | `time_in - expected_time_in` (no grace period) |
| Undertime | `allow_undertime` policy = true, not holiday | `expected_end - time_out` (3 paths for flexible) |
| Night diff | `allow_night_diff` = true, 22:00-06:00 window | Overlap of work period with night window |
| Overtime | Approved OT request exists | Pre-OT or Post-OT amount from request |
| Rendered hours | Always | `(break_start - time_in) + (time_out - break_end)` |

## Frontend Components

- `client/src/container/DailyTimeRecord/DailyTimeRecord.js`
- `client/src/store/actions/dtr/dtrActions.js`
- `client/src/store/reducers/dtr/dtrReducers.js`

## Backend Components

- `server/app/Modules/Payroll/Http/Controllers/DtrController.php`
- `server/app/Modules/Payroll/Repositories/DtrRepository.php` (raw SQL, Eloquent — does NOT call SP_DTR_By_UserId)
- `server/app/Modules/Payroll/Models/Computation.php`
- Stored procedure `SP_DTR_By_UserId` is called in **DtrController.php:77** and **ReportRepository.php:58**, NOT in DtrRepository

## Known Issues / TODO

- [x] Verify: Is the stored procedure `SP_DTR_By_UserId` documented anywhere? No
- [x] Verify: Flexible schedule undertime — are all 3 calculation paths working correctly? Yes
- [x] Verify: Night diff break time deduction — proportional midnight split logic? Yes
