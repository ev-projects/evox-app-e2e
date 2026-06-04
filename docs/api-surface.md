# EVOX API Surface

**Status:** REVIEWED  
**Ticket:** EVOX\-15  
**Last Verified:** — (group review 2026-04-24, \_sessions/2026-04-24-evox11.md — 4 security escalations open)  
**Generated:** 2026-04-16  
**Source:** All 17 backend route files + all frontend Redux action files

**Apr 24 escalations (action items, owner Gary unless noted):**

*   `POST /api/insert_users` — no auth, can insert user records. **CRITICAL.** File ticket: add auth middleware OR remove. Due before 2026-05-01.
    
*   `/api/opsschedule/*` (6 routes) — no auth, full CRUD exposed. File ticket: remove the controller (unused). Due before 2026-05-01.
    
*   API key console.log frontend exposure — verify whether PROD has console.log disabled. Due this week.
    
*   Mark struck-through unused endpoints in this doc + the Confluence copy. Due this week.
    

**Verification notes (Gary, EVOX\-87):**

|     |     |     |
| --- | --- | --- |
| Endpoint / Area | Finding | Gary's verdict |

|     |     |     |
| --- | --- | --- |
| Endpoint / Area | Finding | Gary's verdict |
| `POST /api/dtr/quickpunch` + `quickpunch_multi` | Appears unprotected | **Intentional** — parent `/dtr` path has API key + JWT guard |
| `POST /api/request/approval/` (email approval) | API key only, no JWT | **Intentional** — uses signed tokenized URL |
| All `/api/opsschedule/*` (6 routes) | No auth middleware, full CRUD exposed | **BUG** — no API key/JWT guard |
| `POST /api/careers/` | No auth | **Bug, but dead code** — feature no longer used |
| `POST /api/changelogs` | No auth | **Bug, but dead code** — POST throws error anyway |
| `POST /api/insert_users` | No auth, can insert user records | **Bug, but dead code** — API closure does not exist; Booking module is not used |
| `GET /api/summaryreport1` and `exportsummaryreport1` | No auth | **Bug, but dead code** — no UI calls; API closure missing |
| `POST /api/sync_users`, `sync_holidays`, `sync_leaves` | API-key only — HRIS sync entry points | Active, by design |
| `GET /api/cron/sync_users`, `sync_holidays`, `sync_leaves` | Duplicates the above with JWT | **Dead code** — admin manual-sync; not wired to UI, not maintained |

**Newly discovered features — status:**

|     |     |     |
| --- | --- | --- |
| Feature | Routes | Status |

|     |     |     |
| --- | --- | --- |
| Feature | Routes | Status |
| Meeting Room Booking | 18 (base api.php) | **Legacy** — not used |
| Policies & Documents | 6   | Active |
| NEO Onboarding | 7   | Active |
| Surveys (NHO, EVA, Happiness) | 8   | Active |
| Fresh Service Integration | 9   | Active |
| Payroll Disputes | 6   | Active |

- - -

## Overview

|     |     |
| --- | --- |
| Metric | Count |

|     |     |
| --- | --- |
| Metric | Count |
| Backend routes | 310+ |
| Frontend API calls | 150+ |
| Backend modules | 17  |
| Frontend feature areas | 28  |
| Middleware combinations | 6   |

**Base URL:** `{REACT_APP_API_BASE_URL}` (configured via .env)  
**Auth:** JWT Bearer token + API key (`X-Authorization` header)  
**Rate limit:** 210 requests per minute

- - -

## Middleware Reference

### Middleware Groups

|     |     |
| --- | --- |
| Group | Middleware Stack |

|     |     |
| --- | --- |
| Group | Middleware Stack |
| `api` | throttle:210,1, EncryptCookies, StartSession, bindings |
| `jwtauth` | JWTAuthentication, ComputeAPIProcessTime |
| `web` | EncryptCookies, AddQueuedCookies, StartSession, ShareErrors, VerifyCsrfToken, bindings |

### Named Middleware

|     |     |     |
| --- | --- | --- |
| Alias | Class | Purpose |

|     |     |     |
| --- | --- | --- |
| Alias | Class | Purpose |
| `jwtauth` | JWTAuthentication + ComputeAPIProcessTime | JWT token validation |
| `auth.apikey` | (custom) | API key validation |
| `role` | EnsureUserHasRole | Role-based access (e.g., `role:admin`) |
| `permission` | PermissionMiddleware | Permission-based access |
| `api.calctime` | ComputeAPIProcessTime | API response time logging |
| `auth:api` | Laravel Authenticate | Standard API auth |

### Common Middleware Patterns

|     |     |     |
| --- | --- | --- |
| Pattern | Used On | Auth Level |

|     |     |     |
| --- | --- | --- |
| Pattern | Used On | Auth Level |
| `jwtauth, auth.apikey` | Most protected routes | Full auth (JWT + API key) |
| `auth.apikey, api.calctime` | Login endpoints | API key only (pre-auth) |
| `auth.apikey` | Forgot password, MS OAuth, sync endpoints | API key only |
| `jwtauth, auth.apikey, role:admin` | User registration | Full auth + admin role |
| (none) | Quickpunch, Opsschedule, Careers, Changelogs | **No auth** |

