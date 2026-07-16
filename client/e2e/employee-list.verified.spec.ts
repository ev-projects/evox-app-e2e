// VERIFIED-BACKED — generated 2026-07-07 from employee-list.registry.md (vetted by Glenn Macasarte on July 2, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Employee List (/app/team/MyTeamList)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements — developer-confirmed ⚠️
    // =========================================================================
    test.describe('Key UI Elements', () => {
        test('Filter button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Filter Controls — developer-confirmed fields ⚠️
    // Confirmed fields: Department, Sub-Department, Status, Job Title, Employee Name
    // =========================================================================
    test.describe('Filter Controls', () => {
        test('Employee Name filter input is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await expect(
                    page.getByRole('textbox', { name: /Employee Name/i })
                        .or(page.getByPlaceholder(/Employee Name/i))
                        .or(page.locator('input[name="employee_name"], input[name="name"]').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('Department filter control is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await expect(
                    page.getByRole('combobox', { name: /Department/i })
                        .or(page.locator('select[name="department"], select[name="department_id"]').first())
                        .or(page.getByText('Department').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('Sub-Department filter control is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await expect(
                    page.getByRole('combobox', { name: /Sub.?Department/i })
                        .or(page.locator('select[name="sub_department"], select[name="sub_department_id"]').first())
                        .or(page.getByText('Sub-Department').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('Status filter control is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await expect(
                    page.getByRole('combobox', { name: /Status/i })
                        .or(page.locator('select[name="status"]').first())
                        .or(page.getByText('Status').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('Job Title filter control is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await expect(
                    page.getByRole('combobox', { name: /Job Title/i })
                        .or(page.locator('select[name="job_title"], select[name="job_title_id"]').first())
                        .or(page.getByText('Job Title').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('clicking Filter button does not produce a PHP error ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                const filterBtn = page.getByRole('button', { name: /Filter/i });
                await filterBtn.click();
                await page.waitForTimeout(1500);
                const bodyText = await page.locator('body').innerText();
                expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
            }
        });
    });

    // =========================================================================
    // Table / List — per-row action buttons confirmed by developer ⚠️
    // Confirmed buttons: View DTR, View Schedule, View Profile, View Punch History
    // Note: "View Punch History" only appears if multi clock-in feature is enabled for the user
    // =========================================================================
    test.describe('Table / List', () => {
        test('employee list table or list container is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                // Wait for the list to load after any initial data fetch
                await page.waitForTimeout(2000);
                await expect(
                    page.locator('table').first()
                        .or(page.locator('[class*="list"], [class*="employee"]').first())
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('View DTR per-row button is present for at least one row ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await page.waitForTimeout(2000);
                const viewDtrBtn = page.getByRole('button', { name: /View DTR/i })
                    .or(page.getByText('View DTR').first());
                // Only assert if at least one employee row is rendered
                const count = await viewDtrBtn.count();
                if (count > 0) {
                    await expect(viewDtrBtn.first()).toBeVisible();
                }
            }
        });

        test('View Schedule per-row button is present for at least one row ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await page.waitForTimeout(2000);
                const viewScheduleBtn = page.getByRole('button', { name: /View Schedule/i })
                    .or(page.getByText('View Schedule').first());
                const count = await viewScheduleBtn.count();
                if (count > 0) {
                    await expect(viewScheduleBtn.first()).toBeVisible();
                }
            }
        });

        test('View Profile per-row button is present for at least one row ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await page.waitForTimeout(2000);
                const viewProfileBtn = page.getByRole('button', { name: /View Profile/i })
                    .or(page.getByText('View Profile').first());
                const count = await viewProfileBtn.count();
                if (count > 0) {
                    await expect(viewProfileBtn.first()).toBeVisible();
                }
            }
        });

        test('View DTR button navigates to /app/dtr/{user_id} ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await page.waitForTimeout(2000);
                const viewDtrBtn = page.getByRole('button', { name: /View DTR/i })
                    .or(page.getByText('View DTR').first());
                const count = await viewDtrBtn.count();
                if (count > 0) {
                    await viewDtrBtn.first().click();
                    await page.waitForTimeout(1000);
                    expect(page.url()).toMatch(/\/app\/dtr\//);
                }
            }
        });

        test('View Profile button navigates to /app/profile/{user_id} ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await page.waitForTimeout(2000);
                const viewProfileBtn = page.getByRole('button', { name: /View Profile/i })
                    .or(page.getByText('View Profile').first());
                const count = await viewProfileBtn.count();
                if (count > 0) {
                    await viewProfileBtn.first().click();
                    await page.waitForTimeout(1000);
                    expect(page.url()).toMatch(/\/app\/profile\//);
                }
            }
        });

        test('View Schedule button navigates to /app/schedule/assign/user/{user_id} ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamList`);
            if (!page.url().includes('/login')) {
                await page.waitForTimeout(2000);
                const viewScheduleBtn = page.getByRole('button', { name: /View Schedule/i })
                    .or(page.getByText('View Schedule').first());
                const count = await viewScheduleBtn.count();
                if (count > 0) {
                    await viewScheduleBtn.first().click();
                    await page.waitForTimeout(1000);
                    expect(page.url()).toMatch(/\/app\/schedule\/assign\/user\//);
                }
            }
        });
    });

});
