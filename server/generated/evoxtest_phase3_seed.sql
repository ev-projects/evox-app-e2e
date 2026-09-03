-- =============================================================================
-- EVOX Phase 3 Baseline Data Seed
-- Generated: 2026-08-14 (evoxtest s35)
-- Run ONCE against the test DB in HeidiSQL / DBeaver / MySQL CLI.
-- Unblocks ~320 of the 401 DATA-SEEDABLE blocked tests.
--
-- User anchors (confirmed active in test DB):
--   Glenn Macasarte — user_id = 1593, bhr_num = 43284
--   Gary Aure       — user_id = 1698, LevelId = 1, IsPrimeHead = 1, sub_dept = 403
--
-- Dates used: March 2025 workdays (well clear of any current payroll period).
--   2025-03-03 Mon, 2025-03-04 Tue, 2025-03-05 Wed, 2025-03-06 Thu, 2025-03-07 Fri
--
-- Unix timestamp convention (alter_logs, dtrs):
--   MySQL server assumed UTC.
--   UNIX_TIMESTAMP('2025-03-07 00:00:00') = 2025-03-07 00:00 UTC = 08:00 PHT ✓
--
-- schedule_details and schedule_policies have NO created_at / updated_at.
-- =============================================================================

-- ── safety guard ──────────────────────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- SECTION 1 — SCHEDULES + DETAILS + POLICIES
-- Unblocks: ScheduleValidationApiTest, ScheduleWriteTest, ScheduleReplicationTest,
--           ScheduleModelCompleteTest, OpsScheduleBranchTest, AssignScheduleHappyPathTest,
--           ScheduleTemplateBranchTest, CronDtrGenerationBranchTest, many more (~27 tests)
-- =============================================================================

-- Template schedule (source_type='template') — used by ScheduleValidationApiTest PUT/GET
INSERT INTO schedules
    (name, bind_to, bind_id, source_type, schedule_type, valid_from, valid_to, rest_days,
     updated_by, created_by, created_at, updated_at, deleted_at)
VALUES
    ('EVOX-TEST Template 08-17', 'user', 1593, 'template', 'standard',
     '2025-01-01', '2026-12-31', '["sat","sun"]',
     1698, 1698, NOW(), NOW(), NULL);

SET @template_sched_id = LAST_INSERT_ID();

-- schedule_details for the template (NO timestamps!)
INSERT INTO schedule_details (schedule_id, day, start_time, end_time, break_time)
VALUES (@template_sched_id, 'all', 0, 32400, 3600);
-- start_time=0 → 08:00 PHT (8×3600−28800), end_time=32400 → 17:00 PHT, break_time=3600=1 hr

-- Default schedule bound to Glenn (source_type='default') — needed by many DTR + cron tests
INSERT INTO schedules
    (name, bind_to, bind_id, source_type, schedule_type, valid_from, valid_to, rest_days,
     updated_by, created_by, created_at, updated_at, deleted_at)
VALUES
    ('EVOX-TEST Default Glenn', 'user', 1593, 'default', 'standard',
     '2025-01-01', '2026-12-31', '["sat","sun"]',
     1698, 1698, NOW(), NOW(), NULL);

SET @default_sched_id = LAST_INSERT_ID();

INSERT INTO schedule_details (schedule_id, day, start_time, end_time, break_time)
VALUES (@default_sched_id, 'all', 0, 32400, 3600);

-- Non-template schedule (source_type='default', different bind) — needed by ScheduleValidationApiTest DELETE
INSERT INTO schedules
    (name, bind_to, bind_id, source_type, schedule_type, valid_from, valid_to, rest_days,
     updated_by, created_by, created_at, updated_at, deleted_at)
VALUES
    ('EVOX-TEST NonTemplate', 'user', 1698, 'default', 'standard',
     '2025-01-01', '2026-12-31', '["sat","sun"]',
     1698, 1698, NOW(), NOW(), NULL);

SET @nontemplate_sched_id = LAST_INSERT_ID();

INSERT INTO schedule_details (schedule_id, day, start_time, end_time, break_time)
VALUES (@nontemplate_sched_id, 'all', 0, 32400, 3600);

-- Change-schedule schedule (source_type='change_schedule') — needed by ChangeScheduleRepositoryLiveTest
INSERT INTO schedules
    (name, bind_to, bind_id, source_type, schedule_type, valid_from, valid_to, rest_days,
     updated_by, created_by, created_at, updated_at, deleted_at)