- - -

## API Endpoints by Module

### 1\. Authentication (6 routes)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| POST | `/api/auth/login` | auth.apikey, api.calctime | AuthController@login | `logIn` (direct axios) |
| POST | `/api/auth/login-mobile` | auth.apikey, api.calctime | AuthController@loginMobile | —   |
| POST | `/api/auth/logout` | jwtauth, auth.apikey | AuthController@logout | `logOut` |
| GET | `/api/auth/authenticate-client` | jwtauth, auth.apikey | AuthController@authenticateClient | `authenticateClient` |
| GET | `/api/auth/authenticate-ms-client` | auth.apikey | AuthController@authenticateMSClient | `authenticateMSClient` |
| POST | `/api/auth/payload` | jwtauth, auth.apikey | AuthController@payload | `fetchUser` |
| POST | `/api/forgot_password_request` | auth.apikey | UserController@forgot\_password\_request | `forgotPasswordRequest` |

- - -

### 2\. User Management (40+ routes)

**Profile & Info:**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/user/{id}/info` | jwtauth, auth.apikey | UserController@user\_info | `getUserInfo` |
| GET | `/api/user/{id}/profile` | jwtauth, auth.apikey | UserController@profile | `fetchProfile` |
| POST | `/api/user/{id}/profile/` | jwtauth, auth.apikey | ProfileController@store | `updateUserProfile` |
| GET | `/api/user/{id}/personal_information` | jwtauth, auth.apikey | UserController@personal\_information | `fetchPersonalInformation` |
| GET | `/api/user/{id}/job_information` | jwtauth, auth.apikey | UserController@job\_information | `fetchJobInformation` |
| GET | `/api/user/{id}/time_off/{start}/{end}` | jwtauth, auth.apikey | UserController@time\_off | `fetchTimeOff` |
| GET | `/api/user/{id}/leave_credits` | jwtauth, auth.apikey | UserController@leave\_credits | `fetchLeaveCredits` |
| POST | `/api/user/{id}/change_password` | jwtauth, auth.apikey | UserController@change\_password | `changePassword` |
| POST | `/api/user/{id}/tick_dpa` | jwtauth, auth.apikey | UserController@tick\_dpa | `tickDPA` |

**Schedule Info:**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/user/{id}/default_schedule` | jwtauth, auth.apikey | UserController@default\_schedule | `fetchDefaultSchedule` |
| GET | `/api/user/{id}/schedule/{schedule_id}` | jwtauth, auth.apikey | UserController@schedule\_info | —   |
| GET | `/api/user/{id}/schedule_history` | jwtauth, auth.apikey | UserController@schedule\_history | `fetchScheduleHistory` |
| GET | `/api/user/{id}/temporary_schedules` | jwtauth, auth.apikey | UserController@temporary\_schedules | `fetchTemporarySchedules` |

**Team & Hierarchy:**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/user/{id}/my_team_list` | jwtauth, auth.apikey | UserController@my\_team\_list | `fetchMyTeamList` |
| GET | `/api/user/{id}/team_list/{dept_id}` | jwtauth, auth.apikey | UserController@my\_team\_list\_under\_department | `fetchTeamList` |
| POST | `/api/user/{id}/team_list_all/` | jwtauth, auth.apikey | UserController@my\_team\_list\_under\_selected\_department | `fetchTeamListAll` |
| GET | `/api/user/{id}/sub_department/{dept_id}` | jwtauth, auth.apikey | UserController@sub\_department\_under\_department | `fetchSubDepartment` |
| GET | `/api/user/{id}/sub_department` | jwtauth, auth.apikey | UserController@get\_user\_sub\_department\_handled | `fetchSubDepartmentUser` |
| POST | `/api/user/{id}/sub_department_allocate` | jwtauth, auth.apikey | UserController@sub\_department\_allocate | `allocateSubDepartment` |
| GET | `/api/user/sub_department_list` | jwtauth, auth.apikey | UserController@sub\_department\_list | `fetchSubDepartmentList` |

**Admin Operations:**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| POST | `/api/user/register` | jwtauth, auth.apikey, **role:admin** | UserController@register | `registerUser` |
| GET | `/api/user/search-user/{name}` | jwtauth, auth.apikey | UserController@get\_user\_by\_string | `searchUser` |
| GET | `/api/user/search-user-dispute` | jwtauth, auth.apikey | UserController@get\_user\_by\_string\_dispute | `searchUserDispute` |
| GET | `/api/user/roles/` | jwtauth, auth.apikey | UserController@get\_roles | `fetchUserRoles` |
| GET | `/api/user/features` | jwtauth, auth.apikey | UserController@get\_features | `fetchUserFeatures` |
| GET | `/api/user/{id}/role_permission/` | jwtauth, auth.apikey | UserController@get\_user\_role\_permission | `fetchUserRolePermission` |
| GET | `/api/user/{id}/features` | jwtauth, auth.apikey | UserController@get\_user\_feature | `fetchUserFeatures` |
| POST | `/api/user/{id}/assign_roles_permissions/` | jwtauth, auth.apikey | UserController@assign\_roles\_permissions | `assignRolesPermissions` |
| POST | `/api/user/{id}/assign_level_features` | jwtauth, auth.apikey | UserController@assign\_level\_features | `assignLevelFeatures` |
| POST | `/api/user/{id}/assign_employees/` | jwtauth, auth.apikey | UserController@assign\_employees | `assignEmployees` |
| GET | `/api/role/{role}/users` | jwtauth, auth.apikey | UserController@list\_via\_role | `fetchRoleUsers` |
| GET | `/api/department/{dept_id}/users` | jwtauth, auth.apikey | UserController@list\_via\_department | `fetchDepartmentUsers` |
| GET | `/api/team/{team_id}/users` | jwtauth, auth.apikey | UserController@list\_via\_team | —   |
| POST | `/api/generate/dtr/` | jwtauth, auth.apikey | UserController@generateDtrDate | `generateDtr` |

**Assets:**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/user/getallassets` | jwtauth, auth.apikey | UserController@getAllAssets | `getAllAssets` |
| GET | `/api/user/getassets` | jwtauth, auth.apikey | UserController@getUserAssets | `getUserAssets` |
| GET | `/api/user/getasset/{id}` | jwtauth, auth.apikey | UserController@getUserAsset | `getUserAsset` |
| POST | `/api/user/addasset` | jwtauth, auth.apikey | UserController@addUserAsset | `addUserAsset` |
| POST | `/api/user/updateasset` | jwtauth, auth.apikey | UserController@updateUserAsset | `updateUserAsset` |

