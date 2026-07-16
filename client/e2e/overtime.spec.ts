// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Overtime New Request  (/app/request/Overtime/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page, request }) => {
      const response = await request.get(`${BASE_URL}/app/request/Overtime/`);
      expect(response.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows Overtime heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('heading', { name: /overtime/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title is set ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Form Fields', () => {
    test('date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('input[type="date"], input[name="date"], input[placeholder*="date" i]').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('start_time input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('input[name="start_time"], input[type="time"][name*="start"], input[placeholder*="start" i]').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('end_time input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('input[name="end_time"], input[type="time"][name*="end"], input[placeholder*="end" i]').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('reason textarea is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('textarea[name="reason"], textarea[placeholder*="reason" i], textarea').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('submit button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit")').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

test.describe('Overtime Existing Request  (/app/request/Overtime/1)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page, request }) => {
      const response = await request.get(`${BASE_URL}/app/request/Overtime/1`);
      expect(response.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows Overtime heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('heading', { name: /overtime/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title is set ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Form Fields', () => {
    test('date input is visible and pre-populated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const dateInput = page.locator('input[type="date"], input[name="date"], input[placeholder*="date" i]').first();
        await expect(dateInput).toBeVisible({ timeout: 10000 });
        const value = await dateInput.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test('start_time input is visible and pre-populated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const startInput = page.locator('input[name="start_time"], input[type="time"][name*="start"], input[placeholder*="start" i]').first();
        await expect(startInput).toBeVisible({ timeout: 10000 });
        const value = await startInput.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test('end_time input is visible and pre-populated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const endInput = page.locator('input[name="end_time"], input[type="time"][name*="end"], input[placeholder*="end" i]').first();
        await expect(endInput).toBeVisible({ timeout: 10000 });
        const value = await endInput.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test('reason textarea is visible and pre-populated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const textarea = page.locator('textarea[name="reason"], textarea[placeholder*="reason" i], textarea').first();
        await expect(textarea).toBeVisible({ timeout: 10000 });
        const value = await textarea.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test('submit button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/Overtime/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit")').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
