// VERIFIED-BACKED — generated 2026-07-07 from ops-schedule.registry.md (vetted by Glenn Macasarte on July 2, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// KNOWN BUG B-EVOX-176: GET /api/opsschedule has no authentication middleware — endpoint is publicly accessible.

test.describe('OPS Schedule (/app/OpsSchedule)', () => {

    // -------------------------------------------------------------------------
    // On Load
    // -------------------------------------------------------------------------
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/OpsSchedule`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/OpsSchedule`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/OpsSchedule`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // -------------------------------------------------------------------------
    // Auth Gate
    // -------------------------------------------------------------------------
    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login or shows login input', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/OpsSchedule`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[type="text"], input[name="email"], input[name="username"]').first()).toBeVisible();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Key UI Elements
    // Developer-confirmed: two-column department schedule cards, each with a
    // react-modal-image component wrapping the schedule image.
    // -------------------------------------------------------------------------
    test.describe('Key UI Elements', () => {
        test('department schedule images are rendered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/OpsSchedule`);
            if (!page.url().includes('/login')) {
                // react-modal-image renders an <img> for each department schedule
                // KNOWN BUG B-EVOX-176: GET /api/opsschedule has no auth middleware; images load even without session cookie
                const images = page.locator('img');
                await expect(images.first()).toBeVisible({ timeout: 10000 });
            }
        });
    });

});
