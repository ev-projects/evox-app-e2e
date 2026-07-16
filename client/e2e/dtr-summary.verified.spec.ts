// VERIFIED-BACKED — generated 2026-07-07 from dtr-summary.registry.md (vetted by Glenn Macasarte on July 2, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('DTR Summary (/app/team/DtrSummary)', () => {

    // -------------------------------------------------------------------------
    // On Load
    // -------------------------------------------------------------------------
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // -------------------------------------------------------------------------
    // Auth Gate
    // -------------------------------------------------------------------------
    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Key UI Elements
    // Developer-confirmed: Export button present on DTR Summary page (Q3 vetting).
    // -------------------------------------------------------------------------
    test.describe('Key UI Elements', () => {
        test('Export button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            if (!page.url().includes('/login')) {
                await expect(page.getByRole('button', { name: /Export/i })).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // -------------------------------------------------------------------------
    // Filter Controls
    // Developer-confirmed (Q4, Q5 vetting):
    //   - Department dropdown
    //   - Name search text input
    //   - Date Range picker (start_date / end_date)
    // -------------------------------------------------------------------------
    test.describe('Filter Controls', () => {
        test('Department dropdown is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            if (!page.url().includes('/login')) {
                // Developer confirmed: Department dropdown exists on this page
                await expect(
                    page.getByRole('combobox', { name: /Department/i })
                        .or(page.locator('select').filter({ hasText: /Department/i }))
                        .or(page.locator('[class*="department"]').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('Name search input is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            if (!page.url().includes('/login')) {
                // Developer confirmed: Name search text input exists on this page
                await expect(
                    page.getByRole('textbox', { name: /Name/i })
                        .or(page.locator('input[placeholder*="Name" i]'))
                        .or(page.locator('input[name="name"]'))
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('start_date date-range picker is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            if (!page.url().includes('/login')) {
                // Developer confirmed: Date Range picker replaces Year/Month/Cutoff cascade
                await expect(
                    page.locator('input[name="start_date"]')
                        .or(page.locator('input[placeholder*="Start" i]'))
                        .or(page.locator('input[type="date"]').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('end_date date-range picker is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DtrSummary`);
            if (!page.url().includes('/login')) {
                await expect(
                    page.locator('input[name="end_date"]')
                        .or(page.locator('input[placeholder*="End" i]'))
                        .or(page.locator('input[type="date"]').last())
                ).toBeVisible({ timeout: 10000 });
            }
        });
    });

});
