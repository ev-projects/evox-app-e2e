# EVOX Dead Code Report — 18 August 2026

**Branch analysed:** `test/coverage-wave-2026-08-18` (HEAD `896687ca`)
**Coverage basis:** `Coverage_Repor-17082026t.zip` (PHPUnit + Jest run of 8 Aug 2026)
**Method:** every method/function the coverage run never fully executed was traced two ways —
top-down (routes → controllers → repositories; app entry points → import graph for React) and
bottom-up (call-site search for every candidate, including Laravel magic: relations-as-properties,
accessors, scopes, `with()` strings, scheduler, Blade views, queue jobs, dynamic dispatch).
Every candidate was then independently re-verified by a second pass before it entered this report.
Items already on the existing review pack for Gary are cross-referenced, not re-reported as new.

---

## 1. Executive summary

| | Count |
|---|---|
| **Newly confirmed dead — backend methods** | **21** |
| **Newly confirmed dead — frontend items** | **3** (1 file, 1 function, 1 whole feature stub) |
| Dead but already on the Gary review pack (no new action) | 6 |
| Candidates that turned out to be ALIVE (do not delete; they need tests instead) | 13 |
| Candidates already deleted by this branch's own commits (stale report entries) | 4 methods + 20 backend files + 8 frontend files |
| **Latent defects discovered while verifying** (not dead code — real bugs) | **5** |

The frontend has almost no dead code — its coverage gap is missing tests, not unreachable code.
The backend dead code clusters in three places: repository methods orphaned when controllers were
rewired to inline the work or call stored procedures directly, an email layer full of empty husks,
and superseded "\_old"/duplicate implementations.

---

## 2. Newly confirmed dead — BACKEND (safe to remove, evidence per item)

### 2a. Repository methods orphaned by controller rewiring
The route still exists and works — but the controller stopped delegating to the repository, so the
repository method is unreachable.

| # | Method | Evidence |
|---|---|---|
| 1 | `AnnouncementRepository::update_status` (Department, L409) | Route `Department/Routes/api.php:78,93` → `AnnouncementController@update_status`, but the controller inlines the work at `AnnouncementController.php:189-191` (`Announcement::find… ->update()`). Route lines carry the author's comment `// uncheck fromcontrolelr`. |
| 2 | `AnnouncementRepository::dashboard_index` (L454) | Controller calls the stored procedure directly: `AnnouncementController.php:242` → `call_sp("EH_SP_Dashboard", …)`. The PHP method is bypassed; the real logic lives in MySQL. |
| 3 | `AnnouncementRepository::show_hr_strict` (L607) | Controller inlines at `AnnouncementController.php:291-292`. Same `// uncheck fromcontrolelr` route comment. |

### 2b. Never-implemented stubs (bodies are `try { return null; }`)

| # | Method | Evidence |
|---|---|---|
| 4 | `DepartmentRepository::dashboard_annoucments` (L151) | No caller anywhere in app/, client/, routes, views. Would be broken if revived (returns a query Builder, never `->get()`). |
| 5 | `DepartmentRepository::create_department_announcement` (L165) | No caller; not in the repository interface, so DI can't reach it. Stub body. |
| 6 | `DepartmentRepository::edit_department_announcement` (L176) | Same. |
| 7 | `DepartmentRepository::destroy_department_announcement` (L187) | Same. All three can go together. |

### 2c. Email layer: four empty husks and one unwired real feature

| # | Method | Evidence |
|---|---|---|
| 8 | `EmailRepository::sendOvertimeRequestChangeStatusEmail` (L135) | All 14 `->send*` call sites in app/ enumerated — no `…ChangeStatusEmail` is ever called. Live path is `OvertimeController.php:58` → `sendOvertimeRequestEmail`. Body is an **empty try block** — does nothing even if called. |
| 9 | `EmailRepository::sendRestDayWorkRequestChangeStatusEmail` (L194) | Same sweep; live path `RestDayWorkController.php:70`. Already noted as known bug B-004 in the verified test suite. Empty try block. |
| 10 | `EmailRepository::sendAlterLogRequestChangeStatusEmail` (L253) | Same; live path `AlterLogController.php:59`. Empty try block. |
| 11 | `EmailRepository::sendChangeScheduleRequestChangeStatusEmail` (L289) | Same; live path `ChangeScheduleController.php:46`. Empty try block. |
| 12 | `EmailRepository::sendSupervisorReminderofNewUser` (L323) | **Different in kind:** this one has a complete, working body that dispatches `SendSupervisorReminderOfNewUserEmailJob` (job class exists and is otherwise unreferenced). No command calls it and `Console/Kernel.php::schedule()` is empty. A finished feature that was never wired to a trigger — supervisors are never told about new reports. **Product question before deletion** (see §6, defect D4). |

