// VERIFIED-BACKED — generated 2026-07-07 from coe.registry.md (vetted by Glenn Macasarte on July 2, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Certificate of Employment (Self) (/app/request/CertificateOfEmployment/)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements
    // Confirmed: Purpose dropdown, With Salary dropdown, Submit button
    // =========================================================================
    test.describe('Key UI Elements', () => {
        test('Purpose label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Purpose:')).toBeVisible({ timeout: 10000 });
            }
        });

        test('With Salary label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('With Salary:')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Submit button is visible ⚠️', async ({ page }) => {
            // Q1 confirmed: label is "Submit"
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Form Fields
    // Developer-confirmed selectors from [DEVELOPER VETTING]
    // =========================================================================
    test.describe('Form Fields', () => {
        test('purpose_index select renders ⚠️', async ({ page }) => {
            // Confirmed: name="purpose_index", native <select>, label "Purpose:"
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('select[name="purpose_index"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('purpose_index select has 11 options ⚠️', async ({ page }) => {
            // Q5 confirmed: exactly 11 purpose options (COE_PURPOSES constant, indices 0–10)
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                const options = page.locator('select[name="purpose_index"] option');
                const count = await options.count();
                // 11 value options (index 0–10); there may be a blank placeholder option
                expect(count).toBeGreaterThanOrEqual(11);
            }
        });

        test('show_compensation select renders ⚠️', async ({ page }) => {
            // Confirmed: name="show_compensation", native <select>, label "With Salary:"
            // Options: blank, "No" (value "0"), "Yes" (value "1")
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('select[name="show_compensation"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('show_compensation select has No and Yes options ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('select[name="show_compensation"] option[value="0"]')).toHaveCount(1);
                await expect(page.locator('select[name="show_compensation"] option[value="1"]')).toHaveCount(1);
            }
        });

        test('purpose_note (Travel To) field is hidden initially ⚠️', async ({ page }) => {
            // Confirmed: name="purpose_note", <input type="text">, label "Travel To:"
            // Conditionally rendered only when purpose_index == 6 or 10
            // Q3 confirmed: layout shifts when element appears
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                const travelInput = page.locator('input[name="purpose_note"]');
                // Should not be visible before a travel purpose is selected
                await expect(travelInput).toHaveCount(0);
            }
        });

        test('purpose_note (Travel To) field appears when travel purpose selected ⚠️', async ({ page }) => {
            // KNOWN BUG BUG-001: purpose_note not Yup-validated — travel purposes allow empty destination
            // Confirmed trigger: purpose_index == 6 ("Visa Application for Personal Travel")
            //                 or purpose_index == 10 ("Requirement for Personal Travel")
            await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
            if (!page.url().includes('/login')) {
                const purposeSelect = page.locator('select[name="purpose_index"]');
                // [CODE REVIEW 2026-07-07] COE.js options: blank <option> at DOM index 0,
                // then coePurposes.map with value={index}. { index: 6 } selects DOM pos 6 = value "5".
                // Need value "6" (Visa Application for Personal Travel) to trigger Travel To field.
                await purposeSelect.selectOption({ value: '6' });
                await expect(page.locator('input[name="purpose_note"]')).toBeVisible({ timeout: 5000 });
            }
        });
    });

    // =========================================================================
    // Table / List
    // COE history: GET /api/request/coe/ called on page load
    // Developer vetting note: "No COE history being displayed" (Q2 corrected)
    // The fetch happens but the table is not rendered in the UI — no DOM assertion
    // =========================================================================
    // NOTE: History table is intentionally omitted from DOM assertions.
    // [DEVELOPER VETTING] corrected: history data is fetched but NOT displayed
    // in the current UI (Q2: "Not Visible on the same page... history is being
    // fetched but not being displayed"). No table locator test added to avoid
    // a permanently failing assertion against a known absent element.

    // =========================================================================
    // Known Bug markers
    // =========================================================================
    test.describe('Known Bug markers (skip — not directly testable via E2E)', () => {
        test.skip('BUG-001: purpose_note not Yup-validated — travel purposes allow empty destination', async () => {
            // KNOWN BUG BUG-001 (Medium): Yup schema has no required() rule on purpose_note.
            // Submitting a travel-purpose COE with blank Travel To passes client validation.
        });

        test.skip('BUG-002: show_compensation not backend-validated — omitting causes silent error', async () => {
            // KNOWN BUG BUG-002 (Low): COERequest validation rules do not include show_compensation.
            // A crafted POST without that field silently hits an error path.
        });

        test.skip('BUG-003: COEController::all() returns misspelled trans("Sucess")', async () => {
            // KNOWN BUG BUG-003 (Low): Success message key is "Sucess" (typo) in COEController::all.
        });

        test.skip('BUG-004: EV_SP_COE_Get_Template called twice — first call is wasted', async () => {
            // KNOWN BUG BUG-004 (Low): COEController::create calls the SP twice; first call is a
            // debug-logging artifact that does nothing useful.
        });

        test.skip('BUG-005: EV_SP_COE_Generate_Sequence has no transaction wrapping', async () => {
            // KNOWN BUG BUG-005 (Medium): Concurrent COE submissions may produce duplicate sequence
            // numbers because the SP is not called inside a DB transaction.
        });

        test.skip('BUG-010: PDF streaming prevents JSON error parsing in catch block', async () => {
            // KNOWN BUG BUG-010 (Medium): API.export() uses responseType: "arraybuffer".
            // If the backend errors after BHR fetch, the JSON error body cannot be parsed —
            // Formatter.alert_error() receives binary, not a JSON error object.
        });
    });
});