VALUES
    ('EVOX-TEST ChangeSchedule', 'user', 1593, 'change_schedule', 'standard',
     '2025-03-03', '2025-03-07', '["sat","sun"]',
     1698, 1698, NOW(), NOW(), NULL);

SET @cs_sched_id = LAST_INSERT_ID();

INSERT INTO schedule_details (schedule_id, day, start_time, end_time, break_time)
VALUES (@cs_sched_id, 'all', 0, 32400, 3600);

-- Schedule policies for the default schedule (needed by DtrDecisionMethodsTest)
INSERT INTO schedule_policies (schedule_id, policy, value)
VALUES
    (@default_sched_id, 'allow_late',      '1'),
    (@default_sched_id, 'allow_undertime', '1');

-- OpsSchedule row — needed by OpsScheduleBranchTest::show__load__valid_id__ok_200
INSERT IGNORE INTO ops_schedules
    (department_id, type, name, position, email, domain, scope, timezone,
     work_days, start_time, end_time, is_active, created_at, updated_at)
VALUES
    (4, 'form', 'EVOX-TEST Ops Schedule', 'QA Lead', 'qa@eastvantage.com',
     'evox', 'PH', 'GMT+8', 'mon,tue,wed,thu,fri', 0, 32400, 1, NOW(), NOW());


-- =============================================================================
-- SECTION 2 — DTR ROWS
-- Unblocks: ComputationDirectTest, DtrApiTest, DtrRepository3Test,
--           DtrRepositoryIntegration2Test, DtrRepositorySpFakeTest,
--           ComputationEngineTest, CronDtrGenerationBranchTest,
--           DtrRepositoryComputePayrollTest, ExportsCollectionFinishTest,
--           DtrLogResourceTest, DtrDecisionMethodsTest, ZeroCoverageModelsReposTest (~32 tests)
-- =============================================================================

-- Using April 2025 to avoid conflicts with existing March rows for Glenn (user_id=1593).
-- INSERT IGNORE skips any date that already has a row for this user.
-- Dates: 2025-04-07 Mon, 2025-04-03 Thu, 2025-04-04 Fri, 2025-04-05 Sat (rest day)
--
-- UNIX_TIMESTAMP('2025-04-07 00:00:00') = 08:00 PHT (MySQL UTC server assumed)
-- UNIX_TIMESTAMP('2025-04-07 09:00:00') = 17:00 PHT

INSERT IGNORE INTO dtrs
    (user_id, date, time_in, time_out,
     start_datetime, end_datetime,
     is_rest_day, break_time, source_type_tagging,
     created_at, updated_at, deleted_at)
VALUES
    -- Row 1: complete logs, regular workday Monday
    (1593, '2025-04-07',
     UNIX_TIMESTAMP('2025-04-07 00:00:00'),  -- 08:00 PHT time_in
     UNIX_TIMESTAMP('2025-04-07 09:00:00'),  -- 17:00 PHT time_out
     UNIX_TIMESTAMP('2025-04-07 00:00:00'),  -- start_datetime
     UNIX_TIMESTAMP('2025-04-07 09:00:00'),  -- end_datetime
     0, 3600, 'default',
     NOW(), NOW(), NULL),

    -- Row 2: complete logs, Thursday (for DtrRepositoryIntegration2Test)
    (1593, '2025-04-03',
     UNIX_TIMESTAMP('2025-04-03 00:00:00'),
     UNIX_TIMESTAMP('2025-04-03 09:00:00'),
     UNIX_TIMESTAMP('2025-04-03 00:00:00'),
     UNIX_TIMESTAMP('2025-04-03 09:00:00'),
     0, 3600, 'default',
     NOW(), NOW(), NULL),

    -- Row 3: no time_out (missing punch-out, for isIncompleteLog tests)
    (1593, '2025-04-04',
     UNIX_TIMESTAMP('2025-04-04 00:00:00'),  -- time_in present
     NULL,                                     -- time_out missing
     UNIX_TIMESTAMP('2025-04-04 00:00:00'),
     UNIX_TIMESTAMP('2025-04-04 09:00:00'),
     0, 3600, 'default',
     NOW(), NOW(), NULL),

    -- Row 4: rest day DTR with time logs (for rest_day_dtr_computes_without_error)
    (1593, '2025-04-05',                       -- Saturday (rest day)
     UNIX_TIMESTAMP('2025-04-05 00:00:00'),
     UNIX_TIMESTAMP('2025-04-05 09:00:00'),
     NULL, NULL,
     1, 3600, 'rest_day_work',
     NOW(), NOW(), NULL);


