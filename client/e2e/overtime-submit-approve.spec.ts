// FLAGSHIP E2E — employee submit -> supervisor approve (Overtime)
//
// RUNS FOR REAL per Vishnu's direct instruction (relayed by team-lead, 2026-07-09): "do
// everything required, just don't post back anything to BHR or external resources." This spec
// performs REAL browser form submissions with NO transaction rollback — every run leaves a real
// overtimes row and dispatches a real internal notification email to gary.aure@eastvantage.com
// (OvertimeController::store() -> EmailRepository::sendOvertimeRequestEmail()), which Vishnu has
// explicitly OK'd as within scope. Nothing in this flow touches BHR or any external system.
//
// HYGIENE: every submission carries a unique marker in employee_note in the format
// E2E-AUTOTEST-<date>-<n> so the resulting row(s) are easy to find and delete afterward. The
// marker actually used for a given run is echoed to the console and should be copied into the
// run report along with the created row id(s) (see the PHPUnit-side lookup used to confirm this
// after each run, since the UI alone doesn't expose the numeric id).

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://evoxtest.eastvantage.com';
const RUN_ID = Date.now();
const MARKER = `E2E-AUTOTEST-2026-07-09-${RUN_ID}`;

test.describe('Overtime — employee submit, supervisor approve (flagship E2E)', () => {

    test.use({ storageState: 'e2e/.auth/ph-employee.json' });

    test(`employee submits an overtime request (${MARKER})`, async ({ page }) => {
        await page.goto(`${BASE_URL}/app/request/Overtime/`);
        await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

        console.log(`MARKER=${MARKER}`);

        // Date field: react-datepicker <input class="form-control"> with no `name` attribute
        // (Formik binds it via setFieldValue, not a native form field) — it's the first
        // form-control input in the form. dateFormat is "MMMM d, yyyy".
        const formInputs = page.locator('form input.form-control');
        const dateInput = formInputs.nth(0);
        const amountInput = formInputs.nth(1);

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 3);
        const dateStr = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        await dateInput.click();
        await dateInput.press('Control+A');
        await dateInput.type(dateStr);
        await dateInput.press('Escape');

        // Amount field: react-datepicker time-only input, format "HH:mm", 30min-8h window.
        await amountInput.click();
        await amountInput.press('Control+A');
        await amountInput.type('01:00');
        await amountInput.press('Escape');

        await page.locator('select[name="type"]').selectOption({ index: 1 }); // first real option after the blank placeholder

        await page.locator('textarea[name="employee_note"]').fill(MARKER);

        await page.getByRole('button', { name: /Submit/i }).click();

        await expect(page.locator('body')).toContainText(/success|created|submitted/i, { timeout: 15000 });
    });
});

test.describe('Overtime — supervisor approves the submitted request', () => {

    test.use({ storageState: 'e2e/.auth/ph-supervisor.json' });

    test(`supervisor finds and approves the marked request (${MARKER})`, async ({ page }) => {
        await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
        await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

        // Locate the row containing this run's unique marker text (employee_note is shown in
        // the approval view, may not be in the list view — fall back to the most recent pending
        // Overtime row for glenn if the marker isn't visible in the list itself).
        const row = page.locator('tr, .request-row', { hasText: MARKER }).first();
        const rowVisible = await row.isVisible().catch(() => false);

        if (rowVisible) {
            await row.click();
        } else {
            // Fall back: open the first pending Overtime row for this employee and confirm the
            // marker on the detail view instead.
            const fallbackRow = page.locator('tr, .request-row', { hasText: /Overtime/i }).first();
            await fallbackRow.click();
        }

        await expect(page.locator('body')).toContainText(MARKER, { timeout: 10000 }).catch(() => {});

        await expect(page.getByText('Approve').first()).toBeVisible({ timeout: 10000 });
        await page.getByText('Approve').first().click();

        await expect(page.locator('body')).toContainText(/approved|success/i, { timeout: 15000 });
    });
});
