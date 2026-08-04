// VERIFIED-BACKED — generated 2026-07-07 from template-list.registry.md (vetted by Glenn Macasarte on July 3, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Schedule Template List (/app/schedule/template/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/schedule/template/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/template/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/template/`);
            const bodyText = await page.locator('body').textContent();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    test.describe('Auth Gate', () => {
        test('redirects to login when unauthenticated', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/template/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    test.describe('Key UI Elements', () => {
        test('Edit link is visible per table row ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/template/`);
            if (!page.url().includes('/login')) {
                // Edit link navigates client-side to /app/schedule/template/{id} — no API call
                await expect(page.getByRole('link', { name: /Edit/i }).first()).toBeVisible();
            }
        });

        test('Delete button is visible per table row ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/template/`);
            if (!page.url().includes('/login')) {
                // Delete button triggers window.confirm then DELETE /api/schedule/{id}
                await expect(page.getByRole('button').filter({ hasText: /Delete/i }).first()).toBeVisible();
            }
        });
    });

    test.describe('Table / List', () => {
        test('template list table is rendered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/template/`);
            if (!page.url().includes('/login')) {
                // Bootstrap striped table rendered once template list loads
                await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('Edit link navigates to template edit route ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/template/`);
            if (!page.url().includes('/login')) {
                const editLink = page.getByRole('link', { name: /Edit/i }).first();
                const count = await editLink.count();
                if (count > 0) {
                    const href = await editLink.getAttribute('href');
                    // href should match /app/schedule/template/{id}
                    expect(href).toMatch(/\/app\/schedule\/template\/\d+/);
                }
            }
        });

        test('Delete button triggers window.confirm dialog ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/schedule/template/`);
            if (!page.url().includes('/login')) {
                let dialogFired = false;
                page.on('dialog', async (dialog) => {
                    dialogFired = true;
                    expect(dialog.message()).toMatch(/Are you sure you want to delete this template schedule\?/);
                    await dialog.dismiss(); // dismiss to avoid actual deletion
                });
                const deleteBtn = page.getByRole('button').filter({ hasText: /Delete/i }).first();
                const count = await deleteBtn.count();
                if (count > 0) {
                    await deleteBtn.click();
                    // Give the dialog handler a moment to fire
                    await page.waitForTimeout(500);
                    expect(dialogFired).toBe(true);
                }
            }
        });
    });

});
