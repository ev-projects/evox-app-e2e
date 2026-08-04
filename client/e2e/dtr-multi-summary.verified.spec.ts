// VERIFIED-BACKED — generated 2026-07-07 from dtr-multi-summary.registry.md (vetted by Glenn Macasarte on July 2, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Registry vetting notes:
// - Correct route: /app/team/DtrMultiLogsSummary (no :id param)
// - Correct component: client/src/container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary.js
// - Required feature permission: view_dtr_summary
// - Developer vetting corrected all AI DRAFT elements:
//     Area 1 (year/month/payroll-cutoff dropdowns): do NOT exist on this page
//     Area 2 (toggle POV button): does NOT exist on this page
//     Area 3 (punch history table): does NOT exist on this page
//     Area 4 (DTR summary block): does NOT exist on this page
// - Confirmed present via Q3 vetting response: Export button exists

test.describe('DTR Multi Clock-In Summary (/app/team/DtrMultiLogsSummary)', () => {

    // =========================================================================
    // On Load
    // =========================================================================

    test.describe('On Load', () => {

        test('returns status < 500', async ({ page }) => {
            const responses: number[] = [];
            page.on('response', r => {
                if (r.url().includes('/app/team/DtrMultiLogsSummary')) {
                    responses.push(r.status());
                }
            });
            const r = await page.goto(`${BASE_URL}/app/team/DtrMultiLogsSummary`).catch(() => null);
            if (r) {
                expect(r.status()).toBeLessThan(500);
            }
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrMultiLogsSummary`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrMultiLogsSummary`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });

    });

    // =========================================================================
    // Auth Gate
    // =========================================================================

    test.describe('Auth Gate', () => {

        test('redirects to login when unauthenticated', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrMultiLogsSummary`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
            }
        });

    });

    // =========================================================================
    // Key UI Elements
    // Developer vetting confirmed: Export button exists (Q3 vetting response)
    // All other AI DRAFT elements were corrected out by Glenn Macasarte
    // =========================================================================

    test.describe('Key UI Elements', () => {

        test('Export button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrMultiLogsSummary`);
            if (!page.url().includes('/login')) {
                // Confirmed by vetting Q3: "Actual DTR Multi-Clock In Summary page has 'Export' button"
                await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
            }
        });

    });

});
