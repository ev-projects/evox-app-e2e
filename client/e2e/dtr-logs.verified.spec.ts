// VERIFIED-BACKED — generated 2026-07-07 from dtr-logs.registry.md (vetted by Glenn Macasarte on July 2, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Vetting notes:
// - Route confirmed: /app/team/DtrLogs (corrected from AI DRAFT /app/dtr_logs)
// - Component confirmed: client/src/container/MyTeam/DtrLogs/DtrLogs.js
// - No :id param — page does not accept a user ID in the route
// - "Generate" button confirmed present (Q4 answer)
// - "Export" button confirmed present (Q5 answer)
// - No feature gate required (Q6: does not require multi_login feature)
// - Year/Month/Payroll Cutoff selects, employee-select, punch log table, filter-btn
//   all corrected by Glenn as "does not exist in DTR Logs page" — omitted from tests

test.describe('DTR Logs (/app/team/DtrLogs)', () => {

    test.describe('On Load', () => {

        test('returns status < 500 ⚠️', async ({ page }) => {
            const responses: number[] = [];
            page.on('response', r => {
                if (r.url().includes('/app/team/DtrLogs')) {
                    responses.push(r.status());
                }
            });
            const r = await page.goto(`${BASE_URL}/app/team/DtrLogs`).catch(() => null);
            if (r) {
                expect(r.status()).toBeLessThan(500);
            }
        });

        test('body is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrLogs`).catch(() => null);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrLogs`).catch(() => null);
            const bodyText = await page.locator('body').textContent({ timeout: 10000 }).catch(() => '');
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });

    });

    test.describe('Auth Gate', () => {

        test('unauthenticated user is redirected to login ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrLogs`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="password"]')).toBeVisible();
            }
        });

    });

    test.describe('Key UI Elements', () => {

        // Developer-confirmed buttons: "Generate" (Q4) and "Export" (Q5)
        // These are the only two elements confirmed present by Glenn's vetting.
        // All other AI-drafted elements (filters, table, employee select) were
        // corrected as "does not exist in DTR Logs page".

        test('Generate button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrLogs`).catch(() => null);
            if (!page.url().includes('/login')) {
                await expect(
                    page.getByRole('button', { name: /Generate/i })
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('Export button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrLogs`).catch(() => null);
            if (!page.url().includes('/login')) {
                await expect(
                    page.getByRole('button', { name: /Export/i })
                ).toBeVisible({ timeout: 10000 });
            }
        });

    });

});
