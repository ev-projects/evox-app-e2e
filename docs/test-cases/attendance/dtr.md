# DTR Model Helper Methods - Test Cases

## Overview

This document covers unit test cases for the `Dtr` model helper methods. The tests validate business logic that does not require database interaction. All timestamps are based on a fixed anchor date:

* Date: `2026-01-05`
* Standard Schedule: `09:00 AM - 06:00 PM`
* Flexible Schedule: `11:00 AM - 08:00 PM`
* Break Time: `1 hour (3600 seconds)`

---

# Test Cases

## 1. hasSchedule()

| TC ID   | Test Case          | Input                                     | Expected Result |
| ------- | ------------------ | ----------------------------------------- | --------------- |
| DTR-001 | Schedule exists    | start_datetime and end_datetime populated | Returns `true`  |
| DTR-002 | Missing start time | start_datetime = null                     | Returns `false` |
| DTR-003 | Missing end time   | end_datetime = null                       | Returns `false` |

---

## 2. hasFlexibleSchedule()

| TC ID   | Test Case                 | Input                                                 | Expected Result |
| ------- | ------------------------- | ----------------------------------------------------- | --------------- |
| DTR-004 | Flexible schedule exists  | start_flexy_datetime and end_flexy_datetime populated | Returns `true`  |
| DTR-005 | Flexible schedule missing | Flexy fields null                                     | Returns `false` |

---

## 3. hasCompleteTimelogs()

| TC ID   | Test Case               | Input                            | Expected Result |
| ------- | ----------------------- | -------------------------------- | --------------- |
| DTR-006 | Complete logs available | time_in and time_out present     | Returns `true`  |
| DTR-007 | Only time_in exists     | time_in populated, time_out null | Returns `false` |
| DTR-008 | No logs available       | time_in and time_out null        | Returns `false` |

---

## 4. validLog()

| TC ID   | Test Case    | Input                          | Expected Result |
| ------- | ------------ | ------------------------------ | --------------- |
| DTR-009 | Valid logs   | time_in and time_out populated | Returns `true`  |
| DTR-010 | Invalid logs | Both logs null                 | Returns `false` |

---

## 5. validLogIn()

| TC ID   | Test Case       | Input             | Expected Result |
| ------- | --------------- | ----------------- | --------------- |
| DTR-011 | Time-in exists  | time_in populated | Returns `true`  |
| DTR-012 | Time-in missing | time_in null      | Returns `false` |

---

## 6. hasLog()

| TC ID   | Test Case               | Input                     | Expected Result |
| ------- | ----------------------- | ------------------------- | --------------- |
| DTR-013 | At least one log exists | time_in populated         | Returns `true`  |
| DTR-014 | No logs exist           | time_in and time_out null | Returns `false` |

---

## 7. hasValidBreakTime()

| TC ID   | Test Case           | Input             | Expected Result |
| ------- | ------------------- | ----------------- | --------------- |
| DTR-015 | Positive break time | break_time = 3600 | Returns `true`  |
| DTR-016 | Zero break time     | break_time = 0    | Returns `false` |
| DTR-017 | Null break time     | break_time = null | Returns `false` |

---

## 8. isRestDay()

| TC ID   | Test Case   | Input           | Expected Result |
| ------- | ----------- | --------------- | --------------- |
| DTR-018 | Rest day    | is_rest_day = 1 | Returns `true`  |
| DTR-019 | Working day | is_rest_day = 0 | Returns `false` |

---

## 9. Source Type Tagging

### isDefault()

| TC ID   | Test Case        | Input                           | Expected Result |
| ------- | ---------------- | ------------------------------- | --------------- |
| DTR-020 | Default source   | source_type_tagging = default   | Returns `true`  |
| DTR-021 | Temporary source | source_type_tagging = temporary | Returns `false` |

### isTemporary()

| TC ID   | Test Case        | Input                           | Expected Result |
| ------- | ---------------- | ------------------------------- | --------------- |
| DTR-022 | Temporary source | source_type_tagging = temporary | Returns `true`  |

### isRestDayWork()

| TC ID   | Test Case            | Input                               | Expected Result |
| ------- | -------------------- | ----------------------------------- | --------------- |
| DTR-023 | Rest day work source | source_type_tagging = rest_day_work | Returns `true`  |

### isChangeSchedule()

