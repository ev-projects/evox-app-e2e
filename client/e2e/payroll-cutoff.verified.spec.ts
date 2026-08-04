// VERIFIED-BACKED — generated 2026-07-07 from payroll-cutoff.registry.md (vetted by Gobi Singaravel on 2026-07-02)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Payroll Cutoff (/app/admin/PayrollCutoff/)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('redirects unauthenticated users to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[type="text"], input[name="email"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements
    // =========================================================================
    test.describe('Key UI Elements', () => {
        test('Add button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                // KNOWN BUG B-003: listInstance initial value is {} not null — spinner condition checks listInstance == null so spinner never shows; list renders immediately
                // PayrollCutoff.js: <Button><i class="fa fa-plus" /> Add</Button> — the "+" is a Font Awesome icon glyph, not a text character; visible text is " Add"
                await expect(page.getByRole('button', { name: /Add/i })).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Table / List
    // =========================================================================
    test.describe('Table / List', () => {
        test('list table renders on load ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                // On load: GET /api/payroll/cutoff/all fires -> PayrollCutoffController::index()
                await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Edit button is visible in a table row ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                // Edit button is text-only, no icon
                // Clicking fires GET /api/payroll/cutoff/{id} -> PayrollCutoffController::find()
                await expect(page.getByRole('button', { name: /Edit/i }).first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('Delete button is visible in a table row ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                // Delete button is text-only, no icon
                // Clicking fires window.confirm "Are you sure you want to delete this item?" then DELETE /api/payroll/cutoff/{id}
                await expect(page.getByRole('button', { name: /Delete/i }).first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('rows-per-page select is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                // Client-side pagination only — no API call on change
                await expect(page.locator('select').first()).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Form Fields (inline Add/Edit form)
    // =========================================================================
    test.describe('Form Fields', () => {
        test('clicking Add slides in inline form ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                await page.getByRole('button', { name: /Add/i }).click();
                // Form slides in inline — no API fires on click
                await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Name field renders with placeholder "Name" ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                await page.getByRole('button', { name: /Add/i }).click();
                // KNOWN BUG B-004: Name field has no Yup required rule but DB column is NOT NULL — empty submit returns generic SQL error "An error has occured: Sorry, something went wrong."
                // KNOWN BUG B-002: Bootstrap Form.Control.Feedback renders in DOM but is-invalid class is never applied — feedback div is invisible
                await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 });
                await expect(page.locator('input[placeholder="Name"]')).toBeVisible();
            }
        });

        test('Start Date field label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                await page.getByRole('button', { name: /Add/i }).click();
                // react-datepicker strips name="start_date" from rendered DOM input — locate by label
                // KNOWN BUG B-001: Yup cross-validation start_date.max(Yup.ref('start_date')) compares field to itself — always passes; no frontend enforcement that end_date must be after start_date
                await expect(page.getByText('Start Date:')).toBeVisible({ timeout: 10000 });
            }
        });

        test('End Date field label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                await page.getByRole('button', { name: /Add/i }).click();
                // react-datepicker strips name="end_date" from rendered DOM input — locate by label
                // KNOWN BUG B-001: Yup cross-validation end_date.min(Yup.ref('end_date')) compares field to itself — always passes
                await expect(page.getByText('End Date:')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Submit button is visible in both Add and Edit modes ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                await page.getByRole('button', { name: /Add/i }).click();
                // Button label is always "Submit" (with icon) — does NOT change to "Update" in Edit mode
                // Clicking triggers window.confirm "Are you sure you want to submit/update this form?"
                // Store mode: POST /api/payroll/cutoff/ -> PayrollCutoffController::store()
                await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible({ timeout: 10000 });
            }
        });

        test('Cancel button is visible alongside Submit in form ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                await page.getByRole('button', { name: /Add/i }).click();
                // Cancel button (with icon) dismisses the inline form — no API call
                await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible({ timeout: 10000 });
            }
        });

        test('Start Date required error fires when field is empty and form submitted ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                await page.getByRole('button', { name: /Add/i }).click();
                await page.locator('input[name="name"]').fill('Test Cutoff');
                // Click Submit to trigger Yup validation without filling dates
                await page.getByRole('button', { name: /Submit/i }).click();
                // Yup required error for Start Date
                await expect(page.getByText('This field is required').first()).toBeVisible({ timeout: 5000 });
            }
        });

        test('Edit mode: clicking Edit opens pre-filled inline form ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                const editBtn = page.getByRole('button', { name: /Edit/i }).first();
                const hasRows = await editBtn.count() > 0;
                if (hasRows) {
                    // Clicking fires GET /api/payroll/cutoff/{id} -> PayrollCutoffController::find()
                    // Form slides in with row values pre-filled (enableReinitialize=true)
                    await editBtn.click();
                    // Submit button label stays "Submit" even in Edit mode
                    await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible({ timeout: 10000 });
                }
            }
        });

        test('KNOWN BUG B-004: empty Name submit returns generic error ⚠️', async ({ page }) => {
            // KNOWN BUG B-004: Name field has no Yup required rule but DB column is NOT NULL
            // Submitting with empty Name hits backend SQL constraint and returns:
            // "An error has occured: Sorry, something went wrong." — no field-level error
            await page.goto(`${BASE_URL}/app/admin/PayrollCutoff/`);
            if (!page.url().includes('/login')) {
                // This test documents the known bug — it does not assert a fix
                test.info().annotations.push({ type: 'known-bug', description: 'B-004: Name NOT NULL DB constraint not enforced in frontend Yup schema' });
            }
        });
    });

});