### 2d. Superseded / "\_old" / duplicate implementations

| # | Method | Evidence |
|---|---|---|
| 13 | `Announcement::announcement_clones_departments_old` (Department model, L42) | Only the declaration exists. Its live twin `announcement_clones_departments` (L57) has 8 call sites in the two Announcement resources. |
| 14 | `RequestRepository::get_status_numbers_old` (L25) | `RequestController` calls `get_status_numbers` (:167) and `get_status_numbers_only` (:179) — never the `_old` variant. Not in the repository interface. Reached only by tests. |
| 15 | `RequestRepository::get_status_numbers_dashboard` (L303) | The dashboard route calls `get_status_numbers_only` (`RequestController.php:179`), not this. **Caveat:** it IS declared in `RequestRepositoryInterface.php:8` — removing it means removing that interface line too. |
| 16 | `TeamAttendanceSummary::get_summary2` (L320) **and** `get_summary_dtr` (L557) **and** `get_summary` (L38) — i.e. **the whole class** | The live Team Attendance Summary screen never touches this PHP class: `reportActions.js:49` → `POST /report/team_attendance_summary/…` → `ReportController.php:625` → **stored procedure `EH_SP_Attendance_Summary`** at `:650`. The class is a superseded PHP reimplementation, instantiated nowhere in app/. Reached only by two test files. |
| 17 | `DtrSummary::check_if_rest_day_work` (L201) | No caller. Sibling `check_if_holiday` IS called (`DtrSummary.php:62,74,78`) and lines 74/78 inline the exact expression this method wraps. Dead method inside a live class. |

### 2e. Private methods with no caller (unreachable by construction)

| # | Method | Evidence |
|---|---|---|
| 18 | `EmployeeAttendanceReportExport::daydate` (L344) | `private`, zero in-file callers. Already noted in a test header, never formally reported. |
| 19 | `EmployeeAttendanceReportExport::newline` (L352) | Same. |
| 20 | `DpaListExport::registerEvents` (L70) | The class **does not implement `WithEvents`**, so Maatwebsite Excel never calls this hook (framework gates on `instanceof WithEvents` — `vendor/maatwebsite/excel/src/Sheet.php:159`). The class itself is live (`UserController.php:523`). This is dead code created by a missing `implements` — see defect D1 in §6. |
| 21 | `BhrRepository::get_report` (L255) | All 25 `$this->bhr->` call sites enumerated; `get_report` is not among them. The Bhr module has no controller and its route file body is commented out. Declared in `BhrRepositoryInterface.php:23` (remove together). Test-only callers. |
| 22 | `BhrRepository::test` (L525-540) | A scratch stub (opens a transaction, sets `$result = null`, commits, returns null). `protected`, zero callers anywhere. Found during test-writing on 18 Aug; delete with #21. |

---

## 3. Newly confirmed dead — FRONTEND

| # | Item | Evidence |
|---|---|---|
| F1 | `src/container/Profile/LeaveCredits/LeaveCredits/LeaveCredits.js` (doubly-nested duplicate, plus its `index.js`) | Only importer is its own barrel; nothing imports the barrel. **Not an identical copy — it is the PRE-BUGFIX version**: the live outer file filters `balance > 0` (commit `59cf53b88` "fix for wrong leave credits showing on my profile page"); the nested copy still hardcodes the old vacation/sick filter. Delete, do not merge. |
| F2 | `src/store/reducers/dtr/dtrMultiLogsSummaryReducers.js :: processItems` (L48) | Defined, not exported, zero references in its file. The similarly-named live `processItems` is a separate local copy in `dtrSummaryReducers.js:115` — same name, different file. |
| F3 | **The entire Work From Home feature stub**: `src/container/Request/WorkFromHome/` + backend `WorkFromHomeResource` (0%) | The component is an 18-line empty shell; imported at `RouteList.js:37` but **never rendered** — no route, no menu entry, no link (`GlobalVariables.js:39` defines the URL; nothing uses it). Backend confirmed independently: `WorkFromHomeResource` has exactly one reference in server/app — its own class declaration; no controller constructs it, no `::collection`, nothing in the Request module routes. The WFH model is referenced only by migrations, an unused FormRequest, and one User relation. |

**Dead code behind commented-out UI** (confirmed 18-19 Aug — these look like coverage gaps but are
unreachable until someone un-comments or removes the markup; several hide silently-broken features):