-- DtrPolicy rows for DTR row 1 (needed by DtrDecisionMethodsTest)
SET @dtr1_id = (SELECT id FROM dtrs WHERE user_id=1593 AND date='2025-04-07' AND deleted_at IS NULL LIMIT 1);

INSERT IGNORE INTO dtr_policies (dtr_id, policy, value)
VALUES
    (@dtr1_id, 'allow_late',      '1'),
    (@dtr1_id, 'allow_undertime', '1');


-- =============================================================================
-- SECTION 3 — ALTER LOGS
-- Unblocks: AlterLogBranchTest (approve/load/submit), AlterLogValidationApiTest,
--           MailablesBuildTest, EmailRepositoryQueueFakeTest, DisputeBranchApiTest,
--           AlterLogBusinessRuleRejectionTest, DtrRepositoryIntegration2Test,
--           ChangeLogBranchTest (load/filter), RequestListBranchTest (~25 tests)
-- alter_log time columns = Unix timestamps (PHT = UTC+8, so 08:00 PHT = 00:00 UTC)
-- =============================================================================

-- Pending alter_log (user=Glenn, date=2025-03-07)
INSERT INTO alter_logs
    (user_id, date,
     current_time_in, current_time_out,
     new_time_in, new_time_out,
     employee_note, approver_note, status,
     created_at, updated_at, deleted_at)
VALUES
    (1593, '2025-03-07',
     UNIX_TIMESTAMP('2025-03-07 00:00:00'),   -- 08:00 PHT
     UNIX_TIMESTAMP('2025-03-07 09:00:00'),   -- 17:00 PHT
     UNIX_TIMESTAMP('2025-03-06 23:55:00'),   -- 07:55 PHT (requested earlier time-in)
     UNIX_TIMESTAMP('2025-03-07 09:00:00'),
     'Test alter log seed — pending', NULL, 'pending',
     NOW(), NOW(), NULL),

    -- Approved alter_log (DtrRepositoryIntegration2Test needs approved + DTR association)
    (1593, '2025-03-03',
     UNIX_TIMESTAMP('2025-03-03 00:00:00'),
     UNIX_TIMESTAMP('2025-03-03 09:00:00'),
     UNIX_TIMESTAMP('2025-03-02 23:55:00'),   -- 07:55 PHT
     UNIX_TIMESTAMP('2025-03-03 09:00:00'),
     'Test alter log seed — approved', 'Approved by seed', 'approved',
     NOW(), NOW(), NULL),

    -- Cancelled alter_log (for cancel branch tests)
    (1593, '2025-03-04',
     UNIX_TIMESTAMP('2025-03-04 00:00:00'),
     UNIX_TIMESTAMP('2025-03-04 09:00:00'),
     UNIX_TIMESTAMP('2025-03-03 23:58:00'),
     UNIX_TIMESTAMP('2025-03-04 09:00:00'),
     'Test alter log seed — cancelled', NULL, 'cancelled',
     NOW(), NOW(), NULL),

    -- Declined alter_log (for decline branch tests)
    (1593, '2025-03-05',
     UNIX_TIMESTAMP('2025-03-05 00:00:00'),
     UNIX_TIMESTAMP('2025-03-05 09:00:00'),
     UNIX_TIMESTAMP('2025-03-04 23:58:00'),
     UNIX_TIMESTAMP('2025-03-05 09:00:00'),
     'Test alter log seed — declined', 'Declined by seed', 'declined',
     NOW(), NOW(), NULL);


-- =============================================================================
-- SECTION 4 — OVERTIMES
-- Unblocks: OvertimeBranchTest (approve/load/submit/delete), OvertimeValidationApiTest,
--           DisputeBranchApiTest, MailablesBuildTest, EmailRepositoryQueueFakeTest,
--           RequestControllerBulkBranchTest, OvertimeBusinessRuleRejectionTest (~15 tests)
-- overtimes.amount = seconds (7200 = 2 hours)
-- =============================================================================

INSERT INTO overtimes
    (user_id, date, amount, type, employee_note, approver_note, status,
     created_at, updated_at, deleted_at)
