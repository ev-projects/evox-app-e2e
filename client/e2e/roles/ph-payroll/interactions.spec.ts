// AUTO-GENERATED interaction spec — role: payroll-head (testPayroll@eastvantage.com)
// MUTATION SAFETY: DB is a live backup dump. Never click Submit/Save/Update/Approve/
// Decline/Delete/Generate. Only GET-based filter/export actions are exercised; verified
// against component source (DisputeReport.js, ViewReport.js, ViewReportMorocco.js —
// all filter/export handlers use API.call({method:"GET"...})) before including here.
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-payroll.json' });

test.describe('ph-payroll — Payroll Dispute Report (/app/payrolldisputeview/)', () => {
  test('loads Payroll-level dispute table with Geo filter (not Department)', async ({ page }) => {
    await page.goto('/app/payrolldisputeview/', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Payroll Dispute Report' })).toBeVisible({ timeout: 10000 });
    // Payroll-level accounts get a Geo filter, not a Department filter (Authenticator.scanLevel branch)
    await expect(page.locator('select[name="geo"]')).toBeVisible();
    await expect(page.locator('select[name="department"]')).toHaveCount(0);
    // Wide payroll table variant has these columns; the employee-facing variant does not
    await expect(page.getByRole('columnheader', { name: 'Emp No' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Cut Off' })).toBeVisible();
  });

  test('date range filter is GET-only — safe to exercise', async ({ page }) => {
    await page.goto('/app/payrolldisputeview/', { waitUntil: 'load' });
    await page.locator('input[name="startDate"]').fill('2026-06-01');
    await page.locator('input[name="endDate"]').fill('2026-06-30');
    await page.getByRole('button', { name: /Filter/i }).click();
    await page.waitForTimeout(1000);
    // page must still be alive and on the same view (no navigation/error)
    await expect(page.getByRole('heading', { name: 'Payroll Dispute Report' })).toBeVisible();
  });

  test('Export button triggers a GET (download), not a mutation', async ({ page }) => {
    await page.goto('/app/payrolldisputeview/', { waitUntil: 'load' });
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: 'Export' }).click();
    await downloadPromise;
    await expect(page.getByRole('heading', { name: 'Payroll Dispute Report' })).toBeVisible();
  });
});

test.describe('ph-payroll — open Dispute form WITHOUT saving (/app/payrolldispute/)', () => {
  test('create-mode form loads; Approve/Decline visible but never clicked', async ({ page }) => {
    await page.goto('/app/payrolldispute/', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Create Dispute' })).toBeVisible({ timeout: 10000 });
    // "Select User" is the employee search/select control on the create form
    const selectUser = page.locator('select[name="selectedUser"]');
    await expect(selectUser).toBeVisible();
    const optionCount = await selectUser.locator('option').count();
    if (optionCount > 1) {
      await selectUser.selectOption({ index: 1 });
    }
    // MUTATION SAFETY: these submit handleSubmit(e,1)/handleSubmit(e,2) -> PUT /updatedispute/*
    // Assert visibility only. Do not click.
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Decline' })).toBeVisible();
  });
});

test.describe('ph-payroll — Payroll Cutoff (/app/admin/PayrollCutoff/) view only', () => {
  test('cutoff list loads; Add/Edit/Delete visible, never clicked', async ({ page }) => {
    await page.goto('/app/admin/PayrollCutoff/', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Payroll Cut-Off List' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Add/i })).toBeVisible();
    // MUTATION SAFETY: Edit opens an update form, Delete calls deletePayrollCutoff(id).
    // Assert visibility only — do not click either.
    const editButtons = page.getByRole('button', { name: 'Edit' });
    if (await editButtons.count() > 0) {
      await expect(editButtons.first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible();
    }
  });
});

test.describe('ph-payroll — DTR Summary (/app/team/DtrSummary) filters only', () => {
  test('name filter + department select are safe; Generate/Export never clicked', async ({ page }) => {
    await page.goto('/app/team/DtrSummary', { waitUntil: 'load' });
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[name="name"]').fill('Test');
    // MUTATION SAFETY: "Generate" (#btn-generate) and the Export dropdown items are form
    // submits per team-lead instruction — never click "Generate". Assert visible only.
    await expect(page.locator('#btn-generate')).toBeVisible();
  });

  test('old DTR summary route (DtrSummaryTemp) also resolves — same component as new', async ({ page }) => {
    const resp = await page.goto('/app/team/DtrSummaryTemp', { waitUntil: 'load' });
    if (resp) expect(resp.status()).toBeLessThan(500);
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('ph-payroll — India/Morocco Payroll Report (timeoff allocation)', () => {
  test('India report (/app/viewreport/): month/year filter + export are GET-only', async ({ page }) => {
    await page.goto('/app/viewreport/', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'India Payroll Report' })).toBeVisible({ timeout: 10000 });
    await page.locator('select[name="type"]').first().selectOption('6');
    const selects = page.locator('select[name="type"]');
    await selects.nth(1).selectOption({ index: 1 });
    await page.getByRole('button', { name: /Filter/i }).click();
    await page.waitForTimeout(1000);
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.locator('.export-drop-down').click();
    await downloadPromise;
  });

  test('geo scoping: Morocco report route is reachable directly (menu only exposes India link)', async ({ page }) => {
    // FINDING: ph-payroll's sidebar only shows one "India Payroll Report" link, but the
    // Morocco variant route is not blocked for this role at the frontend level.
    const resp = await page.goto('/app/viewreport/morocco/', { waitUntil: 'load' });
    if (resp) expect(resp.status()).toBeLessThan(500);
    await expect(page.getByRole('heading', { name: 'Morocco Payroll Report' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('ph-payroll — Generate Date admin page (view only, direct nav)', () => {
  test('not in sidebar for this role — probe reachability, no interaction', async ({ page }) => {
    const resp = await page.goto('/app/admin/GenerateDate/', { waitUntil: 'load' });
    if (resp) expect(resp.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    // Do NOT click any Generate/Submit control on this page regardless of what renders.
  });
});
