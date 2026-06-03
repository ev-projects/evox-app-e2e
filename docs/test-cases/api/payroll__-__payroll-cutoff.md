# API Test Cases – Payroll Cutoff Management (EVOX-11)

## Feature Information

| Field    | Value                               |
| -------- | ----------------------------------- |
| Feature  | Payroll Cutoff Management           |
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

### Permission Requirements

Cutoff modification endpoints require:

```text
manage_payroll_cutoff
```

Generate both:

* Authorized user scenarios
* Unauthorized user scenarios

### Critical Verification Requirements

Verify:

* Country-specific table selection
* Cutoff matching logic
* Fallback cutoff selection
* Hire date filtering behavior
* Overlapping cutoff handling

---

# Test Data Matrix

| Scenario                | Description                   |
| ----------------------- | ----------------------------- |
| Standard Payroll Cutoff | Philippines employee          |
| India Payroll Cutoff    | country_id = 1                |
| Morocco Payroll Cutoff  | country_id = 4                |
| Overlapping Cutoffs     | Multiple matching periods     |
| Employee Hired Recently | Hire date after older cutoffs |
| Missing Cutoff Period   | No matching cutoff            |

---

# List Payroll Cutoffs

## Endpoint

GET `/api/payroll/cutoff/all`

---

## CUTOFF-001 Retrieve All Cutoffs

### Expected Result

```http
200 OK
```

### Assertions

* Collection returned
* All active cutoffs included

---

## CUTOFF-002 Empty Cutoff Table

### Preconditions

No cutoff records.

### Expected Result

```http
200 OK
```

### Assertions

```json
[]
```

---

## CUTOFF-003 Verify Sort Order

### Assertions

* Returned order documented
* Consistent ordering enforced

---

# Get Single Cutoff

## Endpoint

GET `/api/payroll/cutoff/{id}`

---

## CUTOFF-010 Retrieve Existing Cutoff

### Expected Result

```http
200 OK
```

### Assertions

* Correct cutoff returned

---

## CUTOFF-011 Cutoff Not Found

### Expected Result

Verify actual application behavior.

### Assertions

* Error response OR empty result documented

---

# Create Payroll Cutoff

## Endpoint

POST `/api/payroll/cutoff/`

---

## CUTOFF-020 Create Valid Cutoff

### Request

```json
{
  "name": "April Cutoff A",
  "start_date": "2026-04-01",
  "end_date": "2026-04-15"
}
```

### Expected Result

```http
201 Created
```

### Assertions

* Record created
* Values persisted correctly

---

## CUTOFF-021 Create Overlapping Cutoff

### Preconditions

Existing cutoff:

```text
2026-04-01 → 2026-04-15
```

### Request

```json
{
  "name": "Overlap",
  "start_date": "2026-04-10",
  "end_date": "2026-04-25"
}
```

### Expected Result

Verify actual behavior.

### Assertions

* Overlap allowed
* Record successfully saved

---

## CUTOFF-022 Start Date Equals End Date

### Request

```json
{
  "name": "Single Day",
  "start_date": "2026-04-15",
  "end_date": "2026-04-15"
}
```

### Assertions

Document actual behavior.

---

## CUTOFF-023 End Date Before Start Date

### Request

```json
{
  "name": "Invalid",
  "start_date": "2026-04-20",
  "end_date": "2026-04-01"
}
```

### Assertions

Document actual validation behavior.

---

# Update Payroll Cutoff

## Endpoint

PUT `/api/payroll/cutoff/{id}`

---

## CUTOFF-030 Update Existing Cutoff

### Expected Result

```http
200 OK
```

### Assertions

* Values updated
* Existing ID preserved

---

## CUTOFF-031 Update To Overlapping Period

### Preconditions

Another cutoff already exists.

### Assertions

* Overlap permitted
* Update succeeds

---

## CUTOFF-032 Update Nonexistent Cutoff

### Assertions

Document actual behavior.

---

# Delete Payroll Cutoff

## Endpoint

DELETE `/api/payroll/cutoff/{id}`

---

## CUTOFF-040 Delete Existing Cutoff

### Expected Result

```http
200 OK
```

### Assertions

* Record removed

---

## CUTOFF-041 Delete Processed Payroll Cutoff

### Preconditions

Cutoff previously used in payroll.

### Assertions

* Deletion allowed
* No validation prevents removal

---

## CUTOFF-042 Delete Nonexistent Cutoff

