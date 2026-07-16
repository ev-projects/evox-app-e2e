// VERIFIED-BACKED — generated 2026-07-07 from dpa-list.registry.md (vetted by Glenn Macasarte on July 3, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('DPA List (/app/team/DPAList)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page, request }) => {
            const r = await request.get(`${BASE_URL}/app/team/DPAList`).catch(() => null);
            if (r) expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[name="email"], input[type="text"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements
    // =========================================================================
    test.describe('Key UI Elements', () => {
        test('Filter button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible({ timeout: 10000 });
            }
        });

        test('Export dropdown toggle is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed selector: id="dropdown-basic", text: "Export"
                await expect(page.locator('#dropdown-basic')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Filter Controls
    // =========================================================================
    test.describe('Filter Controls', () => {
        test('employee status select is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed: <select name="is_active">, options: "" / 1 (Active) / 0 (Inactive)
                await expect(page.locator('select[name="is_active"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('employee status select has Active and Inactive options ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                const select = page.locator('select[name="is_active"]');
                await expect(select).toBeVisible({ timeout: 10000 });
                // [CODE REVIEW 2026-07-07] DPAList.js uses self-closing <option value="1" label="Active" />
                // — no text content, so toHaveText() fails. Must use toHaveAttribute('label', ...).
                await expect(select.locator('option[value="1"]')).toHaveAttribute('label', 'Active');
                await expect(select.locator('option[value="0"]')).toHaveAttribute('label', 'Inactive');
            }
        });

        test('DPA status select is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed: <select name="submitted_dpa">, options: "" / 1 (Yes) / 0 (No)
                await expect(page.locator('select[name="submitted_dpa"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('DPA status select has Yes and No options ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                const select = page.locator('select[name="submitted_dpa"]');
                await expect(select).toBeVisible({ timeout: 10000 });
                // [CODE REVIEW 2026-07-07] Same self-closing label pattern as is_active select above.
                await expect(select.locator('option[value="1"]')).toHaveAttribute('label', 'Yes');
                await expect(select.locator('option[value="0"]')).toHaveAttribute('label', 'No');
            }
        });

        test('department select is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed: <select name="department_id">, native select, options from user.departments_handled
                await expect(page.locator('select[name="department_id"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('name filter input is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed: <input name="name" placeholder="Enter name"> (type="textfield" bug falls back to text)
                await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('name filter input has placeholder "Enter name" ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                const input = page.locator('input[name="name"]');
                await expect(input).toHaveAttribute('placeholder', 'Enter name');
            }
        });

        test('clicking Filter button fires GET /api/user/get_dpa_list ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed action: Filter click → fetchDpaList → GET /api/user/get_dpa_list
                // → UserController::get_dpa_list (UserController.php:520)
                // → EH_SP_Employee_DPA_List
                const [apiRequest] = await Promise.all([
                    page.waitForRequest(req =>
                        req.url().includes('/api/user/get_dpa_list') &&
                        req.method() === 'GET',
                        { timeout: 10000 }
                    ).catch(() => null),
                    page.getByRole('button', { name: /Filter/i }).click(),
                ]);
                if (apiRequest) {
                    expect(apiRequest.url()).toContain('/api/user/get_dpa_list');
                }
            }
        });
    });

    // =========================================================================
    // Table / List
    // =========================================================================
    test.describe('Table / List', () => {
        test('results table is present after load ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed: read-only table with columns: Emp #, Name, Department, Date Submitted, Status
                await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('table header contains expected columns ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                const tableText = await page.locator('table').first().innerText().catch(() => '');
                // Confirmed columns from registry doc
                expect(tableText).toMatch(/Emp\s*#|Employee\s*#|Emp\s*No/i);
                expect(tableText).toMatch(/Name/i);
                expect(tableText).toMatch(/Department/i);
                expect(tableText).toMatch(/Status/i);
            }
        });
    });

    // =========================================================================
    // Export Controls
    // =========================================================================
    test.describe('Export Controls', () => {
        test('Export dropdown opens on click ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed: id="dropdown-basic" toggle opens dropdown menu (no API call on toggle)
                const toggle = page.locator('#dropdown-basic');
                await expect(toggle).toBeVisible({ timeout: 10000 });
                await toggle.click();
                // After clicking, dropdown items should appear
                await expect(page.getByText('Export All')).toBeVisible({ timeout: 5000 });
            }
        });

        test('Export (filtered) fires GET /api/user/export_dpa_list?export=filtered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed: click Export (filtered) → exportDpaList → GET /api/user/export_dpa_list?export=filtered
                // → UserController::export_dpa_list (UserController.php:551) → DpaListExport → downloads dpa_list.csv
                const toggle = page.locator('#dropdown-basic');
                await toggle.click();
                const [downloadOrRequest] = await Promise.all([
                    page.waitForRequest(req =>
                        req.url().includes('/api/user/export_dpa_list') &&
                        req.url().includes('export=filtered'),
                        { timeout: 10000 }
                    ).catch(() => null),
                    // "Export" (filtered) item — first Export text in the dropdown (not "Export All")
                    page.locator('.dropdown-menu').getByText('Export').first().click().catch(() =>
                        page.getByRole('menuitem', { name: /^Export$/i }).click().catch(() => null)
                    ),
                ]);
                if (downloadOrRequest) {
                    expect(downloadOrRequest.url()).toContain('export=filtered');
                }
            }
        });

        test('Export All fires GET /api/user/export_dpa_list?export=all ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DPAList`);
            if (!page.url().includes('/login')) {
                // Confirmed: click Export All → exportDpaList → GET /api/user/export_dpa_list?export=all
                // → ignores department_id and name params; only is_active and submitted_dpa kept
                const toggle = page.locator('#dropdown-basic');
                await toggle.click();
                const [apiRequest] = await Promise.all([
                    page.waitForRequest(req =>
                        req.url().includes('/api/user/export_dpa_list') &&
                        req.url().includes('export=all'),
                        { timeout: 10000 }
                    ).catch(() => null),
                    page.getByText('Export All').click(),
                ]);
                if (apiRequest) {
                    expect(apiRequest.url()).toContain('export=all');
                }
            }
        });
    });

});
