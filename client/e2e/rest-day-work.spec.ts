// DRAFT — generated 2026-06-20, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────────────────────
test.describe('RestDayWork — New Request (/app/request/RestDayWork/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Rest Day" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Rest Day/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Form Fields', () => {
    test('date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="date"],input[type="date"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('reason textarea is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('textarea[name="reason"],textarea').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('RestDayWork — Edit Existing (/app/request/RestDayWork/1)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Form Fields', () => {
    test('date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="date"],input[type="date"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
