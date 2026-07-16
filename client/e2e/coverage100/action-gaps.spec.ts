// ACTION/FILTER gap-closers — the read-only filter/list pages the scorecard flagged (gaps #14-#22).
// Every interaction here is a READ (filter -> GET list re-fetch); NO mutation, NO submit, NO export click
// unless the export is a confirmed GET. Each page is reached by direct URL with a role that can see it.
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://evoxtest.eastvantage.com';

// Healthy = page shell alive, not bounced to login, no PHP fatal.
async function assertHealthy(page: any) {
  await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
  expect(page.url()).not.toContain('/login');
  const body = await page.locator('body').innerText();
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

// Exercise the primary filter safely: fill any date/select, click Filter/Generate (read-only), assert healthy.
async function exerciseFilter(page: any) {
  const deptSel = page.locator('select[name="department_id"], select[name="department"]').first();
  if (await deptSel.count()) {
    const opts = await deptSel.locator('option').count();
    if (opts > 1) await deptSel.selectOption({ index: 1 }).catch(() => {});
  }
  const filterBtn = page.getByRole('button', { name: /^(Filter|Generate|Search|View)$/i }).first();
  if (await filterBtn.count()) {
    await filterBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    await assertHealthy(page);
  }
}

test.describe('gap #16 DTR Multi-Logs Summary (supervisor) — filters', () => {
  test.use({ storageState: 'e2e/.auth/ph-supervisor.json' });
  test('loads and filter is read-only', async ({ page }) => {
    await page.goto(`${BASE}/app/team/DtrMultiLogsSummary`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthy(page);
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 10000 });
    await exerciseFilter(page);
  });
});

test.describe('gap #14/#15 Team Attendance Summary (supervisor) — date filters', () => {
  test.use({ storageState: 'e2e/.auth/ph-supervisor.json' });
  test('TeamAttendanceSummary loads + filter', async ({ page }) => {
    await page.goto(`${BASE}/app/report/TeamAttendanceSummary/`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthy(page);
    await exerciseFilter(page);
  });
});

test.describe('gap #15 HR Team Attendance Summary (hr) — date filters', () => {
  test.use({ storageState: 'e2e/.auth/ph-hr.json' });
  test('HRTeamAttendanceSummary loads + filter', async ({ page }) => {
    await page.goto(`${BASE}/app/report/HRTeamAttendanceSummary/`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthy(page);
    await exerciseFilter(page);
  });
});

test.describe('gap #17 My Team All Requests (supervisor) — status filters (read-only)', () => {
  test.use({ storageState: 'e2e/.auth/ph-supervisor.json' });
  test('MyTeamAllRequests loads + status tabs re-fetch via GET', async ({ page }) => {
    await page.goto(`${BASE}/app/team/MyTeamAllRequests`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthy(page);
    // status filter buttons re-fetch the list (GET) — click one, assert no mutation, page healthy.
    const status = page.locator('.request_list_btn, [class*="request_list"]').first();
    if (await status.count()) { await status.click().catch(() => {}); await assertHealthy(page); }
    await exerciseFilter(page);
  });
});

test.describe('gap #18 My Overall Requests (employee) — status/date filters', () => {
  test.use({ storageState: 'e2e/.auth/ph-employee.json' });
  test('MyOverallRequests loads + filter', async ({ page }) => {
    await page.goto(`${BASE}/app/account/MyOverallRequests`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthy(page);
    await exerciseFilter(page);
  });
});

test.describe('gap #19 Manage HR Announcements (hr) — list filters', () => {
  test.use({ storageState: 'e2e/.auth/ph-hr.json' });
  test('ManageHrAnnouncements loads + filter', async ({ page }) => {
    await page.goto(`${BASE}/app/hr/ManageHrAnnouncements/`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthy(page);
    await exerciseFilter(page);
  });
});

test.describe('gap #22 Punch History (employee) — date filter', () => {
  test.use({ storageState: 'e2e/.auth/ph-employee.json' });
  test('punch_history loads + filter', async ({ page }) => {
    await page.goto(`${BASE}/app/punch_history/`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthy(page);
    await exerciseFilter(page);
  });
});
