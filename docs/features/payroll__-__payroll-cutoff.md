# Feature: Payroll Cutoff Management

**Status: VERIFIED by Gary Aure on 2026-04-27 (EVOX-11)**
**Module:** Payroll
**Priority:** P0 — Critical

## Description

Admins define payroll cutoff periods that determine pay windows. All DTR viewing, request validation, and dispute detection reference the active cutoff period. Country-specific cutoff tables exist for India and Morocco.

## User Personas

| Role | Access |
|---|---|
| admin | Full CRUD on payroll cutoffs (requires `manage_payroll_cutoff` permission) |
| payroll | View payroll cutoffs |

## User Flow

1. Admin navigates to `/app/admin/PayrollCutoff/`
2. Views list of cutoff periods: `GET /payroll/cutoff/all`
3. Creates new cutoff: name, start_date, end_date
4. `POST /payroll/cutoff/`
5. Cutoff becomes available for DTR filtering and request validation

## API Endpoints

| Method | URI | Middleware | Purpose |
|---|---|---|---|
| GET | `/api/payroll/cutoff/all` | jwtauth, auth.apikey | List all cutoffs |
| GET | `/api/payroll/cutoff/get_filter_for_dtr/{user_id}` | jwtauth, auth.apikey | Get DTR filter options |
| GET | `/api/payroll/cutoff/{id}` | jwtauth, auth.apikey | Get single cutoff |
| POST | `/api/payroll/cutoff/` | jwtauth, auth.apikey | Create cutoff |
| PUT | `/api/payroll/cutoff/{id}` | jwtauth, auth.apikey | Update cutoff |
| DELETE | `/api/payroll/cutoff/{id}` | jwtauth, auth.apikey | Delete cutoff |

## Business Rules

1. Cutoff matching: `start_date <= given_date AND end_date >= given_date`
2. Fallback: if no matching cutoff, use latest by `end_date DESC`
3. **India (country_id=1) and Morocco (country_id=4):** use `EVOX_IND_PAYROLL_CUTOFF` table (model at `app/EvoxIndiaPayrollCutoff.php`, NOT in Modules/Payroll/Models/)
4. **Philippines and others:** use standard `payroll_cutoffs` table
5. DTR filter shows cutoffs >= user's `date_hired` — **only for Philippines/others**. India/Morocco cutoffs do NOT filter by `date_hired`
6. Request dispute detection uses cutoff boundaries

## Frontend Components

- `client/src/container/Admin/PayrollCutoff/`
- `client/src/store/actions/admin/payrollCutoffActions.js`

## Backend Components

- `server/app/Modules/Payroll/Http/Controllers/PayrollCutoffController.php`
- `server/app/Modules/Payroll/Repositories/PayrollCutoffRepository.php`
- `server/app/Modules/Payroll/Models/PayrollCutoff.php`
- `server/app/Modules/Payroll/Models/EvoxIndiaPayrollCutoff.php`

## Known Issues / TODO

- [x] Verify: Can cutoffs overlap? What happens if two cutoffs cover the same date? The app is prone to cutoff overlap,, it could affect request validity for dispute checking.
- [x] Verify: Is there validation preventing deletion of a cutoff that has processed payroll? No, removed cutoff does not affect the flow; but missing cutoff will keep users from filtering their DTR for the affected dates.
