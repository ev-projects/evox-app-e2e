// AUTO-GENERATED interaction spec — role: india-supervisor (nidhi.shrivastava@unq.eastvantage.com)
// Exercises supervisor-only surface: My Team Requests, Team Schedule, Employee List,
// DTR Summary/Logs/Conflict, Manage Department Schedule (template list / assign / create).
//
// SAFETY: staging DB is a live backup dump. This spec NEVER clicks anything that mutates —
// no Approve/Decline/Cancel/Submit/Save/Delete/Upload/Punch/Update/Assign/bulk-action-Update.
// Filter/Generate/Toggle buttons that only re-fetch a GET list are allowed. Where a
// mutating control (bulk "Update", schedule "Update"/"Assign", "Save Template", row
// Approve/Decline) is exercised, the test only asserts *visibility*, it never clicks it.
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/india-supervisor.json' });

const NO_ERROR_SIGNATURES = ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops'];

async function assertHealthyPage(page: import('@playwright/test').Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  for (const sig of NO_ERROR_SIGNATURES) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
  await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 10000 });
}

// Rapid successive filter/tab clicks can trigger a dismissible Bootstrap error toast
// (".alert-dismissible") that overlaps controls and blocks the next click. Close it
// out of the way before continuing rather than letting the next action time out on it.
async function dismissAlert(page: import('@playwright/test').Page) {
  const alert = page.locator('.alert-dismissible');
  if (await alert.count()) {
    const closeBtn = alert.locator('button, [aria-label="Close alert"], .close');
    if (await closeBtn.count()) {
      await closeBtn.first().click({ force: true }).catch(() => {});
    }
    await alert.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

test.describe('india-supervisor — interactions', () => {

  test('My Team Requests: tabs, status filters, department/name filter (read-only)', async ({ page }) => {
    await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.locator('h3.header_text', { hasText: 'My Team Request' })).toBeVisible();

    // Tabs — only click the ones this role actually has (feature-gated). Exact match:
    // "Alteration" is a substring of "MultiPunch Alteration" so a loose match is ambiguous.
    const tabLabels = ['All Requests', 'Alteration', 'Overtime', 'Rest Day Work', 'Change Schedule', 'MultiPunch Alteration'];
    for (const label of tabLabels) {
      const tab = page.getByRole('tab', { name: label, exact: true });
      if (await tab.count()) {
        await dismissAlert(page);
        await tab.click();
        await assertHealthyPage(page);
      }
    }
    // back to All Requests for the rest of the test
    const allTab = page.getByRole('tab', { name: 'All Requests', exact: true });
    if (await allTab.count()) {
      await dismissAlert(page);
      await allTab.click();
    }

    // Status toggle buttons — pure GET refetch, safe to click.
    for (const status of ['Pending', 'Approved', 'Cancelled', 'Declined']) {
      const btn = page.locator('.request_list_btn', { hasText: status });
      if (await btn.count()) {
        await dismissAlert(page);
        await btn.first().click();
        await assertHealthyPage(page);
      }
    }

    // Department dropdown — pick first real option (avoid hardcoding a dept name).
    const deptSelect = page.locator('select[name="department_id"]');
    if (await deptSelect.count()) {
      const optionCount = await deptSelect.locator('option').count();
      if (optionCount > 1) {
        await deptSelect.selectOption({ index: 1 });
      }
    }

    // Name search — fill without submitting via Enter.
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.count()) {
      await nameInput.fill('zz-no-such-employee');
    }

    // Filter button — GET refetch only, safe.
    const filterBtn = page.getByRole('button', { name: /Filter/i });
    if (await filterBtn.count()) {
      await dismissAlert(page);
      await filterBtn.first().click();
      await assertHealthyPage(page);
    }
    // clear the bogus name filter so later assertions on real rows still work
    if (await nameInput.count()) {
      await nameInput.fill('');
      if (await filterBtn.count()) {
        await dismissAlert(page);
        await filterBtn.first().click();
      }
    }

    // Bulk-select checkbox — local state only, never click the mutating "Update" button next to it.
    const selectAll = page.locator('thead input[type="checkbox"]');
    if (await selectAll.count()) {
      await selectAll.first().click();
      await selectAll.first().click(); // toggle back off
    }
    const bulkActionSelect = page.locator('select[name="bulk_action"]');
    const bulkUpdateBtn = page.getByRole('button', { name: /Update/i });
    if (await bulkActionSelect.count()) {
      await expect(bulkActionSelect).toBeVisible();
    }
    if (await bulkUpdateBtn.count()) {
      await expect(bulkUpdateBtn.first()).toBeVisible(); // visibility only — NEVER click (mutates)
    }
  });

  test('My Team Requests: view a request detail, Approve/Decline visible but not clicked', async ({ page }) => {
    await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);

    const viewLink = page.locator('tbody.request_list a.nav-link').first();
    if (await viewLink.count()) {
      await viewLink.click();
      await assertHealthyPage(page);
      // Approve/Decline only render for pending/declined/approved combos — assert IF present, never click.
      const approveBtn = page.getByRole('button', { name: /Approve/i });
      const declineBtn = page.getByRole('button', { name: /Decline/i });
      if (await approveBtn.count()) await expect(approveBtn.first()).toBeVisible();
      if (await declineBtn.count()) await expect(declineBtn.first()).toBeVisible();
    } else {
      test.skip(true, 'no team request rows currently in the list to open');
    }
  });

  test('Team Schedule: department/team/name filters, day/week/month view, Export visible', async ({ page }) => {
    await page.goto('/app/team/MyTeamSchedule', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.locator('h2.header_text', { hasText: 'My Team Schedule' })).toBeVisible();

    const deptSelect = page.locator('select[name="department_id"]');
    if (await deptSelect.count()) {
      const optionCount = await deptSelect.locator('option').count();
      if (optionCount > 1) await deptSelect.selectOption({ index: 1 });
    }
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.count()) await nameInput.fill('');

    const filterBtn = page.getByRole('button', { name: /Filter/i });
    if (await filterBtn.count()) {
      await dismissAlert(page);
      await filterBtn.first().click();
      await assertHealthyPage(page);
    }

    // View-type tabs: Today / Weekly / Monthly — read-only re-fetch of the schedule grid.
    for (const label of ['Weekly', 'Monthly', 'Today']) {
      const tab = page.getByRole('tab', { name: label });
      if (await tab.count()) {
        await dismissAlert(page);
        await tab.click();
        await assertHealthyPage(page);
      }
    }

    // Export dropdown — open it, assert menu items, never click an export action.
    // Scope to .dropdown-item (menu entries) — the toggle button itself also renders "Export" text.
    const exportToggle = page.locator('.export-drop-down').getByRole('button', { name: /Export/i });
    if (await exportToggle.count()) {
      await exportToggle.first().click();
      const menuItems = page.locator('.export-drop-down .dropdown-item');
      await expect(menuItems.filter({ hasText: 'Export All' })).toBeVisible();
      await expect(menuItems.filter({ hasText: /^Export$/ })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('Employee List: department/status/job-title/name filters, sort, row action links', async ({ page }) => {
    await page.goto('/app/team/MyTeamList', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.locator('h2.page-title', { hasText: 'Employee list' })).toBeVisible();

    const deptFilter = page.locator('.department-filter');
    if (await deptFilter.count()) {
      await deptFilter.click();
      const firstOption = page.locator('.department-filter .select__option').first();
      if (await firstOption.count()) await firstOption.click();
    }

    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.count()) await statusSelect.selectOption('1'); // Active

    const jobTitleInput = page.locator('input[name="job_title"]');
    if (await jobTitleInput.count()) await jobTitleInput.fill('');

    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.count()) await nameInput.fill('');

    const filterBtn = page.getByRole('button', { name: /Filter/i });
    if (await filterBtn.count()) {
      await dismissAlert(page);
      await filterBtn.first().click();
      await assertHealthyPage(page);
    }

    const sortSelect = page.locator('select[name="order_by"]');
    if (await sortSelect.count()) {
      await sortSelect.selectOption('name:asc');
      await assertHealthyPage(page);
    }

    // Row action icons (DTR / Schedule / Profile) — read-only navigations.
    const dtrIcon = page.locator('td.actions a[title="View DTR"]').first();
    if (await dtrIcon.count()) {
      await dtrIcon.click();
      await assertHealthyPage(page);
      await page.goBack({ waitUntil: 'load' });
    }
  });

  test('DTR Summary: filters, Generate (read-only), Export menu visible', async ({ page }) => {
    await page.goto('/app/team/DtrSummary', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.locator('h2.page-title', { hasText: 'DTR SUMMARY' })).toBeVisible();

    const deptSelect = page.locator('select[name="department_id"]');
    if (await deptSelect.count()) {
      const optionCount = await deptSelect.locator('option').count();
      if (optionCount > 1) await deptSelect.selectOption({ index: 1 });
    }

    const generateBtn = page.locator('#btn-generate');
    if (await generateBtn.count()) {
      await dismissAlert(page);
      await generateBtn.click();
      await assertHealthyPage(page);
    }

    const exportToggle = page.locator('.export-drop-down').getByRole('button', { name: /Export/i });
    if (await exportToggle.count()) {
      await exportToggle.first().click();
      await expect(page.locator('#btn-export-department').first()).toBeVisible();
      await expect(page.locator('#btn-export-all').first()).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('DTR Logs: filters, Generate (read-only), Toggle Outlook POV, Export button visible', async ({ page }) => {
    await page.goto('/app/team/DtrLogs', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.locator('h2.page-title', { hasText: 'DTR LOGS' })).toBeVisible();

    const deptSelect = page.locator('select[name="department_id"]');
    if (await deptSelect.count()) {
      const optionCount = await deptSelect.locator('option').count();
      if (optionCount > 1) await deptSelect.selectOption({ index: 1 });
    }

    const generateBtn = page.getByRole('button', { name: /^Generate$/i });
    if (await generateBtn.count()) {
      await dismissAlert(page);
      await generateBtn.first().click();
      await assertHealthyPage(page);
    }

    // "Toggle Outlook" only flips a local POV column state — no server write.
    const toggleBtn = page.locator('.toggle-outlook-dtr');
    if (await toggleBtn.count()) {
      await dismissAlert(page);
      await toggleBtn.click();
      await assertHealthyPage(page);
    }

    const exportBtn = page.getByRole('button', { name: /^Export$/i });
    if (await exportBtn.count()) {
      await expect(exportBtn.first()).toBeVisible(); // visibility only — do not click (triggers download/export)
    }
  });

  test('DTR Conflict Report: direct URL (not in sidebar), Generate & Export list is read-only fetch', async ({ page }) => {
    // Not present in this role's rendered menu, but ProtectedRoute allows role=supervisor + feature=view_dtr_summary.
    await page.goto('/app/team/DtrConflict', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.locator('h2.page-title', { hasText: 'DTR Conflict Report' })).toBeVisible();

    const generateBtn = page.locator('#btn-generate');
    if (await generateBtn.count()) {
      // Despite the label, this button's default click path only calls fetchDtrConflict (GET) — no export/file write.
      await dismissAlert(page);
      await generateBtn.click();
      await assertHealthyPage(page);
    }

    const exportToggle = page.locator('.export-drop-down').getByRole('button', { name: /Export/i });
    if (await exportToggle.count()) {
      await exportToggle.first().click();
      await expect(page.locator('#btn-export-all').first()).toBeVisible(); // visibility only
      await page.keyboard.press('Escape');
    }
  });

  test('Manage Department Schedule > Template List: table, Edit link opens read view, Save never clicked', async ({ page }) => {
    await page.goto('/app/schedule/template/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.getByText('List of Template Schedules')).toBeVisible();

    const editLink = page.locator('a.btn.btn-primary', { hasText: 'Edit' }).first();
    if (await editLink.count()) {
      await editLink.click();
      await assertHealthyPage(page);
      const saveBtn = page.getByRole('button', { name: /Save/i });
      if (await saveBtn.count()) await expect(saveBtn.first()).toBeVisible(); // visibility only, never click
    } else {
      test.skip(true, 'no template schedules exist for this role to open');
    }

    const deleteBtn = page.getByRole('button', { name: /Delete/i });
    if (await deleteBtn.count()) {
      await expect(deleteBtn.first()).toBeVisible(); // visibility only — never click (deletes a template)
    }
  });

  test('Manage Department Schedule > Assign Department Schedule: department select (read-only fetch), radios, Update/Assign never clicked', async ({ page }) => {
    await page.goto('/app/schedule/assign/department', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.getByText('Departments Handled')).toBeVisible();

    const deptSelect = page.locator('select').first();
    const optionCount = await deptSelect.locator('option').count();
    if (optionCount > 1) {
      // Selecting a department only calls getDefaultSchedule (GET) — no write.
      await deptSelect.selectOption({ index: 1 });
      await assertHealthyPage(page);

      // Creation type / schedule type radios are local Formik state only — safe to toggle.
      // They only render once getDefaultSchedule's response populates the form, so wait for it.
      const scheduleTypeRadios = page.locator('input[type="radio"][name="schedule_type"]');
      if (await scheduleTypeRadios.first().isVisible({ timeout: 15000 }).catch(() => false)) {
        await scheduleTypeRadios.first().click({ force: true });
      }

      const updateBtn = page.getByRole('button', { name: /^Update$/i });
      const assignBtn = page.getByRole('button', { name: /Assign to all employees/i });
      if (await updateBtn.count()) await expect(updateBtn.first()).toBeVisible(); // never click — mutates DTR records
      if (await assignBtn.count()) await expect(assignBtn.first()).toBeVisible(); // never click — mutates for whole dept
    } else {
      test.skip(true, 'no departments handled by this account to select');
    }
  });

  test('Manage Department Schedule > Add Template: form renders, Save Template never clicked', async ({ page }) => {
    await page.goto('/app/schedule/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);

    const saveBtn = page.getByRole('button', { name: /Save/i });
    if (await saveBtn.count()) {
      await expect(saveBtn.first()).toBeVisible(); // visibility only — never click (creates a template)
    }
  });

  test('Scope: no admin-only links leak into this role\'s sidebar', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    const sidebar = page.locator('aside.main-sidebar');
    await expect(sidebar.locator('a[href*="/app/admin/"]')).toHaveCount(0);
    await expect(sidebar.getByText('Register User', { exact: false })).toHaveCount(0);
  });
});