**DPA & Country:**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/user/get_dpa_list` | jwtauth, auth.apikey | UserController@get\_dpa\_list | `getDpaList` |
| GET | `/api/user/export_dpa_list` | jwtauth, auth.apikey | UserController@export\_dpa\_list | `exportDpaList` |
| GET | `/api/user/getusercountry` | jwtauth, auth.apikey | UserController@getUserCountry | —   |
| GET | `/api/user/getcountry` | jwtauth, auth.apikey | UserController@getCountry | —   |
| GET | `/api/utc/sync_adjustment` | jwtauth, auth.apikey | UtctimelogController@sync\_adjustment | `syncAdjustment` |

- - -

### 3\. Request Module (49 routes)

**Request List & Bulk:**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/request/request-list` | jwtauth, auth.apikey | RequestController@requestlist | `fetchRequestList` |
| GET | `/api/request/request-list-disputes` | jwtauth, auth.apikey | RequestController@requestListDisputes | `fetchRequestListDisputes` |
| GET | `/api/request/request-numbers` | jwtauth, auth.apikey | RequestController@requestlistNumbers | `fetchStatusNumbers` |
| GET | `/api/request/request-numbers_dashboard` | jwtauth, auth.apikey | RequestController@requestlistNumbers\_dashboard | `fetchRequestNumbersDashboard` |
| POST | `/api/request/bulk-request` | jwtauth, auth.apikey | RequestController@bulkRequest | `bulkRequestAction` |
| GET | `/api/request/` | jwtauth, auth.apikey | RequestController@find | —   |
| GET | `/api/request/request-validity-check` | jwtauth, auth.apikey | RequestController@requestValidityChecker | —   |
| POST | `/api/request/approval/` | **auth.apikey only** | RequestController@change\_request\_status\_via\_hash\_code | —   |

**Overtime (8 routes):**

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Controller | Frontend Action |

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Controller | Frontend Action |
| POST | `/api/request/overtime/` | OvertimeController@store | `addOvertime` |
| PUT | `/api/request/overtime/{id}` | OvertimeController@update | `updateOvertime` |
| DELETE | `/api/request/overtime/{id}` | OvertimeController@destroy | —   |
| GET | `/api/request/overtime/{id}` | OvertimeController@find | `fetchOvertime` |
| PUT | `/api/request/overtime/approve/{id}` | OvertimeController@approve | `updateOvertimeStatus` |
| PUT | `/api/request/overtime/decline/{id}` | OvertimeController@decline | `updateOvertimeStatus` |
| PUT | `/api/request/overtime/pending/{id}` | OvertimeController@pending | —   |
| PUT | `/api/request/overtime/cancel/{id}` | OvertimeController@cancel | —   |

**Change Schedule (8 routes):** Same pattern as Overtime → `ChangeScheduleController`

**Alter Log (8 routes):** Same pattern → `AlterLogController`

**Alter Log Punch (8 routes):** Same pattern → `AlterLogPunchController`

**Rest Day Work (9 routes):** Same pattern + `GET .../rest_day_work/myrequests` → `RestDayWorkController`

All request routes use `jwtauth, auth.apikey` middleware.

