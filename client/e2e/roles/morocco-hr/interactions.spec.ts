// AUTO-GENERATED interaction spec — role: morocco-hr (khaoula.laaraibi@eastvantage.com)
// Exercises HR-specific forms/lists beyond plain page-load (filters, tabs, dropdowns,
// open-form-without-saving). MUTATION SAFETY: this file must never click
// Save/Submit/Update/Delete/Sync/Generate/Register/Assign/Upload, and must never click
// NEO's "Send Link" button (it sends a real onboarding email to a live employee).
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/morocco-hr.json' });

test.describe('morocco-hr — Department Announcements (list + create form, no submit)', () => {
  test('My Announcement List loads', async ({ page }) => {
    const resp = await page.goto('/app/team/DepartmentAnnouncementList/', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).not.toContainText('Fatal error');
  });

  // NOTE: morocco-hr is DENIED the Create Announcement page — this test asserts that verified
  // behavior rather than the form flow the other 3 HR accounts get. See FINDINGS-FOR-REVIEW.md A6:
  // the route /app/team/DepartmentAnouncement/ is gated role={['supervisor','client']}
  // permission={['manage_department_announcements','client_access']} — HR roles aren't even listed,
  // yet hr-head/ph-hr/india-hr reach it while morocco-hr gets a hard 403. Enforcement is
  // inconsistent across accounts (a real product/permission bug). morocco-hr's own announcement
  // list page also has NO create/new link, consistent with it genuinely lacking the permission.
  test('Create Announcement page is correctly denied (403) for this account [documents FINDINGS A6]', async ({ page }) => {
    await page.goto('/app/team/DepartmentAnouncement/', { waitUntil: 'load' });
    // App renders its own access-denied boundary rather than the form.
    await expect(page.locator('body')).toContainText(/can't access this page|403|not authorized|access denied/i, { timeout: 15000 });
    // The create form must NOT be present for this account.
    await expect(page.locator('input[name="title"]')).toHaveCount(0);
  });
});

test.describe('morocco-hr — Employee List (filters only)', () => {
  test('filter by name does not error', async ({ page }) => {
    await page.goto('/app/team/MyTeamList', { waitUntil: 'load' });
    const nameFilter = page.locator('input[name="name"]');
    if (await nameFilter.count() > 0) {
      await nameFilter.fill('a');
    }
    await expect(page.locator('body')).not.toContainText('Fatal error');
  });
});

test.describe('morocco-hr — DPA List (filters only, no export)', () => {
  test('status + department filters, Filter click is a safe GET', async ({ page }) => {
    await page.goto('/app/team/DPAList', { waitUntil: 'load' });
    // "DPA List" text also appears in the sidebar nav item, so scope to the page heading.
    await expect(page.getByRole('heading', { name: 'DPA List' })).toBeVisible({ timeout: 10000 });

    const statusSelect = page.locator('select[name="is_active"]');
    await expect(statusSelect).toBeVisible({ timeout: 10000 });
    await statusSelect.selectOption('1');
    await page.locator('select[name="submitted_dpa"]').selectOption('1');
    await page.getByRole('button', { name: /filter/i }).click();

    await expect(page.locator('body')).not.toContainText('Fatal error');
    // Explicitly do NOT click Export / Export All.
  });
});

test.describe('morocco-hr — Reports (India + Morocco Payroll Report variants)', () => {
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
    await selects.nth(0).selectOption('4'); // April
    await selects.nth(1).selectOption({ index: 1 });
    await page.getByRole('button', { name: /filter/i }).click();

    await expect(page.locator('body')).not.toContainText('Fatal error');
  });

  test('Morocco Payroll Report renders the Morocco-specific variant, month/year filter, no export', async ({ page }) => {
    await page.goto('/app/viewreport/morocco/', { waitUntil: 'load' });
    // "Morocco Payroll Report" text also appears in the sidebar nav item, so scope to the page heading.
    await expect(page.getByRole('heading', { name: 'Morocco Payroll Report' })).toBeVisible({ timeout: 10000 });

    const selects = page.locator('select[name="type"]');
    await expect(selects.first()).toBeVisible({ timeout: 10000 });
    await selects.nth(0).selectOption('5'); // May
    await selects.nth(1).selectOption({ index: 1 });
    await page.getByRole('button', { name: /filter/i }).click();

    await expect(page.locator('body')).not.toContainText('Fatal error');
  });

  test('Morocco Payroll Report IS in the sidebar for a Morocco HR (geo variant check)', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Close' }).first().click({ timeout: 5000 }).catch(() => {});
    // The sidebar can load in AdminLTE's collapsed icon-only mode (labels hidden via CSS) for
    // this auth session; expand it via the header's pushmenu toggle before checking nav text.
    const sidebarCollapsed = await page.evaluate(() => document.body.classList.contains('sidebar-collapse'));
    if (sidebarCollapsed) {
      await page.locator('[data-widget="pushmenu"]').click();
    }
    // "Morocco Payroll Report" is nested under the "Reports" treeview group, which is collapsed
    // by default — expand it before asserting the child link is visible.
    await page.locator('aside.main-sidebar').getByText('Reports', { exact: true }).click();
    await expect(page.locator('aside.main-sidebar').getByText('Morocco Payroll Report', { exact: true })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('morocco-hr — NEO Onboarding / Submission Report (view only, never Send Link)', () => {
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

test.describe('morocco-hr — COE HR (search + fill, no request submit)', () => {
  test('search employee, pick purpose, Request stays unclicked', async ({ page }) => {
    await page.goto('/app/request/CertificateOfEmploymentHR/', { waitUntil: 'load' });
    await expect(page.getByText('Search Employee:')).toBeVisible({ timeout: 10000 });

    await page.locator('input[name="employee_name"]').fill('an');
    await page.waitForTimeout(1200);

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

test.describe('morocco-hr — Policies (view only, no upload)', () => {
  test('Manage Policy Accessibility list loads', async ({ page }) => {
    const resp = await page.goto('/app/policiesdocumentlist', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
  });

  test('Upload Policies page loads, no file selected/uploaded', async ({ page }) => {
    const resp = await page.goto('/app/policiesupload', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
  });
});

test.describe('morocco-hr — admin surface is NOT visible (role boundary)', () => {
  test('no Sync / Assign / Admin Functions / Register User / OPS Functions in the sidebar', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Close' }).first().click({ timeout: 5000 }).catch(() => {});
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 10000 });

    for (const label of ['Admin Functions', 'Sync', 'Assign', 'Register User', 'Payroll Cutoff', 'Department List', 'OPS Functions']) {
      await expect(page.locator('aside.main-sidebar').getByText(label, { exact: true })).toHaveCount(0);
    }
  });
});
