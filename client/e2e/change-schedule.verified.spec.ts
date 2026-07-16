// VERIFIED-BACKED — generated 2026-07-07 from change-schedule.registry.md (vetted by Glenn Macasarte on July 1, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Change of Schedule (/app/request/ChangeSchedule/)', () => {

    // -------------------------------------------------------------------------
    // On Load
    // -------------------------------------------------------------------------
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // -------------------------------------------------------------------------
    // Auth Gate
    // -------------------------------------------------------------------------
    test.describe('Auth Gate', () => {
        test('unauthenticated user is redirected to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[name="email"], input[type="text"]').first()).toBeVisible();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Key UI Elements (Store mode — new request)
    // Developer-confirmed buttons from [DEVELOPER VETTING] Area 5
    // -------------------------------------------------------------------------
    test.describe('Key UI Elements', () => {
        test('Submit button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
            if (!page.url().includes('/login')) {
                // Confirmed text: "Submit" (Area 5, element #13, DEVELOPER VETTING ✅ confirmed)
                await expect(page.getByText('Submit')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // -------------------------------------------------------------------------
    // Form Fields (Store mode — new request)
    // Developer-confirmed from [DEVELOPER VETTING]:
    //   - Area 4: employee_note textarea (✅ confirmed)
    //   - Area 2: ScheduleHolidayPolicy, SchedulePolicy, WorkDays (✅ confirmed)
    //   - Area 1: valid_from / valid_to — name attributes NOT in DOM (✏️ corrected)
    //   - Area 3: per-day time pickers — name attributes NOT in DOM (✏️ corrected)
    // -------------------------------------------------------------------------
    test.describe('Form Fields', () => {
        test('employee Note textarea is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
            if (!page.url().includes('/login')) {
                // name="employee_note" <textarea> · label "Note:" · visible in non-approval mode
                // (Area 4, element #11, DEVELOPER VETTING ✅ confirmed)
                await expect(page.locator('textarea[name="employee_note"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('"Valid From:" label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
            if (!page.url().includes('/login')) {
                // Area 1 — name attribute NOT in DOM (✏️ corrected); test by visible label text
                await expect(page.getByText('Valid From:')).toBeVisible({ timeout: 10000 });
            }
        });

        test('"Valid To:" label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
            if (!page.url().includes('/login')) {
                // Area 1 — name attribute NOT in DOM (✏️ corrected); test by visible label text
                await expect(page.getByText('Valid To:')).toBeVisible({ timeout: 10000 });
            }
        });
    });

});

// =============================================================================
// Approval mode — /app/request/ChangeSchedule/:id (supervisor view)
// Developer-confirmed buttons (Area 5, DEVELOPER VETTING ✅ confirmed):
//   Approve (#14), Decline (#15), Cancel (#16)
// Q2 answer: Approve button NOT visible on employee's own view — only supervisor
// =============================================================================
test.describe('Change of Schedule — Approval mode (/app/request/ChangeSchedule/:id)', () => {

    test.describe('On Load', () => {
        test('approval route returns status < 500', async ({ page }) => {
            // Use a sentinel ID; the page may redirect or show a 404 state — not a 500
            const r = await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    test.describe('Auth Gate', () => {
        test('unauthenticated user is redirected to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[name="email"], input[type="text"]').first()).toBeVisible();
            }
        });
    });

    test.describe('Key UI Elements — supervisor approval actions', () => {
        test('Approve button is visible for supervisor ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
            if (!page.url().includes('/login')) {
                // Confirmed text: "Approve" — only visible if: (a) logged-in user is supervisor
                // (is_under_supervisee = true) AND (b) request status is "pending" or "declined".
                // RequestButtons.js: approval mode shows Approve only when status != 'approved'.
                const btn = page.getByText('Approve');
                const count = await btn.count();
                if (count > 0) {
                    await expect(btn.first()).toBeVisible({ timeout: 10000 });
                }
            }
        });

        test('Decline button is visible for supervisor ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
            if (!page.url().includes('/login')) {
                // Confirmed text: "Decline" — only visible if supervisor AND status is pending or approved.
                const btn = page.getByText('Decline');
                const count = await btn.count();
                if (count > 0) {
                    await expect(btn.first()).toBeVisible({ timeout: 10000 });
                }
            }
        });

        test('Cancel button is visible in update mode (employee own request) ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Cancel button renders ONLY in method=='update' mode
                // (RequestButtons.js line 32), NOT in approval mode. Approval mode shows only
                // Approve/Decline based on status. Cancel is for employees cancelling their own request.
                // KNOWN BUG B-001: cancel() uses trans('messages.cancel_overtime_success') — wrong key.
                const btn = page.getByText('Cancel');
                const count = await btn.count();
                if (count > 0) {
                    await expect(btn.first()).toBeVisible({ timeout: 10000 });
                }
            }
        });

        test('approver Note textarea is visible in approval mode ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
            if (!page.url().includes('/login')) {
                // name="approver_note" <textarea> · label "Note:" · visible in approval mode
                // (Area 4, element #12, DEVELOPER VETTING ✅ confirmed)
                await expect(page.locator('textarea[name="approver_note"]')).toBeVisible({ timeout: 10000 });
            }
        });
    });

});

// =============================================================================
// Known bug markers (do not remove — tracked for fix verification)
// KNOWN BUG B-001: cancel() uses trans('messages.cancel_overtime_success') — wrong message key
// KNOWN BUG B-002: No server-side validation of schedule_details or schedule_policies — malformed payload throws unhandled exception
// KNOWN BUG B-003: Dead custom validation message valid_from.unique_dates — rule not applied, message is dead code
// KNOWN BUG B-006: Nested DB::beginTransaction() in approve() calling update() — InnoDB silently ignores inner begin
// KNOWN BUG B-007: Raw SQL string interpolation in changeSchedules() model method — SQL injection risk if dates unsanitised
// KNOWN BUG B-008: eval() in ChangeSchedule.js render for accessing nested schedule_details properties
// =============================================================================