- - -

### 4\. DTR / Payroll (14 routes)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/dtr/{user_id}/{start}/{end}` | jwtauth, auth.apikey | DtrController@daily\_time\_record | `viewEmployeeDtr` |
| GET | `/api/dtr/punch/{user_id}/{start}/{end}` | jwtauth, auth.apikey | DtrController@punches | `viewEmployeePunch` |
| GET | `/api/dtr/dtrpunch/{user_id}/{start}/{end}` | jwtauth, auth.apikey | DtrController@Dtr\_punches | `viewEmployeeTargetPunch` |
| GET | `/api/dtr/dtrpunch/check/{user_id}/{date}` | jwtauth, auth.apikey | DtrController@dtr\_single\_punch | —   |
| POST | `/api/dtr/quickpunch` | jwtauth, auth.apikey | DtrController@quickpunch | `addQuickPunch` |
| POST | `/api/dtr/quickpunch_multi` | jwtauth, auth.apikey | DtrController@quickpunch\_multi | `addMultiQuickPunch` |
| GET | `/api/dtr/insert_time_in_out/{dtr_id}/{in}/{out}/{rest}` | jwtauth, auth.apikey | DtrController@insert\_time\_in\_and\_out | —   |
| GET | `/api/dtr/incomplete_logs` | jwtauth, auth.apikey | DtrController@get\_incomplete\_logs | `getIncompleteDtr` |
| GET | `/api/payroll/cutoff/get_filter_for_dtr/{user_id}` | jwtauth, auth.apikey | PayrollCutoffController@get\_filter\_for\_dtr | `getFilterForDtr` |
| GET | `/api/payroll/cutoff/all` | jwtauth, auth.apikey | PayrollCutoffController@all | `fetchAllPayrollCutoffs` |
| GET | `/api/payroll/cutoff/{id}` | jwtauth, auth.apikey | PayrollCutoffController@find | `fetchPayrollCutoff` |
| POST | `/api/payroll/cutoff/` | jwtauth, auth.apikey | PayrollCutoffController@store | `addPayrollCutoff` |
| PUT | `/api/payroll/cutoff/{id}` | jwtauth, auth.apikey | PayrollCutoffController@update | `updatePayrollCutoff` |
| DELETE | `/api/payroll/cutoff/{id}` | jwtauth, auth.apikey | PayrollCutoffController@destroy | —   |

- - -

### 5\. Schedule (6 routes)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/schedule/templates/` | jwtauth, auth.apikey | ScheduleController@templates | `fetchScheduleTemplate` |
| POST | `/api/schedule/assign/` | jwtauth, auth.apikey | ScheduleController@assign | `assignSchedule` |
| POST | `/api/schedule/` | jwtauth, auth.apikey | ScheduleController@store | `addSchedule` |
| GET | `/api/schedule/{id}` | jwtauth, auth.apikey | ScheduleController@show | `fetchScheduleTemplate` |
| PUT | `/api/schedule/{id}` | jwtauth, auth.apikey | ScheduleController@update | `updateSchedule` |
| DELETE | `/api/schedule/{id}` | jwtauth, auth.apikey | ScheduleController@destroy | `deleteSchedule` |

- - -

### 6\. Team (7 routes)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/team/all` | jwtauth, auth.apikey | TeamController@all | `fetchTeams` |
| GET | `/api/team/{id}` | jwtauth, auth.apikey | TeamController@find | `fetchTeam` |
| POST | `/api/team/` | jwtauth, auth.apikey | TeamController@store | `addTeam` |
| PUT | `/api/team/{id}` | jwtauth, auth.apikey | TeamController@update | `updateTeam` |
| DELETE | `/api/team/{id}` | jwtauth, auth.apikey | TeamController@destroy | `deleteTeam` |
| GET | `/api/department/{dept_id}/teams` | jwtauth, auth.apikey | TeamController@list\_via\_department | —   |
| GET | `/api/user/{user_id}/teams_handled` | jwtauth, auth.apikey | TeamController@list\_via\_team\_handler | `fetchTeamsHandled` |

- - -

### 7\. Department (25+ routes)

