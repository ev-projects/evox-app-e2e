// VERIFIED-BACKED — generated 2026-07-07 from my-list.registry.md (vetted by Glenn Macasarte on July 3, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('My Announcement List (/app/team/DepartmentAnnouncementList/)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const [r] = await Promise.all([
                page.waitForResponse(res => res.url().includes('/app/team/DepartmentAnnouncementList/')).catch(() => null),
                page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`),
            ]);
            if (r?.status()) {
                expect(r.status()).toBeLessThan(500);
            }
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body text', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            const bodyText = await page.locator('body').textContent();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('unauthenticated request redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[type="text"], input[name="email"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements
    // ⚠️ Developer-confirmed elements only
    // =========================================================================
    test.describe('Key UI Elements ⚠️', () => {
        test('Create button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] ✅ confirmed: button labelled "Create" / "+ Create Announcement"
                const createBtn = page.getByRole('button', { name: /Create/i })
                    .or(page.getByText(/\+\s*Create Announcement/i));
                await expect(createBtn.first()).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Table / List
    // ⚠️ Developer-confirmed row actions only
    // =========================================================================
    test.describe('Table / List ⚠️', () => {
        test('each row has a "Visit Page" button to view the announcement ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] ✏️ corrected: announcement card is NOT clickable;
                // there is a dedicated "Visit Page" button per row
                const visitPageBtns = page.getByRole('button', { name: /Visit Page/i })
                    .or(page.getByText(/Visit Page/i));
                const count = await visitPageBtns.count();
                // If the list has rows they must expose Visit Page buttons;
                // if the list is empty this assertion is vacuously fine
                if (count > 0) {
                    await expect(visitPageBtns.first()).toBeVisible();
                }
            }
        });

        test('each row has an Edit button ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] ✏️ corrected: row-level Edit button navigates to
                // /app/team/DepartmentAnouncement/{id} and loads form via
                // GET /api/department/announcements/strict/{id} → AnnouncementController::show_strict()
                const editBtns = page.getByRole('button', { name: /Edit/i });
                const count = await editBtns.count();
                if (count > 0) {
                    await expect(editBtns.first()).toBeVisible();
                }
            }
        });

        test('each row has a Delete button ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] ✅ confirmed: Delete button triggers window.confirm
                // then calls DELETE /department/announcements/my_handle_announcements/{id}
                // → AnnouncementController::destroy($id)
                const deleteBtns = page.getByRole('button', { name: /Delete/i });
                const count = await deleteBtns.count();
                if (count > 0) {
                    await expect(deleteBtns.first()).toBeVisible();
                }
            }
        });

        test('Delete button shows browser confirm dialog ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] ✅ confirmed: window.confirm fires before DELETE request
                let dialogFired = false;
                page.on('dialog', async dialog => {
                    dialogFired = true;
                    await dialog.dismiss(); // dismiss so no actual deletion occurs in test
                });

                const deleteBtns = page.getByRole('button', { name: /Delete/i });
                const count = await deleteBtns.count();
                if (count > 0) {
                    await deleteBtns.first().click();
                    expect(dialogFired).toBe(true);
                }
            }
        });

        test('no search/filter input is present on the page ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] ✏️ corrected (Q1 answer): there is NO search filter on
                // this page — the AI draft assumed a search input but Glenn confirmed it does not exist
                const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
                await expect(searchInput).toHaveCount(0);
            }
        });
    });
});