| Item | Evidence / consequence |
|---|---|
| `FreshServiceTickets.js` — `apiCall`, `getUserAvatarClass`, `getUserInitials`, `SafeTextRenderer`, `buildSubjectPrefix`, plus the whole CC-emails autocomplete (state + 1s debounce + suggestions call) | Only mentions live inside the commented-out "Requester" column (L321-328) and a commented-out CC input; ~26 of the file's 34 uncovered branch arms. A reply always posts `cc_emails: []`. |
| `FreshServiceForm.js` — 4 of 8 validation-error slots (Category, Sub-category, CC-emails, submit) + the "Priority must be selected" message + the same 3 dead helpers | `validateTicketData` writes only four keys; the priority select can only produce 1-4. (The CC autocomplete IS live on this screen — dead only on My Tickets.) |
| `ViewReportMorocco.js` — `datatimeoffnew`/`Setdatatimeoffnew` (L32), the NEW HIRE heading (L348) and its row map (L360) | The setter is never called, so the NEW HIRE section can never render whatever the API returns. **The Morocco payroll report's new-hire feature silently does not work.** |
| `DtrPunch.js` — the entire year/month/cutoff filter apparatus incl. guards at L92/L105 | No Select is rendered and no setter exists; `componentWillMount`/`componentWillReceiveProps` bodies are commented out, so the screen fetches nothing on mount. |
| `PoliciesDocumentViewer.js` — the `<object type="application/pdf">` fallback (L135) | `pdf` is tested in the first condition (L118), so the else-if (L125) can never be true. |
| `UploadedDocumentList.js` — `openModal`/`closeModal`/`handleviewer`/`downloadBase64File` | No view/download control is rendered; **an administrator cannot look at the document they are toggling.** |
| `DPAForm.js` — `toggleConfirmButton` (no caller) + 4 empty ReactPlayer callbacks | The `onError` one matters: a failed webinar load gives a dead player, no message, no acknowledgment path. |
| `ElSecureCoding.js` — `confirm` state, yup schema, `tickDpa`/`showAlert` dispatch props | `render()` emits only the SharePoint deck; no checkbox/form/submit exists, so **the Secure Coding refresher can never be acknowledged.** |

Additional frontend dead code confirmed during test-writing (18-19 Aug):

| Item | Evidence |
|---|---|
| `MyRequests.js:92-104`, `MyOverallRequest.js:93-105`, `MyTeamRequests.js:216-226/677-682`, `MyTeamAllRequest.js:214-224/603-608` — a `pagination` array of elements built on every render, never placed in the tree (plus its Button onClick and `resetValues`) | All four pages actually paginate through `<Paginate/>`; the only render site is commented out. ~2 unreachable functions per file. |
| `MyTeam/OverallRequest.js` — the Canceled/Approved/Declined arms of `Status` (L177/185/193), and effectively the whole screen | The single table row is hard-coded to `status="Pending"`, the row loop is commented out, and Filter/Reset are wired to nothing — **the screen is still a mock-up**. |
| `MyTeamSchedule.js:38` — `onSubmitHandler` | No caller; the Filter button uses the near-identical `handleSubmit` (L84). Two implementations of one rule — delete one. |
| `ReportNavigatorShort.js` — the three `case "week"` arms (L41/78/102) | The Weekly tab is commented out (L140) and no caller passes `default_view_type="week"`. |
| `Overtime.js:357` — `NoScheduleInfo` component | Its only reference sits inside a commented-out block at L215. |
| `Dashboard.js:525` — `{true ? <EmployeeDashboard/> : null}` | Constant condition; the null arm is dead. |
| `TimeOff.js:38` — `profile.leave_credits != []` | Array-vs-array compare is always true; the null arm is unreachable. |
| `PersonalInformation.js:61` — `Validator.isValid(profile)` guard | L47 dereferences `profile.details` first and the reducer's initial profile is always an object; the false arm can never be taken. |
| `store/reducers/user/userReducers.js` — duplicate `case "UPDATE_USER"` (L84/L94) | The second block (syncing `departments_handled`) is unreachable — this one is also a live bug: handler-list changes need a re-login to show. Duplicate `case "FETCH_ALL_ASSETS"` (150/159) is harmless (identical bodies). |

Housekeeping (not dead code, but found while proving the above): unused imports at
`Profile.js:9` (ChangePasswordForm) and `Wrapper.js:10` (PageNotFound); six orphaned `.css`
files left behind by this branch's own deletions (both `ChangeLogs` dirs, `Hr/*` announcement
dirs); two `index.js` stubs exporting `null` in `Hr/Announcements` and `Hr/PostAnnouncements`.

**Explicitly verified NOT dead** (they simply have no tests): `ElSecureCoding`
(route `/app/EVLearning/Secure_Coding`, linked from `EVLearning.js:60`), `EmailNotFound`
(reached only via a PHP redirect — `LoginController.php:78,120,173`), `PageLoadingCard`
(loading placeholder, 13+ render sites), `PageNotAllowed` (`Wrapper.js:78` permission-denied
arm), `PageNotFound` (catch-all route `RouteList.js:524`), and **both** ChangePassword
components (`ProtectedRoutes.js:35` forced-reset flow vs `PersonalInformation.js:194`
voluntary change — one per flow, neither abandoned).

