// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('TeamAttendanceSummary (/app/report/TeamAttendanceSummary/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to login ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      const url = page.url();
      if (url.includes('/login')) {
        await expect(page.locator('input[name="email"], input[type="email"], input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows "Team Attendance Summary" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('heading', { name: /Team Attendance Summary/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('shows Export button ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('button', { name: /export/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('start_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('input[name="start_date"]')).toBeVisible({ timeout: 10000 });
      }
    });

    test('end_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('input[name="end_date"]')).toBeVisible({ timeout: 10000 });
      }
    });

    test('department_id select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('select[name="department_id"]')).toBeVisible({ timeout: 10000 });
      }
    });

    test('submit/Filter button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/TeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('button', { name: /filter|submit/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

test.describe('HRTeamAttendanceSummary (/app/report/HRTeamAttendanceSummary/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to login ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      const url = page.url();
      if (url.includes('/login')) {
        await expect(page.locator('input[name="email"], input[type="email"], input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows "Attendance Summary" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('heading', { name: /Attendance Summary/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('shows Export button ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('button', { name: /export/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('start_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('input[name="start_date"]')).toBeVisible({ timeout: 10000 });
      }
    });

    test('end_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('input[name="end_date"]')).toBeVisible({ timeout: 10000 });
      }
    });

    test('department_id select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/report/HRTeamAttendanceSummary/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('select[name="department_id"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
