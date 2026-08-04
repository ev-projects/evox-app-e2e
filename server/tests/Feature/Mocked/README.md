# Mocked logic tests — cron/sync + external endpoints

**Status: BUILT LOCALLY — PENDING ON-BOX VERIFICATION.** These were written under the 2026-07-11
"no writes to staging" rule, so they have NOT been deployed or run on the box. Deploy + run ONLY
after Vishnu re-authorizes writes.

## What these are
Safe replacements for the ~62 "Pattern A" cron/sync/Freshservice tests that were neutralized in
`../../findings/OUTGOING-CALL-SAFETY-AUDIT.md` because they invoked the REAL sync (live BHR /
biometric-device / Freshservice calls + whole-DB writes).

Each test binds every EXTERNAL dependency to a Mockery fake via the container **before** the
controller resolves, so the endpoint's logic runs but **no live external call and no mass write can
happen**. Pattern copied from the proven `tests/Feature/ForShare/SchedulerCronCommandsTest.php`.

- `CronSyncMockedTest.php` — sync_holidays, sync_realtime_biometrics, sync_leaves, sync_users.
  Mocks `BhrRepositoryInterface`, `BiometricsRepositoryInterface`, `PayrollCutoffRepositoryInterface`,
  `DtrRepositoryInterface`, `UserRepositoryInterface` (clean container bindings — high confidence).
- `FreshServiceMockedTest.php` — my-tickets list + create ticket. Mocks the `Ixudra\Curl` facade
  (fluent-chain mock — the fragile part; verify method names on-box).

## To deploy + run (after writes re-authorized)
```
pscp -batch -pw ev CronSyncMockedTest.php FreshServiceMockedTest.php \
  lms-dev@10.10.4.24:/var/www/html/evox-app-e2e/server/tests/Feature/Mocked/
plink -ssh -batch -pw ev lms-dev@10.10.4.24 \
  "cd /var/www/html/evox-app-e2e/server && ./vendor/bin/phpunit -c /tmp/phpunit-cov.xml tests/Feature/Mocked"
```
If a fluent Curl method or a repo method name is off, the run will say which — adjust the mock,
never remove the safety (never let a real BHR/FS/biometric call through).

## Still skip-only (documented in the audit, not mock-tested)
The `sync_dtr / sync_overtime / sync_alter_log / sync_rest_day_work / sync_change_schedule` endpoints
depend on `DrupalEvoxRepositoryInterface` (a second external EVOX instance) whose method surface I
did not fully map read-only; they can be mock-tested the same way once that interface is confirmed.
`generate_weekly_dtr` is internal (no external dep) but does a whole-user-set DTR generation — mock
the DTR repo's generate method and scope to one user before running.