**Core:**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/department/all` | jwtauth, auth.apikey | DepartmentController@all | `fetchDepartments` |
| GET | `/api/department/get_department_all` | jwtauth, auth.apikey | DepartmentController@get\_department\_all | `fecthdepartment` |
| GET | `/api/department/all_with_announcements` | jwtauth, auth.apikey | DepartmentController@all\_with\_announcements | `fetchDepartmentsWithAnnouncements` |
| GET | `/api/department/{id}` | jwtauth, auth.apikey | DepartmentController@find | `fetchDepartmentDetail` |
| DELETE | `/api/department/{id}` | jwtauth, auth.apikey | DepartmentController@destroy | —   |
| POST | `/api/department/{id}/switch_active_schedule` | jwtauth, auth.apikey | DepartmentController@set\_active\_on\_sched | `switchActiveSchedule` |
| GET | `/api/department/{id}/department_handlers` | jwtauth, auth.apikey | DepartmentController@department\_handlers | `fetchDepartmentHandlers` |
| GET | `/api/department/{id}/users` | jwtauth, auth.apikey | DepartmentController@users | `fetchDepartmentUsers` |
| GET | `/api/department/{id}/default_schedule` | jwtauth, auth.apikey | DepartmentController@default\_schedule | —   |
| POST | `/api/department/assign_handlers/{id}` | jwtauth, auth.apikey | DepartmentController@assign\_handlers | `assignDepartmentHandlers` |

**Announcements (15+ routes):** Full CRUD for department announcements, HR announcements, dashboard announcements — all use `jwtauth, auth.apikey`.

- - -

### 8\. HR (5 routes)


|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/hr/announcements/all` | jwtauth, auth.apikey | HrController@announcements | `fetchAllHrAnnouncements` |
| GET | `/api/hr/announcements/{id}` | jwtauth, auth.apikey | HrController@getAnnouncement | `fetchHrAnnouncement` |
| POST | `/api/hr/announcements` | jwtauth, auth.apikey | HrController@store | `createHrAnnouncement` |
| POST | `/api/hr/announcements/{id}` | jwtauth, auth.apikey | HrController@update | `updateHrAnnouncement` |
| DELETE | `/api/hr/announcements/{id}` | jwtauth, auth.apikey | HrController@delete | —   |

- - -

### 9\. Report (22 routes)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Method | URI | Middleware | Controller | Frontend Action |
| GET | `/api/report/get_dashboard_holiday` | jwtauth, auth.apikey | ReportController@get\_dashboard\_holidays | `getDashboardHoliday` |
| GET | `/api/report/holidays` | jwtauth, auth.apikey | ReportController@holidays | `getHolidays` |
| GET | `/api/report/my_dtr_notifications` | jwtauth, auth.apikey | ReportController@my\_dtr\_notifications | `getMyDtrNotifications` |
| GET | `/api/report/team_attendance` | jwtauth, auth.apikey | ReportController@team\_attendance | `getTeamAttendance` |
| POST | `/api/report/team_attendance_summary/{start}/{end}` | jwtauth, auth.apikey | ReportController@team\_attendance\_summary | `exportTeamAttendanceSummary` |
| GET | `/api/report/team_schedule/` | jwtauth, auth.apikey | ReportController@team\_schedule | `exportTeamSchedule` |
| GET | `/api/report/team_birthday_anniversary` | jwtauth, auth.apikey | ReportController@team\_birthday\_anniversary | `getTeamBirthdayAnniversary` |
| GET | `/api/report/attendance/summary/export/{start}/{end}` | jwtauth, auth.apikey | ReportController@export | `exportAttendanceSummary` |
| GET | `/api/report/dtr_summary/{user_id}/{start}/{end}` | jwtauth, auth.apikey | ReportController@dtr\_summary | —   |
| GET | `/api/report/dtr_summary/block/{user_id}/{start}/{end}` | jwtauth, auth.apikey | ReportController@dtr\_summary\_block | `getUserDtrSummary` |
| GET | `/api/report/dtr_summary/team` | jwtauth, auth.apikey | ReportController@team\_dtr\_summary | `fetchDtrSummaryTeam` |
| GET | `/api/report/dtr_summary/new_team` | jwtauth, auth.apikey | ReportController@new\_dtr\_summary\_report | `fetchDtrSummaryNewTeam` |
| GET | `/api/report/dtr_summary/export` | jwtauth, auth.apikey | ReportController@export\_team\_dtr\_summary | `exportDtrSummary` |
| GET | `/api/report/dtr_summary/new_export` | jwtauth, auth.apikey | ReportController@new\_dtr\_summary\_report\_csv\_export | `exportNewDtrSummary` |
| GET | `/api/report/dtr_summary/multi_logs` | jwtauth, auth.apikey | ReportController@dtr\_multi\_logs\_summary\_report | `fetchMultiLogs` |
| GET | `/api/report/dtr_summary/multi_logs_export` | jwtauth, auth.apikey | ReportController@dtr\_multi\_logs\_summary\_report\_csv\_export | `exportMultiLogs` |
| GET | `/api/report/dtr_summary/dtr_conflict` | jwtauth, auth.apikey | ReportController@dtr\_conflict\_report | `fetchDtrConflict` |
| GET | `/api/report/dtr_summary/export_dtr_conflict` | jwtauth, auth.apikey | ReportController@dtr\_half\_day\_mismatch | `exportDtrConflict` |
| GET | `/api/report/dtr_logs/team` | jwtauth, auth.apikey | ReportController@team\_dtr\_logs | `fetchDtrLogs` |
| GET | `/api/report/dtr_logs/export` | jwtauth, auth.apikey | ReportController@export\_team\_dtr\_logs | `exportDtrLogs` |
| GET | `/api/report/timeoff_allocation` | jwtauth, auth.apikey | ReportController@timeoff\_allocation\_report | —   |
| GET | `/api/report/get_morocco_payroll_params` | jwtauth, auth.apikey | ReportController@getMoroccoPayrollParams | —   |