---

## 4. Already reported / do-not-touch

| Item | Status |
|---|---|
| `Dtr::checkUndertime`, `isTimedOutBeforeSchedule`, `isTimedOutBetweenSchedule`, `isTimedOutAfterSchedule` | Already on the Gary review pack. **Do not delete now** — a previous deletion was attempted and reverted (13+ tests cover them; removal is gated on the payroll dual-engine decision). |
| `Dtr::summary_report_short` (L855) | On the review pack; note the pack claims it was already removed — **it is still present on this branch**, the pack described a different snapshot. |
| `RegisterController::validator` + the four Auth scaffolding controllers | On the review pack (item A5). `Auth::routes()` is never called; `routes/web.php` registers only `/`, `/microsoft-login`, `/microsoft-callback`. |

---

## 5. Verified ALIVE — false positives (need tests, not deletion)

These looked dead to the mechanical scan because it missed **same-file `$this->method()` calls on
private/protected members**. All have confirmed callers; they are now on the test-writing list:

`DtrRepository::apply_biometrics_to_dtr` (:986, :1220), `DtrRepository::save_dtr_policies`
(:139, :254, :362), `DtrRepository::optimze_schedule_application` (:239),
`RestDayWorkRepository::optimze_rest_day` (:90), `ScheduleRepository::save_schedule_details`
(:53, :94, :766), `save_schedule_policies` (5 sites), `save_schedule_holiday_policies` (5 sites),
`assign_to_user` (:200), `assign_to_department` (:208), `User::getFeatureAccess` (User.php:1023-24),
`UserRepository::generate_department` (:154, :246), `BhrRepository::get_match` (:348),
`Computation::compute_overtime` (Computation.php:157 — **load-bearing for payroll amounts**),
`AuthController::get_default_payload` (4 same-file callers on the login paths).

Also stale (already deleted by this branch, the report just hadn't caught up):
`UserRepository::adminRoleConditions`, `UserController::assign_roles_permissions`,
`get_user_role_permission`, `get_roles` — removed by commits `e8899700` / `896687ca` with the
roles-and-permissions cleanup.

---

## 6. Latent defects found during verification (not dead code — real bugs)

| # | Defect | Where | Impact |
|---|---|---|---|
| D1 | `DpaListExport` forgot `implements WithEvents` (and `ShouldAutoSize`, imported but unimplemented) — its styling hook silently never runs | `DpaListExport.php:13` | Cosmetic only today (output is CSV, widths meaningless), but the intent of the code never executes. One-line fix. |
| D2 | `AnnouncementController::show_hr_strict`: `$dep_announcement` is only assigned inside `if (Auth::user()->isLevel("HR"))` — a non-HR caller hits an undefined variable | `AnnouncementController.php:291-297` | 500 error for non-HR users on a live endpoint. |
| D3 | `RouteList.js:523` declares `path={["/", email_not_found]}` but `/` is already claimed by `AuthenticateClient` at :522 — the `/` arm is unreachable | `client/src/config/RouteList.js:522-523` | Harmless today; confusing routing. |
| D4 | A complete supervisor-notification feature (new-user reminder email + queued job) exists but nothing triggers it | `EmailRepository.php:323` + `SendSupervisorReminderOfNewUserEmailJob.php` | Supervisors are never notified of new reports. Decide: wire it to the user-sync flow, or delete it. |
| D5 | `app/Console/Kernel.php::schedule()` is empty — every cron command is presumably triggered by the OS crontab, nothing in-app | `Console/Kernel.php` | Not a bug per se; worth confirming the server crontab covers all 11 commands. |

---

## 7. What this means for the 95% coverage goal

Coverage denominators on this branch (report's numbers, minus files the branch already deleted):

| Metric | Now | After removing the dead code above | To reach 95% |
|---|---|---|---|
| Backend methods | 70.07% (803/1146) | ≈ 71.4% (803/1125) | ≈ 266 more methods to full coverage |
| Backend classes | 64.34% (175/272) | ≈ 64.6% (175/271) | ≈ 83 more classes |
| Frontend functions | 77.99% (2339/2999) | ≈ 78.3% (2339/2988) | ≈ 500 more functions |
| Frontend branches | 88.36% (5160/5840) | ≈ 88.5% | ≈ 380 more branch arms |

Dead code is deliberately **excluded** from the test-writing waves — writing tests for unreachable
code inflates effort and cements code that should be deleted. The removal itself should go through
a Jira ticket to Gary as before (the EVOX-704 route worked well).

---

*Generated 18 Aug 2026 on branch `test/coverage-wave-2026-08-18`. Every verdict in §2-§5 was
produced by tracing actual call sites in this branch's working tree, then independently
re-verified; evidence line numbers refer to this branch, not to master.*
