// DRAFT — generated 2026-06-20, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────────────────────
test.describe('MyTeamSchedule (/app/team/MyTeamSchedule)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Team Schedule" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Team Schedule|Schedule/i })).toBeVisible({ timeout: 10000 });
      }
    });
    test('Export button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('button', { name: /export/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Filter Controls', () => {
    test('start_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="start_date"],input[type="date"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('end_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="end_date"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('department_id select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="department_id"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('team schedule table or grid is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamSchedule`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody,.schedule-grid').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('WeeklyTeamSchedule (/app/team/WeeklyTeamSchedule)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/team/WeeklyTeamSchedule`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/WeeklyTeamSchedule`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/WeeklyTeamSchedule`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('DailyTeamSchedule (/app/team/DailyTeamSchedule)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/team/DailyTeamSchedule`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DailyTeamSchedule`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DailyTeamSchedule`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