- - -

### 10\. Cron (24 routes)

All cron routes use `jwtauth, auth.apikey` middleware and `GET` method.

|     |     |     |
| --- | --- | --- |
| URI | Controller | Purpose |

|     |     |     |
| --- | --- | --- |
| URI | Controller | Purpose |
| `/api/cron/initial_sync_of_users` | CronController@initial\_sync\_of\_users | Full BHR sync |
| `/api/cron/sync_users` | CronController@sync\_users | Changed users sync |
| `/api/cron/sync_users/{since_date}` | CronController@sync\_users | Sync since date |
| `/api/cron/generate_weekly_dtr` | CronController@generate\_weekly\_dtr | Generate DTR records |
| `/api/cron/generate_weekly_dtr/{start}/{end}` | CronController@generate\_weekly\_dtr | Generate for range |
| `/api/cron/sync_realtime_biometrics` | CronController@sync\_realtime\_biometrics | Biometric sync |
| `/api/cron/sync_realtime_biometrics/{start}/{end}` | CronController@sync\_realtime\_biometrics | Biometric range |
| `/api/cron/sync_holidays` | CronController@sync\_holidays | Holiday sync |
| `/api/cron/sync_holidays/{start}/{end}` | CronController@sync\_holidays | Holiday range |
| `/api/cron/sync_leaves` | CronController@sync\_leaves | Leave sync |
| `/api/cron/sync_leaves/{start}/{end}` | CronController@sync\_leaves | Leave range |
| `/api/cron/sync_dtr` | CronController@sync\_dtr | DTR sync |
| `/api/cron/sync_dtr/{start}/{end}` | CronController@sync\_dtr | DTR range |
| `/api/cron/sync_alter_log` | CronController@sync\_alter\_log | Alter log sync |
| `/api/cron/sync_alter_log/{start}/{end}` | CronController@sync\_alter\_log | Alter log range |
| `/api/cron/sync_rest_day_work` | CronController@sync\_rest\_day\_work | Rest day sync |
| `/api/cron/sync_rest_day_work/{start}/{end}` | CronController@sync\_rest\_day\_work | Rest day range |
| `/api/cron/sync_change_schedule/{start}/{end}` | CronController@sync\_change\_schedule | Schedule sync |
| `/api/cron/sync_overtime` | CronController@sync\_overtime | Overtime sync |
| `/api/cron/sync_overtime/{start}/{end}` | CronController@sync\_overtime | Overtime range |
| `/api/cron/sync_default_schedule` | CronController@sync\_default\_schedule | Default schedule sync |
| `/api/cron/sync_default_schedule/{is_initial}` | CronController@sync\_default\_schedule | Initial sync flag |
| `/api/cron/sync_temporary_schedule` | CronController@sync\_temporary\_schedule | Temp schedule sync |
| `/api/cron/sync_temporary_schedule/{is_initial}` | CronController@sync\_temporary\_schedule | Initial sync flag |

- - -

### 11\. Opsschedule (6 routes — NO AUTH)

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |
| GET | `/api/opsschedule` | **NONE** | OpsScheduleController@get |
| GET | `/api/opsschedule/show/{id}` | **NONE** | OpsScheduleController@show |
| GET | `/api/opsschedule/list/{dept_id?}` | **NONE** | OpsScheduleController@getList |
| POST | `/api/opsschedule` | **NONE** | OpsScheduleController@store |
| PUT | `/api/opsschedule/{id}` | **NONE** | OpsScheduleController@update |
| DELETE | `/api/opsschedule/{id}` | **NONE** | OpsScheduleController@delete |

- - -

### 12\. Client (2 routes)

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |
| POST | `/api/client/assign` | jwtauth, auth.apikey | ClientController@assignEmployeesClient |
| GET | `/api/client/{client_id}/{dept_id}/users` | jwtauth, auth.apikey | ClientController@users |

- - -

### 13\. COE (3 routes)

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |
| GET | `/api/request/coe/` | jwtauth, auth.apikey | COEController@all |
| POST | `/api/request/coe/` | jwtauth, auth.apikey | COEController@create |
| GET | `/api/request/coe/user/` | jwtauth, auth.apikey | COEController@getUsers |

- - -

### 14\. Careers (2 routes — NO AUTH)

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |
| GET | `/api/careers/` | **NONE** | CareersController@index |
| POST | `/api/careers/` | **NONE** | CareersController@store |

- - -

### 15\. Changelogs (2 routes — NO AUTH)

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |
| GET | `/api/changelogs` | **NONE** | ChangeLogsController@getChangeLogs |
| POST | `/api/changelogs` | **NONE** | ChangeLogsController@store |

- - -

### 16\. Base Routes (70+ routes)

These are defined in the main `server/routes/api.php` file, not in modules:

