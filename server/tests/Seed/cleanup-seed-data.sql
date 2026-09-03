-- Removes every row the Seed suite ever committed (rollback plan for the seed run).
-- All seeded rows carry the marker below in their note column.
-- Run against the test/staging DB only. Review the SELECTs before running the DELETEs.

-- Preview what would be removed:
SELECT 'overtimes' t, id, user_id, date, status FROM overtimes        WHERE employee_note LIKE 'SEED-E2E baseline row%';
SELECT 'alter_logs' t, id, user_id, date, status FROM alter_logs      WHERE employee_note LIKE 'SEED-E2E baseline row%';
SELECT 'rest_day_works' t, id, user_id, date, status FROM rest_day_works WHERE employee_note LIKE 'SEED-E2E baseline row%';
SELECT 'change_schedules' t, id, user_id, valid_from, status FROM change_schedules WHERE employee_note LIKE 'SEED-E2E baseline row%';

-- Delete:
DELETE FROM overtimes        WHERE employee_note LIKE 'SEED-E2E baseline row%';
DELETE FROM alter_logs       WHERE employee_note LIKE 'SEED-E2E baseline row%';
DELETE FROM rest_day_works   WHERE employee_note LIKE 'SEED-E2E baseline row%';
DELETE FROM change_schedules WHERE employee_note LIKE 'SEED-E2E baseline row%';