| TC ID   | Test Case              | Input                                 | Expected Result |
| ------- | ---------------------- | ------------------------------------- | --------------- |
| DTR-024 | Change schedule source | source_type_tagging = change_schedule | Returns `true`  |

---

## 10. getTotalRenderedTime()

| TC ID   | Test Case               | Input                | Expected Result         |
| ------- | ----------------------- | -------------------- | ----------------------- |
| DTR-025 | Calculate rendered time | 09:00 AM to 06:00 PM | Returns `32400` seconds |
| DTR-026 | Missing logs            | No logs              | Returns `0`             |

---

## 11. getRequiredTime()

| TC ID   | Test Case                  | Input                   | Expected Result         |
| ------- | -------------------------- | ----------------------- | ----------------------- |
| DTR-027 | Standard schedule duration | 09:00 AM to 06:00 PM    | Returns `32400` seconds |
| DTR-028 | No schedule                | start/end datetime null | Returns `0`             |

---

## 12. getRequiredHalfDayTime()

| TC ID   | Test Case            | Input                              | Expected Result         |
| ------- | -------------------- | ---------------------------------- | ----------------------- |
| DTR-029 | Half-day computation | Schedule 32400 sec, Break 3600 sec | Returns `14400` seconds |

Calculation:

```text
Half Day Time
= (Required Time / 2) - (Break Time / 2)

= (32400 / 2) - (3600 / 2)
= 16200 - 1800
= 14400 seconds
```

---

## 13. getExpectedTimeIn()

| TC ID   | Test Case         | Input                  | Expected Result              |
| ------- | ----------------- | ---------------------- | ---------------------------- |
| DTR-030 | Standard schedule | Normal schedule        | Returns start_datetime       |
| DTR-031 | Flexible schedule | Flexy schedule defined | Returns start_flexy_datetime |
| DTR-032 | No schedule       | Schedule fields null   | Returns `0`                  |

---

## 14. isTimedInBeforeSchedule()

| TC ID   | Test Case           | Input                    | Expected Result |
| ------- | ------------------- | ------------------------ | --------------- |
| DTR-033 | Exactly on schedule | time_in = start_datetime | Returns `true`  |
| DTR-034 | Early login         | 30 minutes before start  | Returns `true`  |
| DTR-035 | Late login          | 30 minutes after start   | Returns `false` |

---

## 15. isTimedInAfterSchedule()

(Requires Flexible Schedule)

| TC ID   | Test Case         | Input                          | Expected Result |
| ------- | ----------------- | ------------------------------ | --------------- |
| DTR-036 | At flexy start    | time_in = start_flexy_datetime | Returns `true`  |
| DTR-037 | After flexy start | time_in > start_flexy_datetime | Returns `true`  |

---

## 16. isTimedInBetweenSchedule()

| TC ID   | Test Case                       | Input    | Expected Result |
| ------- | ------------------------------- | -------- | --------------- |
| DTR-038 | Between standard and flex start | 10:00 AM | Returns `true`  |
| DTR-039 | Before schedule start           | 08:30 AM | Returns `false` |

---

## 17. hasOverlappedTimeLogs()

| TC ID   | Test Case         | Input                         | Expected Result |
| ------- | ----------------- | ----------------------------- | --------------- |
| DTR-040 | Time out next day | 10:00 PM to 02:00 AM next day | Returns `true`  |
| DTR-041 | Same day logs     | 09:00 AM to 06:00 PM          | Returns `false` |

---

## 18. hasUnderlappedTimeLogs()

| TC ID   | Test Case            | Input                                         | Expected Result |
| ------- | -------------------- | --------------------------------------------- | --------------- |
| DTR-042 | Time in previous day | Previous day 10:00 PM to current day 07:00 AM | Returns `true`  |
| DTR-043 | Same day logs        | 09:00 AM to 06:00 PM                          | Returns `false` |

---

# Summary

| Category                   | Test Cases        |
| -------------------------- | ----------------- |
| Schedule Validation        | 5                 |
| Timelog Validation         | 9                 |
| Break Time Validation      | 3                 |
| Rest Day Validation        | 2                 |
| Source Type Validation     | 5                 |
| Time Computation           | 8                 |
| Schedule Timing Rules      | 7                 |
| Overlap/Underlap Detection | 4                 |
| **Total**                  | **43 Test Cases** |

All test cases are deterministic and based on the fixed date `2026-01-05`.
