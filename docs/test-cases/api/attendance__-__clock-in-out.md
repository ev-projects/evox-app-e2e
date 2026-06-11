# API Test Cases – Clock In / Clock Out (Quickpunch) (EVOX-11)

## Feature Information

| Field    | Value                               |
| -------- | ----------------------------------- |
| Feature  | Clock In / Clock Out (Quickpunch)   |
| Module   | Payroll (DTR)                       |
| Priority | P0 - Critical                       |
| Status   | VERIFIED by Gary Aure on 2026-04-27 |
| Ticket   | EVOX-11                             |

---

## Test Generation Instructions

### Authentication Requirements

All requests MUST include:

```http
Authorization: Bearer <VALID_JWT>
X-Authorization: <VALID_API_KEY>
```

### Middleware Coverage Requirements

For each endpoint generate tests for:

* Valid JWT + Valid API Key
* Missing JWT
* Invalid JWT
* Expired JWT
* Missing X-Authorization
* Invalid X-Authorization

### Important Implementation Note

Single Quickpunch and Multi Quickpunch are completely different code paths and must be tested independently.

* Single Quickpunch → `apply_biometrics_to_dtr`
* Multi Quickpunch → `apply_punch_to_history`

Do not share assertions between these flows.

---

# Test Data Matrix

| Scenario                               | User Type |
| -------------------------------------- | --------- |
| Standard Employee                      | employee  |
| Employee with Multi Quickpunch Enabled | employee  |
| Client User                            | client    |
| Newly Hired Employee                   | employee  |
| Employee with Existing DTR             | employee  |
| Employee Without DTR                   | employee  |

---

# Single Quickpunch API

## Endpoint

POST `/api/dtr/quickpunch`

---

## SQP-001 Successful Clock In

### Preconditions

* Employee authenticated
* Existing DTR record available

### Request

```json
{
  "quickpunch": "in"
}
```

### Expected Result

```http
200 OK
```

### Assertions

* Biometrics object created
* CheckType = "I"
* Employee number stored with "20" prefix
* sync_biometrics_to_dtr executed
* DTR time_in populated
* Payroll items recomputed

---

## SQP-002 Successful Clock Out

### Request

```json
{
  "quickpunch": "out"
}
```

### Assertions

* CheckType = "O"
* DTR time_out populated
* Payroll recomputed

---

## SQP-003 Invalid Quickpunch Value

### Request

```json
{
  "quickpunch": "invalid"
}
```

### Expected Result

Exception thrown.

### Assertions

* Request rejected
* No DTR update
* No payroll computation

---

## SQP-004 Existing DTR Record Found

### Preconditions

Matching DTR exists.

### Assertions

* Existing DTR updated
* New DTR not generated

---

## SQP-005 Auto Generate DTR For Existing Employee

### Preconditions

* No DTR found
* Employee hired more than 30 days ago

### Assertions

* DTR generation triggered
* Generates 23 days
* Start date = punch date minus 7 days

---

## SQP-006 Auto Generate DTR For New Hire

### Preconditions

* Employee hired within 30 days
* No DTR found

### Assertions

* DTR generation triggered
* Generates 30 days
* Start date = date_hired

---

## SQP-007 Employee Number Prefix Applied

### Assertions

Stored employee number format:

```text
20<emp_num>
```

---

## SQP-008 CheckType Mapping In

### Assertions

```text
I => time_in
```

---

## SQP-009 CheckType Mapping Out

### Assertions

```text
O => time_out
```

---

## SQP-010 Duplicate Clock In

### Preconditions

User submits same punch repeatedly.

### Assertions

* Latest punch applied
* No duplicate protection
* Request succeeds

---

## SQP-011 Duplicate Clock Out

### Preconditions

Repeated clock out submissions.

### Assertions

* Latest punch wins
* Request succeeds

---

# Multi Quickpunch API

## Endpoint

POST `/api/dtr/quickpunch_multi`

---

## MQP-001 Initial Clock In

### Preconditions

No active work session.

### Request

```json
{
  "quickpunch": "I"
}
```

### Assertions

* Work session started
* DtrPunchHistory record created

---

## MQP-002 Pause Active Session

### Preconditions

Employee currently working.

### Request

```json
{
  "quickpunch": "P"
}
```

### Assertions

* Session paused
* Punch history updated

---

## MQP-003 Continue Paused Session

### Preconditions

Employee paused.

### Request

```json
{
  "quickpunch": "C"
}
```

### Assertions

* Session resumed
* Punch history updated

---

## MQP-004 Clock Out Active Session

### Preconditions

Employee currently working.

### Request

```json
{
  "quickpunch": "O"
}
```

### Assertions

* Session closed
* Punch history updated

---

## MQP-005 Pause Without Active Session

### Preconditions

No active work session.

### Request

```json
{
  "quickpunch": "P"
}
```

### Assertions

* Request rejected or ignored
* No punch history created

---

## MQP-006 Continue Without Pause

### Preconditions

Employee currently working.

### Assertions

* Request rejected or ignored
* Existing session unchanged

---

## MQP-007 Clock Out Without Clock In

### Preconditions

No active session.

### Assertions

* Request rejected or ignored
* No attendance modification

---

## MQP-008 Clock In After Finished Day

### Preconditions

Employee already completed session.

### Assertions

* System follows business rules
* Verify acceptance or rejection

---

## MQP-009 Invalid Punch Type

### Request

```json
{
  "quickpunch": "X"
}
```

### Assertions

* Request rejected
* No attendance update

---

## MQP-010 Verify Storage Mechanism

### Assertions

* DtrPunchHistory used
* sync_biometrics_to_dtr NOT called

---

# Permission Tests

## PERM-001 User Without allow_quickpunch Permission

### Preconditions

Permission absent.

### Expected Result

```http
200 OK
```

### Assertions

* API allows punch
* Permission not enforced server-side

---

## PERM-002 Client User Calls Endpoint Directly

### Preconditions

Authenticated client user.

### Assertions

* Verify actual API behavior
* No server-side role restriction detected

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

### Headers

```http
Authorization: Bearer <VALID_JWT>
```

### Expected Result

```http
401 Unauthorized
```

### Assertions

auth.apikey blocks request.

---

## AUTH-005 Invalid API Key

### Headers

```http
Authorization: Bearer <VALID_JWT>
X-Authorization: invalid-key
```

### Expected Result

```http
401 Unauthorized
```

### Assertions

auth.apikey blocks request.

---

# Integration Tests

## INT-001 Single Quickpunch End-to-End

### Assertions

* Punch submitted
* DTR updated
* Payroll recalculated

---

## INT-002 Multi Quickpunch End-to-End

### Flow

```text
Clock In
Pause
Continue
Clock Out
```

### Assertions

* All transitions valid
* Punch history complete
* Session finalized

---

# Coverage Summary

| Area                    | Covered |
| ----------------------- | ------- |
| Single Clock In         | ✓       |
| Single Clock Out        | ✓       |
| Multi Clock In          | ✓       |
| Pause                   | ✓       |
| Continue                | ✓       |
| Multi Clock Out         | ✓       |
| DTR Generation          | ✓       |
| New Hire Logic          | ✓       |
| Employee Number Prefix  | ✓       |
| CheckType Mapping       | ✓       |
| Duplicate Punches       | ✓       |
| Payroll Recompute       | ✓       |
| Authentication          | ✓       |
| API Key Middleware      | ✓       |
| JWT Middleware          | ✓       |
| Permission Bypass       | ✓       |
| Storage Path Validation | ✓       |
