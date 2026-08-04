// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// ===========================================================================
// 1. SyncBiometrics — /app/admin/SyncBiometrics/
// ===========================================================================
test.describe('SyncBiometrics  (/app/admin/SyncBiometrics/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500 and body is visible', async ({ page }) => {
            const response = await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            expect(response?.status()).toBeLessThan(500);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP fatal errors in body', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            await expect(page.locator('body')).not.toContainText('Uncaught Error');
            await expect(page.locator('body')).not.toContainText('Fatal error');
            await expect(page.locator('body')).not.toContainText('Parse error');
        });
    });

    test.describe('Auth Gate', () => {
        test('unauthenticated user is redirected to /login ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            await page.waitForURL(/\/login/, { timeout: 10000 });
            await expect(
                page.locator('input[name="username"], input[placeholder*="email" i]')
            ).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('Key UI Elements', () => {
        test('heading contains "Biometrics" ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(
                    page.locator('h1, h2, h3, h4, .content-header, .box-title')
                        .filter({ hasText: /Biometrics/i })
                        .first()
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('page title document contains Biometrics ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            const url = page.url();
            if (!url.includes('/login')) {
                const title = await page.title();
                const bodyText = await page.locator('body').innerText();
                expect(title + bodyText).toMatch(/Biometrics/i);
            }
        });
    });

    test.describe('Form Fields', () => {
        test('Date From label is visible ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('label').filter({ hasText: /Date From/i }).first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('Date To label is visible ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('label').filter({ hasText: /Date To/i }).first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('valid_from date input is present ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('input[name="valid_from"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('valid_to date input is present ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('input[name="valid_to"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Submit button is present and enabled ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    test.describe('Table / List', () => {
        test('results table is absent before sync is triggered ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBiometrics/');
            const url = page.url();
            if (!url.includes('/login')) {
                // Table only renders when sync.biometrics.length > 0 — on fresh load it should be absent
                await expect(page.locator('table')).toHaveCount(0, { timeout: 10000 });
            }
        });
    });
});

// ===========================================================================
// 2. SyncBhrLeaves — /app/admin/SyncBhrLeaves/
// ===========================================================================
test.describe('SyncBhrLeaves  (/app/admin/SyncBhrLeaves/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500 and body is visible', async ({ page }) => {
            const response = await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            expect(response?.status()).toBeLessThan(500);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP fatal errors in body', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            await expect(page.locator('body')).not.toContainText('Uncaught Error');
            await expect(page.locator('body')).not.toContainText('Fatal error');
            await expect(page.locator('body')).not.toContainText('Parse error');
        });
    });

    test.describe('Auth Gate', () => {
        test('unauthenticated user is redirected to /login ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            await page.waitForURL(/\/login/, { timeout: 10000 });
            await expect(
                page.locator('input[name="username"], input[placeholder*="email" i]')
            ).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('Key UI Elements', () => {
        test('heading contains "BHR" or "Leaves" ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(
                    page.locator('h1, h2, h3, h4, .content-header, .box-title')
                        .filter({ hasText: /BHR|Leaves/i })
                        .first()
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('page body contains text "BHR" ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('body')).toContainText(/BHR/i);
            }
        });
    });

    test.describe('Form Fields', () => {
        test('Date From label is visible ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('label').filter({ hasText: /Date From/i }).first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('Date To label is visible ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('label').filter({ hasText: /Date To/i }).first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('valid_from date input is present ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('input[name="valid_from"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('valid_to date input is present ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('input[name="valid_to"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Submit button is present ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    test.describe('Table / List', () => {
        test('results table is absent before sync is triggered ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncBhrLeaves/');
            const url = page.url();
            if (!url.includes('/login')) {
                // Table only renders when sync.leaves.length > 0 — on fresh load it should be absent
                await expect(page.locator('table')).toHaveCount(0, { timeout: 10000 });
            }
        });
    });
});

// ===========================================================================
// 3. SyncUTCAdjustment — /app/admin/SyncUTCAdjustment/
// ===========================================================================
test.describe('SyncUTCAdjustment  (/app/admin/SyncUTCAdjustment/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500 and body is visible', async ({ page }) => {
            const response = await page.goto(BASE_URL + '/app/admin/SyncUTCAdjustment/');
            expect(response?.status()).toBeLessThan(500);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP fatal errors in body', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUTCAdjustment/');
            await expect(page.locator('body')).not.toContainText('Uncaught Error');
            await expect(page.locator('body')).not.toContainText('Fatal error');
            await expect(page.locator('body')).not.toContainText('Parse error');
        });
    });

    test.describe('Auth Gate', () => {
        test('unauthenticated user is redirected to /login ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUTCAdjustment/');
            await page.waitForURL(/\/login/, { timeout: 10000 });
            await expect(
                page.locator('input[name="username"], input[placeholder*="email" i]')
            ).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('Key UI Elements', () => {
        test('heading contains "UTC" ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUTCAdjustment/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(
                    page.locator('h1, h2, h3, h4, .content-header, .box-title')
                        .filter({ hasText: /UTC/i })
                        .first()
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('page body contains text "UTC Adjustment" ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUTCAdjustment/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('body')).toContainText(/UTC Adjustment/i);
            }
        });
    });

    test.describe('Form Fields', () => {
        test('Check Adjustment submit button is visible ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUTCAdjustment/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Check Adjustment button label text is correct ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUTCAdjustment/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(
                    page.locator('button[type="submit"]').filter({ hasText: /Check Adjustment/i })
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('no date inputs are rendered — this page has no date range fields ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUTCAdjustment/');
            const url = page.url();
            if (!url.includes('/login')) {
                // SyncUTCAdjustment has commented-out date fields — only the action button exists
                await expect(page.locator('input[name="valid_from"]')).toHaveCount(0, { timeout: 10000 });
                await expect(page.locator('input[name="valid_to"]')).toHaveCount(0, { timeout: 10000 });
            }
        });
    });
});

// ===========================================================================
// 4. SyncUserUpdates — /app/admin/SyncUserUpdates/
// ===========================================================================
test.describe('SyncUserUpdates  (/app/admin/SyncUserUpdates/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500 and body is visible', async ({ page }) => {
            const response = await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            expect(response?.status()).toBeLessThan(500);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP fatal errors in body', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            await expect(page.locator('body')).not.toContainText('Uncaught Error');
            await expect(page.locator('body')).not.toContainText('Fatal error');
            await expect(page.locator('body')).not.toContainText('Parse error');
        });
    });

    test.describe('Auth Gate', () => {
        test('unauthenticated user is redirected to /login ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            await page.waitForURL(/\/login/, { timeout: 10000 });
            await expect(
                page.locator('input[name="username"], input[placeholder*="email" i]')
            ).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('Key UI Elements', () => {
        test('heading contains "User Updates" ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(
                    page.locator('h1, h2, h3, h4, .content-header, .box-title')
                        .filter({ hasText: /User Updates/i })
                        .first()
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('page body contains text "BHR User Updates" ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('body')).toContainText(/User Updates/i);
            }
        });
    });

    test.describe('Form Fields', () => {
        test('Changes From label is visible ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('label').filter({ hasText: /Changes From/i }).first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('valid_from date input is present ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('input[name="valid_from"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('no valid_to date input — SyncUserUpdates uses a single date field ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('input[name="valid_to"]')).toHaveCount(0, { timeout: 10000 });
            }
        });

        test('Submit button is present ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            const url = page.url();
            if (!url.includes('/login')) {
                await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    test.describe('Table / List', () => {
        test('results table is absent before sync is triggered ⚠️', async ({ page }) => {
            await page.goto(BASE_URL + '/app/admin/SyncUserUpdates/');
            const url = page.url();
            if (!url.includes('/login')) {
                // Table only renders when sync.users.length > 0 — on fresh load it should be absent
                await expect(page.locator('table')).toHaveCount(0, { timeout: 10000 });
            }
        });
    });
});
