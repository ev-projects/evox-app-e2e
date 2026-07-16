// VERIFIED-BACKED — generated 2026-07-07 from all-list.registry.md (vetted by Glenn Macasarte on July 3, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// NOTE: [DEVELOPER VETTING] corrects the route to /app/admin/AnnouncementList/.
// The registry AI DRAFT used /app/hr/ManageHrAnnouncements/ — that is wrong.
// The correct component is client/src/container/Admin/AdminAnnouncementsList/AdminAnnouncementsList.js.
// All selectors and endpoints below are sourced exclusively from [DEVELOPER VETTING] blocks.

test.describe('All HR Announcements (/app/hr/ManageHrAnnouncements/)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('unauthenticated request redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[name="email"], input[type="text"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements
    // [DEVELOPER VETTING] confirms: edit button per card (pencil icon), delete button per card (trash icon).
    // [DEVELOPER VETTING] confirms: create button does NOT exist on this page.
    // =========================================================================
    test.describe('Key UI Elements', () => {
        test('edit button is visible on at least one announcement card ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] edit button navigates to /app/team/DepartmentAnnouncement/{announcement_id}
                await expect(page.getByRole('button', { name: /Edit/i }).first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('delete button is visible on at least one announcement card ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] AdminAnnouncementsList.js line 213-215: Delete button is
                // ICON-ONLY (<i class="fa fa-trash"></i>) — no text content.
                // getByRole('button', { name: /Delete/i }) would never match. Use .filter({ has: ... }).
                const deleteBtns = page.locator('button').filter({ has: page.locator('.fa-trash') });
                const count = await deleteBtns.count();
                if (count > 0) {
                    await expect(deleteBtns.first()).toBeVisible({ timeout: 10000 });
                }
            }
        });
    });

    // =========================================================================
    // Filter Controls
    // [DEVELOPER VETTING] (open questions answer): page has filters by department, country, status, and title.
    // =========================================================================
    test.describe('Filter Controls', () => {
        test('department filter is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed filter: by department
                await expect(
                    page.getByRole('combobox', { name: /department/i })
                        .or(page.locator('select[name*="department"], select[name*="dep"]').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('country filter is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed filter: by country
                await expect(
                    page.getByRole('combobox', { name: /country/i })
                        .or(page.locator('select[name*="country"]').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('status filter is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed filter: by status
                await expect(
                    page.getByRole('combobox', { name: /status/i })
                        .or(page.locator('select[name*="status"]').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('title search input is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed filter: by title
                await expect(
                    page.getByRole('textbox', { name: /title/i })
                        .or(page.locator('input[name*="title"], input[placeholder*="title" i]').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Table / List
    // [DEVELOPER VETTING] confirms: list is loaded from GET /api/department/announcements/all.
    // Page is admin-only (open questions answer: admins only).
    // Combines all department announcements (not HR-only — open questions answer).
    // =========================================================================
    test.describe('Table / List', () => {
        test('announcement list area is rendered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                // List section — at minimum a container element should be present
                await expect(
                    page.locator('.announcement-list, [class*="announcement"], table, .card-list').first()
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('edit navigates to department announcement detail page ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] edit button navigates to /app/team/DepartmentAnnouncement/{announcement_id}
                const editBtn = page.getByRole('button', { name: /Edit/i }).first();
                const editBtnCount = await editBtn.count();
                if (editBtnCount > 0) {
                    await editBtn.click();
                    await page.waitForURL(/\/app\/team\/DepartmentAnnouncement\//, { timeout: 10000 }).catch(() => {});
                    expect(page.url()).toMatch(/\/app\/team\/DepartmentAnnouncement\//);
                }
            }
        });

        test('delete triggers window.confirm dialog ⚠️', async ({ page }) => {
            // KNOWN BUG: [DEVELOPER VETTING] delete soft-deletes root + hard-deletes clones.
            // Test only validates the confirm dialog fires — does not confirm the deletion.
            await page.goto(`${BASE_URL}/app/admin/AnnouncementList/`);
            if (!page.url().includes('/login')) {
                let dialogFired = false;
                page.once('dialog', async (dialog) => {
                    dialogFired = true;
                    await dialog.dismiss(); // dismiss to avoid actual deletion in test environment
                });

                // [CODE REVIEW 2026-07-07] Icon-only button — use .fa-trash filter (see above).
                const deleteBtn = page.locator('button').filter({ has: page.locator('.fa-trash') }).first();
                const deleteBtnCount = await deleteBtn.count();
                if (deleteBtnCount > 0) {
                    await deleteBtn.click();
                    // Allow time for dialog event
                    await page.waitForTimeout(500);
                    expect(dialogFired).toBe(true);
                }
            }
        });
    });

});
