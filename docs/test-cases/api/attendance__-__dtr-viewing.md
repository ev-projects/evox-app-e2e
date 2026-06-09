# API Test Cases – DTR (Daily Time Record) Viewing (EVOX-11)

## Feature Information

| Field    | Value                               |
| -------- | ----------------------------------- |
| Feature  | DTR (Daily Time Record) Viewing     |
| Module   | Payroll                             |
| Priority | P0 - Critical                       |
| Status   | VERIFIED by Gary Aure on 2026-04-27 |
| Ticket   | EVOX-11                             |

---

## Test Generation Instructions

### Authentication Requirements

All endpoints require:

```http
Authorization: Bearer <VALID_JWT>
X-Authorization: <VALID_API_KEY>
```

### Middleware Coverage Requirements

For every endpoint generate tests for:

* Valid JWT + API Key
* Missing JWT
* Invalid JWT
* Expired JWT
* Missing X-Authorization
* Invalid X-Authorization

### Critical Verification Requirements

Verify that:

* `SP_DTR_By_UserId` is executed for DTR retrieval
* Country-specific cutoff source is selected correctly
* Cutoff periods are filtered based on employee hire date
* Summary calculations match DTR records

---

# Test Data Matrix

| Scenario                         | User Type   |
| -------------------------------- | ----------- |
| Employee                         | employee    |
| Supervisor                       | supervisor  |
| Team Leader                      | team_leader |
| HR User                          | hr          |
| Payroll User                     | payroll     |
| Admin User                       | admin       |
| India Employee                   | employee    |
| Morocco Employee                 | employee    |
| New Hire                         | employee    |
| Employee With Overtime           | employee    |
| Employee With Night Differential | employee    |
| Employee With Late Logs          | employee    |
| Employee With Undertime          | employee    |

---

# DTR Retrieval API

## Endpoint

GET `/api/dtr/{user_id}/{start}/{end}`

---

## DTR-001 Retrieve DTR Records Successfully

### Preconditions

* Valid user exists
* DTR records exist

### Expected Result

```http
200 OK
```

### Assertions

* Response contains `dtr_records`
* Response contains `summary`
* Records returned within requested range

---

## DTR-002 Empty DTR Period

### Preconditions

No attendance records exist.

### Expected Result

```http
200 OK
```

### Assertions

```json
{
  "dtr_records": []
}
```

* Summary still returned

---

## DTR-003 Verify Stored Procedure Execution

### Assertions

* `SP_DTR_By_UserId` executed
* Procedure receives correct user_id
* Procedure receives correct start date
* Procedure receives correct end date

---

## DTR-004 Single Day Retrieval

### Request

```http
GET /api/dtr/1001/2026-04-01/2026-04-01
```

### Assertions

* One day returned
* Summary calculated correctly

---

## DTR-005 Large Date Range Retrieval

### Preconditions

90+ day range.

### Assertions

* Records returned successfully
* No timeout
* Summary generated

---

## DTR-006 Invalid User ID

### Expected Result

Verify actual behavior.

### Assertions

* Empty response OR error response documented

---

## DTR-007 Invalid Date Range

### Request

```http
GET /api/dtr/1001/2026-05-01/2026-04-01
```

### Assertions

Document actual behavior.

---

# Punch Records API

## Endpoint

GET `/api/dtr/punch/{user_id}/{start}/{end}`

---

## PUNCH-001 Retrieve Punch Records

### Expected Result

```http
200 OK
```

### Assertions

* Punch records returned
* Records belong to requested employee

---

## PUNCH-002 Empty Punch Records

### Preconditions

No punches exist.

### Assertions

* Empty array returned

---

## PUNCH-003 Date Range Filtering

### Assertions

* Only requested period returned

---

# DTR With Punches API

## Endpoint

GET `/api/dtr/dtrpunch/{user_id}/{start}/{end}`

---

## DTRPUNCH-001 Retrieve DTR With Punches

### Assertions

* DTR records returned
* Punch details included

---

## DTRPUNCH-002 Verify DTR-Punch Mapping

### Assertions

* Punches correctly linked to DTR dates

---

# Incomplete Logs API

## Endpoint

GET `/api/dtr/incomplete_logs`

---

## INC-001 Retrieve Incomplete Logs

### Expected Result

```http
200 OK
```

### Assertions

* Records with missing IN or OUT identified

---

## INC-002 No Incomplete Logs

### Assertions

* Empty collection returned

---

# Payroll Cutoff Filter API