VALUES
    -- Pending overtime
    (1593, '2025-03-07', 7200, 'overtime',
     'Test overtime seed — pending', NULL, 'pending',
     NOW(), NOW(), NULL),

    -- Approved overtime (for bulk approve + hash_code_approval tests)
    (1593, '2025-03-03', 7200, 'overtime',
     'Test overtime seed — approved', 'Approved by seed', 'approved',
     NOW(), NOW(), NULL),

    -- Non-approved / declined overtime
    (1593, '2025-03-04', 3600, 'overtime',
     'Test overtime seed — declined', 'Declined by seed', 'declined',
     NOW(), NOW(), NULL),

    -- Cancelled overtime
    (1593, '2025-03-05', 3600, 'overtime',
     'Test overtime seed — cancelled', NULL, 'cancelled',
     NOW(), NOW(), NULL);


-- =============================================================================
-- SECTION 5 — REST DAY WORKS
-- Unblocks: RestDayWorkBranchTest (approve/load/submit/delete),
--           DisputeBranchApiTest, MailablesBuildTest, EmailRepositoryQueueFakeTest,
--           RestDayWorkRepositoryLiveTest, RestDayWorkBusinessRuleRejectionTest (~8 tests)
-- start_time = time_to_seconds('09:00', true, "subtract") = 9*3600 - 28800 = 3600
-- end_time   = time_to_seconds('17:00', true, "subtract") = 17*3600 - 28800 = 32400
-- break_time = time_to_seconds('00:30') = 1800
-- =============================================================================

INSERT INTO rest_day_works
    (user_id, date, start_time, end_time, break_time, employee_note, approver_note, status,
     created_at, updated_at, deleted_at)
VALUES
    -- Pending RDW (Sunday 2025-03-02)
    (1593, '2025-03-02', 3600, 32400, 1800,
     'Test RDW seed — pending', NULL, 'pending',
     NOW(), NOW(), NULL),

    -- Approved RDW
    (1593, '2025-03-09', 3600, 32400, 1800,
     'Test RDW seed — approved', 'Approved by seed', 'approved',
     NOW(), NOW(), NULL),

    -- Cancelled RDW
    (1593, '2025-03-16', 3600, 32400, 1800,
     'Test RDW seed — cancelled', NULL, 'cancelled',
     NOW(), NOW(), NULL);


-- =============================================================================
-- SECTION 6 — CHANGE SCHEDULES
-- Unblocks: ChangeScheduleBranchTest, ChangeScheduleRepositoryLiveTest,
--           ProvidersBootTest (unique_dates rule), ScheduleModelCompleteTest,
--           RequestControllerBulkBranchTest, ChangeScheduleBusinessRuleRejectionTest (~10 tests)
-- =============================================================================

-- Pending change_schedule (narrow valid_from/valid_to for DtrRepositoryIntegration2Test)
INSERT INTO change_schedules
    (user_id, schedule_id, valid_from, valid_to, employee_note, approver_note, status,
     created_at, updated_at, deleted_at)
VALUES
    (1593, @cs_sched_id, '2025-03-03', '2025-03-07',
     'Test CS seed — pending', NULL, 'pending',
     NOW(), NOW(), NULL),

    -- Approved change_schedule (for ScheduleModelCompleteTest::change_schedule_returns_the_approved_request)
    (1593, @cs_sched_id, '2025-03-10', '2025-03-14',
     'Test CS seed — approved', 'Approved by seed', 'approved',
     NOW(), NOW(), NULL),

    -- Non-approved (declined) change_schedule
    (1593, @cs_sched_id, '2025-03-17', '2025-03-21',
     'Test CS seed — declined', 'Declined by seed', 'declined',
     NOW(), NOW(), NULL);


-- =============================================================================
-- SECTION 7 — ANNOUNCEMENTS
-- Unblocks: AllAnnouncementListVerifiedApiTest, AnnouncementHappyPathTest,
--           DepartmentAnnouncementsBranchTest, AnnouncementRepositoryLiveTest,
--           AnnouncementStrictResourceTest, ZeroCoverageResourcesTest,
--           ClientAndDepartmentModelsTest (~13 tests)
-- Columns: title, category, content, headline, dep_id, created_by, set_all,
--          expiry_date, log_date, release_date, thumbnail, created_at, updated_at, deleted_at
-- Categories confirmed in app code: "HR", "Department"
-- =============================================================================