**Meeting Room Booking (18 routes):**

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Controller | Purpose |

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Controller | Purpose |
| POST | `/api/storeroom` | RoomController@storeRoomDetails | Create room |
| GET | `/api/Getroom` | RoomController@GetroomDetails | List rooms |
| GET | `/api/Getroomlist/{id}` | RoomController@Getroomlist | Room detail |
| PUT | `/api/UpdateRoomdetails/{id}` | RoomController@UpdateRoomdetails | Update room |
| GET | `/api/DeleteRoomdetails/{id}` | RoomController@DeleteRoomdetails | Delete room |
| GET | `/api/Getroomcal` | RoomController@GetroomDetailscal | Calendar rooms |
| GET | `/api/Getroomlistlocation_wise/{id}` | RoomController@Getroomlistlocation\_wise | Rooms by location |
| POST | `/api/storelocation` | LocationController@storeLocationDetails | Create location |
| GET | `/api/getlocation/{id?}` | LocationController@GetlocationDetails | List locations |
| GET | `/api/getlocationcal` | LocationController@GetlocationDetailscal | Calendar locations |
| PUT | `/api/UpdateLocationDetails/{id}` | LocationController@UpdateLocationDetails | Update location |
| GET | `/api/DeleteLocationDetails/{id}` | LocationController@DeleteLocationDetails | Delete location |
| POST | `/api/storebooking` | BookingController@storeBookingRoomDetails | Create booking |
| GET | `/api/GetBookeddetails` | BookingController@GetBookeddetails | List bookings |
| GET | `/api/GetBookeddetailsByid/{id}` | BookingController@GetBookeddetailsByid | Booking detail |
| PUT | `/api/Roomapproval/{id}` | BookingController@Roomapproval | Approve booking |
| POST | `/api/validatedate` | BookingController@validatedate | Validate dates |
| GET | `/api/Getitrequirement` | BookingController@get\_itrequirement\_roomlist | IT requirements |

**Dashboard & Notifications:**

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |
| GET | `/api/get_dashboard_all/{page_type}` | BookingController@get\_dashboard\_all |
| GET | `/api/get_redis_notifications/{user_id}` | RedisController@get\_redis\_notifications |
| GET | `/api/Gettodayleaves` | BookingController@get\_today\_leave\_list |
| GET | `/api/Gettommorowleaves` | BookingController@get\_tommorow\_leave\_list |

**Disputes:**

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |
| POST | `/api/storedispute` | DisputeController@store |
| GET | `/api/getdispute` | DisputeController@show |
| GET | `/api/getdisputeExport` | DisputeController@showExport |
| GET | `/api/getpayrollcutoff/{from}/{to}` | DisputeController@getpayrollcutoff |
| GET | `/api/getuserdispute/{id}` | DisputeController@getEmployeeDispute |
| PUT | `/api/updatedispute/{id}` | DisputeController@UpdateDispute |

**Policies & Documents:**

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |
| POST | `/api/uploadfiles` | PoliciesDocumentController@upload |
| GET | `/api/show` | PoliciesDocumentController@show |
| GET | `/api/get_user_departments` | PoliciesDocumentController@get\_user\_departments |
| GET | `/api/showlist` | PoliciesDocumentController@showlist |
| PUT | `/api/updatestatus/{id}/{status}` | PoliciesDocumentController@updatestatus |
| GET | `/api/download_policy/{id}/` | PoliciesDocumentController@downloadPolicy |

**NEO Onboarding:**

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |
| GET | `/api/get_neo_onboarding_users/` | NeoController@get\_neo\_onboarding\_users |
| GET | `/api/get_users_pending_submissions/` | NeoController@get\_users\_pending\_submissions |
| GET | `/api/get_user_submissions_data/` | NeoController@get\_user\_submissions\_data |
| POST | `/api/send_onboarding_link/` | NeoController@send\_onboarding\_link |
| POST | `/api/approve_submissions/` | NeoController@approve\_submissions |
| POST | `/api/request_for_resubmission/` | NeoController@request\_for\_resubmission |
| GET | `/api/get_neo_file/{userId}/{fileId}` | NeoController@get\_file |

**Surveys:**

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |
| GET/POST | `/api/nho_survey` | NewHireOrientationController@index/store |
| GET/POST | `/api/eva_survey` | EvaController@index/store |
| GET/POST | `/api/eva_registration` | EvaController@getEvaRegistration/saveEvaRegistration |
| GET | `/api/user_coc` | CodeOfConductController@index |
| POST | `/api/acknowledge_coc` | CodeOfConductController@store |
| GET/POST | `/api/happiness_survey` | HappinessController@get/add |

**Fresh Service Integration:**

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |

