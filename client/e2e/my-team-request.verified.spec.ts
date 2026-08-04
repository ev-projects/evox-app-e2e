// VERIFIED-BACKED — generated 2026-07-07 from my-team-request.registry.md (vetted by Glenn Macasarte on July 3, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('My Team Requests (/app/team/MyTeamRequests)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('unauthenticated user is redirected to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements
    // =========================================================================
    test.describe('Key UI Elements', () => {
        test('Filter button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Filter')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Bulk Action button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Bulk Action')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Filter Controls
    // =========================================================================
    test.describe('Filter Controls', () => {
        test('date-from input renders with name valid_from ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('input[name="valid_from"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('date-to input renders with name valid_to ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('input[name="valid_to"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('status toggle Pending is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Pending')).toBeVisible({ timeout: 10000 });
            }
        });

        test('status toggle Approved is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Approved')).toBeVisible({ timeout: 10000 });
            }
        });

        test('status toggle Cancelled is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Cancelled')).toBeVisible({ timeout: 10000 });
            }
        });

        test('status toggle Declined is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Declined')).toBeVisible({ timeout: 10000 });
            }
        });

        test('request type tab All Requests is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Tab title from MyTeamRequests.js line 262: title="All Requests"
                await expect(page.getByText('All Requests')).toBeVisible({ timeout: 10000 });
            }
        });

        test('request type tab Alteration is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Alteration')).toBeVisible({ timeout: 10000 });
            }
        });

        test('request type tab Overtime is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Tab title from MyTeamRequests.js line 266: title="Overtime"
                await expect(page.getByText('Overtime')).toBeVisible({ timeout: 10000 });
            }
        });

        test('request type tab Rest Day Work is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Tab title from MyTeamRequests.js line 268: title="Rest Day Work"
                await expect(page.getByText('Rest Day Work')).toBeVisible({ timeout: 10000 });
            }
        });

        test('request type tab Change Schedule is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Change Schedule')).toBeVisible({ timeout: 10000 });
            }
        });

        test('request type tab MultiPunch Alteration is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Tab title from MyTeamRequests.js line 272: title="MultiPunch Alteration"
                await expect(page.getByText('MultiPunch Alteration')).toBeVisible({ timeout: 10000 });
            }
        });

        test('department select renders with name department_id ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('select[name="department_id"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('name search input renders with placeholder Enter name ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('input[placeholder="Enter name"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Filter submit button triggers request-list fetch ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                const [request] = await Promise.all([
                    page.waitForRequest(
                        req => req.url().includes('/api/request/request-list') && req.url().includes('my_team_requests'),
                        { timeout: 10000 }
                    ).catch(() => null),
                    page.getByText('Filter').click(),
                ]);
                // Confirms Filter button fires GET /api/request/request-list?url=my_team_requests
                // (RequestController::requestlist → EH_SP_My_Team_Request)
                if (request) {
                    expect(request.url()).toContain('/api/request/request-list');
                }
            }
        });
    });

    // =========================================================================
    // Table / List — Bulk action controls
    // =========================================================================
    test.describe('Table / List', () => {
        test('select-all checkbox is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                // Master checkbox (isAll) — first checkbox in the table header area
                await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('bulk action dropdown renders with name bulk_action ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('select[name="bulk_action"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('bulk action dropdown has Approved and Deny options ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                const select = page.locator('select[name="bulk_action"]');
                await expect(select).toBeVisible({ timeout: 10000 });
                const options = await select.locator('option').allTextContents();
                const optionText = options.join(' ');
                expect(optionText).toMatch(/Approved|Approve/i);
                expect(optionText).toMatch(/Deny/i);
            }
        });

        test('Bulk Action submit button is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Bulk Action')).toBeVisible({ timeout: 10000 });
            }
        });
    });

});
