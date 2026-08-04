// AUTO-GENERATED interaction spec — role: hr-head (atea.ortiz@eastvantage.com)
// Exercises HR-specific forms/lists beyond plain page-load (filters, tabs, dropdowns,
// open-form-without-saving). MUTATION SAFETY: this file must never click
// Save/Submit/Update/Delete/Sync/Generate/Register/Assign/Upload, and must never click
// NEO's "Send Link" button (it sends a real onboarding email to a live employee).
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/hr-head.json' });

test.describe('hr-head — Department Announcements (list + create form, no submit)', () => {
  test('My Announcement List loads', async ({ page }) => {
    const resp = await page.goto('/app/team/DepartmentAnnouncementList/', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).not.toContainText('Fatal error');
  });

  test('Create Announcement form fills without Submit', async ({ page }) => {
    test.setTimeout(45000); // tour render + overlay teardown adds real wall-clock time on this box
    await page.goto('/app/team/DepartmentAnouncement/', { waitUntil: 'load' });
    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="title"]').fill('QA interaction test — do not save');
    await page.locator('input[name="headline"]').fill('(test only)');

    // A react-joyride product tour auto-runs on first load. Its overlay renders with
    // pointerEvents: 'auto' across the FULL page (confirmed in react-joyride's own
    // Overlay.js — this <Joyride> never sets spotlightClicks, so it defaults to false and
    // the click-through path is never enabled), blocking every click on the page — including
    // the radios below — until the tour is skipped/finished/closed. The tooltip (and its Skip
    // button) renders above the overlay so it's always clickable itself; the previous fix's
    // bug was checking skipTour.count() synchronously right after the fills, before the
    // tooltip was guaranteed to have mounted — on a slow render that silently no-ops and
    // leaves the still-active overlay to block the next click for the full test timeout.
    // Actively wait for the button, then wait for the overlay to actually unmount before
    // touching anything else on the page.
    const skipTour = page.getByRole('button', { name: /skip/i });
    const skipVisible = await skipTour.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    if (skipVisible) {
      await skipTour.click();
      await page.locator('.react-joyride__overlay').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    }

    // "Only selected departments" radio reveals the department MultiSelect without publishing globally.
    const radios = page.locator('input[type="radio"]');
    if (await radios.count() >= 3) {
      await radios.nth(2).click();
    }
    // [FIX] the anchored /^\s*submit\s*$/i regex never matched, at any timeout — confirmed via
    // page.locator(...).ariaSnapshot() and direct regex probing that the button's true accessible
    // name is NOT just " Submit": the icon (`<i className="fa fa-location-arrow is-green" />`)
    // renders its glyph via a CSS ::before pseudo-element, and Chromium includes that private-use-
    // area glyph character in the computed accessible name ahead of the " Submit" text — `\s*`
    // doesn't match a non-whitespace glyph. Unanchored /submit/i (same pattern already used for
    // the COE HR Request/Submit button elsewhere in this file) matches correctly.
    const submitBtn = page.getByRole('button', { name: /submit/i });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    // Explicitly do NOT click Submit.
  });
});

test.describe('hr-head — Employee List (filters only)', () => {
  test('filter by name does not error', async ({ page }) => {
    await page.goto('/app/team/MyTeamList', { waitUntil: 'load' });
    const nameFilter = page.locator('input[name="name"]');
    if (await nameFilter.count() > 0) {
      await nameFilter.fill('a');
    }
    await expect(page.locator('body')).not.toContainText('Fatal error');
  });
});

test.describe('hr-head — DPA List (filters only, no export)', () => {
  test('status + department filters, Filter click is a safe GET', async ({ page }) => {
    await page.goto('/app/team/DPAList', { waitUntil: 'load' });
    // "DPA List" text also appears in the sidebar nav item, so scope to the page heading.
    await expect(page.getByRole('heading', { name: 'DPA List' })).toBeVisible({ timeout: 10000 });

    const statusSelect = page.locator('select[name="is_active"]');
    await expect(statusSelect).toBeVisible({ timeout: 10000 });
    await statusSelect.selectOption('1');
    await page.locator('select[name="submitted_dpa"]').selectOption('0');
    await page.getByRole('button', { name: /filter/i }).click();

    await expect(page.locator('body')).not.toContainText('Fatal error');
    // Explicitly do NOT click Export / Export All.
  });
});