### Assertions

Document actual behavior.

---

# DTR Filter API

## Endpoint

GET `/api/payroll/cutoff/get_filter_for_dtr/{user_id}`

---

## FILTER-001 Standard Employee Filter

### Preconditions

Employee country ≠ India/Morocco.

### Expected Result

```http
200 OK
```

### Assertions

* Cutoffs returned
* Cutoffs grouped by year/month

---

## FILTER-002 Filter By Hire Date

### Preconditions

```text
date_hired = 2026-03-15
```

### Assertions

* No cutoff before hire date returned

---

## FILTER-003 India Employee Filter

### Preconditions

```text
country_id = 1
```

### Assertions

* Uses EVOX_IND_PAYROLL_CUTOFF
* No hire date filtering

---

## FILTER-004 Morocco Employee Filter

### Preconditions

```text
country_id = 4
```

### Assertions

* Uses EVOX_IND_PAYROLL_CUTOFF
* No hire date filtering

---

## FILTER-005 Philippines Employee Filter

### Preconditions

```text
country_id != 1
country_id != 4
```

### Assertions

* Uses payroll_cutoffs
* Applies hire date filtering

---

# Cutoff Matching Logic

## MATCH-001 Date Inside Cutoff

### Preconditions

Cutoff:

```text
2026-04-01 → 2026-04-15
```

Date:

```text
2026-04-10
```

### Assertions

Cutoff matched.

---

## MATCH-002 Date Equals Start Date

### Assertions

Cutoff matched.

---

## MATCH-003 Date Equals End Date

### Assertions

Cutoff matched.

---

## MATCH-004 Date Outside Range

### Preconditions

Date:

```text
2026-05-01
```

### Assertions

No direct match found.

---

# Fallback Logic

## FALLBACK-001 No Matching Cutoff

### Preconditions

No cutoff contains date.

### Assertions

Latest cutoff selected by:

```sql
ORDER BY end_date DESC
```

---

## FALLBACK-002 Multiple Historical Cutoffs

### Assertions

Most recent cutoff selected.

---

# Overlapping Cutoff Behavior

## OVERLAP-001 Two Matching Cutoffs

### Preconditions

```text
Cutoff A: 2026-04-01 → 2026-04-15
Cutoff B: 2026-04-10 → 2026-04-25
Date: 2026-04-12
```

### Assertions

Document actual selected cutoff.

---

## OVERLAP-002 Multiple Overlapping Cutoffs

### Assertions

System remains deterministic.

---

# Country-Specific Table Selection

## COUNTRY-001 India

### Preconditions

```text
country_id = 1
```

### Assertions

* EVOX_IND_PAYROLL_CUTOFF queried
* payroll_cutoffs not queried

---

## COUNTRY-002 Morocco

### Preconditions

```text
country_id = 4
```

### Assertions

* EVOX_IND_PAYROLL_CUTOFF queried
* payroll_cutoffs not queried

---

## COUNTRY-003 Philippines

### Preconditions

```text
country_id = 2
```

### Assertions

* payroll_cutoffs queried
* EVOX_IND_PAYROLL_CUTOFF not queried

---

# Permission Tests

## PERM-001 Admin With Permission

### Preconditions

User has:

```text
manage_payroll_cutoff
```

### Assertions

* Create succeeds
* Update succeeds
* Delete succeeds

---

## PERM-002 Admin Without Permission

### Preconditions

Permission absent.

### Assertions

Document actual authorization behavior.

---

## PERM-003 Payroll User

### Assertions

* View endpoints allowed
* Modification endpoints restricted

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

| Area                     | Covered |
| ------------------------ | ------- |
| List Cutoffs             | ✓       |
| Get Cutoff               | ✓       |
| Create Cutoff            | ✓       |
| Update Cutoff            | ✓       |
| Delete Cutoff            | ✓       |
| DTR Filter Generation    | ✓       |
| Hire Date Filtering      | ✓       |
| Country Rules            | ✓       |
| India Payroll Cutoffs    | ✓       |
| Morocco Payroll Cutoffs  | ✓       |
| Standard Payroll Cutoffs | ✓       |
| Cutoff Matching          | ✓       |
| Fallback Logic           | ✓       |
| Overlapping Cutoffs      | ✓       |
| Permissions              | ✓       |
| JWT Middleware           | ✓       |
| API Key Middleware       | ✓       |
