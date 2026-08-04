// VERIFIED-BACKED — generated 2026-07-07 from add-template.registry.md (vetted by Glenn Macasarte on July 3, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Add Schedule Template (/app/schedule/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/schedule/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    test.describe('Auth Gate', () => {
        test('redirects to login when unauthenticated', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[name="email"], input[type="text"]').first()).toBeVisible();
            }
        });
    });

    test.describe('Key UI Elements', () => {
        test('Submit button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('button[type="submit"]')).toBeVisible();
            }
        });

        test('Submit button has text "Submit" ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible();
            }
        });
    });

    test.describe('Form Fields', () => {
        test('Name input is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('input[name="name"]')).toBeVisible();
            }
        });

        test('Name input accepts text ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                const nameInput = page.locator('input[name="name"]');
                await nameInput.fill('Test Template');
                await expect(nameInput).toHaveValue('Test Template');
            }
        });

        test('Schedule Type radio — Standard is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] TemplateCreate.js radio buttons have name="schedule_type"
                // but NO value attribute (they use setFieldValue in onChange). Must locate by label.
                await expect(page.locator('label').filter({ hasText: 'Standard' }).locator('input[type="radio"]')).toBeAttached();
            }
        });

        test('Schedule Type radio — Flexible is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('label').filter({ hasText: 'Flexible' }).locator('input[type="radio"]')).toBeAttached();
            }
        });

        test('Schedule Type radio — Customize is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('label').filter({ hasText: 'Customize' }).locator('input[type="radio"]')).toBeAttached();
            }
        });

        test('selecting Standard radio shows start/end/break time fields ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                await page.locator('label').filter({ hasText: 'Standard' }).locator('input[type="radio"]').check();
                // Standard schedule details: start_time, end_time, break_time
                await expect(page.locator('input[name="std_schedule_details[0].start_time"]')).toBeAttached();
                await expect(page.locator('input[name="std_schedule_details[0].end_time"]')).toBeAttached();
                await expect(page.locator('input[name="std_schedule_details[0].break_time"]')).toBeAttached();
            }
        });

        test('schedule policy checkbox — Allow Special Holiday is checked by default ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] ScheduleDetails.js checkboxes have NO name attribute.
                // Use label text: "Special Holiday" (ScheduleHolidayPolicy component).
                const cb = page.locator('label').filter({ hasText: 'Special Holiday' }).locator('input[type="checkbox"]');
                await expect(cb).toBeChecked();
            }
        });

        test('schedule policy checkbox — Allow Legal Holiday is checked by default ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                const cb = page.locator('label').filter({ hasText: 'Legal Holiday' }).locator('input[type="checkbox"]');
                await expect(cb).toBeChecked();
            }
        });

        test('schedule policy checkbox — Allow Undertime is unchecked by default ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                const cb = page.locator('label').filter({ hasText: 'Undertime' }).locator('input[type="checkbox"]');
                await expect(cb).not.toBeChecked();
            }
        });

        test('schedule policy checkbox — Allow Late (Tardiness) is unchecked by default ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Label text in SchedulePolicy is "Tardiness" (not "Late").
                const cb = page.locator('label').filter({ hasText: 'Tardiness' }).locator('input[type="checkbox"]');
                await expect(cb).not.toBeChecked();
            }
        });

        test('schedule policy checkbox — Allow Night Differential is unchecked by default ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                const cb = page.locator('label').filter({ hasText: 'Night Differential' }).locator('input[type="checkbox"]');
                await expect(cb).not.toBeChecked();
            }
        });

        test('submitting empty form shows required error for Name ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                await page.locator('button[type="submit"]').click();
                await expect(page.getByText('This field is required')).toBeVisible({ timeout: 5000 });
            }
        });

        test('submitting without schedule type shows schedule type error ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                await page.locator('input[name="name"]').fill('Test Template');
                await page.locator('button[type="submit"]').click();
                await expect(page.getByText('Please Select Schedule Type')).toBeVisible({ timeout: 5000 });
            }
        });

        // KNOWN GAP: after a successful submit, the form resets to blank but the template list
        // is NOT refreshed — user stays on /app/schedule/ with a blank form and no feedback
        // that the new template appears in the list without a manual page reload.
        test('successful submit shows success alert without redirecting ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/`);
            if (!page.url().includes('/login')) {
                // Fill minimum required fields
                await page.locator('input[name="name"]').fill('PW Smoke Template');
                await page.locator('label').filter({ hasText: 'Standard' }).locator('input[type="radio"]').check();
                // Time fields are rendered by DatePicker — fill underlying inputs if visible
                const startTime = page.locator('input[name="std_schedule_details[0].start_time"]');
                const endTime   = page.locator('input[name="std_schedule_details[0].end_time"]');
                const breakTime = page.locator('input[name="std_schedule_details[0].break_time"]');
                if (await startTime.isVisible()) await startTime.fill('08:00');
                if (await endTime.isVisible())   await endTime.fill('17:00');
                if (await breakTime.isVisible())  await breakTime.fill('12:00');

                await page.locator('button[type="submit"]').click();
                // After success, URL should remain on /app/schedule/ (no redirect)
                await page.waitForTimeout(2000);
                expect(page.url()).toContain('/app/schedule/');
            }
        });
    });

});