|     |     |     |
| --- | --- | --- |
| Method | URI | Controller |
| GET | `/api/freshservice/workspaces` | FreshServiceController@getWorkspaces |
| GET | `/api/freshservice/tickets/my-tickets` | FreshServiceController@getMyTickets |
| POST | `/api/freshservice/tickets/` | FreshServiceController@createTicket |
| POST | `/api/freshservice/tickets/upload-image` | FreshServiceController@saveTicketImage |
| POST | `/api/freshservice/tickets/attachments` | FreshServiceController@saveAttachment |
| GET | `/api/freshservice/tickets/{id}/` | FreshServiceController@getTicket |
| POST | `/api/freshservice/tickets/{id}/reply` | FreshServiceController@sendTicketConversation |
| GET | `/api/freshservice/tickets/{id}/conversations` | FreshServiceController@getTicketConversation |
| GET | `/api/freshservice/users/suggestions` | FreshServiceController@getUserSuggestions |

**Sync (in base routes — API key only):**

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |

|     |     |     |     |
| --- | --- | --- | --- |
| Method | URI | Middleware | Controller |
| POST | `/api/sync_users` | auth.apikey | SyncController@syncusers |
| POST | `/api/sync_users_hris` | auth.apikey | SyncController@syncusers\_HRIS |
| POST | `/api/sync_holidays` | auth.apikey | SyncController@syncholidays |
| POST | `/api/sync_leaves` | auth.apikey | SyncController@syncleaves |
| POST | `/api/sync_timeoff_allocation` | auth.apikey | SyncController@timeoff\_allocation\_HRIS |
| POST | `/api/sync_timeoff_allocation_new` | auth.apikey | SyncController@timeoff\_allocation\_HRIS\_New |
| POST | `/api/sync_timeoff_allocation_fail_sync` | auth.apikey | SyncController@timeoff\_allocation\_HRIS\_fail\_sync |
| POST | `/api/insert_users` | **NONE** | BookingController@insert\_user\_details |

- - -

## Frontend API Configuration

**File:** `client/src/services/API.js`

|     |     |
| --- | --- |
| Setting | Value |

|     |     |
| --- | --- |
| Setting | Value |
| Base URL | `process.env.REACT_APP_API_BASE_URL` |
| Content-Type | `application/json` |
| Auth header | `Authorization: Bearer {localStorage.access_token}` |
| API key header | `X-Authorization: {REACT_APP_API_KEY}` |
| Request dedup | Yes — prevents duplicate concurrent requests |
| Error handling | Invalid token → logout + redirect to login |
| Loading state | `react-promise-tracker` integration |
| Export method | `API.export()` — uses `arraybuffer` response type for file downloads |

- - -

## Security Summary

### Unprotected Endpoints (No Auth)

**CORRECTION (2026-04-16):** Quickpunch routes were incorrectly flagged as unprotected. They ARE inside the `jwtauth, auth.apikey` middleware group. Verified against actual curl request from production.

|     |     |     |
| --- | --- | --- |
| URI | Risk | Module |

|     |     |     |
| --- | --- | --- |
| URI | Risk | Module |
| All `/api/opsschedule/*` (6 routes) | Full CRUD without auth — **confirmed unprotected** | Opsschedule |
| `GET /api/careers/` | Read-only, low risk | Careers |
| `POST /api/careers/` | Can import job listings without auth | Careers |
| `GET /api/changelogs` | Read-only, low risk | Changelogs |
| `POST /api/changelogs` | Can create changelogs without auth | Changelogs |
| `POST /api/insert_users` | Can insert users without auth | Base routes |
| `GET /api/summaryreport1` | Report data without auth | Report |
| `GET /api/exportsummaryreport1` | Export data without auth | Report |

### API Key Only (No JWT)

|     |     |
| --- | --- |
| URI | Purpose |

|     |     |
| --- | --- |
| URI | Purpose |
| `POST /api/request/approval/` | Email approval link |
| `POST /api/auth/login` | Login (pre-auth) |
| `GET /api/auth/authenticate-ms-client` | MS OAuth |
| `POST /api/forgot_password_request` | Password reset |
| `POST /api/sync_users` | External sync |
| `POST /api/sync_holidays` | External sync |
| `POST /api/sync_leaves` | External sync |

- - -

## Open Questions

1.  `POST /api/insert_users` has no auth at all — is this intentional? Looks like it could create users.
    
2.  `/api/summaryreport1` and `/api/exportsummaryreport1` have no auth — report data exposed.
    
3.  **Duplicate sync endpoints** — sync operations exist in both base routes (`/api/sync_*`) and cron module (`/api/cron/sync_*`). Which set is active?
    
4.  **Meeting Room Booking** is in base routes, not a module. Was this planned to be extracted into a module?
    

- - -

## Verification Log

|     |     |     |     |
| --- | --- | --- | --- |
| Date | Reviewer | Action | Reference |

|     |     |     |     |
| --- | --- | --- | --- |
| Date | Reviewer | Action | Reference |
| 2026-04-16 | AI-generated | Initial DRAFT | EVOX\-15 |
| 2026-04-17 | Gary Aure | Solo verified with verdicts on dead-code endpoints | EVOX\-87 |
| 2026-04-24 | Group | REVIEWED — 4 security escalations open (insert\_users, opsschedule, console.log, strikethrough) | \_sessions/2026-04-24-evox11.md |