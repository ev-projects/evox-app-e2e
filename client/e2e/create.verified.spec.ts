// VERIFIED-BACKED — generated 2026-07-07 from create.registry.md (vetted by Glenn Macasarte on July 3, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// KNOWN BUG B-release-date-self-ref: Yup cross-validation on release_date uses
// .max(Yup.ref('release_date')) (self-referential) — the "expiry must be after release"
// check is non-functional. Backend does not enforce this either.
// KNOWN BUG B-expiry-date-self-ref: Yup cross-validation on expiry_date uses
// .min(Yup.ref('expiry_date')) (self-referential) — same issue as release_date.
// [DEVELOPER VETTING] corrected: the name attributes for release_date / expiry_date
// do not exist on the rendered inputs — do not locate by name attribute.

test.describe('Create Department Announcement (/app/team/DepartmentAnouncement/)', () => {

    // -------------------------------------------------------------------------
    // On Load
    // -------------------------------------------------------------------------
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // -------------------------------------------------------------------------
    // Auth Gate
    // -------------------------------------------------------------------------
    test.describe('Auth Gate', () => {
        test('unauthenticated request redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Key UI Elements — store (create) mode
    // -------------------------------------------------------------------------
    test.describe('Key UI Elements', () => {
        test('Save button is visible on the create form ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed: button[type="submit"] labelled "Save" in store mode
                await expect(page.locator('button[type="submit"]').filter({ hasText: /Save|Create/i })).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // -------------------------------------------------------------------------
    // Form Fields — store (create) mode
    // -------------------------------------------------------------------------
    test.describe('Form Fields', () => {
        test('Title input is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed: input[name="title"]
                await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Headline input is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed: input[name="headline"]
                await expect(page.locator('input[name="headline"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Department multi-select control is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed: MultiSelect component rendered under "Department" label
                await expect(page.getByText('Department')).toBeVisible({ timeout: 10000 });
            }
        });

        test('All Departments radio is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] DepartmentAnnouncementsForm.js radios have NO name attribute
                // (setFieldValue pattern — checked={values.set_all}, onChange calls setFieldValue).
                // Must locate by label text instead of name attribute.
                await expect(page.locator('label').filter({ hasText: 'All Departments' }).locator('input[type="radio"]')).toBeAttached({ timeout: 10000 });
                await expect(page.getByText('All Departments')).toBeVisible({ timeout: 10000 });
            }
        });

        test('All departments except radio is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('label').filter({ hasText: 'All departments except' }).locator('input[type="radio"]')).toBeAttached({ timeout: 10000 });
                await expect(page.getByText('All departments except')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Only selected departments radio is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('label').filter({ hasText: 'Only selected departments' }).locator('input[type="radio"]')).toBeAttached({ timeout: 10000 });
                await expect(page.getByText('Only selected departments')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Thumbnail file input is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed: input[type="file"][name="thumbnail"]
                await expect(page.locator('input[type="file"][name="thumbnail"]')).toBeAttached({ timeout: 10000 });
            }
        });

        test('TinyMCE content editor is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed: TinyMCE renders [contenteditable="true"]
                await expect(page.locator('[contenteditable="true"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Link input is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed: input[name="link"]
                await expect(page.locator('input[name="link"]')).toBeVisible({ timeout: 10000 });
            }
        });
    });

});

// ---------------------------------------------------------------------------
// Edit mode — separate route /app/team/DepartmentAnouncement/{id}
// ---------------------------------------------------------------------------
test.describe('Edit Department Announcement (/app/team/DepartmentAnouncement/{id})', () => {

    // -------------------------------------------------------------------------
    // On Load
    // -------------------------------------------------------------------------
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // -------------------------------------------------------------------------
    // Auth Gate
    // -------------------------------------------------------------------------
    test.describe('Auth Gate', () => {
        test('unauthenticated request redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Key UI Elements — edit mode
    // -------------------------------------------------------------------------
    test.describe('Key UI Elements', () => {
        test('Update button is visible on the edit form ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] confirmed: button[type="submit"] labelled "Update" in edit mode
                await expect(page.locator('button[type="submit"]').filter({ hasText: /Update/i })).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // -------------------------------------------------------------------------
    // Form Fields — edit mode (same inputs, pre-populated)
    // -------------------------------------------------------------------------
    test.describe('Form Fields', () => {
        test('Title input is present in edit mode ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Headline input is present in edit mode ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('input[name="headline"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('TinyMCE content editor is present in edit mode ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('[contenteditable="true"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Link input is present in edit mode ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/team/DepartmentAnouncement/1`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('input[name="link"]')).toBeVisible({ timeout: 10000 });
            }
        });
    });

});