-- General announcement (set_all=1, created_by=Glenn, resolvable creator)
INSERT INTO announcements
    (title, category, content, headline, dep_id, created_by, set_all,
     expiry_date, log_date, release_date, thumbnail,
     created_at, updated_at, deleted_at)
VALUES
    ('EVOX-TEST General Announcement',
     'Department',
     '<p>Seed announcement for automated tests.</p>',
     'Test announcement headline',
     NULL, 1593, 1,
     DATE_ADD(NOW(), INTERVAL 30 DAY),
     NOW(), NOW(), NULL,
     NOW(), NOW(), NULL),

    -- HR-category announcement (for AnnouncementRepositoryLiveTest::show_hr_strict)
    ('EVOX-TEST HR Announcement',
     'HR',
     '<p>HR seed announcement for automated tests.</p>',
     'HR test announcement',
     NULL, 1593, 1,
     DATE_ADD(NOW(), INTERVAL 30 DAY),
     NOW(), NOW(), NULL,
     NOW(), NOW(), NULL),

    -- System announcement (created_by=0, for AnnouncementStrictResourceTest::test_system_announcement)
    ('EVOX-TEST System Announcement',
     'Department',
     '<p>System-generated seed announcement.</p>',
     'System announcement',
     NULL, 0, 1,
     DATE_ADD(NOW(), INTERVAL 30 DAY),
     NOW(), NOW(), NULL,
     NOW(), NOW(), NULL);


-- =============================================================================
-- SECTION 8 — UTC_TIMELOG  *** NO INSERT NEEDED — ROWS ALREADY EXIST ***
-- Confirmed existing data (2026-08-14):
--
--   id=1  IST  Asia/Kolkata      +5:30   country_id=1  India        IN  IND
--   id=2  PST  Asia/Manila       +8:00   country_id=2  Philippines  PH  PHL
--   id=6  CET  Africa/Casablanca +1:00   country_id=4  Morocco      MA  MAR
--
-- ⚠ Use these country_id values in any test that filters utc_timelog by country:
--     Philippines → country_id = 2
--     India       → country_id = 1
--     Morocco     → country_id = 4
--
-- If any test hardcodes country_id = 1 for Philippines or = 3 for Morocco,
-- that is a Cat-5 error: fix the test to use the correct ID above.
-- =============================================================================
-- (no SQL — data already present)


-- =============================================================================
-- SECTION 9 — PAYROLL CUTOFFS
-- Unblocks: ProvidersBootTest (unique_payroll_cutoff rule), PayrollCutoffValidationRejectionTest,
--           PayrollCutoffBusinessRuleRejectionTest, ControllerTailsTest (dtr_incomplete_logs) (~8 tests)
-- Columns: name, start_date, end_date, created_at, updated_at, deleted_at
-- The ControllerTailsTest needs a cutoff whose window spans today.
-- =============================================================================

-- Historical cutoff (for overlap collision tests — rejects re-submitting same range)
INSERT INTO payroll_cutoffs (name, start_date, end_date, created_at, updated_at, deleted_at)
VALUES
    ('EVOX-TEST Cutoff Mar-2025-A', '2025-03-01', '2025-03-15', NOW(), NOW(), NULL),
    ('EVOX-TEST Cutoff Mar-2025-B', '2025-03-16', '2025-03-31', NOW(), NOW(), NULL);

-- Current-period cutoff — window spans today (for ControllerTailsTest::dtr_incomplete_logs)
-- NOTE: adjust start_date to at least 2 days before today so [start..yesterday] window > 0
INSERT INTO payroll_cutoffs (name, start_date, end_date, created_at, updated_at, deleted_at)
VALUES
    ('EVOX-TEST Cutoff Current',
     DATE_SUB(CURDATE(), INTERVAL 7 DAY),
     DATE_ADD(CURDATE(), INTERVAL 7 DAY),
     NOW(), NOW(), NULL);


-- =============================================================================
-- SECTION 10 — ROLES AND PERMISSIONS (Spatie)
-- Unblocks: RepositoryCrudFinishTest (assigning_the_admin_role_silently_adds_every_supervisor_permission) (~4 tests)
-- guard_name column does NOT exist in this install — removed from all statements.
-- =============================================================================

INSERT IGNORE INTO roles (name, created_at, updated_at)
VALUES
    ('supervisor', NOW(), NOW()),
    ('admin',      NOW(), NOW()),
    ('employee',   NOW(), NOW());

