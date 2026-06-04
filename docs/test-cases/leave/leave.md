# Leave Model Helper Methods - Test Cases

## Overview

This document covers unit test cases for the `Leave` model helper methods. The tests validate leave status evaluation and leave type classification logic. All tests operate solely on model attributes and do not require database interaction.

### Default Test Data

| Field  | Value          |
| ------ | -------------- |
| status | approved       |
| type   | Vacation Leave |
| amount | 1.0            |

---

# Test Cases

## 1. Leave Status Validation

### isApproved()

| TC ID  | Test Case           | Input              | Expected Result |
| ------ | ------------------- | ------------------ | --------------- |
| LV-001 | Approved status     | status = approved  | Returns `true`  |
| LV-002 | Non-approved status | status = requested | Returns `false` |

---

### isRequested()

| TC ID  | Test Case            | Input              | Expected Result |
| ------ | -------------------- | ------------------ | --------------- |
| LV-003 | Requested status     | status = requested | Returns `true`  |
| LV-004 | Non-requested status | status = approved  | Returns `false` |

---

### isDenied()

| TC ID  | Test Case     | Input           | Expected Result |
| ------ | ------------- | --------------- | --------------- |
| LV-005 | Denied status | status = denied | Returns `true`  |

---

### isCanceled()

| TC ID  | Test Case           | Input             | Expected Result |
| ------ | ------------------- | ----------------- | --------------- |
| LV-006 | Canceled status     | status = canceled | Returns `true`  |
| LV-007 | Non-canceled status | status = approved | Returns `false` |

---

## 2. Paid Leave Classification

### isPaidLeave()

Determines whether a leave type is considered paid based on the application's unpaid leave type definitions.

| TC ID  | Test Case                | Input                           | Expected Result |
| ------ | ------------------------ | ------------------------------- | --------------- |
| LV-008 | Vacation Leave           | type = Vacation Leave           | Returns `true`  |
| LV-009 | Sick Leave               | type = Sick Leave               | Returns `true`  |
| LV-010 | Unpaid Leave             | type = Unpaid Leave             | Returns `false` |
| LV-011 | Work From Home           | type = Work from home           | Returns `false` |
| LV-012 | MGC Unpaid Call Out Days | type = MGC Unpaid Call Out Days | Returns `false` |

---

## 3. Unpaid Leave Classification

### isUnPaidLeave()

Determines whether a leave type belongs to the unpaid leave category.

| TC ID  | Test Case       | Input                 | Expected Result |
| ------ | --------------- | --------------------- | --------------- |
| LV-013 | Unpaid Leave    | type = Unpaid Leave   | Returns `true`  |
| LV-014 | Work From Home  | type = Work from home | Returns `true`  |
| LV-015 | Paid Leave Type | type = Vacation Leave | Returns `false` |

---

# Functional Coverage Matrix

| Function        | Covered Scenarios                    |
| --------------- | ------------------------------------ |
| isApproved()    | Approved, Non-approved               |
| isRequested()   | Requested, Non-requested             |
| isDenied()      | Denied                               |
| isCanceled()    | Canceled, Non-canceled               |
| isPaidLeave()   | Paid leave types, Unpaid leave types |
| isUnPaidLeave() | Unpaid leave types, Paid leave types |

---

# Summary

| Category                    | Test Cases        |
| --------------------------- | ----------------- |
| Status Validation           | 7                 |
| Paid Leave Classification   | 5                 |
| Unpaid Leave Classification | 3                 |
| **Total**                   | **15 Test Cases** |

## Expected Business Rules

### Leave Statuses

Supported statuses validated by the tests:

* approved
* requested
* denied
* canceled

### Paid Leave Types

Examples validated as paid:

* Vacation Leave
* Sick Leave

### Unpaid Leave Types

Examples validated as unpaid:

* Unpaid Leave
* Work from home
* MGC Unpaid Call Out Days

All helper methods are attribute-based and require no database access.