## Endpoint

GET `/api/payroll/cutoff/get_filter_for_dtr/{user_id}`

---

## CUTOFF-001 Retrieve Cutoff Filters

### Expected Result

```http
200 OK
```

### Assertions

* Years returned
* Months returned
* Cutoff periods returned

---

## CUTOFF-002 Filter Based On Hire Date

### Preconditions

Employee hired recently.

### Assertions

* No cutoff before hire date returned

---

## CUTOFF-003 India Employee Cutoff Source

### Preconditions

Employee country = India.

### Assertions

* Uses `evox_india_payroll_cutoffs`

---

## CUTOFF-004 Morocco Employee Cutoff Source

### Preconditions

Employee country = Morocco.

### Assertions

* Uses `evox_india_payroll_cutoffs`

---

## CUTOFF-005 Standard Employee Cutoff Source

### Preconditions

Employee country ≠ India/Morocco.

### Assertions

* Uses `payroll_cutoffs`

---

# Payroll Calculation Verification

## CALC-001 Late Calculation

### Preconditions

```text
Expected IN = 08:00
Actual IN = 08:15
allow_late = true
```

### Assertions

```text
Late = 15 minutes
```

---

## CALC-002 Late Disabled

### Preconditions

```text
allow_late = false
```

### Assertions

```text
Late = 0
```

---

## CALC-003 Undertime Calculation

### Preconditions

```text
Expected OUT = 17:00
Actual OUT = 16:30
allow_undertime = true
```

### Assertions

```text
Undertime = 30 minutes
```

---

## CALC-004 Undertime Disabled

### Preconditions

```text
allow_undertime = false
```

### Assertions

```text
Undertime = 0
```

---

## CALC-005 Flexible Schedule Undertime

### Preconditions

Flexible schedule employee.

### Assertions

* All 3 undertime paths execute correctly

---

## CALC-006 Night Differential Standard Case

### Preconditions

```text
Work Time:
22:00 - 06:00
```

### Assertions

* Night diff calculated correctly

---

## CALC-007 Night Differential Partial Overlap

### Preconditions

```text
21:00 - 23:00
```

### Assertions

```text
Night diff = 1 hour
```

---

## CALC-008 Night Differential With Break

### Preconditions

Night shift includes break.

### Assertions

* Proportional midnight split logic applied

---

## CALC-009 Overtime Approved

### Preconditions

Approved OT request exists.

### Assertions

* OT value included in summary

---

## CALC-010 Overtime Not Approved

### Preconditions

No approved OT request.

### Assertions

```text
Overtime = 0
```

---

## CALC-011 Rendered Hours Calculation

### Preconditions

```text
Time In = 08:00
Break Start = 12:00
Break End = 13:00
Time Out = 17:00
```

### Assertions

```text
Rendered Hours = 8
```

---

# Summary Verification

## SUM-001 Summary Totals Match Records

### Assertions

* Total hours equals sum of records
* Total late equals sum of records
* Total undertime equals sum of records
* Total overtime equals sum of records

---

## SUM-002 Absence Calculation

### Preconditions

Missing attendance days.

### Assertions

* Absences counted correctly

---

# Authentication Tests

## AUTH-001 Missing JWT

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "token_absent"
}
```

---

## AUTH-002 Invalid JWT

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "token_invalid"
}
```

---

## AUTH-003 Expired JWT

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "token_expired"
}
```

---

## AUTH-004 Missing API Key

### Expected Result

```http
401 Unauthorized
```

### Assertions

auth.apikey blocks request.

---

## AUTH-005 Invalid API Key

### Expected Result

```http
401 Unauthorized
```

### Assertions

auth.apikey blocks request.

---

# Coverage Summary

| Area                       | Covered |
| -------------------------- | ------- |
| DTR Retrieval              | ✓       |
| Stored Procedure Execution | ✓       |
| Punch Retrieval            | ✓       |
| DTR + Punch View           | ✓       |
| Incomplete Logs            | ✓       |
| Cutoff Filters             | ✓       |
| Hire Date Filtering        | ✓       |
| Country Payroll Rules      | ✓       |
| Late Calculation           | ✓       |
| Undertime Calculation      | ✓       |
| Flexible Schedule Logic    | ✓       |
| Night Differential         | ✓       |
| Overtime                   | ✓       |
| Rendered Hours             | ✓       |
| Summary Totals             | ✓       |
| JWT Middleware             | ✓       |
| API Key Middleware         | ✓       |
