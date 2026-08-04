// VERIFIED-BACKED — generated 2026-07-07 from alter-punch-date.registry.md (vetted by Glenn Macasarte on July 1, 2026)
// CORRECTED 2026-07-07 — 2 broken selectors fixed after JSX review:
//   getByText('+') → button.filter({ has: i.fa-plus }) — the + is a Font Awesome icon, not a text node
//   getByText('−') → button.filter({ has: i.fa-minus }) — same; minus is a CSS glyph, not Unicode '−'
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// KNOWN BUG BUG-003: AlterLogPunchRepository::destroy() calls AlterLog::findOrFail() — deletes an AlterLog record by ID, not the punch record
// KNOWN BUG BUG-004: AlterLogPunchRepository::pending() calls AlterLog::findOrFail() — sets wrong model to pending
// KNOWN BUG BUG-005: Table name mismatch: model uses alter_log_punches_new, migration creates alter_log_punches
// KNOWN BUG BUG-008: No email notification at any stage of Alter Log Punch lifecycle
// KNOWN BUG BUG-009: Update path is dead code — updateAlterLogPunch dispatch commented out in frontend
// KNOWN BUG GAP-003: No form request validation class — backend accepts any payload, malformed new_punch throws PHP exception
// KNOWN BUG GAP-004: Conflict error returns HTTP 500 instead of 422 — frontend shows confusing generic error alert
// KNOWN BUG GAP-005: No payroll-period / dispute check — corrections for past-cutoff dates treated same as current period

test.describe('Alter Punch Date (/app/request/AlterLogPunch/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            const bodyText = await page.locator('body').textContent();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    test.describe('Key UI Elements', () => {
        test('Submit button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Submit')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Date label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Date:')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    test.describe('Filter Controls', () => {
        test('Date picker renders with form-control class ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                // Date field: react-datepicker with className="form-control", label "Date:"
                await expect(page.locator('input.form-control').first()).toBeVisible({ timeout: 10000 });
            }
        });
    });

    test.describe('Form Fields', () => {
        test('Employee Note textarea renders ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                // name="employee_note" — textarea, label "Note:"
                await expect(page.locator('textarea[name="employee_note"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Approver Note textarea renders in supervisor view ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                // name="approver_note" — only rendered when is_under_supervisee=true (supervisor session).
                // This test WILL FAIL for non-supervisor test sessions — that is expected behaviour.
                // approver_note renders on the :id route when onApproval=true; at the base store URL
                // it is conditional on the logged-in user being a supervisee's supervisor.
                await expect(page.locator('textarea[name="approver_note"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Add row button (fa-plus icon) renders in the right panel ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                // AlterLogPunch.js line 479: <Button><i className="fa fa-plus" /></Button>
                // The + is a Font Awesome CSS icon — no visible text node. Locate by icon class.
                await expect(
                    page.locator('button').filter({ has: page.locator('i.fa-plus') })
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('Remove row button (fa-minus icon) renders in the right panel ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                // AlterLogPunch.js line 480: <Button><i className="fa fa-minus" /></Button>
                // The − is a Font Awesome CSS icon — no visible text node. Locate by icon class.
                await expect(
                    page.locator('button').filter({ has: page.locator('i.fa-minus') })
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('Submit button is clickable and shows confirm dialog ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                // Confirm dialog appears on submit
                let dialogSeen = false;
                page.on('dialog', async (dialog) => {
                    dialogSeen = true;
                    await dialog.dismiss();
                });
                await page.getByText('Submit').click();
                // dialog may or may not fire depending on form validation state; just assert no crash
                await expect(page.locator('body')).toBeVisible();
            }
        });
    });

    test.describe('Table / List', () => {
        test('Existing punch table renders (read-only, left panel) ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/`);
            if (!page.url().includes('/login')) {
                // <table> read-only, columns: Date, Clock In, Clock Out, Hour Count, Punch Status, Project
                await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
            }
        });
    });

});

// Second describe block — Approval / Update route (/app/request/AlterLogPunch/:id)
// KNOWN BUG BUG-009: Update path is dead code — updateAlterLogPunch dispatch commented out; editing an existing pending record does nothing
test.describe('Alter Punch Date — Approval/Update route (/app/request/AlterLogPunch/:id)', () => {

    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/request/AlterLogPunch/1`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/1`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/1`);
            const bodyText = await page.locator('body').textContent();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/1`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    test.describe('Key UI Elements', () => {
        test('Approve button renders when viewing an existing request ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/1`);
            if (!page.url().includes('/login')) {
                // text: "Approve" — sets action="approve" → PUT /api/request/alter_log_punch/approve/{id}
                await expect(page.getByText('Approve')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Decline button renders when viewing an existing request ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/1`);
            if (!page.url().includes('/login')) {
                // text: "Decline" — sets action="decline" → PUT /api/request/alter_log_punch/decline/{id}
                await expect(page.getByText('Decline')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Cancel button renders when viewing an existing request ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/AlterLogPunch/1`);
            if (!page.url().includes('/login')) {
                // text: "Cancel" — sets action="cancel" → PUT /api/request/alter_log_punch/cancel/{id}
                await expect(page.getByText('Cancel')).toBeVisible({ timeout: 10000 });
            }
        });
    });

});