test.describe('hr-head — Reports (Team Schedule / India Payroll Report)', () => {
  test('Team Schedule loads', async ({ page }) => {
    const resp = await page.goto('/app/team/MyTeamSchedule', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
  });

  test('India Payroll Report: month/year filter, no export', async ({ page }) => {
    await page.goto('/app/viewreport/', { waitUntil: 'load' });
    // "India Payroll Report" text also appears in the sidebar nav item, so scope to the page heading.
    await expect(page.getByRole('heading', { name: 'India Payroll Report' })).toBeVisible({ timeout: 10000 });

    const selects = page.locator('select[name="type"]');
    await expect(selects.first()).toBeVisible({ timeout: 10000 });
    await selects.nth(0).selectOption('1'); // January
    await selects.nth(1).selectOption({ index: 1 }); // first available year
    await page.getByRole('button', { name: /filter/i }).click();

    await expect(page.locator('body')).not.toContainText('Fatal error');
    // Explicitly do NOT click Export.
  });
});

test.describe('hr-head — NEO Onboarding / Submission Report (view only, never Send Link)', () => {
  test('Onboarding List loads and Send Link stays unclicked', async ({ page }) => {
    await page.goto('/app/neo/onboarding/', { waitUntil: 'load' });
    // "NEO Onboarding List" text also appears in the sidebar nav group, so scope to the page heading.
    await expect(page.getByRole('heading', { name: 'NEO Onboarding List' })).toBeVisible({ timeout: 10000 });
    const sendLinkBtn = page.getByRole('button', { name: /send link/i });
    if (await sendLinkBtn.count() > 0) {
      await expect(sendLinkBtn.first()).toBeVisible();
      // Explicitly do NOT click — this sends a real onboarding email to a live employee.
    }
  });

  test('Submission Report loads', async ({ page }) => {
    const resp = await page.goto('/app/neo/submissions/', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
  });
});

test.describe('hr-head — COE HR (search + fill, no request submit)', () => {
  test('search employee, pick purpose, Request stays unclicked', async ({ page }) => {
    await page.goto('/app/request/CertificateOfEmploymentHR/', { waitUntil: 'load' });
    await expect(page.getByText('Search Employee:')).toBeVisible({ timeout: 10000 });

    await page.locator('input[name="employee_name"]').fill('an');
    await page.waitForTimeout(1200); // debounce in COEHR is 1000ms

    const purposeSelect = page.locator('select[name="purpose_index"]');
    await expect(purposeSelect).toBeVisible({ timeout: 10000 });
    const optionCount = await purposeSelect.locator('option').count();
    if (optionCount > 1) {
      await purposeSelect.selectOption({ index: 1 });
    }
    const submitBtn = page.getByRole('button', { name: /request|submit/i });
    if (await submitBtn.count() > 0) {
      await expect(submitBtn.first()).toBeVisible();
      // Explicitly do NOT click.
    }
  });
});

test.describe('hr-head — Policies (view only, no upload)', () => {
  test('Manage Policy Accessibility list loads', async ({ page }) => {
    const resp = await page.goto('/app/policiesdocumentlist', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
  });

  test('Upload Policies page loads, no file selected/uploaded', async ({ page }) => {
    const resp = await page.goto('/app/policiesupload', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
  });
});

test.describe('hr-head — admin surface is NOT visible (role boundary)', () => {
  test('no Sync / Assign / Admin Functions / Register User in the sidebar', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Close' }).first().click({ timeout: 5000 }).catch(() => {});
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 10000 });

    for (const label of ['Admin Functions', 'Sync', 'Assign', 'Register User', 'Payroll Cutoff', 'Department List']) {
      await expect(page.locator('aside.main-sidebar').getByText(label, { exact: true })).toHaveCount(0);
    }
  });
});