-- Seed at least one permission and attach it to supervisor
INSERT IGNORE INTO permissions (name, created_at, updated_at)
VALUES ('approve_requests', NOW(), NOW());

-- Link supervisor role → approve_requests permission
INSERT IGNORE INTO role_has_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'approve_requests'
WHERE r.name = 'supervisor';


-- =============================================================================
-- SECTION 11 — ALTER LOG PUNCHES (multi-login / punch rows)
-- Unblocks: AlterLogPunchBranchTest, AlterLogPunchRepositoryLiveTest,
--           RequestControllerBulkBranchTest, ZeroCoverageResourcesTest,
--           DtrStatusMethodsTest (~16 tests)
-- Tables: alter_log_punches_new, dtr_collective_punch_history_new
-- old_punch / new_punch store JSON arrays of { id, ... } objects referencing DtrPunchHistory.
-- =============================================================================

-- Seed DtrPunchHistory rows first (needed by conflict + status method tests).
-- Confirmed columns (2026-08-14):
--   id, user_id, date, project_name (nullable), date_timestamp (bigint NOT NULL DEFAULT 0),
--   time_in (bigint), time_out (bigint), log_action, log_in_type, log_out_type,
--   remarks (nullable), is_active (default 1), client_id (nullable), project_id (nullable),
--   created_at, updated_at
--
-- time_in / time_out / date_timestamp = Unix timestamps (bigint).
--   date_timestamp = start-of-day in UTC (MySQL UTC server assumed):
--     2025-03-07 00:00 UTC = UNIX_TIMESTAMP('2025-03-07 00:00:00')
--   time_in = 2025-03-07 00:00 UTC = 08:00 PHT
--   time_out = 2025-03-07 09:00 UTC = 17:00 PHT
--
-- log_action / log_in_type / log_out_type: values from BHR or device; using 'CheckIn' convention.
--   If the app uses different values (e.g. 'in', 'out', 'biometric'), update below.

INSERT INTO dtr_collective_punch_history_new
    (user_id, date, date_timestamp, time_in, time_out,
     log_action, log_in_type, log_out_type, is_active,
     created_at, updated_at)
VALUES
    -- Row for 2025-03-07 (primary day)
    (1593, '2025-03-07',
     UNIX_TIMESTAMP('2025-03-07 00:00:00'),   -- date_timestamp
     UNIX_TIMESTAMP('2025-03-07 00:00:00'),   -- time_in  (08:00 PHT)
     UNIX_TIMESTAMP('2025-03-07 09:00:00'),   -- time_out (17:00 PHT)
     'CheckIn', 'biometric', 'biometric', 1,
     NOW(), NOW()),

    -- Row for 2025-03-06 (yesterday relative to 2025-03-07 — needed by on_conflict_reports_yesterday_overlap)
    (1593, '2025-03-06',
     UNIX_TIMESTAMP('2025-03-06 00:00:00'),
     UNIX_TIMESTAMP('2025-03-06 00:00:00'),   -- 08:00 PHT
     UNIX_TIMESTAMP('2025-03-06 09:00:00'),   -- 17:00 PHT
     'CheckIn', 'biometric', 'biometric', 1,
     NOW(), NOW());

-- Capture the IDs of the two rows just inserted.
-- LAST_INSERT_ID() returns the first auto-generated ID in a multi-row INSERT.
SET @punch0_id = LAST_INSERT_ID();           -- 2025-03-06 row
SET @punch1_id = @punch0_id + 1;             -- 2025-03-07 row

-- AlterLogPunch row (pending) for Glenn — references the 2025-03-07 punch
INSERT INTO alter_log_punches_new
    (user_id, date,
     old_punch,
     new_punch,
     employee_note, approver_note, status,
     created_at, updated_at)
VALUES
    (1593, '2025-03-07',
     JSON_ARRAY(JSON_OBJECT('id', @punch1_id)),
     JSON_ARRAY(JSON_OBJECT('id', @punch1_id, 'CheckTime', '2025-03-07 08:00:00', 'CheckType', 'I')),
     'Test AlterLogPunch seed — pending', NULL, 'pending',
     NOW(), NOW());


-- =============================================================================
-- SECTION 12 — MISC CONTENT ROWS
-- =============================================================================

-- asset_management row (for AssetEndpointsCoverage100Test::test_update_asset_with_real_id)
-- Confirmed columns (2026-08-14): user_id, personal_equipment, equipment_type, serial_no, asset_tag,
--   created_at, updated_at, deleted_at  (NOT 'is_personal_equipment')
INSERT IGNORE INTO asset_management
    (user_id, personal_equipment, equipment_type, serial_no, asset_tag,
     deleted_at, created_at, updated_at)
