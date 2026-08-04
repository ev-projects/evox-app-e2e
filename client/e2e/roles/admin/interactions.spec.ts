// AUTO-GENERATED interaction spec — role: admin (dummyman@ops.eastvantage.com)
// Exercises admin-only forms/lists beyond plain page-load (filters, tabs, dropdowns,
// open-form-without-saving). MUTATION SAFETY: this file must never click
// Save/Submit/Update/Delete/Sync/Generate/Register/Assign/Upload — DB is a live backup dump.
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

const FORBIDDEN_TEXT = /^(Save|Submit|Update|Delete|Sync|Generate|Register|Assign|Upload)$/i;

test.describe('admin — RegisterUser (fill only, no Register)', () => {
  test('select a role, form expands, fill fields, Register button stays unclicked', async ({ page }) => {
    await page.goto('/app/admin/RegisterUser/', { waitUntil: 'load' });
    await expect(page.getByText('Select Role(s):')).toBeVisible({ timeout: 10000 });

    const roleSelect = page.locator('.dropdown-container').first();
    await roleSelect.locator('.dropdown-heading').click();
    const firstOption = page.locator('.dropdown-content .select-item').first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    await firstOption.click();

    // Selecting a role reveals the rest of the form
    await expect(page.locator('input[name="first_name"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="first_name"]').fill('QA Interaction Test');
    await page.locator('input[name="last_name"]').fill('Do Not Save');
    await page.locator('input[name="email"]').fill('qa-interaction-test@example.invalid');

    const registerBtn = page.getByRole('button', { name: /register/i });
    await expect(registerBtn).toBeVisible();
    // Explicitly do NOT click — mutation safety.
  });
});

test.describe('admin — AssignRolesPermissions (search only, no Assign)', () => {
  test('search a name, list renders, Assign button not clicked', async ({ page }) => {
    await page.goto('/app/admin/AssignRolePermission/', { waitUntil: 'load' });
    await expect(page.getByText('Search Name:')).toBeVisible({ timeout: 10000 });

    const search = page.locator('input[name="nameFilter"]');
    await search.fill('mar');
    // Either a "Select User" dropdown appears or "Sorry, No Record Found" — both are valid, non-error outcomes.
    await expect(
      page.locator('select[name="selectedUser"]').or(page.getByText('Sorry, No Record Found'))
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('admin — AssignFeature (search only, no Assign)', () => {
  test('search a name, feature panel does not error', async ({ page }) => {
    await page.goto('/app/admin/AssignFeature/', { waitUntil: 'load' });
    await expect(page.getByText('Search Name:')).toBeVisible({ timeout: 10000 });

    const search = page.locator('input[name="nameFilter"]');
    await search.fill('cru');
    await expect(
      page.locator('select[name="selectedUser"]').or(page.getByText('Sorry, No Record Found'))
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('admin — PayrollCutoff (open Add form, no submit)', () => {
  test('list renders, Add opens the create form', async ({ page }) => {
    await page.goto('/app/admin/PayrollCutoff/', { waitUntil: 'load' });
    await expect(page.getByText('Payroll Cut-Off List')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /add/i }).click();
    // Form fields should now be present (Start/End date pickers)
    await expect(page.locator('.react-datepicker-wrapper, input.form-control').first()).toBeVisible({ timeout: 10000 });
    const submitBtn = page.getByRole('button', { name: FORBIDDEN_TEXT });
    if (await submitBtn.count() > 0) {
      await expect(submitBtn.first()).toBeVisible();
      // Explicitly do NOT click.
    }
  });
});

test.describe('admin — DepartmentList (view only, no toggle/delete)', () => {
  test('department table renders with Multi Login switches present but untouched', async ({ page }) => {
    await page.goto('/app/admin/DepartmentList/', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Department List' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
    // Confirm the mutation-risk controls exist (proves the page rendered fully) — never clicked.
    await expect(page.locator('table input[type="checkbox"]').first()).toBeVisible();
  });
});

test.describe('admin — AdminAnnouncementsList (filters, Edit-open, no delete)', () => {
  test('filter by status and title, list refreshes without error', async ({ page }) => {
    await page.goto('/app/admin/AnnouncementList/', { waitUntil: 'load' });
    await expect(page.getByText('Manage All EVOX Announcements')).toBeVisible({ timeout: 10000 });

    await page.locator('select[name="status"]').selectOption('ongoing');
    await page.locator('input[name="announcement_title"]').fill('QA filter test');
    await page.getByRole('button', { name: /filter/i }).click();

    await expect(page.locator('body')).not.toContainText('Fatal error');
    // Reset filter title so we leave no odd state behind (client-side only, not persisted).
    await page.locator('input[name="announcement_title"]').fill('');
  });

  test('Edit opens the announcement form without submitting', async ({ page }) => {
    await page.goto('/app/admin/AnnouncementList/', { waitUntil: 'load' });
    const editLink = page.getByRole('link', { name: 'Edit' }).first();
    if (await editLink.count() === 0) {
      test.skip(true, 'no announcements to edit in this environment');
    }
    await editLink.click();
    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 });
    const submitBtn = page.getByRole('button', { name: /^submit$/i });
    await expect(submitBtn).toBeVisible();
    // Explicitly do NOT click Submit.
  });
});

test.describe('admin — GenerateDate (fill only, no Generate)', () => {
  test('pick employees, Generate button stays unclicked', async ({ page }) => {
    await page.goto('/app/admin/GenerateDate/', { waitUntil: 'load' });
    await expect(page.getByText('GENERATE DTR DATE')).toBeVisible({ timeout: 10000 });

    const employeeSelect = page.locator('.dropdown-container').first();
    await employeeSelect.locator('.dropdown-heading').click();
    const firstOption = page.locator('.dropdown-content .select-item').first();
    if (await firstOption.count() > 0) {
      await firstOption.click();
    }
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeVisible();
    // Explicitly do NOT click.
  });
});

test.describe('admin — Meeting Room masters (view list, open create form, no Submit)', () => {
  test('Room list loads', async ({ page }) => {
    const resp = await page.goto('/app/Roomlist/', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).not.toContainText('Fatal error');
  });

  test('Room create form (createroom/0) fills without Submit', async ({ page }) => {
    const resp = await page.goto('/app/createroom/0', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    const nameInput = page.locator('input[placeholder="RoomName"]');
    if (await nameInput.count() === 0) {
      test.skip(true, 'RoomMaster form not reachable for this role/env');
    }
    await nameInput.fill('QA Test Room - do not save');
    const submitBtn = page.getByRole('button', { name: /submit/i });
    await expect(submitBtn).toBeVisible();
    // Explicitly do NOT click.
  });

  test('Location list loads', async ({ page }) => {
    const resp = await page.goto('/app/locationlist/', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).not.toContainText('Fatal error');
  });

  test('Location create form (createlocation/0) fills without Submit', async ({ page }) => {
    const resp = await page.goto('/app/createlocation/0', { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    const nameInputs = page.locator('input.form-control');
    if (await nameInputs.count() === 0) {
      test.skip(true, 'LocationMaster form not reachable for this role/env');
    }
    await nameInputs.first().fill('QA Test Location - do not save');
    const submitBtn = page.getByRole('button', { name: /submit/i });
    if (await submitBtn.count() > 0) {
      await expect(submitBtn.first()).toBeVisible();
      // Explicitly do NOT click.
    }
  });
});

test.describe('admin — sees full admin surface (sanity, no HR-only gaps expected)', () => {
  test('Admin Functions menu group (Sync/Assign/Payroll Cutoff/Department List) is visible', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load' });
    // Dismiss any promo dialog (e.g. "SPECIAL REFERRAL DRIVE") that overlays the sidebar —
    // it can appear a moment after load, so wait for it rather than a one-shot count() check.
    await page.getByRole('button', { name: 'Close' }).first().click({ timeout: 5000 }).catch(() => {});
    // The sidebar can load in AdminLTE's collapsed icon-only mode (labels hidden via CSS) for
    // this auth session; expand it via the header's pushmenu toggle before checking nav text.
    const sidebarCollapsed = await page.evaluate(() => document.body.classList.contains('sidebar-collapse'));
    if (sidebarCollapsed) {
      await page.locator('[data-widget="pushmenu"]').click();
    }
    await expect(page.getByText('Admin Functions')).toBeVisible({ timeout: 10000 });
    await page.getByText('Admin Functions').click();
    await expect(page.getByText('Payroll Cutoff')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Department List')).toBeVisible({ timeout: 10000 });
  });
});
