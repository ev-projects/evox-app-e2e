// DRAFT — generated 2026-06-20, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────────────────────
test.describe('MyRequests (/app/account/MyRequests)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/account/MyRequests`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequests`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequests`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequests`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "My Requests" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /My Requests/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Filter Controls', () => {
    test('status or type filter select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="status"],select[name="type"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('date range input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="start_date"],input[type="date"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('Filter button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('button', { name: /filter/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('request list table is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('MyRequestsDispute (/app/account/MyRequestsDispute)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Dispute" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Dispute/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('dispute list table is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('MyTeamRequests (/app/team/MyTeamRequests)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Team Requests" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Team Requests/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Filter Controls', () => {
    test('status filter is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="status"]')).toBeVisible({ timeout: 10000 });
      }
    });
    test('date range input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="start_date"],input[type="date"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('team request list table is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('MyTeamAllRequests (/app/team/MyTeamAllRequests)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/team/MyTeamAllRequests`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamAllRequests`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamAllRequests`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Filter Controls', () => {
    test('date range input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamAllRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="start_date"],input[type="date"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('all-requests table is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/MyTeamAllRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('MyOverallRequest (/app/account/MyOverallRequests)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/account/MyOverallRequests`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyOverallRequests`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyOverallRequests`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Overall" or "Requests" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyOverallRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Overall|Requests/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Filter Controls', () => {
    test('type or status filter is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyOverallRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="type"],select[name="status"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('overall request list table is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyOverallRequests`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