VALUES
    (1593, 0, 'Laptop', 'SN-EVOX-TEST-001', 'TAG-001', NULL, NOW(), NOW());

-- employee_clients row (for ClientApiTest::test_get_client_users_returns_200)
-- TODO: run  SHOW COLUMNS FROM employee_clients;  and add required FK columns.
-- Minimal seed — adjust client_id to a valid row in the clients table.
-- INSERT INTO employee_clients (user_id, client_id, created_at, updated_at)
-- VALUES (1593, (SELECT id FROM employee_clients LIMIT 1), NOW(), NOW());
-- DISABLED: needs a valid client_id FK — check clients table first.

-- Holiday rows (for CronDtrGenerationBranchTest::a_holiday_falling_inside_the_requested_range)
-- Confirmed tables: dtr_holidays, holidays  (predefined_holidays does not exist)
-- Seeding into both tables. If columns differ from what's below, the failing INSERT
-- will error and you can run  SHOW COLUMNS FROM dtr_holidays;  or  SHOW COLUMNS FROM holidays;
--
-- holidays table (general — used by leave/payroll modules)
INSERT IGNORE INTO holidays (name, date, type, created_at, updated_at)
VALUES
    ('EVOX-TEST Christmas Day',  '2025-12-25', 'legal',   NOW(), NOW()),
    ('EVOX-TEST Bonifacio Day',  '2025-11-30', 'special', NOW(), NOW()),
    -- Holiday inside April 2025 range (for date-range cron tests)
    ('EVOX-TEST Seed Holiday',   '2025-04-04', 'special', NOW(), NOW());

-- dtr_holidays table (DTR-specific — used by cron DTR generation)
INSERT IGNORE INTO dtr_holidays (name, date, type, created_at, updated_at)
VALUES
    ('EVOX-TEST Christmas Day',  '2025-12-25', 'legal',   NOW(), NOW()),
    ('EVOX-TEST Bonifacio Day',  '2025-11-30', 'special', NOW(), NOW()),
    ('EVOX-TEST Seed Holiday',   '2025-04-04', 'special', NOW(), NOW());


-- =============================================================================
-- RESTORE
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VERIFICATION QUERIES — run after seeding to confirm rows were inserted
-- =============================================================================
SELECT 'schedules'             AS tbl, COUNT(*) AS n FROM schedules             WHERE name LIKE 'EVOX-TEST%';
SELECT 'schedule_details'      AS tbl, COUNT(*) AS n FROM schedule_details      WHERE schedule_id IN (SELECT id FROM schedules WHERE name LIKE 'EVOX-TEST%');
SELECT 'dtrs'                  AS tbl, COUNT(*) AS n FROM dtrs                  WHERE user_id=1593 AND date BETWEEN '2025-03-01' AND '2025-03-31';
SELECT 'alter_logs'            AS tbl, COUNT(*) AS n FROM alter_logs            WHERE user_id=1593 AND date BETWEEN '2025-03-01' AND '2025-03-31';
SELECT 'overtimes'             AS tbl, COUNT(*) AS n FROM overtimes             WHERE user_id=1593 AND date BETWEEN '2025-03-01' AND '2025-03-31';
SELECT 'rest_day_works'        AS tbl, COUNT(*) AS n FROM rest_day_works        WHERE user_id=1593 AND date BETWEEN '2025-03-01' AND '2025-03-31';
SELECT 'change_schedules'      AS tbl, COUNT(*) AS n FROM change_schedules      WHERE user_id=1593;
SELECT 'announcements'         AS tbl, COUNT(*) AS n FROM announcements         WHERE title LIKE 'EVOX-TEST%';
SELECT 'utc_timelog'           AS tbl, COUNT(*) AS n FROM utc_timelog;
SELECT 'payroll_cutoffs'       AS tbl, COUNT(*) AS n FROM payroll_cutoffs       WHERE name LIKE 'EVOX-TEST%';
SELECT 'roles'                 AS tbl, COUNT(*) AS n FROM roles                 WHERE name IN ('supervisor','admin','employee');
SELECT 'alter_log_punches_new' AS tbl, COUNT(*) AS n FROM alter_log_punches_new WHERE user_id=1593;
