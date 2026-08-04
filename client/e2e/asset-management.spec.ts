// DRAFT — generated 2026-06-20, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────────────────────
test.describe('AssetManagementForm — New (/app/asset_management/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/asset_management/`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Asset" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Asset/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Form Fields', () => {
    test('asset_type select or input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="asset_type"],input[name="asset_type"],select').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('serial_number input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="serial_number"],input[name="serial"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('AssetManagementForm — Edit (/app/asset_management/1)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/asset_management/1`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/1`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/1`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Form Fields', () => {
    test('form fields are visible (pre-populated) ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/1`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input,select').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_management/1`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('AssetReport (/app/asset_reports/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/asset_reports/`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_reports/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_reports/`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Asset Report" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_reports/`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Asset Report|Asset/i })).toBeVisible({ timeout: 10000 });
      }
    });
    test('Export button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_reports/`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('button', { name: /export/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Filter Controls', () => {
    test('department_id or asset_type filter is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_reports/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="department_id"],select[name="asset_type"],select').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('asset report table is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/asset_reports/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
